/**
 * ui.app.js - Main UI orchestrator
 * Coordinates modules: utils, search, cards, packs
 */
(function (global) {
  "use strict";

  function getAntesPerPageByUa() {
    const root = document.documentElement;
    if (root?.classList.contains("ua-mobile")) return 4;
    if (root?.classList.contains("ua-desktop")) return 8;

    // Fallback when UA classes are unavailable.
    const ua = navigator.userAgent || "";
    const isMobile = /Android|iPhone|iPad|iPod|Mobile|Windows Phone|webOS/i.test(ua);
    return isMobile ? 4 : 8;
  }

  const ANTES_PER_PAGE = getAntesPerPageByUa();
  let currentPageIndex = 0;
  let allShopQueues = [];
  let paginationContainer = null;
  let scrollingContainer = null;
  let anteNavSection = null;
  let anteNavButtons = null;
  let trackingTermsActive = true;
  let lastQueueSource = null;
  let lastQueueParsed = [];

  function initShopUI() {
    const t = (key) => global.BalatroI18n?.t ? global.BalatroI18n.t(key) : key;
    const utils = global.BalatroUtils || {};
    const search = global.BalatroSearch || {};
    const cards = global.BalatroCards || {};
    const packs = global.BalatroPacks || {};
    const renderers = global.BalatroRenderers || {};

    const {
      createElement,
      cleanSummaryLine,
      setupDragScroll,
      setButtonLoadingState,
      getFaceInfoForSegment,
      getSummaryEmojisForText,
      translateGameText,
      setupPointerDragScroll,
    } = utils;

    const { renderBoss, renderTag, renderVoucher } = renderers;
    if (
      !renderBoss ||
      !renderTag ||
      !renderVoucher ||
      !search.createSearchUI ||
      typeof createElement !== "function" ||
      typeof cleanSummaryLine !== "function" ||
      typeof setupDragScroll !== "function" ||
      typeof getFaceInfoForSegment !== "function" ||
      typeof getSummaryEmojisForText !== "function" ||
      typeof translateGameText !== "function" ||
      typeof setupPointerDragScroll !== "function"
    ) {
      console.error("Critical dependencies missing; aborting UI init.");
      return;
    }

    // Create search UI
    const { container: searchContainer, filterPanel } = search.createSearchUI();
    const searchFloatingWindow =
      document.getElementById("searchFloatingWindow") || createElement("div");
    searchFloatingWindow.id = "searchFloatingWindow";
    if (!searchFloatingWindow.parentElement) {
      document.body.appendChild(searchFloatingWindow);
    }
    searchFloatingWindow.replaceChildren(searchContainer, filterPanel);

    // Create ante navigation section (between config and results)
    document.getElementById("anteNavSection")?.remove();
    anteNavSection = createElement("div", "anteNavSection");
    anteNavSection.id = "anteNavSection";
    const anteNavHeader = createElement("div", "anteNavHeader");
    anteNavHeader.append(
      createElement("span", "anteNavTitle", t("ui.ante_navigation")),
      createElement("span", "anteNavHint", t("ui.tap_to_jump"))
    );
    anteNavButtons = createElement("div", "anteNavButtons");
    anteNavSection.append(anteNavHeader, anteNavButtons);
    const configContainer = document.querySelector(".container");
    if (configContainer?.parentNode) {
      configContainer.insertAdjacentElement("afterend", anteNavSection);
    } else {
      document.body.appendChild(anteNavSection);
    }

    // Create main containers
    document.getElementById("scrollingContainer")?.remove();
    scrollingContainer = createElement("div");
    scrollingContainer.id = "scrollingContainer";
    if (anteNavSection?.parentNode) {
      anteNavSection.insertAdjacentElement("afterend", scrollingContainer);
    } else {
      document.body.appendChild(scrollingContainer);
    }
    search.setSearchScope?.(scrollingContainer);

    document.getElementById("paginationContainer")?.remove();
    paginationContainer = createElement("div");
    paginationContainer.id = "paginationContainer";
    if (scrollingContainer?.parentNode) {
      scrollingContainer.insertAdjacentElement("afterend", paginationContainer);
    } else {
      document.body.appendChild(paginationContainer);
    }

    const getTrackingTermsActive = () => {
      return global.hasActiveTrackingItems?.() || false;
    };

    // Connect search to card filter updates
    if (search.onSearchChange) {
      trackingTermsActive = getTrackingTermsActive();
      search.onSearchChange(() => {
        cards.triggerFilterUpdate?.();
        // Skip when emoji click handler is managing the full pipeline
        if (global._emojiSyncActive) return;
        const nextTrackingState = getTrackingTermsActive();
        if (nextTrackingState === trackingTermsActive) return;
        trackingTermsActive = nextTrackingState;
        var savedScrollY = global.scrollY;
        global.onTrackingTermsStateChange?.(trackingTermsActive);
        renderCurrentPage({ skipScroll: true });
        renderAnteNavigation();
        if (global.scrollY !== savedScrollY) global.scrollTo(0, savedScrollY);
      });
    }

    /**
     * Extract shop queues from raw analysis output
     */
    function extractShopQueues(text) {
      if (text === lastQueueSource) return lastQueueParsed;

      const queues = [];
      const regex = /==ANTE \d+==[\s\S]*?(?=(?:==ANTE \d+==|$))/g;
      const matches = text.match(regex);

      if (matches) {
        matches.forEach((match) => {
          const titleMatch = match.match(/==ANTE \d+==/);
          const title = titleMatch ? titleMatch[0] : "Untitled";
          const boss = (match.match(/Boss: (.+)/) || [])[1]?.trim() || "";
          const voucher = (match.match(/Voucher: (.+)/) || [])[1]?.trim() || "";
          const tags = (match.match(/Tags: (.+)/) || [])[1]?.trim().split(",").map((t) => t.trim()) || [];
          const queue = (match.match(/Shop Queue:([\s\S]*?)(?=Packs:|$)/) || [])[1]
            ?.trim().split("\n").filter((l) => l.trim()) || [];
          const packsList = (match.match(/Packs:([\s\S]*?)(?=(?:==ANTE \d+==|$))/) || [])[1]
            ?.trim().split("\n").filter((l) => l.trim()) || [];

          queues.push({ title, queue, boss, voucher, tags, packs: packsList });
        });
      }

      lastQueueSource = text;
      lastQueueParsed = queues;
      return queues;
    }

    function getAnteNumberFromTitle(title) {
      const match = String(title || "").match(/ANTE\s*(\d+)/i);
      return match ? Number(match[1]) : NaN;
    }

    function getAnalyzedAnteNumbers() {
      const analyzed = allShopQueues
        .map(({ title }) => getAnteNumberFromTitle(title))
        .filter(Number.isFinite);
      return [...new Set(analyzed)].sort((a, b) => a - b);
    }

    function isNearbySummariesEnabled() {
      var hasManualSearch = (document.getElementById("searchInput")?.value?.trim().length > 0) && (global.lastAugmentedSummary?.size > 0);
      return global.summaryNearbyVisible !== false && (trackingTermsActive || hasManualSearch);
    }

    function renderAnteNavigation() {
      if (!anteNavSection || !anteNavButtons) return;
      const anteList = [...new Set(
        allShopQueues
          .map((item) => getAnteNumberFromTitle(item?.title))
          .filter(Number.isFinite)
      )];
      anteNavButtons.innerHTML = "";
      if (!anteList.length) {
        anteNavSection.style.display = "none";
        return;
      }
      anteNavSection.style.display = "";
      const pageAntes = new Set(
        allShopQueues
          .slice(currentPageIndex * ANTES_PER_PAGE, (currentPageIndex + 1) * ANTES_PER_PAGE)
          .map((item) => getAnteNumberFromTitle(item?.title))
          .filter(Number.isFinite)
      );
      anteList.forEach((anteNum) => {
        const btn = Object.assign(createElement("button", "anteNavButton", `${t("ui.ante")} ${anteNum}`), {
          type: "button",
        });
        btn.classList.toggle("is-current-page", pageAntes.has(anteNum));
        btn.addEventListener("click", () => global.goToAntePage?.(anteNum));
        anteNavButtons.appendChild(btn);
      });
    }

    /** Render mini summaries for nearby antes */
    function renderMiniSummaries(anteNum, container, analyzedAntes) {
      const summaryLookup = global.lastSummariesByAnte instanceof Map ? global.lastSummariesByAnte : null;
      const wrapper = createElement("div", "miniSummaryWrapper");
      wrapper.appendChild(createElement("div", "miniSummaryLabel", t("ui.nearby_summaries")));
      const list = createElement("div", "miniSummaryList");
      const anteKeys = (() => {
        const futureAntes = analyzedAntes
          .filter((n) => Number.isFinite(n) && n > anteNum)
          .sort((a, b) => a - b)
          .slice(0, 3);
        return [anteNum, ...futureAntes];
      })();

      anteKeys.forEach((anteKey) => {
        const row = createElement("div", "miniSummaryEntry");
        const anteSpan = createElement("span", "miniSummaryAnte", `${t("ui.ante")} ${anteKey}`);
        const textSpan = createElement("span", "miniSummaryText");
        const lookupText = summaryLookup?.get(anteKey);
        const rawText = lookupText ? (cleanSummaryLine(lookupText) || lookupText) : t("ui.no_summary_yet");
        if (typeof global.renderSummarySegments === "function") {
          global.renderSummarySegments(rawText, textSpan, "miniSummary");
        } else {
          textSpan.textContent = rawText;
        }

        row.append(anteSpan, textSpan);
        const popup = createElement("div", "miniSummaryPopup");
        popup.append(Object.assign(anteSpan.cloneNode(true), { className: "miniSummaryAnte miniSummaryPopupAnte" }), Object.assign(textSpan.cloneNode(true), { className: "miniSummaryText miniSummaryTextFull" }));
        row.appendChild(popup);

        const dragState = setupPointerDragScroll?.(textSpan) || { isDragging: () => false };
        row.addEventListener("click", (e) => { e.stopPropagation(); if (dragState.isDragging()) return; document.querySelectorAll(".miniSummaryPopup.visible").forEach((el) => el.classList.remove("visible")); !popup.classList.contains("visible") && popup.classList.add("visible"); });
        popup.addEventListener("click", (e) => { e.stopPropagation(); popup.classList.remove("visible"); });
        list.appendChild(row);
      });
      wrapper.appendChild(list);
      container.appendChild(wrapper);
    }

    /** Render a single ante's content */
    function renderAnteQueue({ title, queue, boss, voucher, tags, packs: packsList }, analyzedAntes) {
      const container = createElement("div", "queueContainer");
      const info = createElement("div", "queueInfo");
      const metaColumn = createElement("div", "queueMetaColumn");

      // Title with consistent ante number color
      const titleEl = createElement("div", "queueTitle anteTitle");
      const cleanTitle = (title.match(/ANTE\s*\d+/i) || [title.replace(/=+/g, "").trim()])[0];
      const match = cleanTitle.match(/^(ANTE)\s*(\d+)/i);
      const anteNum = match ? parseInt(match[2], 10) : null;
      if (match) {
        titleEl.innerHTML = `${t("ui.ante")} <span class="anteNum">${match[2]}</span>`;
        container.dataset.ante = String(anteNum);
      } else titleEl.textContent = cleanTitle;
      metaColumn.appendChild(titleEl);

      // Helper for meta blocks with canvas
      const makeMetaBlock = (label, items, containerClass, nameClass, canvasSize, renderFn) => {
        const block = createElement("div", "metaBlock");
        block.innerHTML = `<b>${label}</b>`;
        const itemsContainer = createElement("div", containerClass);
        const itemClassByContainer = {
          voucherContainer: "voucherContainer",
          tagsContainer: "tagContainer",
          bossContainer: "bossContainer",
        };
        items.forEach((item) => {
          const itemContainer = createElement("div", itemClassByContainer[containerClass] || containerClass);
          const canvas = Object.assign(document.createElement("canvas"), { width: canvasSize[0], height: canvasSize[1] });
          renderFn(canvas, item);
          const localizedName = translateGameText(item);
          const nameEl = createElement("div", nameClass, localizedName);
          nameEl.dataset.enName = String(item || "");
          nameEl.dataset.originalText = String(item || "");
          const emojis = getSummaryEmojisForText?.(item) || [];
          if (emojis.length) {
            itemContainer.dataset.summaryEmojis = emojis.join(",");
          }
          itemContainer.append(canvas, nameEl);
          itemsContainer.appendChild(itemContainer);
        });
        itemsContainer.dataset.searchText = items.join(" ");
        block.appendChild(itemsContainer);
        return block;
      };

      // Meta row
      const metaRow = createElement("div", "queueMetaRow");
      metaRow.appendChild(makeMetaBlock(t("ui.voucher"), voucher ? [voucher] : [], "voucherContainer", "voucherName", [84, 112], renderVoucher));
      metaRow.appendChild(makeMetaBlock(t("ui.tags"), tags, "tagsContainer", "tagName", [34, 34], renderTag));
      metaRow.appendChild(makeMetaBlock(t("ui.boss"), boss ? [boss] : [], "bossContainer", "bossName", [34, 34], renderBoss));
      metaColumn.appendChild(metaRow);
      info.appendChild(metaColumn);

      if (anteNum !== null) {
        renderMiniSummaries(anteNum, info, analyzedAntes);
        // Hide wrapper when nearby summaries are not enabled; DOM stays for in-place refresh
        if (!isNearbySummariesEnabled()) {
          const w = info.querySelector(".miniSummaryWrapper");
          if (w) w.style.display = "none";
        }
      }
      container.appendChild(info);

      // Card set with controls
      const cardSet = createElement("div", "cardSet");
      const cardSetHeader = createElement("div", "cardSetHeader");
      const autoTextOnly = Boolean(global.__analysisAutoTextOnly) || Boolean(global.cardTextOnlyMode);
      let queueNodes = cards.buildQueueNodes?.(queue, { textOnly: autoTextOnly }) || [];
      const cardList = createElement("div", "cardList scrollable no-select");

      const rerender = () => { cards.renderCardGroups?.(cardList, queueNodes); search.searchAndHighlight?.(); };
      const layout = cards.createLayoutToggle?.(cardList, rerender) || { button: createElement("button"), setMode: () => {}, getMode: () => "scroll" };
      const groupControls = cards.createGroupControls?.(rerender) || createElement("div");
      const topControls = createElement("div", "cardSetTopControls");
      const topLeft = createElement("div", "cardSetTopLeft");
      const topRight = createElement("div", "cardSetTopRight");
      layout.button.classList.add("cardSetLayoutToggle");
      groupControls.classList.add("cardSetGroupControls");
      let hideNonHighlight = false;
      const hideToggle = Object.assign(createElement("button", "cardSetToggle cardSetIconToggle cardSetHitFilterToggle", ""), { type: "button" });
      const applyFilter = () => cards.applyGroupHighlightFilter?.(cardList, hideNonHighlight);
      const syncHideToggle = () => {
        const filtered = hideNonHighlight;
        hideToggle.textContent = filtered ? "◉" : "◎";
        hideToggle.classList.toggle("active", filtered);
        const actionLabel = filtered ? t("ui.show_all_groups") : t("ui.hide_non_hit");
        hideToggle.title = actionLabel;
        hideToggle.setAttribute("aria-label", actionLabel);
      };
      syncHideToggle();

      topLeft.append(layout.button, hideToggle);
      topRight.append(groupControls);
      topControls.append(topLeft, topRight);
      cardSetHeader.appendChild(topControls);

      // Per-ante controls
      const cardsInput = Object.assign(createElement("input"), { type: "number", min: "1", max: "9999", value: "1000", className: "anteCardsInput" });
      const recalcBtn = Object.assign(createElement("button", "cardSetToggle anteRecalcButton", t("ui.cards_this_ante")), { type: "button" });
      const restoreBtn = Object.assign(createElement("button", "cardSetToggle anteRestoreButton", t("ui.restore")), { type: "button" });
      const jumpBtn = Object.assign(createElement("button", "cardSetToggle anteJumpButton", t("ui.jump_to_card")), { type: "button" });
      const jumpInput = Object.assign(createElement("input"), { type: "number", min: "1", max: String(queue.length || 1), value: "1", className: "anteJumpInput" });
      jumpBtn.title = t("ui.jump_to_card");
      jumpBtn.setAttribute("aria-label", t("ui.jump_to_card"));

      const recalcControls = createElement("div", "cardSetRunControls");
      const recalcLeft = createElement("div", "cardSetRunLeft");
      const recalcRight = createElement("div", "cardSetRunRight");
      const jumpCombo = createElement("div", "cardSetComboControl cardSetJumpCombo");
      const recalcCombo = createElement("div", "cardSetComboControl cardSetRecalcCombo");
      jumpCombo.append(jumpInput, jumpBtn);
      recalcCombo.append(cardsInput, recalcBtn);
      recalcLeft.append(jumpCombo);
      recalcRight.append(createElement("span", "cardSetInlineLabel", t("ui.cards_this_ante_label")), recalcCombo, restoreBtn);
      recalcControls.append(recalcLeft, recalcRight);
      cardSetHeader.appendChild(recalcControls);
      cardSet.append(cardSetHeader, cardList);
      container.appendChild(cardSet);

      cards.onGroupRender?.(() => cards.renderCardGroups?.(cardList, queueNodes));
      cards.onGroupFilterUpdate?.(applyFilter);
      cards.renderCardGroups?.(cardList, queueNodes);
      applyFilter();

      const syncJumpRange = () => {
        const max = Math.max(1, queueNodes.length);
        jumpInput.max = String(max);
        const current = Number(jumpInput.value) || 1;
        if (current > max) jumpInput.value = String(max);
      };
      syncJumpRange();

      const jumpToCardSequence = () => {
        const rawSeq = Math.floor(Number(jumpInput.value));
        if (!Number.isFinite(rawSeq) || rawSeq < 1) return;
        const maxCards = Math.max(1, Number(jumpInput.max) || queueNodes.length || 1);
        const seq = Math.min(Math.max(rawSeq, 1), maxCards);
        if (seq !== rawSeq) jumpInput.value = String(seq);
        const groupSize = Number(cards.getGroupSize?.()) || Number(cards.GROUP_SIZES?.[0]) || 2;
        const targetIndex = Math.floor((seq - 1) / groupSize);
        const groups = cardList.querySelectorAll(".cardGroup");
        const target = groups[targetIndex];
        if (!target) return;

        if (cardList.classList.contains("scrollable")) {
          const left = Math.max(0, target.offsetLeft - cardList.offsetLeft);
          cardList.scrollTo({ left, behavior: "smooth" });
          return;
        }

        target.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" });
      };

      jumpBtn.addEventListener("click", jumpToCardSequence);
      jumpInput.addEventListener("keydown", (e) => {
        if (e.key !== "Enter") return;
        e.preventDefault();
        jumpToCardSequence();
      });

      hideToggle.addEventListener("click", () => {
        hideNonHighlight = !hideNonHighlight;
        syncHideToggle();
        applyFilter();
      });

      const runCompute = (btn, textOnly, mode) => {
        if (btn.disabled || !anteNum) return;
        const limit = Math.max(0, Number(cardsInput.value) || 0);
        if (!limit || !global.computeSingleAnteQueue) return;
        setButtonLoadingState?.(btn, true);
        setTimeout(() => {
          try {
            const result = global.computeSingleAnteQueue(anteNum, limit);
            queueNodes = cards.buildQueueNodes?.(result || [], { textOnly }) || [];
            layout.setMode(mode);
            rerender();
            applyFilter();
            syncJumpRange();
            // Mark if we're in high card count mode (recalc) or normal mode (restore)
            container.dataset.highCardMode = (btn === recalcBtn) ? "true" : "";
          } catch (err) {
            console.error("Per-ante compute failed at ante " + anteNum + ":", err);
            var result = global.formatAnalysisError?.(err.message || String(err), anteNum);
            alert(result ? result.message : t("ui.analyze_failed"));
          } finally {
            setButtonLoadingState?.(btn, false);
          }
        }, 0);
      };

      // Store reference for settings-triggered re-render
      recalcBtn.dataset.anteRecalc = "true";

      recalcBtn.addEventListener("click", () => runCompute(recalcBtn, Boolean(window.cardTextOnlyMode), "grid"));
      restoreBtn.addEventListener("click", () => {
        // Restore original queue from analysis, reset cardsInput to global value
        const globalCards = document.getElementById("cardsPerAnte");
        if (globalCards) cardsInput.value = globalCards.value;
        queueNodes = cards.buildQueueNodes?.(queue, { textOnly: false }) || [];
        layout.setMode("scroll");
        rerender();
        applyFilter();
        syncJumpRange();
        container.dataset.highCardMode = "";
      });

      // Packs section
      if (packsList.length > 0 && packs.createPackSection) {
        const packSection = packs.createPackSection(packsList, () => {
          if (search.searchAndHighlight) search.searchAndHighlight();
        });
        container.append(packSection.header, packSection.toggles, packSection.container);
      }

      return container;
    }

    /** Render current page of shop queues */
    function renderCurrentPage(options = {}) {
      const skipScroll = Boolean(options.skipScroll);
      const totalPages = Math.ceil(allShopQueues.length / ANTES_PER_PAGE);
      const analyzedAntes = getAnalyzedAnteNumbers();
      scrollingContainer.innerHTML = "";
      cards.clearCallbacks?.();
      if (!totalPages) {
        paginationContainer.innerHTML = "";
        paginationContainer.style.display = "none";
        renderAnteNavigation();
        return;
      }

      paginationContainer.style.display = totalPages <= 1 ? "none" : "flex";
      allShopQueues
        .slice(currentPageIndex * ANTES_PER_PAGE, (currentPageIndex + 1) * ANTES_PER_PAGE)
        .forEach((q) => scrollingContainer.appendChild(renderAnteQueue(q, analyzedAntes)));
      renderAnteNavigation();
      search.markSearchDomDirty?.();

      if (!skipScroll) {
        window.scrollTo({ top: window.scrollY + scrollingContainer.getBoundingClientRect().top - 12, behavior: "smooth" });
      }
      scrollingContainer.querySelectorAll(".scrollable").forEach(setupDragScroll);
      requestAnimationFrame(() => {
        var rafScrollY = skipScroll ? global.scrollY : null;
        search.searchAndHighlight?.();
        global.applyEmojiFilter?.();
        if (rafScrollY !== null && global.scrollY !== rafScrollY) {
          global.scrollTo(0, rafScrollY);
        }
      });

      if (global.pendingScrollToResults) { global.pendingScrollToResults = false; requestAnimationFrame(() => scrollingContainer?.scrollIntoView({ behavior: "smooth", block: "start" })); }
    }

    /** Render pagination controls */
    function renderPaginationControls() {
      const totalPages = Math.ceil(allShopQueues.length / ANTES_PER_PAGE);
      paginationContainer.innerHTML = "";
      paginationContainer.style.display = totalPages <= 1 ? "none" : "flex";
      const findAnteContainer = (ante) => {
        const anteText = String(ante);
        if (!scrollingContainer) return null;
        return (
          scrollingContainer.querySelector(`.queueContainer[data-ante="${anteText}"]`) ||
          [...scrollingContainer.querySelectorAll(".queueContainer")].find((qc) => {
            const textAnte = qc.querySelector(".queueTitle .anteNum")?.textContent?.trim();
            return textAnte === anteText;
          }) ||
          null
        );
      };

      const scrollAnteIntoView = (ante, options = {}) => {
        const behavior = options.behavior || "auto";
        const target = findAnteContainer(ante);
        if (!target) return false;
        const targetTop = Math.max(0, window.scrollY + target.getBoundingClientRect().top);
        window.scrollTo({ top: targetTop, behavior });
        return true;
      };

      const goToPage = (page, options = {}) => {
        const p = Math.max(0, Math.min(page, totalPages - 1));
        const skipScroll = Boolean(options.skipScroll);
        if (p !== currentPageIndex) {
          currentPageIndex = p;
          renderPaginationControls();
          renderCurrentPage({ skipScroll: false }); // Always scroll when changing pages
        } else if (!skipScroll) {
          renderCurrentPage();
        }
      };

      global.goToAntePage = (ante) => {
        if (!Number.isFinite(ante) || !allShopQueues.length) return;
        const idx = allShopQueues.findIndex(({ title }) => new RegExp(`ANTE\\s+${ante}\\b`, "i").test(title || ""));
        if (idx === -1) return;
        const pageIndex = Math.floor(idx / ANTES_PER_PAGE);
        const samePage = pageIndex === currentPageIndex;
        goToPage(pageIndex, { skipScroll: true });
        const alignToTop = () => scrollAnteIntoView(ante, { behavior: "auto" });
        if (!alignToTop()) {
          setTimeout(alignToTop, 0);
        }
        if (!samePage) {
          // Correction passes after page-switch layout work.
          requestAnimationFrame(alignToTop);
          setTimeout(alignToTop, 80);
        }
      };

      if (totalPages <= 1) return;

      const makeBtn = (text, disabled, onClick) => { const btn = Object.assign(createElement("button", "paginationButton", text), { type: "button", disabled }); btn.addEventListener("click", () => { if (!btn.disabled) { setButtonLoadingState?.(btn, true); setTimeout(onClick, 0); } }); return btn; };
      const prevBtn = makeBtn(t("ui.previous"), currentPageIndex === 0, () => goToPage(currentPageIndex - 1));
      const nextBtn = makeBtn(t("ui.next"), currentPageIndex >= totalPages - 1, () => goToPage(currentPageIndex + 1));

      const pageSelect = createElement("select", "paginationInfoSelect");
      for (let i = 0; i < totalPages; i++) {
        const pageSlice = allShopQueues.slice(i * ANTES_PER_PAGE, (i + 1) * ANTES_PER_PAGE);
        const anteNums = pageSlice
          .map((item) => getAnteNumberFromTitle(item?.title))
          .filter(Number.isFinite);
        const startAnte = anteNums[0];
        const endAnte = anteNums[anteNums.length - 1];
        const rangeLabel = Number.isFinite(startAnte)
          ? (startAnte === endAnte
            ? ` (${t("ui.ante")} ${startAnte})`
            : ` (${t("ui.ante")} ${startAnte}-${endAnte})`)
          : "";

        pageSelect.appendChild(
          Object.assign(
            createElement("option", null, `${t("ui.page")} ${i + 1}${rangeLabel}`),
            { value: i, selected: i === currentPageIndex }
          )
        );
      }
      pageSelect.addEventListener("change", (e) => { const p = Number(e.target.value); if (p !== currentPageIndex) { pageSelect.disabled = true; setTimeout(() => goToPage(p), 0); } });

      const info = createElement("div", "paginationInfo");
      info.append(pageSelect, createElement("span", "paginationInfoTotal", `/ ${totalPages}`));
      paginationContainer.append(prevBtn, info, nextBtn);
    }

    /**
     * Main display function
     */
    function displayShopQueues() {
      const text = global.lastRawOutput || "";
      allShopQueues = extractShopQueues(text);
      trackingTermsActive = getTrackingTermsActive();
      global.onTrackingTermsStateChange?.(trackingTermsActive);
      currentPageIndex = 0;
      renderPaginationControls();
      renderCurrentPage();
    }

    // Initialize
    displayShopQueues();
    global.refreshShopDisplay = displayShopQueues;
    global.setNearbySummariesVisible = (flag) => {
      global.summaryNearbyVisible = flag !== false;
      if (!allShopQueues.length) return;
      renderCurrentPage({ skipScroll: true });
    };

    // Close popups on outside click
    document.addEventListener("click", () => {
      document.querySelectorAll(".miniSummaryPopup.visible").forEach((el) => el.classList.remove("visible"));
    });

    // Expose emoji filter sync
    if (search.syncEmojiFilterToSearch) {
      global.syncEmojiFilterToSearch = search.syncEmojiFilterToSearch;
    }
  }

  // Set loading state on group buttons
  function setGroupButtonsLoading(flag) {
    if (typeof flag !== "boolean") return;
    const utils = global.BalatroUtils;
    if (!utils) return;
    document.querySelectorAll(".groupSizeButton").forEach((btn) => {
      if (utils.setButtonLoadingState) {
        utils.setButtonLoadingState(btn, flag);
      } else {
        btn.disabled = flag;
      }
    });
  }

  global.initShopUI = initShopUI;
  global.setGroupButtonsLoading = setGroupButtonsLoading;
})(window);
