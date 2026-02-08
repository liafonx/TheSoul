(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory(typeof globalThis !== "undefined" ? globalThis : root, true);
  } else {
    root.BalatroSharedLists = factory(root, false);
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function (root, isNode) {
  let generatedLocale = {};
  if (isNode) {
    try {
      generatedLocale = require("./localization/generated/zh-CN.game.json");
    } catch (_err) {
      generatedLocale = {};
    }
  } else if (root && typeof root.BalatroLocale_zhCN === "object") {
    generatedLocale = root.BalatroLocale_zhCN;
  }

  function translateKey(key) {
    if (root?.BalatroI18n?.t) {
      const translated = root.BalatroI18n.t(key, "zh-CN");
      if (translated && translated !== key) return translated;
    }
    if (generatedLocale && generatedLocale[key]) return generatedLocale[key];
    return key;
  }

  // Emoji categories for jokers used in summaries.
  // Each entry: emoji -> { color, cards, cardColors? }
  const SUMMARY_FACE_EMOJI = Object.freeze({
    "👥": { color: "rgb(119, 198, 255)", cards: ["Blueprint", "Brainstorm", "Invisible Joker"] },
    "🎪": { color: "#ff7a7a", cards: ["Showman"] },
    "💿": { color: "#5fd4d4", cards: ["Seance", "Sixth Sense"] },
    "👑": { color: "rgb(236, 194, 93)", cards: ["Baron", "Mime"] },
    "🥤": { color: "#ff7a8a", cards: ["Diet Cola"] },
    "🥊": { color: "", cards: ["Luchador"] },
    "5️⃣": { color: "#e867b2ff", cards: ["Dusk", "Sock and Buskin", "The Idol", "Bloodstone"] },
    "🧬": { color: "#c689ff", cards: ["DNA"] },
    "🃏": {
      color: "#79c15aff",
      cards: ["Turtle Bean", "Troubadour"],
      cardColors: {},
    },
    "💰": { color: "", cards: ["Reserved Parking", "Golden Ticket", "Mail-In Rebate"] }, // 
    // "🧱": { color: "", cards: ["Photograph", "Hanging Chad"] },
    "🪙": { color: "var(--ui-text-dim)", cards: ["Certificate"] },
    "🥷": { color: "#ff7a8a", cards: ["Burglar"] },
  });

  const TRACKED_SPECTRALS = Object.freeze([
    "Cryptid",
    "Deja Vu",
    "Ectoplasm",
    "The Soul",
  ]);

  const TAG_EMOJI = Object.freeze({
    "Negative Tag": "🎞️",
    "Double Tag": "🖇️",
    "Voucher Tag": "🎟️",
  });

  const VOUCHER_EMOJI = Object.freeze({
    "Director's Cut": "🔄",
    Retcon: "🔄",
    Blank: "📄",
    Antimatter: "🩻",
  });

  const ALERT_BOSSES = Object.freeze([
    "The Ox",
    "The Psychic",
    "The Plant",
    "The Hook",
    "The Needle",
    "Crimson Heart",
    "Verdant Leaf",
  ]);

  const TRACKED_JOKERS = Object.freeze(
    [...new Set(
      Object.values(SUMMARY_FACE_EMOJI).flatMap((value) => {
        if (!value || typeof value !== "object") return [];
        if (Array.isArray(value.cards)) return value.cards;
        if (value.cards && typeof value.cards === "object") {
          return Object.keys(value.cards);
        }
        return [];
      })
    )]
  );

  const JOKER_TRANSLATIONS = Object.freeze(
    Object.fromEntries(
      TRACKED_JOKERS.map((name) => [
        name,
        translateKey(name),
      ])
    )
  );

  const SPECTRAL_TRANSLATIONS = Object.freeze(
    Object.fromEntries(
      TRACKED_SPECTRALS.map((name) => [
        name,
        translateKey(name),
      ])
    )
  );

  // Keep legacy display output stable for tests/consumers.
  const KING_DISPLAY = Object.freeze({
    "Red Seal": "红封K",
    Steel: "钢铁K",
    Gold: "黄金K",
    "Red Seal Steel": "红封钢K",
    "Red Seal Gold": "红封金K",
  });

  const SPECTRAL_PACK_PREFIXES = Object.freeze([
    "Spectral Pack -",
    "Jumbo Spectral Pack -",
    "Mega Spectral Pack -",
    "Arcana Pack -",
  ]);

  const BUFFOON_PACK_PREFIXES = Object.freeze([
    "Buffoon Pack -",
    "Jumbo Buffoon Pack -",
    "Mega Buffoon Pack -",
  ]);

  const TAG_NAME_SET = new Set(Object.keys(TAG_EMOJI));
  const VOUCHER_NAME_SET = new Set(Object.keys(VOUCHER_EMOJI));
  const ALERT_BOSS_SET = new Set(ALERT_BOSSES);

  function isTrackedTag(tagName) {
    return TAG_NAME_SET.has(tagName);
  }

  function isTrackedVoucher(voucherName) {
    return VOUCHER_NAME_SET.has(voucherName);
  }

  function isTrackedBoss(bossName) {
    return ALERT_BOSS_SET.has(bossName);
  }

  function formatSummaryTag(tagName, options = {}) {
    const { chineseOnly = false, isFirstTag = false } = options;
    if (!isTrackedTag(tagName)) return null;
    const emoji = TAG_EMOJI[tagName] || "";
    const negPrefix = tagName === "Negative Tag" && isFirstTag ? "‼️" : "";
    if (chineseOnly) {
      const translated = translateKey(tagName);
      return `${negPrefix}${emoji}${translated}`;
    }
    return `${negPrefix}${emoji}${tagName}`;
  }

  function formatSummaryVoucher(voucherName, options = {}) {
    const { chineseOnly = false } = options;
    if (!isTrackedVoucher(voucherName)) return null;
    const emoji = VOUCHER_EMOJI[voucherName] || "";
    if (chineseOnly) {
      const translated = translateKey(voucherName);
      return `${emoji}${translated}`;
    }
    return emoji ? `${emoji}${voucherName}` : voucherName;
  }

  function formatSummaryBoss(bossName, options = {}) {
    const { chineseOnly = false } = options;
    if (!isTrackedBoss(bossName)) return null;
    const alert = "☠️";
    if (chineseOnly) {
      const translated = translateKey(bossName);
      return `${alert}${translated}`;
    }
    return `${alert}${bossName}`;
  }

  function getTagDisplay(tagName) {
    const emoji = TAG_EMOJI[tagName] || "";
    const translated = translateKey(tagName);
    return emoji ? `${emoji} ${translated}` : translated;
  }

  function getVoucherDisplay(voucherName) {
    const emoji = VOUCHER_EMOJI[voucherName] || "";
    const translated = translateKey(voucherName);
    return emoji ? `${emoji} ${translated}` : translated;
  }

  const shared = {
    JOKER_TRANSLATIONS,
    SPECTRAL_TRANSLATIONS,
    TAG_EMOJI,
    ALERT_BOSSES,
    VOUCHER_EMOJI,
    SUMMARY_FACE_EMOJI,
    KING_DISPLAY,
    SPECTRAL_PACK_PREFIXES,
    BUFFOON_PACK_PREFIXES,
    TRACKED_JOKERS,
    TRACKED_SPECTRALS,
    JOKER_NAMES: TRACKED_JOKERS,
    SPECTRAL_NAMES: TRACKED_SPECTRALS,
    TAG_NAMES: Object.freeze(Object.keys(TAG_EMOJI)),
    VOUCHER_NAMES: Object.freeze(Object.keys(VOUCHER_EMOJI)),
    BOSSES: ALERT_BOSSES,
    GAME_TRANSLATIONS: Object.freeze(generatedLocale || {}),
    translateKey,
    getTagDisplay,
    getVoucherDisplay,
    isTrackedTag,
    isTrackedVoucher,
    isTrackedBoss,
    formatSummaryTag,
    formatSummaryVoucher,
    formatSummaryBoss,
  };

  return Object.freeze(shared);
});
