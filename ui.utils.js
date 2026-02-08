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
  const jokerTranslations = sharedLists.JOKER_TRANSLATIONS || {};
  const translateKey = sharedLists.translateKey || ((key) => key);
  const gameTranslations = sharedLists.GAME_TRANSLATIONS || {};
  const reverseGameTranslations = {};
  const CACHE_LIMIT = 4096;

  const localeState = {
    value: null,
    isChinese: true,
  };

  const gameTextCache = new Map();
  const summaryEmojiCache = new Map();
  const faceInfoCache = new Map();
  const packNameCache = new Map();

  Object.keys(gameTranslations).forEach((englishKey) => {
    const chineseValue = gameTranslations[englishKey];
    if (typeof chineseValue !== "string" || !chineseValue) return;
    if (!(chineseValue in reverseGameTranslations)) {
      reverseGameTranslations[chineseValue] = englishKey;
    }
  });

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

  function localizeStandardCardName(name) {
    if (!isChineseLocale()) return name;
    const cardMatch = /^(\d+|Jack|Queen|King|Ace)\s+of\s+(Spades|Hearts|Clubs|Diamonds)$/i.exec((name || "").trim());
    if (!cardMatch) return name;
    const rank = cardMatch[1];
    const suit = cardMatch[2];
    const rankCn = translateKey(rank);
    const suitCn = translateKey(suit);
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
    if (!isChineseLocale()) {
      const normalizedRaw = raw.replace(/\s+/g, " ").trim();
      const prefixMatch = /^(‼️|🔘)\s*/.exec(normalizedRaw);
      if (prefixMatch) {
        const englishRest = translateGameTextUncached(normalizedRaw.slice(prefixMatch[0].length));
        return `${prefixMatch[1]} ${englishRest}`;
      }
      return reverseGameTranslations[normalizedRaw] || raw;
    }

    const normalized = raw.replace(/\s+/g, " ").trim();
    const prefixMatch = /^(‼️|🔘)\s*/.exec(normalized);
    if (prefixMatch) {
      const translatedRest = translateGameTextUncached(normalized.slice(prefixMatch[0].length));
      return `${prefixMatch[1]} ${translatedRest}`;
    }

    const standard = localizeStandardCardName(normalized);
    if (standard !== normalized) return standard;

    const direct = translateKey(normalized);
    if (direct !== normalized) return direct;

    return raw;
  }

  // Build normalized maps for face emoji lookups
  // summaryFaceEmojiMap: emoji -> { color, cards: [eng], cardColors: { eng: color } }
  // summaryFaceCardMap: eng -> { emoji, color, cn }
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
    cards.forEach((name) => {
      const cn = translateKey(name);
      const cardColor = cardColors[name] || color;
      summaryFaceCardMap[name] = { emoji, color: cardColor, cn };
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

  function addEmojiCard(emoji, cardName, color) {
    const entry = ensureSummaryEmoji(emoji, color);
    if (!entry || !cardName) return;
    if (!entry.cards.includes(cardName)) entry.cards.push(cardName);
  }

  Object.entries(tagEmojiMap).forEach(([name, emoji]) => {
    if (!emoji) return;
    tagNameEmojiMap[name] = emoji;
    addEmojiCard(emoji, name, "");
    mappedEmojiEntries.push({ englishName: name, localizedName: translateKey(name), emoji });
  });

  Object.entries(voucherEmojiMap).forEach(([name, emoji]) => {
    if (!emoji) return;
    voucherNameEmojiMap[name] = emoji;
    addEmojiCard(emoji, name, "");
    mappedEmojiEntries.push({ englishName: name, localizedName: translateKey(name), emoji });
  });

  alertBosses.forEach((name) => {
    if (!name) return;
    bossNameEmojiMap[name] = "☠️";
    addEmojiCard("☠️", name, "#ff7a7a");
    mappedEmojiEntries.push({ englishName: name, localizedName: translateKey(name), emoji: "☠️" });
  });

  spectralNames.forEach((name) => {
    if (!name) return;
    spectralNameEmojiMap[name] = "💠";
    addEmojiCard("💠", name, "#5fd4d4");
    mappedEmojiEntries.push({ englishName: name, localizedName: translateKey(name), emoji: "💠" });
  });

  addEmojiCard("♔", "King Cards", "#ffd36a");
  addEmojiCard("‼️", "Negative marker", "#ff7a7a");

  Object.entries(summaryFaceCardMap).forEach(([cardName, info]) => {
    if (info.cn) {
      faceMatchers.push({ token: info.cn, info });
    }
    faceMatchers.push({ token: cardName, info });
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
      if (source.includes(entry.englishName) || source.includes(entry.localizedName)) {
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
