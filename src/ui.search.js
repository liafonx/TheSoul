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
  let searchScope = null;
  let searchItemsDirty = true;
  let cachedSearchItems = [];
  let cachedSearchRoot = null;

  const SEARCHABLE_SELECTOR =
    ".queueItem, .packCards > div, .voucherContainer, .tagContainer, .bossContainer";

  function markSearchDomDirty() {
    searchItemsDirty = true;
  }

  function setSearchScope(scopeEl) {
    searchScope = scopeEl || null;
    markSearchDomDirty();
  }

  function getSearchableItems() {
    if (searchScope && !searchScope.isConnected) {
      searchScope = null;
      searchItemsDirty = true;
    }

    // Fix 5: Lightweight root check instead of O(N) .every(isConnected)
    const root =
      document.getElementById("scrollingContainer") ||
      searchScope ||
      document;

    if (
      !searchItemsDirty &&
      cachedSearchRoot === root &&
      cachedSearchItems.length
    ) {
      return cachedSearchItems;
    }

    cachedSearchRoot = root;
    cachedSearchItems = Array.from(root.querySelectorAll(SEARCHABLE_SELECTOR));
    searchItemsDirty = false;
    return cachedSearchItems;
  }

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
    activeToggleTerms = new Set();

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

  function syncSummaryFilterButtons() {
    const filter = global.summaryEmojiFilter || {};
    const filterContent = document.getElementById("summaryFilterContent");
    if (!filterContent) return;
    filterContent.querySelectorAll(".summaryFilterButton").forEach((btn) => {
      const icon = btn.querySelector(".summaryFilterEmoji");
      if (!icon) return;
      const emoji = (icon.textContent || "").trim();
      if (!(emoji in filter)) return;
      btn.classList.toggle("active", filter[emoji] !== false);
    });
  }

  function syncSearchFiltersToEmoji() {
    const utils = getUtils();
    const { summaryFaceCardMap } = utils;
    const filter = global.summaryEmojiFilter || {};
    const terms = initActiveTerms();
    if (!summaryFaceCardMap || !Object.keys(summaryFaceCardMap).length) return;

    const emojiCards = {};
    jokerFilterButtons.forEach((_btn, engName) => {
      const info = summaryFaceCardMap[engName];
      const emoji = info?.emoji;
      if (!emoji) return;
      if (!emojiCards[emoji]) emojiCards[emoji] = [];
      emojiCards[emoji].push(engName);
    });

    Object.entries(emojiCards).forEach(([emoji, cards]) => {
      filter[emoji] = cards.some((name) => terms.has(name.toLowerCase()));
    });

    syncSummaryFilterButtons();
    global.applyEmojiFilter?.();
    scheduleSearchAndHighlight();
  }

  /**
   * Perform search and highlight on all searchable items
   */
  function searchAndHighlight() {
    const savedScrollY = global.scrollY;
    const utils = getUtils();
    const { summaryFaceCardMap } = utils;
    const terms = initActiveTerms();

    const searchInput = document.getElementById("searchInput");
    const isCjkTerm = (term) => /[\u3400-\u9FFF]/.test(term);
    const manualTerms = searchInput
      ? searchInput.value
        .split(/[,\uFF0C]/)
        .map((term) => term.trim().toLowerCase())
        .filter((term) => term.length > 0 && (isCjkTerm(term) ? term.length >= 1 : term.length >= 3))
      : [];

    // Fix 7: Reuse cached expanded terms from ui.search-integration.js
    const expandedTrackedTerms = global.getExpandedTrackingTerms?.() || [];
    const hasManualSearch = manualTerms.length > 0;
    const hasTrackedSearch = expandedTrackedTerms.length > 0;

    const queueItems = getSearchableItems();

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

      const matchesManual = hasManualSearch && manualTerms.some((term) => itemText.includes(term));
      const matchesTracked = hasTrackedSearch && expandedTrackedTerms.some((term) => itemText.includes(term));
      const shouldHighlight = matchesManual || matchesTracked;

      if (shouldHighlight) {
        item.classList.add("highlight");
        item.classList.toggle("highlight-search", matchesManual);
        item.classList.toggle("highlight-track", !matchesManual && matchesTracked);
      } else {
        item.classList.remove("highlight");
        item.classList.remove("highlight-track");
        item.classList.remove("highlight-search");
      }

      // Swap card name to Chinese when highlighted (text-only mode)
      if (isTextOnly) {
        if (!nameEl) nameEl = item.querySelector(".cardName");
        if (!nameEl) return;
        if (!enName) {
          enName = nameEl.dataset.enName || nameEl.dataset.originalText || nameEl.textContent || "";
        }
        const faceKey = utils.nameToKey?.(enName) || enName;
        if (!faceKey || !summaryFaceCardMap?.[faceKey]) return;

        const faceInfo = summaryFaceCardMap[faceKey];
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

    // Restore scroll position after DOM modifications
    if (global.scrollY !== savedScrollY) {
      global.scrollTo(0, savedScrollY);
    }

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
    const createElement = utils.createElement;
    if (typeof createElement !== "function") {
      throw new Error("BalatroUtils.createElement is unavailable.");
    }

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
    searchInput.placeholder = t("ui.search_placeholder");

    const searchLabel = createElement("label", null, t("ui.search_hint"));
    searchLabel.setAttribute("for", "searchInput");

    const searchContainer = createElement("div", "search-container");
    searchContainer.append(searchLabel, searchInput);

    // Toggle buttons container
    const toggleContainer = createElement("div", "toggle-container");
    const toggleGroups = [
      { title: t("ui.jokers"), items: trackedJokers, category: "joker" },
      { title: t("ui.spectrals"), items: trackedSpectrals },
      { title: t("ui.vouchers"), items: trackedVouchers },
      { title: t("ui.tags_label"), items: trackedTags },
      { title: t("ui.bosses"), items: trackedBosses },
    ];

    toggleGroups.forEach((group) => {
      const groupDiv = createElement("div", "toggle-group");
      const titleSpan = createElement("span", "toggle-group-title", group.title);
      groupDiv.appendChild(titleSpan);

      group.items.forEach((term) => {
        const localizedTerm = utils.translateGameText ? utils.translateGameText(term) : term;
        const button = createElement("button", "toggle-button", localizedTerm);
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
          syncSearchFiltersToEmoji();
        });

        groupDiv.appendChild(button);
      });

      toggleContainer.appendChild(groupDiv);
    });

    // Filter panel (collapsible)
    const filterPanel = createElement("div", "filter-panel");
    const filterSummary = createElement("button", "filter-summary", t("ui.search_filters"));
    filterSummary.type = "button";
    filterSummary.setAttribute("aria-expanded", "false");
    const filterActions = createElement("div", "filter-actions");
    const selectAllButton = createElement("button", "filter-action-button", t("ui.select_all"));
    selectAllButton.type = "button";
    const removeAllButton = createElement("button", "filter-action-button", t("ui.remove_all"));
    removeAllButton.type = "button";
    const filterBody = createElement("div", "filter-panel-body");

    const setAllFilterButtons = (isActive) => {
      const terms = initActiveTerms();
      allFilterButtons.forEach((button) => {
        if (button.disabled) return;
        setToggleButtonState(button, isActive, terms);
      });
      syncSearchFiltersToEmoji();
    };

    selectAllButton.addEventListener("click", () => setAllFilterButtons(true));
    removeAllButton.addEventListener("click", () => setAllFilterButtons(false));
    filterActions.append(selectAllButton, removeAllButton);

    const setFilterPanelOpen = (isOpen) => {
      const open = Boolean(isOpen);
      filterPanel.classList.toggle("is-open", open);
      filterSummary.setAttribute("aria-expanded", String(open));
      filterBody.hidden = !open;
    };

    setFilterPanelOpen(false);
    filterSummary.addEventListener("click", () => setFilterPanelOpen(!filterPanel.classList.contains("is-open")));
    filterBody.append(filterActions, toggleContainer);
    filterPanel.append(filterSummary, filterBody);

    // Event listeners
    searchInput.addEventListener("input", scheduleSearchAndHighlight);
    searchInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        e.stopPropagation();
        document.getElementById("searchFloatingWindow")?.classList.remove("visible");
        searchInput.blur();
      }
    });

    syncSearchFiltersToEmoji();
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

    const emojiCards = {};
    Object.entries(summaryFaceCardMap).forEach(([engName, info]) => {
      const emoji = info?.emoji;
      if (!emoji || !(emoji in filter)) return;
      if (!emojiCards[emoji]) emojiCards[emoji] = [];
      emojiCards[emoji].push(engName);
    });

    let changed = false;
    Object.entries(emojiCards).forEach(([emoji, cards]) => {
      const shouldBeOn = filter[emoji] !== false;
      const buttons = cards.map((name) => jokerFilterButtons.get(name)).filter(Boolean);
      if (!buttons.length) return;

      if (!shouldBeOn) {
        buttons.forEach((btn) => {
          if (btn.classList.contains("active")) {
            setToggleButtonState(btn, false, terms);
            changed = true;
          }
        });
        return;
      }

      const allInactive = buttons.every((btn) => !btn.classList.contains("active"));
      if (!allInactive) return;
      buttons.forEach((btn) => {
        setToggleButtonState(btn, true, terms);
        changed = true;
      });
    });

    syncSummaryFilterButtons();
    return changed;
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
    scheduleSearchAndHighlight,
    createSearchUI,
    onSearchChange,
    syncEmojiFilterToSearch,
    getActiveToggleTerms,
    setSearchScope,
    markSearchDomDirty,
    jokerFilterButtons,
  };
})(window);
