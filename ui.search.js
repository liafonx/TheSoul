/**
 * ui.search.js - Search and highlight functionality
 * Contains: search input, filter toggles, highlight logic
 */
(function (global) {
  "use strict";

  const t = (key) => global.BalatroI18n?.t ? global.BalatroI18n.t(key) : key;

  // Lazy getters for dependencies
  const getUtils = () => global.BalatroUtils || {};
  const getData = () => global.BalatroData || {};

  // Active search terms from toggle buttons
  let activeToggleTerms = null;

  // Map joker filter buttons for emoji sync
  const jokerFilterButtons = new Map();
  const allFilterButtons = new Set();

  // Callbacks for search changes
  const searchChangeCallbacks = new Set();
  let pendingHighlightFrame = 0;

  function scheduleSearchAndHighlight() {
    if (pendingHighlightFrame) return;
    pendingHighlightFrame = requestAnimationFrame(() => {
      pendingHighlightFrame = 0;
      searchAndHighlight();
    });
  }

  /**
   * Initialize active toggle terms from tracked items
   */
  function initActiveTerms() {
    if (activeToggleTerms) return activeToggleTerms;

    const data = getData();
    const {
      trackedJokers = [],
      trackedSpectrals = [],
      trackedTags = [],
      trackedBosses = [],
      trackedVouchers = [],
    } = data;

    activeToggleTerms = new Set(
      [...trackedJokers, ...trackedSpectrals, ...trackedTags, ...trackedBosses, ...trackedVouchers]
        .map((term) => term.toLowerCase())
    );

    return activeToggleTerms;
  }

  /**
   * Register callback for search/highlight changes
   * @param {Function} callback
   */
  function onSearchChange(callback) {
    if (typeof callback === "function") searchChangeCallbacks.add(callback);
  }

  function setToggleButtonState(button, isActive, terms) {
    if (!button) return;
    const next = Boolean(isActive);
    const lower = button.dataset.termLower || "";
    button.classList.toggle("active", next);
    if (!lower || !terms) return;
    if (next) terms.add(lower);
    else terms.delete(lower);
  }

  function setEmojiIconFilterAll(isActive) {
    const utils = getUtils();
    const { summaryFaceEmojiMap } = utils;
    const filter = global.summaryEmojiFilter || {};
    Object.keys(summaryFaceEmojiMap || {}).forEach((emoji) => {
      filter[emoji] = Boolean(isActive);
    });

    const filterContent = document.getElementById("summaryFilterContent");
    if (filterContent) {
      filterContent.querySelectorAll(".summaryFilterButton").forEach((btn) => {
        const icon = btn.querySelector(".summaryFilterEmoji");
        if (!icon) return;
        const emoji = (icon.textContent || "").trim();
        if (!(emoji in filter)) return;
        btn.classList.toggle("active", filter[emoji] !== false);
      });
    }

    global.applySummaryEmojiFilter?.();
  }

  /**
   * Perform search and highlight on all searchable items
   */
  function searchAndHighlight() {
    const utils = getUtils();
    const { summaryFaceEmojiMap, summaryFaceCardMap } = utils;
    const terms = initActiveTerms();

    const searchInput = document.getElementById("searchInput");
    const isCjkTerm = (term) => /[\u3400-\u9FFF]/.test(term);
    const manualTerms = searchInput
      ? searchInput.value
        .split(/[,\uFF0C]/)
        .map((term) => term.trim().toLowerCase())
        .filter((term) => term.length > 0 && (isCjkTerm(term) ? term.length >= 1 : term.length >= 3))
      : [];

    const searchTerms = [...manualTerms, ...terms];
    const hasSearch = searchTerms.length > 0;

    const queueItems = document.querySelectorAll(
      ".queueItem, .packItem > div, .voucherContainer, .tagContainer, .bossContainer"
    );

    queueItems.forEach((item) => {
      const isTextOnly = item.classList.contains("queueItemTextOnly");
      let nameEl = item.querySelector(".cardName, .standardCardName, .voucherName, .tagName, .bossName, .packName");
      let enName = item.dataset.searchText || item.dataset.enName || "";
      if (!enName && nameEl) enName = nameEl.dataset.enName || nameEl.dataset.originalText || "";

      let itemText = item.dataset.searchCorpus || "";
      if (!itemText) {
        const localizedName = (nameEl?.textContent || "").trim();
        itemText = `${enName || ""} ${localizedName} ${(item.textContent || "")}`.toLowerCase();
        item.dataset.searchCorpus = itemText;
      }

      if (isTextOnly) {
        nameEl = item.querySelector(".cardName");
        if (nameEl) {
          enName = nameEl.dataset.enName || nameEl.dataset.originalText || nameEl.textContent || "";
          itemText = item.dataset.searchCorpusTextOnly || `${enName} ${nameEl.dataset.defaultText || nameEl.textContent || ""}`.toLowerCase();
          item.dataset.searchCorpusTextOnly = itemText;
        }
      }

      const shouldHighlight = hasSearch && searchTerms.some((term) => itemText.includes(term));

      if (shouldHighlight) {
        const faceEmoji = item.dataset.faceEmoji || "";
        const isNegativeFace = item.dataset.negativeFace === "1";
        let color = "";
        if (isNegativeFace) {
          color = "#f5a5a5";
        } else if (faceEmoji && summaryFaceEmojiMap?.[faceEmoji]) {
          color = summaryFaceEmojiMap[faceEmoji].color || "";
        }
        if (color) {
          item.style.setProperty("--highlight-color", color);
        } else {
          item.style.removeProperty("--highlight-color");
        }
        item.classList.add("highlight");
      } else {
        item.classList.remove("highlight");
        item.style.removeProperty("--highlight-color");
      }

      // Swap card name to Chinese when highlighted (text-only mode)
      if (isTextOnly) {
        if (!nameEl) nameEl = item.querySelector(".cardName");
        if (!nameEl) return;
        if (!enName) {
          enName = nameEl.dataset.enName || nameEl.dataset.originalText || nameEl.textContent || "";
        }
        if (!enName || !summaryFaceCardMap?.[enName]) return;

        const faceInfo = summaryFaceCardMap[enName];
        const baseChinese = faceInfo.cn || enName;
        const faceEmoji = faceInfo.emoji || "";
        const hasNegative = nameEl.dataset.negativeTag === "1";
        const displayText = `${faceEmoji}${hasNegative ? "‼️" : ""}${baseChinese}`;

        if (shouldHighlight) {
          nameEl.textContent = displayText;
          nameEl.classList.add("cardName-cn");
        } else {
          nameEl.textContent = nameEl.dataset.defaultText || nameEl.dataset.originalText || nameEl.textContent;
          nameEl.classList.remove("cardName-cn");
        }
      }
    });

    // Notify listeners
    searchChangeCallbacks.forEach((cb) => cb());
  }

  /**
   * Create the search input and filter toggle panel
   * @returns {{ container: HTMLElement, filterPanel: HTMLElement }}
   */
  function createSearchUI() {
    const utils = getUtils();
    const data = getData();
    const createElement = utils.createElement || ((tag, cls, txt) => Object.assign(document.createElement(tag), cls && { className: cls }, txt !== undefined && { textContent: txt }));

    const {
      trackedJokers = [],
      trackedSpectrals = [],
      trackedTags = [],
      trackedBosses = [],
      trackedVouchers = [],
    } = data;

    // Initialize active terms
    initActiveTerms();

    // Search input
    const searchInput = createElement("input", null);
    searchInput.type = "text";
    searchInput.id = "searchInput";
    searchInput.placeholder = t("Enter search terms (use , or ，)");

    const searchLabel = createElement("label", null, t("Press Enter to search (use , or ，; Chinese min 1 char, English min 3 chars)"));
    searchLabel.setAttribute("for", "searchInput");

    const searchContainer = createElement("div", "search-container");
    searchContainer.append(searchLabel, searchInput);

    // Toggle buttons container
    const toggleContainer = createElement("div", "toggle-container");
    const toggleGroups = [
      { title: t("Jokers:"), items: trackedJokers, category: "joker" },
      { title: t("Spectrals:"), items: trackedSpectrals },
      { title: t("Vouchers:"), items: trackedVouchers },
      { title: t("Tags:"), items: trackedTags },
      { title: t("Bosses:"), items: trackedBosses },
    ];

    toggleGroups.forEach((group) => {
      const groupDiv = createElement("div", "toggle-group");
      const titleSpan = createElement("span", "toggle-group-title", group.title);
      groupDiv.appendChild(titleSpan);

      group.items.forEach((term) => {
        const localizedTerm = utils.isChineseLocale?.()
          ? (utils.translateGameText ? utils.translateGameText(term) : term)
          : term;
        const button = createElement("button", "toggle-button active", localizedTerm);
        button.type = "button";
        const lower = term.toLowerCase();
        button.dataset.termLower = lower;
        allFilterButtons.add(button);

        if (group.category === "joker") {
          button.dataset.filterCategory = "joker";
          button.dataset.cardName = term;
          jokerFilterButtons.set(term, button);
        }

        button.addEventListener("click", () => {
          const terms = initActiveTerms();
          setToggleButtonState(button, !button.classList.contains("active"), terms);
          scheduleSearchAndHighlight();
        });

        groupDiv.appendChild(button);
      });

      toggleContainer.appendChild(groupDiv);
    });

    // Filter panel (collapsible)
    const filterPanel = createElement("details", "filter-panel");
    const filterSummary = createElement("summary", "filter-summary", t("Search Filters"));
    const filterActions = createElement("div", "filter-actions");
    const selectAllButton = createElement("button", "filter-action-button", t("Select all"));
    selectAllButton.type = "button";
    const removeAllButton = createElement("button", "filter-action-button", t("Remove all"));
    removeAllButton.type = "button";

    const setAllFilterButtons = (isActive) => {
      const terms = initActiveTerms();
      allFilterButtons.forEach((button) => {
        if (button.disabled) return;
        setToggleButtonState(button, isActive, terms);
      });
      setEmojiIconFilterAll(isActive);
      scheduleSearchAndHighlight();
    };

    selectAllButton.addEventListener("click", () => setAllFilterButtons(true));
    removeAllButton.addEventListener("click", () => setAllFilterButtons(false));
    filterActions.append(selectAllButton, removeAllButton);

    filterPanel.append(filterSummary, filterActions, toggleContainer);

    // Event listeners
    searchInput.addEventListener("input", scheduleSearchAndHighlight);
    searchInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        const highlighted = document.querySelector(".highlight");
        if (highlighted) {
          highlighted.scrollIntoView({ behavior: "smooth", block: "center", inline: "center" });
        }
      }
    });

    return { container: searchContainer, filterPanel };
  }

  /**
   * Sync emoji filters to search filter buttons
   * Called when emoji filter changes in summary
   */
  function syncEmojiFilterToSearch() {
    const utils = getUtils();
    const { summaryFaceCardMap } = utils;
    const filter = global.summaryEmojiFilter || {};
    const terms = initActiveTerms();

    if (!summaryFaceCardMap || !Object.keys(summaryFaceCardMap).length) return;

    Object.entries(summaryFaceCardMap).forEach(([engName, info]) => {
      const emoji = info.emoji;
      if (!emoji || !(emoji in filter)) return;

      const shouldBeOn = filter[emoji] !== false;
      const btn = jokerFilterButtons.get(engName);
      if (!btn) return;

      const lower = engName.toLowerCase();
      const currentlyActive = btn.classList.contains("active");

      if (shouldBeOn && !currentlyActive) {
        setToggleButtonState(btn, true, terms);
      } else if (!shouldBeOn && currentlyActive) {
        setToggleButtonState(btn, false, terms);
      }
    });

    scheduleSearchAndHighlight();
  }

  /**
   * Get active toggle terms (for external access)
   */
  function getActiveToggleTerms() {
    return initActiveTerms();
  }

  // Export search module
  global.BalatroSearch = {
    searchAndHighlight,
    createSearchUI,
    onSearchChange,
    syncEmojiFilterToSearch,
    getActiveToggleTerms,
    jokerFilterButtons,
  };
})(window);
