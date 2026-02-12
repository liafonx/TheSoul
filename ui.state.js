/**
 * ui.state.js - Global state management and pure data processing
 * Provides SummaryState manager and data transformation functions.
 * No DOM manipulation - works only with data structures.
 */
(function () {
  "use strict";

  var getUtils = function () { return window.BalatroUtils || {}; };

  // ---- Global state variables ----
  window.instantAnalysis = false;
  window.lastRawOutput = "";
  window.lastSummary = "";
  window.lastSummariesByAnte = new Map();
  window.lastBaseSummariesByAnte = new Map();
  window.lastTrackingSummariesByAnte = new Map();
  window.__RESET_SUMMARY_ON_NEXT_OPEN__ = false;

  // ---- SummaryState Manager ----
  // Clean data-driven architecture with immutable source and computed properties
  var SummaryState = {
    // Immutable source data (never modified after parsing)
    rawOutput: "",
    baseSummary: new Map(),

    // Filter/search state
    activeEmojiFilters: new Set(),
    searchTerms: [],

    // Computed data caches (lazy evaluation)
    _trackingCache: null,
    _searchCache: null,
    _finalCache: null,

    get trackingItems() {
      if (!this._trackingCache) {
        this._trackingCache = computeTrackingItems(this.baseSummary, this.activeEmojiFilters);
      }
      return this._trackingCache;
    },

    get searchMatches() {
      if (!this._searchCache) {
        this._searchCache = computeSearchMatches(this.baseSummary, this.searchTerms);
      }
      return this._searchCache;
    },

    get finalSummary() {
      if (!this._finalCache) {
        this._finalCache = computeFinalSummary(
          this.baseSummary,
          this.searchMatches,
          this.trackingItems
        );
      }
      return this._finalCache;
    },

    invalidate: function () {
      this._trackingCache = null;
      this._searchCache = null;
      this._finalCache = null;
    },

    reset: function () {
      this.rawOutput = "";
      this.baseSummary = new Map();
      this.activeEmojiFilters = new Set();
      this.searchTerms = [];
      this.invalidate();
    }
  };

  window.SummaryState = SummaryState;

  // ---- Pure data processing functions ----

  /**
   * Extract tracking items that match active emoji filters.
   * @param {Map} baseSummary - Original summary Map<ante, summaryText>
   * @param {Set} activeEmojiFilters - Set of enabled emojis like {'👥', '5️⃣'}
   * @returns {Map} Filtered summary Map<ante, filteredText>
   */
  function computeTrackingItems(baseSummary, activeEmojiFilters) {
    if (!activeEmojiFilters || activeEmojiFilters.size === 0) return new Map();
    if (!baseSummary || baseSummary.size === 0) return new Map();

    var utils = getUtils();
    var result = new Map();

    for (var _ref of baseSummary) {
      var ante = _ref[0], summaryText = _ref[1];
      var matchedItems = [];
      var items = summaryText.split(/[、,]/).map(function (s) { return s.trim(); }).filter(Boolean);

      for (var i = 0; i < items.length; i++) {
        var item = items[i];
        var emojis = utils.getSummaryEmojisForText?.(item) || [];
        var hasMatch = emojis.some(function (emoji) { return activeEmojiFilters.has(emoji); });
        if (hasMatch) {
          matchedItems.push(item);
        }
      }

      if (matchedItems.length > 0) {
        result.set(ante, matchedItems.join("\u3001"));
      }
    }

    return result;
  }

  /**
   * Find items in summary that match search terms (manual search).
   * @param {Map} baseSummary - Original summary Map<ante, summaryText>
   * @param {Array} searchTerms - Array of search keywords like ['豆', '小丑']
   * @returns {Map} Search results Map<ante, matchedText>
   */
  function computeSearchMatches(baseSummary, searchTerms) {
    if (!searchTerms || searchTerms.length === 0) return new Map();
    if (!baseSummary || baseSummary.size === 0) return new Map();

    var utils = getUtils();
    var result = new Map();
    var isCjk = function (term) { return /[\u3400-\u9FFF]/.test(term); };

    var normalizedTerms = searchTerms
      .map(function (t) { return t.trim().toLowerCase(); })
      .filter(function (t) { return t.length > 0 && (isCjk(t) ? t.length >= 1 : t.length >= 3); });

    if (normalizedTerms.length === 0) return new Map();

    for (var _ref of baseSummary) {
      var ante = _ref[0], summaryText = _ref[1];
      var matchedItems = [];
      var items = summaryText.split(/[、,]/).map(function (s) { return s.trim(); }).filter(Boolean);

      for (var i = 0; i < items.length; i++) {
        var item = items[i];
        var translated = utils.translateGameText?.(item) || item;
        var searchText = (item + " " + translated).toLowerCase();
        var matches = normalizedTerms.some(function (term) { return searchText.includes(term); });
        if (matches) {
          matchedItems.push(item);
        }
      }

      if (matchedItems.length > 0) {
        result.set(ante, matchedItems.join("\u3001"));
      }
    }

    return result;
  }

  /**
   * Combine search results and tracking items into final display summary.
   * @param {Map} baseSummary - Original summary (for future reference)
   * @param {Map} searchMatches - Search results Map<ante, searchText>
   * @param {Map} trackingItems - Tracking items Map<ante, trackingText>
   * @returns {Map} Combined summary Map<ante, combinedText>
   */
  function computeFinalSummary(baseSummary, searchMatches, trackingItems) {
    var result = new Map();

    var allAntes = new Set([
      ...searchMatches.keys(),
      ...trackingItems.keys()
    ]);

    for (var ante of allAntes) {
      var parts = [];

      if (searchMatches.has(ante)) {
        parts.push("\uD83D\uDD0D: " + searchMatches.get(ante));
      }

      if (trackingItems.has(ante)) {
        parts.push(trackingItems.get(ante));
      }

      if (parts.length > 0) {
        result.set(ante, parts.join(" | "));
      }
    }

    return result;
  }

  // ---- State query functions ----

  function hasActiveTrackingItems() {
    var terms = window.BalatroSearch?.getActiveToggleTerms?.();
    if (terms && typeof terms.size === "number") return terms.size > 0;
    var appTrackingState = window.areTrackingTermsActive?.();
    if (typeof appTrackingState === "boolean") return appTrackingState;
    return true;
  }

  /**
   * Check if manual search OR tracking items are active.
   * Used for nearby summary visibility control.
   */
  function hasActiveSearchOrTracking() {
    var searchInput = document.getElementById("searchInput");
    var hasManualSearch = searchInput?.value?.trim().length > 0;
    if (hasManualSearch) return true;
    return hasActiveTrackingItems();
  }

  function buildSummaryLookup(summaryText) {
    var map = new Map();
    if (!summaryText?.trim()) return map;
    summaryText.split("\n").forEach(function (line) {
      var trimmed = line.trim();
      if (!trimmed) return;
      var match = trimmed.match(/^ante\s*(\d+)\s*[：:]/i) || trimmed.match(/^(\d+)\s*[：:]/);
      if (match) {
        var anteNum = parseInt(match[1], 10);
        if (!Number.isNaN(anteNum) && !map.has(anteNum)) map.set(anteNum, trimmed);
      }
    });
    return map;
  }

  function clampAnteValue(value) {
    var numeric = Number(value);
    if (!Number.isFinite(numeric)) return 39;
    return Math.min(Math.max(Math.floor(numeric), 1), 39);
  }

  // ---- Exports ----
  window.computeTrackingItems = computeTrackingItems;
  window.computeSearchMatches = computeSearchMatches;
  window.computeFinalSummary = computeFinalSummary;
  window.hasActiveTrackingItems = hasActiveTrackingItems;
  window.hasActiveSearchOrTracking = hasActiveSearchOrTracking;
  window.buildSummaryLookup = buildSummaryLookup;
  window.clampAnteValue = clampAnteValue;
})();
