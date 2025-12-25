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

  /**
   * Fallback createElement function
   */
  function fallbackCreateElement(tag, className, text) {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (text !== undefined) el.textContent = text;
    return el;
  }

  /**
   * Fallback cleanSummaryLine function
   */
  function fallbackCleanSummaryLine(rawLine) {
    return rawLine
      .replace(/^\s*ante\s*\d+\s*[：:]\s*/i, "")
      .replace(/^\s*\d+\s*[：:]\s*/, "")
      .trim() || rawLine;
  }

  function initShopUI() {
    const utils = global.BalatroUtils || {};
    const search = global.BalatroSearch || {};
    const cards = global.BalatroCards || {};
    const packs = global.BalatroPacks || {};
    const renderers = global.BalatroRenderers || {};

    // Use fallbacks for potentially undefined functions
    const createElement = utils.createElement || fallbackCreateElement;
    const cleanSummaryLine = utils.cleanSummaryLine || fallbackCleanSummaryLine;
    const setupDragScroll = utils.setupDragScroll || (() => {});
    const setButtonLoadingState = utils.setButtonLoadingState || ((btn, flag) => {
      if (btn) btn.disabled = Boolean(flag);
    });
    const getFaceInfoForSegment = utils.getFaceInfoForSegment || (() => null);
    const setupPointerDragScroll = utils.setupPointerDragScroll || ((el) => ({ isDragging: () => false }));

    const { renderBoss, renderTag, renderVoucher } = renderers;

    // Validate critical dependencies
    if (!renderBoss || !renderTag || !renderVoucher) {
      console.error("Balatro render helpers missing; aborting UI init.");
      return;
    }

    // Validate search module
    if (!search.createSearchUI) {
      console.error("BalatroSearch.createSearchUI missing; aborting UI init.");
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

      return queues;
    }

    /**
     * Render mini summaries for nearby antes
     */
    function renderMiniSummaries(anteNum, container) {
      const summaryLookup = global.lastSummariesByAnte instanceof Map ? global.lastSummariesByAnte : null;

      const wrapper = createElement("div", "miniSummaryWrapper");
      const label = createElement("div", "miniSummaryLabel", "Nearby Summaries");
      wrapper.appendChild(label);

      const list = createElement("div", "miniSummaryList");

      for (let offset = 0; offset < 4; offset++) {
        const anteKey = anteNum + offset;
        const rawText = summaryLookup?.get(anteKey) || `Ante ${anteKey}: No summary yet`;

        const row = createElement("div", "miniSummaryEntry");
        const anteSpan = createElement("span", "miniSummaryAnte", `Ante ${anteKey}`);
        const textSpan = createElement("span", "miniSummaryText");

        const cleaned = cleanSummaryLine(rawText);
        const segments = cleaned.split("、");

        segments.forEach((seg, idx) => {
          const trimmed = seg.trim();
          if (!trimmed) return;

          const chunks = trimmed.split(/(\|)/);
          chunks.forEach((chunk) => {
            if (!chunk) return;
            if (chunk === "|") {
              textSpan.appendChild(createElement("span", "miniSummaryPipe", " | "));
              return;
            }

            const part = createElement("span", "miniSummaryItem", chunk);
            const info = getFaceInfoForSegment(chunk);
            if (info) {
              part.dataset.faceEmoji = info.emoji;
              if (chunk.includes("‼️")) {
                part.classList.add("negativeFace");
              } else if (info.color) {
                part.style.color = info.color;
              }
            }
            textSpan.appendChild(part);
          });

          if (idx < segments.length - 1) {
            textSpan.appendChild(createElement("span", "miniSummaryDelimiter", "、"));
            textSpan.appendChild(document.createTextNode(" "));
          }
        });

        row.append(anteSpan, textSpan);

        // Popup for full content
        const popup = createElement("div", "miniSummaryPopup");
        popup.append(
          Object.assign(anteSpan.cloneNode(true), { className: "miniSummaryAnte miniSummaryPopupAnte" }),
          Object.assign(textSpan.cloneNode(true), { className: "miniSummaryText miniSummaryTextFull" })
        );
        row.appendChild(popup);

        // Drag scroll on text span
        const dragState = setupPointerDragScroll(textSpan);

        row.addEventListener("click", (e) => {
          e.stopPropagation();
          if (dragState.isDragging()) return;
          const isOpen = popup.classList.contains("visible");
          document.querySelectorAll(".miniSummaryPopup.visible").forEach((el) => el.classList.remove("visible"));
          if (!isOpen) popup.classList.add("visible");
        });

        popup.addEventListener("click", (e) => {
          e.stopPropagation();
          popup.classList.remove("visible");
        });

        list.appendChild(row);
      }

      wrapper.appendChild(list);
      container.appendChild(wrapper);
    }

    /**
     * Render a single ante's content
     */
    function renderAnteQueue({ title, queue, boss, voucher, tags, packs: packsList }) {
      const container = createElement("div", "queueContainer");
      const info = createElement("div", "queueInfo");
      const metaColumn = createElement("div", "queueMetaColumn");

      // Title
      const titleEl = createElement("div", "queueTitle anteTitle");
      const cleanTitle = (title.match(/ANTE\s*\d+/i) || [title.replace(/=+/g, "").trim()])[0];
      const match = cleanTitle.match(/^(ANTE)\s*(\d+)/i);
      let anteNum = null;

      if (match) {
        anteNum = parseInt(match[2], 10);
        let numClass = "anteNum";
        if (anteNum >= 32) numClass += " anteNumRed";
        else if (anteNum >= 22) numClass += " anteNumOrange";
        else if (anteNum >= 12) numClass += " anteNumYellow";
        titleEl.innerHTML = `${match[1]} <span class="${numClass}">${match[2]}</span>`;
      } else {
        titleEl.textContent = cleanTitle;
      }
      metaColumn.appendChild(titleEl);

      // Meta row (voucher, tags, boss)
      const metaRow = createElement("div", "queueMetaRow");

      // Voucher
      const voucherBlock = createElement("div", "metaBlock");
      voucherBlock.innerHTML = "<b>Voucher</b>";
      if (voucher) {
        const voucherContainer = createElement("div", "voucherContainer");
        const voucherCanvas = document.createElement("canvas");
        voucherCanvas.width = 84;
        voucherCanvas.height = 112;
        renderVoucher(voucherCanvas, voucher);
        voucherContainer.append(voucherCanvas, createElement("div", "voucherName", voucher));
        voucherBlock.appendChild(voucherContainer);
      }
      metaRow.appendChild(voucherBlock);

      // Tags
      const tagsBlock = createElement("div", "metaBlock");
      tagsBlock.innerHTML = "<b>Tags</b>";
      const tagsContainer = createElement("div", "tagsContainer");
      tags.forEach((tag) => {
        const tagContainer = createElement("div", "tagContainer");
        const tagCanvas = document.createElement("canvas");
        tagCanvas.width = 34;
        tagCanvas.height = 34;
        renderTag(tagCanvas, tag);
        tagContainer.append(tagCanvas, createElement("div", "tagName", tag));
        tagsContainer.appendChild(tagContainer);
      });
      tagsBlock.appendChild(tagsContainer);
      metaRow.appendChild(tagsBlock);

      // Boss
      const bossBlock = createElement("div", "metaBlock");
      bossBlock.innerHTML = "<b>Boss</b>";
      if (boss) {
        const bossContainer = createElement("div", "bossContainer");
        const bossCanvas = document.createElement("canvas");
        bossCanvas.width = 34;
        bossCanvas.height = 34;
        renderBoss(bossCanvas, boss);
        bossContainer.append(bossCanvas, createElement("div", "bossName", boss));
        bossBlock.appendChild(bossContainer);
      }
      metaRow.appendChild(bossBlock);

      metaColumn.appendChild(metaRow);
      info.appendChild(metaColumn);

      // Mini summaries
      if (anteNum !== null) {
        renderMiniSummaries(anteNum, info);
      }

      container.appendChild(info);

      // Card set
      const cardSet = createElement("div", "cardSet");
      const cardSetHeader = createElement("div", "cardSetHeader");

      // Build queue nodes
      let queueNodes = cards.buildQueueNodes ? cards.buildQueueNodes(queue, { textOnly: false }) : [];

      const cardList = createElement("div", "cardList scrollable no-select");

      // Layout toggle
      const layout = cards.createLayoutToggle ? cards.createLayoutToggle(cardList, () => {
        if (cards.renderCardGroups) cards.renderCardGroups(cardList, queueNodes);
        if (search.searchAndHighlight) search.searchAndHighlight();
      }) : { button: createElement("button"), setMode: () => {}, getMode: () => "scroll" };
      cardSetHeader.appendChild(layout.button);

      // Group size controls
      const groupControls = cards.createGroupControls ? cards.createGroupControls(() => {
        if (cards.renderCardGroups) cards.renderCardGroups(cardList, queueNodes);
        if (search.searchAndHighlight) search.searchAndHighlight();
      }) : createElement("div");
      cardSetHeader.appendChild(groupControls);

      // Per-ante recalc controls
      const recalcControls = createElement("div", "groupSizeControls");
      const inputLabel = createElement("span", "groupSizeLabel", "Cards (this Ante):");
      const cardsInput = createElement("input");
      cardsInput.type = "number";
      cardsInput.min = "1";
      cardsInput.max = "9999";
      cardsInput.value = "1000";
      cardsInput.className = "anteCardsInput";

      const recalcBtn = createElement("button", "cardSetToggle anteRecalcButton", "Re-run");
      recalcBtn.type = "button";

      const restoreBtn = createElement("button", "cardSetToggle anteRestoreButton", "Restore");
      restoreBtn.type = "button";

      // Group highlight filter toggle
      let hideNonHighlightGroups = false;
      const hideToggle = createElement("button", "cardSetToggle");
      hideToggle.type = "button";
      const updateHideLabel = () => {
        hideToggle.textContent = hideNonHighlightGroups ? "Show all groups" : "Only groups with hits";
      };
      updateHideLabel();

      recalcControls.append(inputLabel, cardsInput, recalcBtn, restoreBtn, hideToggle);
      cardSetHeader.appendChild(recalcControls);
      cardSet.appendChild(cardSetHeader);
      cardSet.appendChild(cardList);
      container.appendChild(cardSet);

      // Register callbacks
      const applyFilter = () => {
        if (cards.applyGroupHighlightFilter) cards.applyGroupHighlightFilter(cardList, hideNonHighlightGroups);
      };
      if (cards.onGroupRender) cards.onGroupRender(() => {
        if (cards.renderCardGroups) cards.renderCardGroups(cardList, queueNodes);
      });
      if (cards.onGroupFilterUpdate) cards.onGroupFilterUpdate(applyFilter);

      // Render initial cards
      if (cards.renderCardGroups) cards.renderCardGroups(cardList, queueNodes);
      applyFilter();

      // Event handlers
      hideToggle.addEventListener("click", () => {
        hideNonHighlightGroups = !hideNonHighlightGroups;
        updateHideLabel();
        applyFilter();
      });

      recalcBtn.addEventListener("click", () => {
        if (recalcBtn.disabled || !anteNum) return;
        const limit = Math.max(0, Number(cardsInput.value) || 0);
        if (!limit || typeof global.computeSingleAnteQueue !== "function") return;

        setButtonLoadingState(recalcBtn, true);
        setTimeout(() => {
          try {
            const items = global.computeSingleAnteQueue(anteNum, limit) || [];
            queueNodes = cards.buildQueueNodes ? cards.buildQueueNodes(items, { textOnly: true }) : [];
            layout.setMode("grid");
            if (cards.renderCardGroups) cards.renderCardGroups(cardList, queueNodes);
            if (search.searchAndHighlight) search.searchAndHighlight();
          } finally {
            setButtonLoadingState(recalcBtn, false);
          }
        }, 0);
      });

      restoreBtn.addEventListener("click", () => {
        if (restoreBtn.disabled || !anteNum) return;
        const globalInput = document.getElementById("cardsPerAnte");
        const limit = Math.max(0, Number(globalInput?.value) || 0);
        if (!limit || typeof global.computeSingleAnteQueue !== "function") return;

        setButtonLoadingState(restoreBtn, true);
        setTimeout(() => {
          try {
            const items = global.computeSingleAnteQueue(anteNum, limit) || [];
            queueNodes = cards.buildQueueNodes ? cards.buildQueueNodes(items, { textOnly: false }) : [];
            layout.setMode("scroll");
            if (cards.renderCardGroups) cards.renderCardGroups(cardList, queueNodes);
            if (search.searchAndHighlight) search.searchAndHighlight();
          } finally {
            setButtonLoadingState(restoreBtn, false);
          }
        }, 0);
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

    /**
     * Render current page of shop queues
     */
    function renderCurrentPage() {
      const totalPages = Math.ceil(allShopQueues.length / ANTES_PER_PAGE);
      scrollingContainer.innerHTML = "";
      if (cards.clearCallbacks) cards.clearCallbacks();

      if (totalPages === 0) {
        paginationContainer.innerHTML = "";
        paginationContainer.style.display = "none";
        return;
      }

      paginationContainer.style.display = totalPages <= 1 ? "none" : "flex";

      const start = currentPageIndex * ANTES_PER_PAGE;
      const end = start + ANTES_PER_PAGE;
      const pageQueues = allShopQueues.slice(start, end);

      pageQueues.forEach((queueData) => {
        scrollingContainer.appendChild(renderAnteQueue(queueData));
      });

      // Scroll to results
      const topOffset = scrollingContainer.getBoundingClientRect().top;
      window.scrollTo({ top: window.scrollY + topOffset - 12, behavior: "smooth" });

      // Setup drag scroll on all scrollable elements
      scrollingContainer.querySelectorAll(".scrollable").forEach(setupDragScroll);

      // Initial search highlight
      if (search.searchAndHighlight) search.searchAndHighlight();

      // Apply emoji filter if available
      if (typeof global.applySummaryEmojiFilter === "function") {
        global.applySummaryEmojiFilter();
      }

      // Handle pending scroll
      if (global.pendingScrollToResults) {
        global.pendingScrollToResults = false;
        requestAnimationFrame(() => {
          scrollingContainer?.scrollIntoView({ behavior: "smooth", block: "start" });
        });
      }
    }

    /**
     * Render pagination controls
     */
    function renderPaginationControls() {
      const totalPages = Math.ceil(allShopQueues.length / ANTES_PER_PAGE);
      paginationContainer.innerHTML = "";

      if (totalPages <= 1) {
        paginationContainer.style.display = "none";
        return;
      }

      paginationContainer.style.display = "flex";

      const goToPage = (page) => {
        const clamped = Math.max(0, Math.min(page, totalPages - 1));
        if (clamped === currentPageIndex) return;
        currentPageIndex = clamped;
        renderPaginationControls();
        renderCurrentPage();
      };

      // Expose for summary navigation
      global.goToAntePage = (anteNumber) => {
        if (!Number.isFinite(anteNumber) || !allShopQueues.length) return;
        const idx = allShopQueues.findIndex(({ title }) =>
          new RegExp(`ANTE\\s+${anteNumber}\\b`, "i").test(title || "")
        );
        if (idx === -1) return;
        const page = Math.floor(idx / ANTES_PER_PAGE);
        if (page !== currentPageIndex) {
          currentPageIndex = page;
          renderPaginationControls();
          renderCurrentPage();
        }
      };

      const prevBtn = createElement("button", "paginationButton", "Prev");
      prevBtn.type = "button";
      prevBtn.disabled = currentPageIndex === 0;
      prevBtn.addEventListener("click", () => {
        if (prevBtn.disabled) return;
        setButtonLoadingState(prevBtn, true);
        setTimeout(() => goToPage(currentPageIndex - 1), 0);
      });

      const nextBtn = createElement("button", "paginationButton", "Next");
      nextBtn.type = "button";
      nextBtn.disabled = currentPageIndex >= totalPages - 1;
      nextBtn.addEventListener("click", () => {
        if (nextBtn.disabled) return;
        setButtonLoadingState(nextBtn, true);
        setTimeout(() => goToPage(currentPageIndex + 1), 0);
      });

      const info = createElement("div", "paginationInfo");
      const pageSelect = createElement("select", "paginationInfoSelect");
      for (let i = 0; i < totalPages; i++) {
        const option = createElement("option", null, `Page ${i + 1}`);
        option.value = i;
        if (i === currentPageIndex) option.selected = true;
        pageSelect.appendChild(option);
      }
      pageSelect.addEventListener("change", (e) => {
        const newPage = Number(e.target.value);
        if (newPage === currentPageIndex) return;
        pageSelect.disabled = true;
        setTimeout(() => goToPage(newPage), 0);
      });

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
