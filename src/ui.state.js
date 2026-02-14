/**
 * ui.state.js - Global state variables and state query helpers.
 * No DOM manipulation - works only with data structures.
 */
(function () {
  "use strict";

  // ---- Global state variables ----
  window.instantAnalysis = false;
  window.lastRawOutput = "";
  window.lastSummary = "";
  window.lastSummariesByAnte = new Map();
  window.lastBaseSummariesByAnte = new Map();
  window.lastTrackingSummariesByAnte = new Map();
  window.__RESET_SUMMARY_ON_NEXT_OPEN__ = false;
  window.cardTextOnlyMode = false;

  // ---- Emoji sync guard ----
  // When true, onSearchChange callbacks skip redundant work because
  // the emoji click handler in ui.filters.js manages the full pipeline.
  window._emojiSyncActive = false;

  // ---- State query functions ----

  /**
   * Check if any tracking toggle buttons are active.
   * Single canonical implementation — all callers use this.
   */
  function hasActiveTrackingItems() {
    var terms = window.BalatroSearch?.getActiveToggleTerms?.();
    if (terms && typeof terms.size === "number") return terms.size > 0;
    return false;
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

  /**
   * Shorthand for applySummaryEmojiFilterSync.
   * Both the sync and scheduled versions are always available from ui.summary.js,
   * so callers should use this instead of the verbose fallback pattern.
   */
  function applyEmojiFilter() {
    window.applySummaryEmojiFilterSync?.();
  }

  // ---- Exports ----
  window.hasActiveTrackingItems = hasActiveTrackingItems;
  window.hasActiveSearchOrTracking = hasActiveSearchOrTracking;
  window.buildSummaryLookup = buildSummaryLookup;
  window.clampAnteValue = clampAnteValue;
  window.applyEmojiFilter = applyEmojiFilter;
})();
