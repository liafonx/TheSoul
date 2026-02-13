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
    var analyzedAntes = window.getAnalyzedAnteNumbers?.() || [];
    if (!map?.size && !baseMap?.size && !analyzedAntes.length) {
      renderSummaryEmpty(t("ui.summary_placeholder"));
      return;
    }

    // Show all analyzed antes (including those without hits)
    var allAntes = new Set([...(map ? map.keys() : []), ...(baseMap ? baseMap.keys() : []), ...analyzedAntes]);
    var sortedAntes = [...allAntes].sort(function (a, b) { return a - b; });
    var cleanFn = utils.cleanSummaryLine || (function (x) { return x; });

    var frag = document.createDocumentFragment();
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
      frag.appendChild(item);
    });
    summaryFloatingContent.appendChild(frag);
  }

  // Set initial summary text
  if (summaryFloatingContent) {
    summaryFloatingContent.textContent = t("ui.summary_placeholder");
  }

  // ---- Emoji filter application ----

  var _pendingEmojiFilterFrame = 0;

  /**
   * Schedule applySummaryEmojiFilter to run once in the next animation frame.
   * Multiple calls within the same frame are coalesced into a single execution.
   */
  function scheduleApplySummaryEmojiFilter() {
    if (_pendingEmojiFilterFrame) return;
    _pendingEmojiFilterFrame = requestAnimationFrame(function () {
      _pendingEmojiFilterFrame = 0;
      applySummaryEmojiFilterSync();
    });
  }

  var _inEmojiFilter = false;

  function applySummaryEmojiFilterSync() {
    if (_inEmojiFilter) return;
    _inEmojiFilter = true;
    try { _applySummaryEmojiFilterCore(); } finally { _inEmojiFilter = false; }
  }

  function _applySummaryEmojiFilterCore() {
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

    // Scope queries to known containers to avoid full-document traversal
    var scrollRoot = document.getElementById("scrollingContainer");
    var summaryRoot = summaryFloatingContent;

    // Collect all filterable segments from both roots in a single pass
    var segmentSelector = ".summaryText > span[data-summary-emojis], .summaryFaceSegment, .miniSummaryItem";
    var allSegments = [];
    if (summaryRoot) allSegments.push.apply(allSegments, summaryRoot.querySelectorAll(segmentSelector));
    if (scrollRoot) allSegments.push.apply(allSegments, scrollRoot.querySelectorAll(segmentSelector));

    for (var si = 0; si < allSegments.length; si++) {
      var el = allSegments[si];
      if (el.dataset.searchResult === "true") continue;
      applyEmojiVisibilityToSegment(el);
      var emojis = parseEmojis(el);
      var visibleByEmoji = !emojis.length || emojis.every(function (emoji) { return isFaceEntryVisible(emoji); });
      var visibleByTerms = isSegmentTermVisible(el, emojis);
      if (!visibleByEmoji || !visibleByTerms) {
        el.style.display = "none";
      }
    }

    // Process mini summary entries (only in scrollRoot)
    var miniEntries = scrollRoot ? scrollRoot.querySelectorAll(".miniSummaryEntry") : [];
    for (var mi = 0; mi < miniEntries.length; mi++) {
      var row = miniEntries[mi];
      // Check inline items
      var textSpan = row.querySelector(".miniSummaryText:not(.miniSummaryTextFull)");
      var inlineItems = textSpan ? textSpan.querySelectorAll(".miniSummaryItem") : [];
      var anyVisible = !inlineItems.length;
      if (!anyVisible) {
        for (var ii = 0; ii < inlineItems.length; ii++) {
          if (inlineItems[ii].style.display !== "none") { anyVisible = true; break; }
        }
      }

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
    }

    // Hide entire nearby summary when no search and no tracking active
    var hasSearch = document.getElementById("searchInput")?.value?.trim().length > 0;
    var hasTracking = window.hasActiveTrackingItems?.() || false;
    var wrapperDisplay = (hasSearch || hasTracking) ? "" : "none";
    var miniWrappers = scrollRoot ? scrollRoot.querySelectorAll(".miniSummaryWrapper") : [];
    for (var wi = 0; wi < miniWrappers.length; wi++) {
      miniWrappers[wi].style.display = wrapperDisplay;
    }

    var updateDelimiters = function (container, delimClass, pipeClass) {
      var children = container.children;
      var len = children.length;
      // Build visibility array in a single forward pass
      var isContentArr = new Array(len);
      var isVisibleArr = new Array(len);
      var isDelimArr = new Array(len);
      for (var di = 0; di < len; di++) {
        var node = children[di];
        var cls = node.classList;
        var isDelim = cls.contains(delimClass) || cls.contains(pipeClass);
        isDelimArr[di] = isDelim;
        isContentArr[di] = !isDelim && node.nodeType === 1;
        isVisibleArr[di] = isContentArr[di] && node.style.display !== "none";
      }
      for (var di = 0; di < len; di++) {
        if (!isDelimArr[di]) continue;
        var prevVisible = false, hasAfter = false;
        for (var j = di - 1; j >= 0; j--) { if (isContentArr[j]) { prevVisible = isVisibleArr[j]; break; } }
        for (var j = di + 1; j < len; j++) { if (isVisibleArr[j]) { hasAfter = true; break; } }
        children[di].style.display = prevVisible && hasAfter ? "" : "none";
      }
    };

    // Update delimiters scoped to known roots
    var summaryTexts = summaryRoot ? summaryRoot.querySelectorAll(".summaryText") : [];
    for (var sti = 0; sti < summaryTexts.length; sti++) {
      updateDelimiters(summaryTexts[sti], "summaryDelimiter", "summaryPipe");
    }
    var miniTexts = scrollRoot ? scrollRoot.querySelectorAll(".miniSummaryText, .miniSummaryTextFull") : [];
    for (var mti = 0; mti < miniTexts.length; mti++) {
      updateDelimiters(miniTexts[mti], "miniSummaryDelimiter", "miniSummaryPipe");
    }

    // Restore scroll position after DOM modifications
    if (window.scrollY !== savedScrollY) {
      window.scrollTo(0, savedScrollY);
    }
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
    if (typeof window.invalidateTrackingCache === "function") {
      window.invalidateTrackingCache();
    }
    extractTrackingItems();
    renderSummaryList();
    applySummaryEmojiFilterSync();
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
    // Scope to scrollingContainer to avoid full-document traversal
    var scrollRoot = document.getElementById("scrollingContainer");
    if (!scrollRoot) return;
    var entries = scrollRoot.querySelectorAll(".miniSummaryEntry");
    for (var i = 0; i < entries.length; i++) {
      var row = entries[i];
      var anteSpan = row.querySelector(".miniSummaryAnte");
      if (!anteSpan) continue;
      var match = anteSpan.textContent.match(/(\d+)/);
      if (!match) continue;
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
    }
    // Show/hide wrappers: match the same condition used by applySummaryEmojiFilterSync
    var hasSearch = document.getElementById("searchInput")?.value?.trim().length > 0;
    var hasTracking = window.hasActiveTrackingItems?.() || false;
    var wrapperDisplay = (hasSearch || hasTracking) ? "" : "none";
    var wrappers = scrollRoot.querySelectorAll(".miniSummaryWrapper");
    for (var wi = 0; wi < wrappers.length; wi++) {
      wrappers[wi].style.display = wrapperDisplay;
    }
    // Restore scroll position after DOM modifications
    if (window.scrollY !== savedScrollY) {
      window.scrollTo(0, savedScrollY);
    }
  }

  // ---- Exports ----
  window.setSummaryFloatingVisible = setSummaryFloatingVisible;
  window.setButtonLoadingState = setButtonLoadingState;
  window.resetSummaryFloatingScrollPosition = resetSummaryFloatingScrollPosition;
  window.renderSummaryList = renderSummaryList;
  window.renderSummarySegments = renderSummarySegments;
  window.refreshNearbySummaries = refreshNearbySummaries;
  window.applySummaryEmojiFilter = scheduleApplySummaryEmojiFilter;
  window.applySummaryEmojiFilterSync = applySummaryEmojiFilterSync;
  window.extractTrackingItems = extractTrackingItems;
  window.copySummaryToClipboard = copySummaryToClipboard;
  window.onTrackingTermsStateChange = onTrackingTermsStateChange;
})();
