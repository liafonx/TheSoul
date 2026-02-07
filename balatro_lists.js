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

  function translateKey(key, fallback) {
    if (root?.BalatroI18n?.t) {
      const translated = root.BalatroI18n.t(key, "zh-CN");
      if (translated && translated !== key) return translated;
    }
    if (generatedLocale && generatedLocale[key]) return generatedLocale[key];
    if (typeof fallback === "string" && fallback.length) return fallback;
    return key;
  }

  // Emoji categories for jokers used in summaries.
  // Each entry: emoji -> { color, cards, cardColors? }
  const SUMMARY_FACE_EMOJI = Object.freeze({
    "👥": { color: "#76b1ff", cards: ["Blueprint", "Brainstorm", "Invisible Joker"] },
    "🎪": { color: "#ff7a7a", cards: ["Showman"] },
    "💿": { color: "#5fd4d4", cards: ["Seance", "Sixth Sense"] },
    "👑": { color: "#ffd36a", cards: ["Baron", "Mime"] },
    "🥤": { color: "#ff7a8a", cards: ["Diet Cola"] },
    "🥊": { color: "", cards: ["Luchador"] },
    "5️⃣": { color: "#e867b2ff", cards: ["Dusk", "Sock and Buskin", "The Idol"] },
    "🧬": { color: "#c689ff", cards: ["DNA"] },
    "🃏": {
      color: "",
      cards: ["Burglar", "Turtle Bean", "Juggler", "Troubadour"],
      cardColors: { Burglar: "rgb(255, 122, 138)" },
    },
    "💴": { color: "#79c15aff", cards: ["Reserved Parking", "Golden Ticket"] },
    "🧱": { color: "", cards: ["Photograph", "Hanging Chad"] },
    "🪙": { color: "", cards: ["Certificate"] },
  });

  const LEGACY_SPECTRAL_TRANSLATIONS = Object.freeze({
    Cryptid: "神秘生物",
    "Deja Vu": "既视感(红封）",
    Ectoplasm: "灵质(负片)",
    "The Soul": "灵魂",
  });

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

  const LEGACY_JOKER_TRANSLATIONS = Object.freeze({
    DNA: "DNA",
    Blueprint: "蓝图",
    Baron: "男爵",
    Brainstorm: "头脑",
    Mime: "哑剧",
    Showman: "马戏团",
    Burglar: "窃贼",
    "Reserved Parking": "车位",
    "Turtle Bean": "黑龟豆",
    Seance: "通灵",
    "Sixth Sense": "第六感",
    "Diet Cola": "可乐",
    "Invisible Joker": "隐形",
    Photograph: "照片",
    "Golden Ticket": "门票",
    Certificate: "证书",
    "Hanging Chad": "选票",
    Dusk: "黄昏",
    "Sock and Buskin": "喜与悲",
    "The Idol": "偶像",
    Luchador: "摔角手",
    Juggler: "杂耍",
    Troubadour: "吟游诗人",
  });

  const JOKER_TRANSLATIONS = Object.freeze(
    Object.fromEntries(
      Object.entries(LEGACY_JOKER_TRANSLATIONS).map(([name, fallback]) => [
        name,
        translateKey(name, fallback),
      ])
    )
  );

  const SPECTRAL_TRANSLATIONS = Object.freeze(
    Object.fromEntries(
      Object.entries(LEGACY_SPECTRAL_TRANSLATIONS).map(([name, fallback]) => [
        name,
        translateKey(name, fallback),
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
      const translated = translateKey(tagName, tagName);
      return `${negPrefix}${emoji}${translated}`;
    }
    return `${negPrefix}${emoji}${tagName}`;
  }

  function formatSummaryVoucher(voucherName, options = {}) {
    const { chineseOnly = false } = options;
    if (!isTrackedVoucher(voucherName)) return null;
    const emoji = VOUCHER_EMOJI[voucherName] || "";
    if (chineseOnly) {
      const translated = translateKey(voucherName, voucherName);
      return `${emoji}${translated}`;
    }
    return emoji ? `${emoji}${voucherName}` : voucherName;
  }

  function formatSummaryBoss(bossName, options = {}) {
    const { chineseOnly = false } = options;
    if (!isTrackedBoss(bossName)) return null;
    const alert = "☠️";
    if (chineseOnly) {
      const translated = translateKey(bossName, bossName);
      return `${alert}${translated}`;
    }
    return `${alert}${bossName}`;
  }

  function getTagDisplay(tagName) {
    const emoji = TAG_EMOJI[tagName] || "";
    const translated = translateKey(tagName, tagName);
    return emoji ? `${emoji} ${translated}` : translated;
  }

  function getVoucherDisplay(voucherName) {
    const emoji = VOUCHER_EMOJI[voucherName] || "";
    const translated = translateKey(voucherName, voucherName);
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
    JOKER_NAMES: Object.freeze(Object.keys(JOKER_TRANSLATIONS)),
    SPECTRAL_NAMES: Object.freeze(Object.keys(SPECTRAL_TRANSLATIONS)),
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
