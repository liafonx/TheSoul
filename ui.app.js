/**
 * ui.app.js - Main UI orchestrator
 * Coordinates modules: utils, search, cards, packs
 */
(function (global) {
  "use strict";

  const ANTES_PER_PAGE = 4;
  let currentPageIndex = 0;
  let allShopQueues = [];
  let paginationContainer = null;
  let scrollingContainer = null;
  let lastQueueSource = null;
  let lastQueueParsed = [];

  function initShopUI() {
    const t = (key) => global.BalatroI18n?.t ? global.BalatroI18n.t(key) : key;
    const utils = global.BalatroUtils || {};
    const search = global.BalatroSearch || {};
    const cards = global.BalatroCards || {};
    const packs = global.BalatroPacks || {};
    const renderers = global.BalatroRenderers || {};

    // Destructure utilities with inline fallbacks for robustness
    const createElement = utils.createElement || ((tag, cls, txt) => Object.assign(document.createElement(tag), cls && { className: cls }, txt !== undefined && { textContent: txt }));
    const cleanSummaryLine = utils.cleanSummaryLine || ((raw) => raw.replace(/^\s*ante\s*\d+\s*[：:]\s*/i, "").replace(/^\s*\d+\s*[：:]\s*/, "").trim() || raw);
    const setupDragScroll = utils.setupDragScroll || (() => {});
    const setButtonLoadingState = utils.setButtonLoadingState || ((btn, flag) => btn && (btn.disabled = Boolean(flag)));
    const getFaceInfoForSegment = utils.getFaceInfoForSegment || (() => null);
    const getSummaryEmojisForText = utils.getSummaryEmojisForText || (() => []);
    const translateGameText = utils.translateGameText || ((text) => text);
    const setupPointerDragScroll = utils.setupPointerDragScroll || (() => ({ isDragging: () => false }));

    const { renderBoss, renderTag, renderVoucher } = renderers;
    if (!renderBoss || !renderTag || !renderVoucher || !search.createSearchUI) {
      console.error("Critical dependencies missing; aborting UI init.");
      return;
    }

    // Create search UI
    const { container: searchContainer, filterPanel } = search.createSearchUI();
    document.body.appendChild(searchContainer);
    document.body.appendChild(filterPanel);

    // Create main containers
    scrollingContainer = createElement("div");
    scrollingContainer.id = "scrollingContainer";
    document.body.appendChild(scrollingContainer);

    paginationContainer = createElement("div");
    paginationContainer.id = "paginationContainer";
    document.body.appendChild(paginationContainer);

    // Connect search to card filter updates
    if (search.onSearchChange && cards.triggerFilterUpdate) {
      search.onSearchChange(() => cards.triggerFilterUpdate());
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

    function getAnalyzedAnteNumbers() {
      const analyzed = allShopQueues
        .map(({ title }) => {
          const match = String(title || "").match(/ANTE\s*(\d+)/i);
          return match ? Number(match[1]) : NaN;
        })
        .filter(Number.isFinite);
      return [...new Set(analyzed)].sort((a, b) => a - b);
    }

    function isNearbySummariesEnabled() {
      return global.summaryNearbyVisible !== false;
    }

    /** Render mini summaries for nearby antes */
    function renderMiniSummaries(anteNum, container, analyzedAntes) {
      const summaryLookup = global.lastSummariesByAnte instanceof Map ? global.lastSummariesByAnte : null;
      const wrapper = createElement("div", "miniSummaryWrapper");
      wrapper.appendChild(createElement("div", "miniSummaryLabel", t("Nearby Summaries")));
      const list = createElement("div", "miniSummaryList");
      const anteKeys = analyzedAntes.length
        ? analyzedAntes
          .slice()
          .sort((a, b) => (Math.abs(a - anteNum) - Math.abs(b - anteNum)) || (a - b))
          .slice(0, 4)
          .sort((a, b) => a - b)
        : [anteNum];

      // Helper to render text with segments and delimiters
      const renderSegments = (text, textSpan) => {
        cleanSummaryLine(text).split("、").forEach((seg, idx, arr) => {
          const trimmed = seg.trim();
          if (!trimmed) return;
          trimmed.split(/(\|)/).forEach((chunk) => {
            if (!chunk) return;
            if (chunk === "|") { textSpan.appendChild(createElement("span", "miniSummaryPipe", " | ")); return; }
            const part = createElement("span", "miniSummaryItem", chunk);
            part.dataset.originalText = chunk;
            const info = getFaceInfoForSegment?.(chunk);
            if (info) {
              part.dataset.faceEmoji = info.emoji;
              chunk.includes("‼️") ? part.classList.add("negativeFace") : info.color && (part.style.color = info.color);
            }
            const emojis = getSummaryEmojisForText?.(chunk) || [];
            if (emojis.length) {
              part.dataset.summaryEmojis = emojis.join(",");
            }
            textSpan.appendChild(part);
          });
          if (idx < arr.length - 1) { textSpan.appendChild(createElement("span", "miniSummaryDelimiter", "、")); textSpan.appendChild(document.createTextNode(" ")); }
        });
      };

      anteKeys.forEach((anteKey) => {
        const row = createElement("div", "miniSummaryEntry");
        const anteSpan = createElement("span", "miniSummaryAnte", `${t("Ante")} ${anteKey}`);
        const textSpan = createElement("span", "miniSummaryText");
        renderSegments(summaryLookup?.get(anteKey) || `${t("Ante")} ${anteKey}: ${t("No summary yet")}`, textSpan);

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

      // Title with color-coded ante number
      const titleEl = createElement("div", "queueTitle anteTitle");
      const cleanTitle = (title.match(/ANTE\s*\d+/i) || [title.replace(/=+/g, "").trim()])[0];
      const match = cleanTitle.match(/^(ANTE)\s*(\d+)/i);
      const anteNum = match ? parseInt(match[2], 10) : null;
      if (match) {
        const numClass = `anteNum${anteNum >= 32 ? " anteNumRed" : anteNum >= 22 ? " anteNumOrange" : anteNum >= 12 ? " anteNumYellow" : ""}`;
        titleEl.innerHTML = `${t("Ante")} <span class="${numClass}">${match[2]}</span>`;
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
      metaRow.appendChild(makeMetaBlock(t("Voucher"), voucher ? [voucher] : [], "voucherContainer", "voucherName", [84, 112], renderVoucher));
      metaRow.appendChild(makeMetaBlock(t("Tags"), tags, "tagsContainer", "tagName", [34, 34], renderTag));
      metaRow.appendChild(makeMetaBlock(t("Boss"), boss ? [boss] : [], "bossContainer", "bossName", [34, 34], renderBoss));
      metaColumn.appendChild(metaRow);
      info.appendChild(metaColumn);

      if (anteNum !== null && isNearbySummariesEnabled()) renderMiniSummaries(anteNum, info, analyzedAntes);
      container.appendChild(info);

      // Card set with controls
      const cardSet = createElement("div", "cardSet");
      const cardSetHeader = createElement("div", "cardSetHeader");
      let queueNodes = cards.buildQueueNodes?.(queue, { textOnly: false }) || [];
      const cardList = createElement("div", "cardList scrollable no-select");

      const rerender = () => { cards.renderCardGroups?.(cardList, queueNodes); search.searchAndHighlight?.(); };
      const layout = cards.createLayoutToggle?.(cardList, rerender) || { button: createElement("button"), setMode: () => {}, getMode: () => "scroll" };
      cardSetHeader.append(layout.button, cards.createGroupControls?.(rerender) || createElement("div"));

      // Per-ante controls
      const cardsInput = Object.assign(createElement("input"), { type: "number", min: "1", max: "9999", value: "1000", className: "anteCardsInput" });
      const recalcBtn = Object.assign(createElement("button", "cardSetToggle anteRecalcButton", t("Re-run")), { type: "button" });
      const restoreBtn = Object.assign(createElement("button", "cardSetToggle anteRestoreButton", t("Restore")), { type: "button" });
      let hideNonHighlight = false;
      const hideToggle = Object.assign(createElement("button", "cardSetToggle", t("Only groups with hits")), { type: "button" });
      const applyFilter = () => cards.applyGroupHighlightFilter?.(cardList, hideNonHighlight);

      const recalcControls = createElement("div", "groupSizeControls");
      recalcControls.append(createElement("span", "groupSizeLabel", t("Cards (this Ante):")), cardsInput, recalcBtn, restoreBtn, hideToggle);
      cardSetHeader.appendChild(recalcControls);
      cardSet.append(cardSetHeader, cardList);
      container.appendChild(cardSet);

      cards.onGroupRender?.(() => cards.renderCardGroups?.(cardList, queueNodes));
      cards.onGroupFilterUpdate?.(applyFilter);
      cards.renderCardGroups?.(cardList, queueNodes);
      applyFilter();

      hideToggle.addEventListener("click", () => { hideNonHighlight = !hideNonHighlight; hideToggle.textContent = hideNonHighlight ? t("Show all groups") : t("Only groups with hits"); applyFilter(); });

      const runCompute = (btn, textOnly, mode) => {
        if (btn.disabled || !anteNum) return;
        const limit = Math.max(0, Number(textOnly ? cardsInput.value : document.getElementById("cardsPerAnte")?.value) || 0);
        if (!limit || !global.computeSingleAnteQueue) return;
        setButtonLoadingState?.(btn, true);
        setTimeout(() => { try { queueNodes = cards.buildQueueNodes?.(global.computeSingleAnteQueue(anteNum, limit) || [], { textOnly }) || []; layout.setMode(mode); rerender(); } finally { setButtonLoadingState?.(btn, false); } }, 0);
      };
      recalcBtn.addEventListener("click", () => runCompute(recalcBtn, true, "grid"));
      restoreBtn.addEventListener("click", () => runCompute(restoreBtn, false, "scroll"));

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
      if (!totalPages) { paginationContainer.innerHTML = ""; paginationContainer.style.display = "none"; return; }

      paginationContainer.style.display = totalPages <= 1 ? "none" : "flex";
      allShopQueues
        .slice(currentPageIndex * ANTES_PER_PAGE, (currentPageIndex + 1) * ANTES_PER_PAGE)
        .forEach((q) => scrollingContainer.appendChild(renderAnteQueue(q, analyzedAntes)));

      if (!skipScroll) {
        window.scrollTo({ top: window.scrollY + scrollingContainer.getBoundingClientRect().top - 12, behavior: "smooth" });
      }
      scrollingContainer.querySelectorAll(".scrollable").forEach(setupDragScroll);
      search.searchAndHighlight?.();
      global.applySummaryEmojiFilter?.();

      if (global.pendingScrollToResults) { global.pendingScrollToResults = false; requestAnimationFrame(() => scrollingContainer?.scrollIntoView({ behavior: "smooth", block: "start" })); }
    }

    /** Render pagination controls */
    function renderPaginationControls() {
      const totalPages = Math.ceil(allShopQueues.length / ANTES_PER_PAGE);
      paginationContainer.innerHTML = "";
      paginationContainer.style.display = totalPages <= 1 ? "none" : "flex";
      if (totalPages <= 1) return;

      const goToPage = (page) => { const p = Math.max(0, Math.min(page, totalPages - 1)); if (p !== currentPageIndex) { currentPageIndex = p; renderPaginationControls(); renderCurrentPage(); } };
      global.goToAntePage = (ante) => { if (!Number.isFinite(ante) || !allShopQueues.length) return; const idx = allShopQueues.findIndex(({ title }) => new RegExp(`ANTE\\s+${ante}\\b`, "i").test(title || "")); if (idx !== -1) goToPage(Math.floor(idx / ANTES_PER_PAGE)); };

      const makeBtn = (text, disabled, onClick) => { const btn = Object.assign(createElement("button", "paginationButton", text), { type: "button", disabled }); btn.addEventListener("click", () => { if (!btn.disabled) { setButtonLoadingState?.(btn, true); setTimeout(onClick, 0); } }); return btn; };
      const prevBtn = makeBtn(t("Previous"), currentPageIndex === 0, () => goToPage(currentPageIndex - 1));
      const nextBtn = makeBtn(t("Next"), currentPageIndex >= totalPages - 1, () => goToPage(currentPageIndex + 1));

      const pageSelect = createElement("select", "paginationInfoSelect");
      for (let i = 0; i < totalPages; i++) pageSelect.appendChild(Object.assign(createElement("option", null, `${t("Page")} ${i + 1}`), { value: i, selected: i === currentPageIndex }));
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
