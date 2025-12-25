/**
 * ui.search.js - Search and highlight functionality
 * Contains: search input, filter toggles, highlight logic
 */
(function (global) {
  "use strict";

  // Lazy getters for dependencies
  const getUtils = () => global.BalatroUtils || {};
  const getData = () => global.BalatroData || {};

  // Active search terms from toggle buttons
  let activeToggleTerms = null;

  // Map joker filter buttons for emoji sync
  const jokerFilterButtons = new Map();

  // Callbacks for search changes
  const searchChangeCallbacks = new Set();

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

  /**
   * Perform search and highlight on all searchable items
   */
  function searchAndHighlight() {
    const utils = getUtils();
    const { summaryFaceEmojiMap, summaryFaceCardMap } = utils;
    const terms = initActiveTerms();

    const searchInput = document.getElementById("searchInput");
    const manualTerms = searchInput
      ? searchInput.value.split(",").map((t) => t.trim().toLowerCase()).filter((t) => t.length >= 3)
      : [];

    const searchTerms = [...manualTerms, ...terms];

    const queueItems = document.querySelectorAll(
      ".queueItem, .packItem > div, .voucherContainer, .tagContainer, .bossContainer"
    );

    queueItems.forEach((item) => {
      const isTextOnly = item.classList.contains("queueItemTextOnly");
      let itemText = item.textContent.toLowerCase();
      let nameEl = null;
      let enName = null;

      if (isTextOnly) {
        nameEl = item.querySelector(".cardName");
        if (nameEl) {
          enName = nameEl.dataset.enName || nameEl.dataset.originalText || nameEl.textContent || "";
          itemText = enName.toLowerCase();
        }
      }

      const shouldHighlight = searchTerms.length > 0 && searchTerms.some((term) => itemText.includes(term));

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
          nameEl.textContent = nameEl.dataset.originalText || nameEl.textContent;
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
    const createElement = utils.createElement || ((tag, cls, txt) => {
      const el = document.createElement(tag);
      if (cls) el.className = cls;
      if (txt !== undefined) el.textContent = txt;
      return el;
    });

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
    searchInput.placeholder = "Enter search terms (comma-separated)";

    const searchLabel = createElement("label", null, "Press enter to search (comma separated, min 3 chars)");
    searchLabel.setAttribute("for", "searchInput");

    const searchContainer = createElement("div", "search-container");
    searchContainer.append(searchLabel, searchInput);

    // Toggle buttons container
    const toggleContainer = createElement("div", "toggle-container");
    const toggleGroups = [
      { title: "Jokers:", items: trackedJokers, category: "joker" },
      { title: "Spectrals:", items: trackedSpectrals },
      { title: "Vouchers:", items: trackedVouchers },
      { title: "Tags:", items: trackedTags },
      { title: "Bosses:", items: trackedBosses },
    ];

    toggleGroups.forEach((group) => {
      const groupDiv = createElement("div", "toggle-group");
      const titleSpan = createElement("span", "toggle-group-title", group.title);
      groupDiv.appendChild(titleSpan);

      group.items.forEach((term) => {
        const button = createElement("button", "toggle-button active", term);
        button.type = "button";
        const lower = term.toLowerCase();

        if (group.category === "joker") {
          button.dataset.filterCategory = "joker";
          button.dataset.cardName = term;
          jokerFilterButtons.set(term, button);
        }

        button.addEventListener("click", () => {
          const terms = initActiveTerms();
          const isActive = button.classList.toggle("active");
          if (isActive) {
            terms.add(lower);
          } else {
            terms.delete(lower);
          }
          searchAndHighlight();
        });

        groupDiv.appendChild(button);
      });

      toggleContainer.appendChild(groupDiv);
    });

    // Filter panel (collapsible)
    const filterPanel = createElement("details", "filter-panel");
    const filterSummary = createElement("summary", "filter-summary", "Search Filters");
    filterPanel.append(filterSummary, toggleContainer);

    // Event listeners
    searchInput.addEventListener("input", searchAndHighlight);
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
        btn.classList.add("active");
        terms.add(lower);
      } else if (!shouldBeOn && currentlyActive) {
        btn.classList.remove("active");
        terms.delete(lower);
      }
    });

    searchAndHighlight();
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
