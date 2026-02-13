/**
 * ui.search-integration.js - Search data extraction and summary augmentation
 * Parses raw output for search matching and combines search + tracking results.
 */
(function () {
  "use strict";

  // Fix 1: Cache parsed raw output — parse once, reuse across callers
  var _cachedRawText = null;
  var _cachedParsedAntes = null;

  function getCachedParsedAntes() {
    var rawOutput = window.lastRawOutput || "";
    if (rawOutput === _cachedRawText && _cachedParsedAntes) return _cachedParsedAntes;
    _cachedRawText = rawOutput;
    _cachedParsedAntes = parseRawOutputByAnte(rawOutput);
    return _cachedParsedAntes;
  }

  // Fix 4: Cache expanded tracking terms — only rebuild when terms change
  var _lastTermsSize = -1;
  var _cachedExpandedTerms = null;

  function getExpandedTrackingTerms() {
    var terms = window.BalatroSearch?.getActiveToggleTerms?.();
    if (!terms || !terms.size) return null;
    if (terms.size === _lastTermsSize && _cachedExpandedTerms) return _cachedExpandedTerms;
    _lastTermsSize = terms.size;
    var enLocale = window.BalatroLocale_enUS || {};
    var cnLocale = window.BalatroLocale_zhCN || {};
    var expanded = [];
    terms.forEach(function (term) {
      expanded.push(term);
      var en = enLocale[term];
      if (en) expanded.push(en.toLowerCase());
      var cn = cnLocale[term];
      if (cn) expanded.push(cn.toLowerCase());
    });
    _cachedExpandedTerms = expanded;
    return expanded;
  }

  function invalidateTrackingCache() {
    _lastTermsSize = -1;
    _cachedExpandedTerms = null;
  }

  /**
   * Parse raw output to extract Boss, Voucher, Tags, and Shop items by ante.
   * @param {string} rawText - The raw output text
   * @returns {Map<number, {boss, voucher, tags, shopItems}>}
   */
  function parseRawOutputByAnte(rawText) {
    var antes = new Map();
    if (!rawText?.trim()) return antes;

    var sections = rawText.split(/==ANTE (\d+)==/);

    for (var i = 1; i < sections.length; i += 2) {
      var anteNum = parseInt(sections[i], 10);
      var content = sections[i + 1];
      if (!content) continue;

      var bossMatch = content.match(/^Boss: (.+)$/m);
      var boss = bossMatch ? bossMatch[1].trim() : null;

      var voucherMatch = content.match(/^Voucher: (.+)$/m);
      var voucher = voucherMatch ? voucherMatch[1].trim() : null;

      var tagsMatch = content.match(/^Tags: (.+)$/m);
      var tags = tagsMatch ? tagsMatch[1].split(",").map(function (t) { return t.trim(); }).filter(Boolean) : [];

      var shopMatches = [...content.matchAll(/^(\d+)\) (.+)$/gm)];
      var shopItems = shopMatches.map(function (m) {
        var index = m[1];
        var name = m[2]
          .replace(/^(Foil |Holographic |Polychrome |Negative )+/, "")
          .replace(/^(Eternal |Perishable |Rental )+/, "")
          .trim();
        return { index: index, name: name };
      });

      antes.set(anteNum, { boss: boss, voucher: voucher, tags: tags, shopItems: shopItems });
    }

    return antes;
  }

  /**
   * Extract search results from raw output (supports translated text).
   * Uses ONLY manual search terms, NOT emoji filter terms.
   * @returns {Map<number, Array<string>>} - Map of ante number to matched items
   */
  function extractSearchResults() {
    var searchInput = document.getElementById("searchInput");
    var isCjkTerm = function (term) { return /[\u3400-\u9FFF]/.test(term); };

    var manualTerms = searchInput?.value
      .split(/[,\uff0c]/)
      .map(function (t) { return t.trim().toLowerCase(); })
      .filter(function (t) { return t.length > 0 && (isCjkTerm(t) ? t.length >= 1 : t.length >= 3); }) || [];

    if (manualTerms.length === 0) return new Map();

    var matchesSearch = function (text) {
      var lowerText = text.toLowerCase();
      return manualTerms.some(function (term) { return lowerText.includes(term); });
    };

    var utils = window.BalatroUtils;
    var isChinese = utils?.isChineseLocale?.() || false;

    /**
     * Match an item by English name, converting to locale display.
     * @param {string} enName - English name from raw output
     * @param {string} suffix - Optional suffix like "#1"
     * @returns {string|null} Display name if matched, null otherwise
     */
    var matchItem = function (enName, suffix) {
      // Get localized name via translateGameText (handles English→key→locale)
      var localizedName = utils?.translateGameText?.(enName) || enName;

      // Build search text from both English and localized names
      var searchText = (enName + " " + localizedName).toLowerCase();

      if (!matchesSearch(searchText)) return null;

      // Return display name in current locale
      var displayName = isChinese ? localizedName : enName;
      return suffix ? displayName + suffix : displayName;
    };

    var parsedAntes = getCachedParsedAntes();
    if (!parsedAntes.size) return new Map();

    var results = new Map();

    parsedAntes.forEach(function (anteData, anteNum) {
      var matches = [];
      if (anteData.boss) {
        var hit = matchItem(anteData.boss);
        if (hit) matches.push(hit);
      }
      if (anteData.voucher) {
        var hit = matchItem(anteData.voucher);
        if (hit) matches.push(hit);
      }
      if (anteData.tags) {
        anteData.tags.forEach(function (tag) {
          var hit = matchItem(tag);
          if (hit) matches.push(hit);
        });
      }
      if (anteData.shopItems) {
        anteData.shopItems.forEach(function (item) {
          var hit = matchItem(item.name, "#" + item.index);
          if (hit) matches.push(hit);
        });
      }
      if (matches.length > 0) {
        results.set(anteNum, matches);
      }
    });
    return results;
  }

  /**
   * Extract tracking results from raw output using active toggle terms.
   * Scans ALL antes (not just current page) for items matching tracking filters.
   * @returns {Map<number, Array<string>>} - Map of ante number to matched item display names
   */
  function extractTrackingResults() {
    var expandedTerms = getExpandedTrackingTerms();
    if (!expandedTerms) return new Map();

    var utils = window.BalatroUtils;
    var isChinese = utils?.isChineseLocale?.() || false;

    var matchesTracking = function (text) {
      var lower = text.toLowerCase();
      return expandedTerms.some(function (t) { return lower.includes(t); });
    };

    var parsedAntes = getCachedParsedAntes();
    if (!parsedAntes.size) return new Map();
    var results = new Map();

    parsedAntes.forEach(function (anteData, anteNum) {
      var addMatch = function (enName, suffix) {
        var displayName = isChinese ? (utils?.translateGameText?.(enName) || enName) : enName;
        return suffix ? displayName + suffix : displayName;
      };

      // Collect matches by type group
      var groups = [];

      // Boss
      var bossHits = [];
      if (anteData.boss && matchesTracking(anteData.boss)) bossHits.push(addMatch(anteData.boss));
      if (bossHits.length) groups.push(bossHits.join("\u3001"));

      // Voucher
      var voucherHits = [];
      if (anteData.voucher && matchesTracking(anteData.voucher)) voucherHits.push(addMatch(anteData.voucher));
      if (voucherHits.length) groups.push(voucherHits.join("\u3001"));

      // Tags
      var tagHits = [];
      if (anteData.tags) {
        anteData.tags.forEach(function (tag) {
          if (matchesTracking(tag)) tagHits.push(addMatch(tag));
        });
      }
      if (tagHits.length) groups.push(tagHits.join("\u3001"));

      // Shop items
      var shopHits = [];
      if (anteData.shopItems) {
        anteData.shopItems.forEach(function (item) {
          if (matchesTracking(item.name)) shopHits.push(addMatch(item.name, "#" + item.index));
        });
      }
      if (shopHits.length) groups.push(shopHits.join("\u3001"));

      if (groups.length > 0) {
        results.set(anteNum, groups);
      }
    });
    return results;
  }

  /**
   * Augment summary with search results (prepend 🔍 section).
   * Stores result in window.lastAugmentedSummary.
   * Combines INDEPENDENT search results + tracking items.
   */
  function augmentSummaryWithSearch() {
    var searchResults = extractSearchResults();

    var baseSummary = window.lastBaseSummariesByAnte;
    var trackingSummary = window.lastTrackingSummariesByAnte || new Map();

    if (!searchResults.size && !trackingSummary.size) {
      window.lastAugmentedSummary = null;
      return;
    }

    var hasTracking = window.hasActiveTrackingItems();

    if (!hasTracking && !baseSummary?.size && !searchResults.size) {
      window.lastAugmentedSummary = null;
      return;
    }

    var augmented = new Map();
    var cleanFn = window.BalatroUtils?.cleanSummaryLine || function (x) { return x; };

    var allAntes = new Set([
      ...searchResults.keys(),
      ...(hasTracking ? trackingSummary.keys() : []),
      ...(hasTracking && baseSummary ? baseSummary.keys() : [])
    ]);

    allAntes.forEach(function (anteNum) {
      var parts = [];

      var searchMatches = searchResults.get(anteNum);
      if (searchMatches) {
        parts.push("\uD83D\uDD0D: " + searchMatches.join("\u3001"));
      }

      if (hasTracking) {
        var baseText = baseSummary?.get(anteNum);
        if (baseText && baseText.trim()) {
          parts.push(cleanFn(baseText) || baseText);
        }

        var trackingText = trackingSummary.get(anteNum);
        if (trackingText && trackingText.trim()) {
          parts.push(trackingText);
        }
      }

      if (parts.length > 0) {
        augmented.set(anteNum, parts.join(" | "));
      }
    });

    window.lastAugmentedSummary = augmented;
  }

  // Exports
  window.parseRawOutputByAnte = parseRawOutputByAnte;
  window.extractSearchResults = extractSearchResults;
  window.extractTrackingResults = extractTrackingResults;
  window.augmentSummaryWithSearch = augmentSummaryWithSearch;
  window.getExpandedTrackingTerms = getExpandedTrackingTerms;
  window.invalidateTrackingCache = invalidateTrackingCache;
})();
