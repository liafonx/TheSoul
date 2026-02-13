/**
 * ui.summary.js - Summary rendering, emoji filter, and DOM tracking extraction
 * Handles the floating summary panel rendering and emoji visibility filtering.
 */
(function () {
  "use strict";

  var getUtils = function () { return window.BalatroUtils || {}; };
  var t = function (key) { return window.BalatroI18n?.t ? window.BalatroI18n.t(key) : key; };

  // DOM references (looked up once at load time; DOM is parsed since this is defer)
  var summaryFloatingWindow = document.getElementById("summaryFloatingWindow");
  var summaryFloatingContent = document.getElementById("summaryFloatingContent");

  // ---- Summary window visibility ----

  function setSummaryFloatingVisible(flag) {
    if (!summaryFloatingWindow) return;
    var nextVisible = Boolean(flag);
    summaryFloatingWindow.classList.toggle("visible", nextVisible);
    document.body.classList.toggle("summary-floating-open", nextVisible);
    if (nextVisible && window.__RESET_SUMMARY_ON_NEXT_OPEN__) {
      resetSummaryFloatingScrollPosition();
      requestAnimationFrame(function () {
        resetSummaryFloatingScrollPosition();
        window.__RESET_SUMMARY_ON_NEXT_OPEN__ = false;
      });
    }
  }

  function setButtonLoadingState(btn, flag) {
    var utils = getUtils();
    if (utils.setButtonLoadingState) {
      utils.setButtonLoadingState(btn, flag);
    } else if (btn) {
      btn.disabled = Boolean(flag);
      btn.classList.toggle("is-loading", Boolean(flag));
    }
  }

  function resetSummaryFloatingScrollPosition() {
    if (summaryFloatingContent) summaryFloatingContent.scrollTop = 0;
    if (summaryFloatingWindow) summaryFloatingWindow.scrollTop = 0;
  }

  // ---- Shared segment rendering ----

  /**
   * Render summary text into a container, splitting by delimiters and pipes.
   * @param {string} baseText  - raw summary text
   * @param {HTMLElement} container - target DOM node
   * @param {string} cssPrefix - "summary" or "miniSummary"
   *   "summary"     → summaryDelimiter, summaryPipe, summaryFaceSegment
   *   "miniSummary" → miniSummaryDelimiter, miniSummaryPipe, miniSummaryItem
   */
  function renderSummarySegments(baseText, container, cssPrefix) {
    var utils = getUtils();
    var delimClass = cssPrefix + "Delimiter";
    var pipeClass  = cssPrefix + "Pipe";
    var itemClass  = cssPrefix === "summary" ? "summaryFaceSegment" : "miniSummaryItem";

    baseText.split(/(、|,)/).forEach(function (seg) {
      if (!seg) return;
      if (seg === "\u3001" || seg === ",") {
        container.appendChild(Object.assign(document.createElement("span"), { className: delimClass, textContent: seg }));
        if (seg === ",") container.appendChild(document.createTextNode(" "));
        return;
      }
      seg.split(/(\|)/).forEach(function (chunk) {
        if (!chunk) return;
        if (chunk === "|") { container.appendChild(Object.assign(document.createElement("span"), { className: pipeClass, textContent: " | " })); return; }
        var span = document.createElement("span");
        span.textContent = chunk;
        span.dataset.originalText = chunk;
        var info = utils.getFaceInfoForSegment?.(chunk);
        if (info) {
          span.className = itemClass;
          span.dataset.faceEmoji = info.emoji;
          chunk.includes("\u203C\uFE0F") ? span.classList.add("negativeFace") : info.color && (span.style.color = info.color);
        }
        var summaryEmojis = utils.getSummaryEmojisForText?.(chunk) || [];
        if (summaryEmojis.length) {
          span.dataset.summaryEmojis = summaryEmojis.join(",");
        }
        container.appendChild(span);
      });
    });
  }

  // ---- Summary rendering ----

  function renderSummaryEmpty(text) {
    if (!summaryFloatingContent) return;
    summaryFloatingContent.innerHTML = "";
    summaryFloatingContent.appendChild(Object.assign(document.createElement("div"), {
      className: "summaryEmpty",
      textContent: text,
    }));
  }

  function renderSummaryList() {
    if (!summaryFloatingContent) return;
    var utils = getUtils();
    var map = window.lastAugmentedSummary || window.lastSummariesByAnte;
    summaryFloatingContent.innerHTML = "";

    var searchInput = document.getElementById("searchInput");
    var hasManualSearch = searchInput?.value?.trim().length > 0;

    if (!window.hasActiveTrackingItems() && !hasManualSearch) {
      renderSummaryEmpty(t("ui.no_tracking_items"));
      return;
    }

    var baseMap = window.lastBaseSummariesByAnte;
    if (!map?.size && !baseMap?.size) {
      renderSummaryEmpty(t("ui.summary_placeholder"));
      return;
    }

    // Show all analyzed antes, not just those with hits
    var allAntes = new Set([...(map ? map.keys() : []), ...(baseMap ? baseMap.keys() : [])]);
    var sortedAntes = [...allAntes].sort(function (a, b) { return a - b; });
    var cleanFn = utils.cleanSummaryLine || (function (x) { return x; });

    sortedAntes.forEach(function (anteNum, idx) {
      var rawLine = map?.get(anteNum) || baseMap?.get(anteNum);
      var item = Object.assign(document.createElement("div"), { className: "summaryItem" });
      item.dataset.ante = String(anteNum);
      item.dataset.order = String(idx);

      var anteLabel = Object.assign(document.createElement("button"), { type: "button", className: "summaryAnteButton", textContent: "Ante " + anteNum });
      var text = Object.assign(document.createElement("span"), { className: "summaryText" });
      if (rawLine) {
        renderSummarySegments(cleanFn(rawLine) || rawLine, text, "summary");
        markSearchItems(text);
      } else {
        text.textContent = t("ui.no_summary_yet");
      }

      anteLabel.addEventListener("click", function () {
        setSummaryFloatingVisible(false);
        window.goToAntePage?.(anteNum);
      });

      text.addEventListener("dblclick", function () {
        text.setAttribute("aria-pressed", item.classList.toggle("completed") ? "true" : "false");
        var parent = item.parentElement;
        if (parent) [...parent.children].sort(function (a, b) {
          return (a.classList.contains("completed") ? 1 : 0) - (b.classList.contains("completed") ? 1 : 0) || (Number(a.dataset.order) || 0) - (Number(b.dataset.order) || 0);
        }).forEach(function (c) { parent.appendChild(c); });
      });

      item.append(anteLabel, text);
      summaryFloatingContent.appendChild(item);
    });
  }

  // Set initial summary text
  if (summaryFloatingContent) {
    summaryFloatingContent.textContent = t("ui.summary_placeholder");
  }

  // ---- Emoji filter application ----

  function applySummaryEmojiFilter() {
    var savedScrollY = window.scrollY;
    var utils = getUtils();
    var emojiMap = utils.summaryEmojiMap || {};
    var faceEmojiMap = utils.summaryFaceEmojiMap || {};
    var faceCardMap = utils.summaryFaceCardMap || {};
    var filter = window.summaryEmojiFilter || {};
    var activeTerms = window.BalatroSearch?.getActiveToggleTerms?.() || null;
    var emojiVisible = window.summaryEmojiVisible !== false;
    var faceMatchCache = new Map();
    var enLocale = window.BalatroLocale_enUS || {};
    var faceMatchers = Object.entries(faceCardMap).map(function (_ref) {
      var internalKey = _ref[0], info = _ref[1];
      var enDisplayName = enLocale[internalKey] || "";
      return { engName: internalKey, cnName: (info?.cn || "").trim(), enDisplayName: enDisplayName };
    });
    var termTokenCache = new Map();

    var parseEmojis = function (el) {
      var raw = (el.dataset.summaryEmojis || "").trim();
      if (raw) {
        return raw.split(",").map(function (token) { return token.trim(); }).filter(Boolean);
      }
      var face = (el.dataset.faceEmoji || "").trim();
      return face ? [face] : [];
    };

    var isFaceEntryVisible = function (emoji) {
      return !emoji || !(emoji in faceEmojiMap) || filter[emoji] !== false;
    };

    var getMatchedFaceCards = function (text) {
      var source = String(text || "");
      if (!source) return [];
      if (faceMatchCache.has(source)) return faceMatchCache.get(source);
      var matches = [];
      faceMatchers.forEach(function (_ref) {
        var engName = _ref.engName, cnName = _ref.cnName, enDisplayName = _ref.enDisplayName;
        if (source.includes(engName) || (cnName && source.includes(cnName)) || (enDisplayName && source.includes(enDisplayName))) {
          matches.push(engName);
        }
      });
      faceMatchCache.set(source, matches);
      return matches;
    };

    var getTermTokens = function (name) {
      var key = String(name || "");
      if (!key) return [];
      if (termTokenCache.has(key)) return termTokenCache.get(key);
      var localized = utils.translateGameText ? utils.translateGameText(key) : key;
      var tokens = [key.toLowerCase()];
      if (localized) tokens.push(String(localized).toLowerCase());
      // Include English display name for matching against DOM text from Immolate
      var enName = (window.BalatroLocale_enUS || {})[key];
      if (enName) tokens.push(String(enName).toLowerCase());
      var deduped = [...new Set(tokens.filter(Boolean))];
      termTokenCache.set(key, deduped);
      return deduped;
    };

    var getMatchedMappedCards = function (text, emojis) {
      var source = String(text || "").toLowerCase();
      if (!source || !Array.isArray(emojis) || !emojis.length) return [];
      var matches = new Set();
      emojis.forEach(function (emoji) {
        var cards = emojiMap?.[emoji]?.cards || [];
        cards.forEach(function (cardName) {
          var tokens = getTermTokens(cardName);
          if (tokens.some(function (token) { return source.includes(token); })) {
            matches.add(cardName);
          }
        });
      });
      return [...matches];
    };

    var isSegmentTermVisible = function (el, emojis) {
      if (!activeTerms || typeof activeTerms.has !== "function" || !activeTerms.size) return true;
      var source = el.dataset.originalText ?? el.textContent ?? "";
      var matchedCards = [
        ...getMatchedFaceCards(source),
        ...getMatchedMappedCards(source, emojis),
      ];
      if (matchedCards.length) {
        return matchedCards.some(function (name) { return activeTerms.has(String(name).toLowerCase()); });
      }
      // Segment has emojis but matched no tracked cards — hide it in tracking mode
      if (emojis.length) return false;
      // Plain text with no emoji association — keep visible
      return true;
    };

    var applyEmojiVisibilityToSegment = function (el) {
      var emojis = parseEmojis(el);
      var originalText = el.dataset.originalText ?? el.textContent ?? "";
      var hadNegative = originalText.includes("\u203C\uFE0F");
      if (!el.dataset.originalText) {
        el.dataset.originalText = originalText;
      }
      var nextText = originalText;
      if (!emojiVisible) {
        emojis.forEach(function (emoji) {
          if (emoji in emojiMap && emoji !== "\uD83D\uDC5D") {
            nextText = nextText.split(emoji).join("");
          }
        });
      }
      nextText = nextText.replace(/\s{2,}/g, " ").trim();
      el.textContent = nextText;
      el.style.display = nextText ? "" : "none";

      if (el.classList.contains("summaryFaceSegment") || el.classList.contains("miniSummaryItem")) {
        var baseInfo = utils.getFaceInfoForSegment?.(originalText);
        if (hadNegative) {
          el.classList.add("negativeFace");
          el.style.color = "";
        } else {
          el.classList.remove("negativeFace");
          if (baseInfo?.color) {
            el.style.color = baseInfo.color;
          } else {
            el.style.color = "";
          }
        }
      }
    };

    // Fix 2: Merged DOM pass — apply emoji visibility + term filtering in one loop
    document.querySelectorAll(".summaryText > span[data-summary-emojis], .summaryFaceSegment, .miniSummaryItem").forEach(function (el) {
      if (el.dataset.searchResult === "true") return;
      applyEmojiVisibilityToSegment(el);
      var emojis = parseEmojis(el);
      var visibleByEmoji = !emojis.length || emojis.every(function (emoji) { return isFaceEntryVisible(emoji); });
      var visibleByTerms = isSegmentTermVisible(el, emojis);
      if (!visibleByEmoji || !visibleByTerms) {
        el.style.display = "none";
      }
    });

    document.querySelectorAll(".miniSummaryEntry").forEach(function (row) {
      // Check inline items
      var textSpan = row.querySelector(".miniSummaryText:not(.miniSummaryTextFull)");
      var inlineItems = textSpan ? textSpan.querySelectorAll(".miniSummaryItem") : [];
      var anyVisible = !inlineItems.length || [...inlineItems].some(function (i) { return i.style.display !== "none"; });

      // Toggle inline text vs no-hit placeholder
      var noHit = row.querySelector(".miniSummaryNoHit");
      if (anyVisible) {
        if (textSpan) textSpan.style.display = "";
        if (noHit) noHit.style.display = "none";
      } else {
        if (textSpan) textSpan.style.display = "none";
        if (!noHit) {
          noHit = Object.assign(document.createElement("span"), { className: "miniSummaryNoHit", textContent: t("ui.no_summary_yet") });
          if (textSpan) textSpan.insertAdjacentElement("afterend", noHit);
        }
        if (noHit) noHit.style.display = "";
      }

      // Sync popup: hide popup text too and add popup no-hit placeholder
      var popup = row.querySelector(".miniSummaryPopup");
      if (popup) {
        var popupText = popup.querySelector(".miniSummaryTextFull");
        var popupNoHit = popup.querySelector(".miniSummaryNoHit");
        if (anyVisible) {
          if (popupText) popupText.style.display = "";
          if (popupNoHit) popupNoHit.style.display = "none";
        } else {
          if (popupText) popupText.style.display = "none";
          if (!popupNoHit) {
            popupNoHit = Object.assign(document.createElement("span"), { className: "miniSummaryNoHit", textContent: t("ui.no_summary_yet") });
            if (popupText) popupText.insertAdjacentElement("afterend", popupNoHit);
          }
          if (popupNoHit) popupNoHit.style.display = "";
        }
      }

      row.style.display = "";
    });

    // Hide entire nearby summary when no search and no tracking active
    var hasSearch = document.getElementById("searchInput")?.value?.trim().length > 0;
    var hasTracking = window.hasActiveTrackingItems?.() || false;
    document.querySelectorAll(".miniSummaryWrapper").forEach(function (w) {
      w.style.display = (hasSearch || hasTracking) ? "" : "none";
    });

    var updateDelimiters = function (container, delimClass, pipeClass) {
      var children = [...container.children];
      var isPipe = function (n) { return n?.classList?.contains(pipeClass); };
      var isDelimiter = function (n) { return n?.classList?.contains(delimClass) || isPipe(n); };
      var isContent = function (n) { return n?.nodeType === 1 && !isDelimiter(n); };
      var isVisibleContent = function (n) { return isContent(n) && n.style.display !== "none"; };

      children.forEach(function (node, idx) {
        if (!isDelimiter(node)) return;
        var prevVisible = false, hasAfter = false;
        for (var i = idx - 1; i >= 0 && !prevVisible; i--) if (isContent(children[i])) { prevVisible = isVisibleContent(children[i]); break; }
        for (var i = idx + 1; i < children.length && !hasAfter; i++) if (isVisibleContent(children[i])) { hasAfter = true; break; }
        node.style.display = prevVisible && hasAfter ? "" : "none";
      });
    };

    document.querySelectorAll(".summaryText").forEach(function (c) { updateDelimiters(c, "summaryDelimiter", "summaryPipe"); });
    document.querySelectorAll(".miniSummaryText, .miniSummaryTextFull").forEach(function (c) { updateDelimiters(c, "miniSummaryDelimiter", "miniSummaryPipe"); });

    // Restore scroll position after DOM modifications
    if (window.scrollY !== savedScrollY) {
      window.scrollTo(0, savedScrollY);
    }

    // Fix 6: No RAF cascade — sync is immediate and scheduleSearchAndHighlight
    // handles its own debounce via requestAnimationFrame
    window.syncEmojiFilterToSearch?.();
  }

  // ---- DOM tracking extraction ----

  function extractTrackingItems() {
    // Extract tracking from raw output data (covers ALL antes, not just current page)
    var trackingResults = window.extractTrackingResults?.() || new Map();

    var finalTracking = new Map();
    trackingResults.forEach(function (groups, anteNum) {
      if (groups.length > 0) {
        // groups is an array of type-group strings; separate types with |
        finalTracking.set(anteNum, groups.join("|"));
      }
    });

    window.lastTrackingSummariesByAnte = finalTracking;

    // Augment summary with tracking + search data
    window.augmentSummaryWithSearch?.();
    if (window.lastAugmentedSummary?.size) {
      window.lastSummariesByAnte = window.lastAugmentedSummary;
    } else {
      window.lastSummariesByAnte = window.lastBaseSummariesByAnte || new Map();
    }

    if (typeof window.updateNearbySummaryButton === "function") {
      window.updateNearbySummaryButton();
    }
  }

  // ---- Copy summary to clipboard ----

  function copySummaryToClipboard() {
    if (!window.lastRawOutput?.trim()) {
      alert(t("ui.nothing_to_summarize"));
      return;
    }

    var exportButton = document.getElementById("exportButton");
    setButtonLoadingState(exportButton, true);
    var summaryReady = window.lastSummary?.trim()
      ? Promise.resolve()
      : window.summarizeOutput?.();

    summaryReady
      .then(function () {
        var summary = (window.lastSummary || "").trim();
        if (!summary) {
          alert(t("ui.nothing_to_summarize"));
          return;
        }
        return navigator.clipboard.writeText(summary).then(function () {
          alert(t("ui.summary_copied"));
        });
      })
      .catch(function (err) {
        console.error("Failed to copy summary:", err);
        alert(t("ui.copy_failed"));
      })
      .finally(function () {
        setButtonLoadingState(exportButton, false);
      });
  }

  // ---- Tracking state change handler ----

  function onTrackingTermsStateChange() {
    // Invalidate tracking term cache on state change
    if (typeof window.invalidateTrackingCache === "function") {
      window.invalidateTrackingCache();
    }
    // Extract tracking from highlighted shop items in main page
    extractTrackingItems();
    // Render floating summary with augmented data
    renderSummaryList();
    // Refresh mini-summaries in main page
    if (typeof window.refreshNearbySummaries === "function") {
      window.refreshNearbySummaries();
    }
    // Fix 3: Single filter call after all DOM is ready
    applySummaryEmojiFilter();
    var summaryFilterWindow = document.getElementById("summaryFilterWindow");
    if (summaryFilterWindow?.classList.contains("visible")) {
      window.buildSummaryFilterUI?.();
    }
  }

  // ---- In-place nearby summary refresh ----

  /**
   * Mark items in the 🔍 search section so they bypass emoji/term filtering.
   * Search section = everything from the first 🔍-containing item up to the first pipe delimiter.
   */
  function markSearchItems(container) {
    var children = container.children;
    var inSearch = false;
    for (var i = 0; i < children.length; i++) {
      var child = children[i];
      if (!inSearch && child.textContent && child.textContent.indexOf("\uD83D\uDD0D") >= 0) {
        inSearch = true;
      }
      if (inSearch && (child.classList.contains("miniSummaryPipe") || child.classList.contains("summaryPipe"))) {
        inSearch = false;
        continue;
      }
      if (inSearch) {
        child.dataset.searchResult = "true";
      }
    }
  }

  function refreshNearbySummaries() {
    var savedScrollY = window.scrollY;
    var utils = getUtils();
    var cleanFn = utils.cleanSummaryLine || function (x) { return x; };
    var map = window.lastSummariesByAnte;
    var baseMap = window.lastBaseSummariesByAnte;
    document.querySelectorAll(".miniSummaryEntry").forEach(function (row) {
      var anteSpan = row.querySelector(".miniSummaryAnte");
      if (!anteSpan) return;
      var match = anteSpan.textContent.match(/(\d+)/);
      if (!match) return;
      var anteNum = parseInt(match[1], 10);
      var rawText = map?.get(anteNum) || baseMap?.get(anteNum);
      var text = rawText ? (cleanFn(rawText) || rawText) : null;
      var fallback = t("ui.no_summary_yet");
      // Update inline text
      var textSpan = row.querySelector(".miniSummaryText");
      if (textSpan) { textSpan.innerHTML = ""; renderSummarySegments(text || fallback, textSpan, "miniSummary"); markSearchItems(textSpan); }
      // Update popup text
      var popupText = row.querySelector(".miniSummaryTextFull");
      if (popupText) { popupText.innerHTML = ""; renderSummarySegments(text || fallback, popupText, "miniSummary"); markSearchItems(popupText); }
    });
    // Show/hide wrappers based on whether we have data
    var hasContent = map?.size > 0 || baseMap?.size > 0;
    document.querySelectorAll(".miniSummaryWrapper").forEach(function (w) {
      w.style.display = hasContent ? "" : "none";
    });
    // Restore scroll position after DOM modifications
    if (window.scrollY !== savedScrollY) {
      window.scrollTo(0, savedScrollY);
    }
  }

  // ---- Exports ----
  window.setSummaryFloatingVisible = setSummaryFloatingVisible;
  window.setButtonLoadingState = setButtonLoadingState;
  window.resetSummaryFloatingScrollPosition = resetSummaryFloatingScrollPosition;
  window.renderSummaryEmpty = renderSummaryEmpty;
  window.renderSummaryList = renderSummaryList;
  window.renderSummarySegments = renderSummarySegments;
  window.refreshNearbySummaries = refreshNearbySummaries;
  window.applySummaryEmojiFilter = applySummaryEmojiFilter;
  window.extractTrackingItems = extractTrackingItems;
  window.copySummaryToClipboard = copySummaryToClipboard;
  window.onTrackingTermsStateChange = onTrackingTermsStateChange;
})();
