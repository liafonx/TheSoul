/**
 * ui.utils.js - Shared UI utilities
 * Contains: face emoji maps, button loading states, DOM helpers
 */
(function (global) {
  "use strict";

  const sharedLists = global.BalatroSharedLists || {};
  const summaryFaceEmojiMapRaw = sharedLists.SUMMARY_FACE_EMOJI || {};
  const tagEmojiMap = sharedLists.TAG_EMOJI || {};
  const voucherEmojiMap = sharedLists.VOUCHER_EMOJI || {};
  const alertBosses = sharedLists.ALERT_BOSSES || [];
  const spectralNames = sharedLists.SPECTRAL_NAMES || [];
  const translateKeyFn = sharedLists.translateKey || ((key) => key);
  const nameToKeyFn = sharedLists.nameToKey || ((name) => name);
  const CACHE_LIMIT = 4096;

  const localeState = {
    value: null,
    isChinese: true,
  };

  const gameTextCache = new Map();
  const summaryEmojiCache = new Map();
  const faceInfoCache = new Map();
  const packNameCache = new Map();

  function getLocaleKey() {
    const rawLocale = global.BalatroI18n?.getLocale?.() || global.__BALATRO_LOCALE__ || "zh-CN";
    const normalized = String(rawLocale).toLowerCase();
    if (localeState.value !== normalized) {
      localeState.value = normalized;
      localeState.isChinese = normalized === "zh-cn";
      gameTextCache.clear();
      packNameCache.clear();
    }
    return localeState.isChinese ? "zh-CN" : "en-US";
  }

  function setCached(cache, key, value) {
    if (cache.size >= CACHE_LIMIT) cache.clear();
    cache.set(key, value);
    return value;
  }

  function isChineseLocale() {
    return getLocaleKey() === "zh-CN";
  }

  /**
   * Convert English name to internal key.
   * @param {string} englishName - English display name (e.g., "Seeing Double")
   * @returns {string} Internal key (e.g., "j_seeing_double")
   */
  function nameToKey(englishName) {
    if (global.BalatroI18n?.nameToKey) {
      return global.BalatroI18n.nameToKey(englishName);
    }
    return nameToKeyFn(englishName);
  }

  function localizeStandardCardName(name) {
    if (!isChineseLocale()) return name;
    const cardMatch = /^(\d+|Jack|Queen|King|Ace)\s+of\s+(Spades|Hearts|Clubs|Diamonds)$/i.exec((name || "").trim());
    if (!cardMatch) return name;
    const rank = cardMatch[1];
    const suit = cardMatch[2];
    const rankCn = translateKeyFn(rank);
    const suitCn = translateKeyFn(suit);
    return `${suitCn}${rankCn}`;
  }

  function localizePackName(packName) {
    const raw = String(packName || "");
    if (!raw) return raw;
    if (!isChineseLocale()) return raw;
    const cached = packNameCache.get(raw);
    if (cached !== undefined) return cached;
    const replacements = [
      ["Jumbo ", "巨型"],
      ["Mega ", "超级"],
      ["Arcana Pack", "秘术包"],
      ["Celestial Pack", "天体包"],
      ["Standard Pack", "标准包"],
      ["Buffoon Pack", "小丑包"],
      ["Spectral Pack", "幻灵包"],
    ];
    let text = raw;
    replacements.forEach(([from, to]) => {
      text = text.replace(from, to);
    });
    return setCached(packNameCache, raw, text);
  }

  /**
   * Translate game text (English name) to current locale.
   * Converts English name → internal key → locale lookup.
   * @param {string} text - English display name or text with prefixes
   * @returns {string} Translated text
   */
  function translateGameText(text) {
    const raw = String(text ?? "");
    if (!raw) return raw;
    const cacheKey = `${getLocaleKey()}::${raw}`;
    const cached = gameTextCache.get(cacheKey);
    if (cached !== undefined) return cached;

    const translated = translateGameTextUncached(raw);
    return setCached(gameTextCache, cacheKey, translated);
  }

  function translateGameTextUncached(raw) {
    const normalized = raw.replace(/\s+/g, " ").trim();

    // Handle prefixes (‼️, 🔘)
    const prefixMatch = /^(‼️|🔘)\s*/.exec(normalized);
    if (prefixMatch) {
      const translatedRest = translateGameTextUncached(normalized.slice(prefixMatch[0].length));
      return `${prefixMatch[1]} ${translatedRest}`;
    }

    // Try standard card name localization first
    const standard = localizeStandardCardName(normalized);
    if (standard !== normalized) return standard;

    // Convert English name to internal key, then translate
    const key = nameToKey(normalized);
    if (key !== normalized) {
      // We have an internal key, use i18n to translate
      const translated = global.BalatroI18n?.t?.(key);
      if (translated && translated !== key) return translated;
    }

    // Fallback: try direct translation via translateKey
    const direct = translateKeyFn(normalized);
    if (direct !== normalized) return direct;

    return raw;
  }

  // Build normalized maps for face emoji lookups
  // summaryFaceEmojiMap: emoji -> { color, cards: [keys], cardColors: { key: color } }
  // summaryFaceCardMap: key -> { emoji, color, cn }
  const summaryFaceEmojiMap = {};
  const summaryEmojiMap = {};
  const summaryFaceCardMap = {};
  const tagNameEmojiMap = {};
  const voucherNameEmojiMap = {};
  const bossNameEmojiMap = {};
  const spectralNameEmojiMap = {};
  const mappedEmojiEntries = [];
  const faceMatchers = [];

  Object.entries(summaryFaceEmojiMapRaw).forEach(([emoji, value]) => {
    const color = value && typeof value === "object" ? value.color || "" : value || "";
    let cards = [];
    let cardColors = {};
    if (value && typeof value === "object" && value.cards) {
      cards = Array.isArray(value.cards) ? value.cards : Object.keys(value.cards);
    }
    if (value && typeof value === "object" && value.cardColors) {
      cardColors = value.cardColors;
    }
    summaryFaceEmojiMap[emoji] = { color, cards, cardColors };
    summaryEmojiMap[emoji] = { color, cards: [...cards], cardColors: { ...cardColors } };
    cards.forEach((key) => {
      const cn = translateKeyFn(key);
      const cardColor = cardColors[key] || color;
      summaryFaceCardMap[key] = { emoji, color: cardColor, cn };
    });
  });

  function ensureSummaryEmoji(emoji, color) {
    if (!emoji) return null;
    if (!summaryEmojiMap[emoji]) {
      summaryEmojiMap[emoji] = { color: color || "", cards: [] };
    } else if (!summaryEmojiMap[emoji].color && color) {
      summaryEmojiMap[emoji].color = color;
    }
    return summaryEmojiMap[emoji];
  }

  function addEmojiCard(emoji, cardKey, color) {
    const entry = ensureSummaryEmoji(emoji, color);
    if (!entry || !cardKey) return;
    if (!entry.cards.includes(cardKey)) entry.cards.push(cardKey);
  }

  const enLocale = global.BalatroLocale_enUS || {};

  Object.entries(tagEmojiMap).forEach(([key, emoji]) => {
    if (!emoji) return;
    tagNameEmojiMap[key] = emoji;
    addEmojiCard(emoji, key, "");
    mappedEmojiEntries.push({ key, localizedName: translateKeyFn(key), enName: enLocale[key] || "", emoji });
  });

  Object.entries(voucherEmojiMap).forEach(([key, emoji]) => {
    if (!emoji) return;
    voucherNameEmojiMap[key] = emoji;
    addEmojiCard(emoji, key, "");
    mappedEmojiEntries.push({ key, localizedName: translateKeyFn(key), enName: enLocale[key] || "", emoji });
  });

  alertBosses.forEach((key) => {
    if (!key) return;
    bossNameEmojiMap[key] = "☠️";
    addEmojiCard("☠️", key, "#ff7a7a");
    mappedEmojiEntries.push({ key, localizedName: translateKeyFn(key), enName: enLocale[key] || "", emoji: "☠️" });
  });

  spectralNames.forEach((key) => {
    if (!key) return;
    spectralNameEmojiMap[key] = "💠";
    addEmojiCard("💠", key, "#5fd4d4");
    mappedEmojiEntries.push({ key, localizedName: translateKeyFn(key), enName: enLocale[key] || "", emoji: "💠" });
  });

  addEmojiCard("♔", "King Cards", "#ffd36a");
  addEmojiCard("‼️", "Negative marker", "#ff7a7a");

  Object.entries(summaryFaceCardMap).forEach(([cardKey, info]) => {
    if (info.cn) {
      faceMatchers.push({ token: info.cn, info, key: cardKey });
    }
    // Also match by English name from locale
    const enName = global.BalatroLocale_enUS?.[cardKey];
    if (enName) {
      faceMatchers.push({ token: enName, info, key: cardKey });
    }
    faceMatchers.push({ token: cardKey, info, key: cardKey });
  });

  /**
   * Get face info for a text segment (matches joker names)
   * @param {string} seg - Text segment to check
   * @returns {{ emoji: string, color: string, cn: string } | null}
   */
  function getFaceInfoForSegment(seg) {
    const text = String(seg || "");
    if (!text) return null;
    const cached = faceInfoCache.get(text);
    if (cached !== undefined) return cached;

    for (const matcher of faceMatchers) {
      if (text.includes(matcher.token)) {
        return setCached(faceInfoCache, text, matcher.info);
      }
    }
    return setCached(faceInfoCache, text, null);
  }

  /**
   * Find all summary emoji markers represented by a text segment.
   * Supports direct emoji markers and game-name based lookups.
   * @param {string} text
   * @returns {string[]}
   */
  function getSummaryEmojisForText(text) {
    const source = String(text ?? "").trim();
    if (!source) return [];
    const cached = summaryEmojiCache.get(source);
    if (cached) return cached;

    const hits = new Set();
    Object.keys(summaryEmojiMap).forEach((emoji) => {
      if (source.includes(emoji)) hits.add(emoji);
    });

    for (const matcher of faceMatchers) {
      if (source.includes(matcher.token)) {
        hits.add(matcher.info.emoji);
      }
    }

    mappedEmojiEntries.forEach((entry) => {
      if (source.includes(entry.key) || source.includes(entry.localizedName) || (entry.enName && source.includes(entry.enName))) {
        hits.add(entry.emoji);
      }
    });

    if (source.includes("King")) hits.add("♔");
    if (source.includes("‼️") || /\bNegative\b/i.test(source)) hits.add("‼️");

    return setCached(summaryEmojiCache, source, [...hits]);
  }

  /**
   * Set loading state on a button (adds spinner, disables)
   * @param {HTMLButtonElement} btn - Button element
   * @param {boolean} flag - Loading state
   */
  function setButtonLoadingState(btn, flag) {
    if (!btn) return;
    const isLoading = Boolean(flag);
    btn.disabled = isLoading;
    if (isLoading) {
      btn.classList.remove("is-loading");
      void btn.offsetWidth; // force reflow
      btn.classList.add("is-loading");
    } else {
      btn.classList.remove("is-loading");
    }
  }

  /**
   * Create a DOM element with optional class and text
   * @param {string} tag - HTML tag name
   * @param {string} [className] - CSS class(es)
   * @param {string} [text] - Text content
   * @returns {HTMLElement}
   */
  function createElement(tag, className, text) {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (text !== undefined) el.textContent = text;
    return el;
  }

  /**
   * Clean summary line (remove ante prefix)
   * @param {string} rawLine - Raw summary line
   * @returns {string}
   */
  function cleanSummaryLine(rawLine) {
    return rawLine
      .replace(/^\s*ante\s*\d+\s*[：:]\s*/i, "")
      .replace(/^\s*\d+\s*[：:]\s*/, "")
      .trim() || rawLine;
  }

  /**
   * Setup drag-to-scroll on an element
   * @param {HTMLElement} element - Scrollable element
   */
  function setupDragScroll(element) {
    let isDown = false;
    let startX = 0;
    let scrollLeft = 0;

    element.addEventListener("mousedown", (e) => {
      if (!element.classList.contains("scrollable")) return;
      isDown = true;
      element.classList.add("active");
      startX = e.pageX - element.offsetLeft;
      scrollLeft = element.scrollLeft;
      element.classList.add("no-select");
    });

    element.addEventListener("mouseleave", () => {
      if (!element.classList.contains("scrollable")) return;
      isDown = false;
      element.classList.remove("active", "no-select");
    });

    element.addEventListener("mouseup", () => {
      if (!element.classList.contains("scrollable")) return;
      isDown = false;
      element.classList.remove("active", "no-select");
    });

    element.addEventListener("mousemove", (e) => {
      if (!isDown || !element.classList.contains("scrollable")) return;
      e.preventDefault();
      const x = e.pageX - element.offsetLeft;
      element.scrollLeft = scrollLeft - (x - startX);
    });
  }

  /**
   * Setup pointer-based horizontal drag scroll (for touch/mouse)
   * @param {HTMLElement} element - Element to scroll
   * @param {Object} callbacks - Optional { onDragStart, onDragEnd }
   * @returns {{ isDragging: () => boolean }}
   */
  function setupPointerDragScroll(element, callbacks = {}) {
    let isDragging = false;
    let startX = 0;
    let startScrollLeft = 0;

    element.addEventListener("pointerdown", (e) => {
      if (e.button !== undefined && e.button !== 0) return;
      isDragging = false;
      startX = e.clientX;
      startScrollLeft = element.scrollLeft;
      element.setPointerCapture(e.pointerId);
      callbacks.onDragStart?.();
    });

    element.addEventListener("pointermove", (e) => {
      if (!element.hasPointerCapture(e.pointerId)) return;
      const deltaX = e.clientX - startX;
      if (!isDragging && Math.abs(deltaX) > 4) isDragging = true;
      if (isDragging) element.scrollLeft = startScrollLeft - deltaX;
    });

    const onEnd = (e) => {
      if (element.hasPointerCapture(e.pointerId)) {
        element.releasePointerCapture(e.pointerId);
      }
      if (isDragging) e.preventDefault();
      setTimeout(() => { isDragging = false; }, 0);
      callbacks.onDragEnd?.();
    };

    element.addEventListener("pointerup", onEnd);
    element.addEventListener("pointercancel", onEnd);

    return { isDragging: () => isDragging };
  }

  // Initialize global emoji filter state
  global.summaryEmojiFilter = global.summaryEmojiFilter || {};
  Object.keys(summaryEmojiMap).forEach((emoji) => {
    if (!(emoji in global.summaryEmojiFilter)) {
      global.summaryEmojiFilter[emoji] = true;
    }
  });

  // Initialize global color toggle state
  global.summaryColorOff = Boolean(global.summaryColorOff);
  // Initialize nearby summary visibility (default enabled)
  global.summaryNearbyVisible = global.summaryNearbyVisible !== false;

  // Export utilities
  global.BalatroUtils = {
    summaryFaceEmojiMap,
    summaryEmojiMap,
    summaryFaceCardMap,
    nameToKey,
    translateGameText,
    localizeStandardCardName,
    localizePackName,
    isChineseLocale,
    getFaceInfoForSegment,
    getSummaryEmojisForText,
    setButtonLoadingState,
    createElement,
    cleanSummaryLine,
    setupDragScroll,
    setupPointerDragScroll,
  };
})(window);
