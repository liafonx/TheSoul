(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory(typeof globalThis !== "undefined" ? globalThis : root, true);
  } else {
    root.BalatroSharedLists = factory(root, false);
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function (root, isNode) {
  // Load locale maps for key-based lookups
  let enLocale = {};
  let zhLocale = {};
  let nameToKeyMap = {};

  if (isNode) {
    try {
      enLocale = require("./localization/generated/en-US.game.json");
      zhLocale = require("./localization/generated/zh-CN.game.json");
      nameToKeyMap = require("./localization/generated/name-to-key.json");
    } catch (_err) {
      enLocale = {};
      zhLocale = {};
      nameToKeyMap = {};
    }
  } else if (root) {
    enLocale = root.BalatroLocale_enUS || {};
    zhLocale = root.BalatroLocale_zhCN || {};
    nameToKeyMap = root.BalatroNameToKey || {};
  }

  /**
   * Translate an internal key to the current locale.
   * @param {string} key - Internal key (e.g., "j_seeing_double")
   * @returns {string} Translated display name
   */
  function translateKey(key) {
    if (root?.BalatroI18n?.t) {
      const translated = root.BalatroI18n.t(key);
      if (translated && translated !== key) return translated;
    }
    // Fallback to direct locale lookup
    const locale = root?.BalatroI18n?.getLocale?.() || "zh-CN";
    const map = locale === "zh-CN" ? zhLocale : enLocale;
    if (map && map[key]) return map[key];
    return key;
  }

  /**
   * Convert English name to internal key.
   * @param {string} englishName - English display name
   * @returns {string} Internal key or original name
   */
  function nameToKey(englishName) {
    if (root?.BalatroI18n?.nameToKey) {
      return root.BalatroI18n.nameToKey(englishName);
    }
    return nameToKeyMap[englishName] || englishName;
  }

  // Emoji categories for jokers used in summaries.
  // Each entry: emoji -> { color, cards (internal keys), cardColors? }
  const SUMMARY_FACE_EMOJI = Object.freeze({
    "👥": { color: "rgb(119, 198, 255)", cards: ["j_blueprint", "j_brainstorm", "j_invisible"] },
    "🎪": { color: "#ff7a7a", cards: ["j_ring_master"] },
    "💿": { color: "#5fd4d4", cards: ["j_seance", "j_sixth_sense"] },
    "👑": { color: "rgb(236, 194, 93)", cards: ["j_baron", "j_mime"] },
    "🥤": { color: "#ff7a8a", cards: ["j_diet_cola"] },
    "🥊": { color: "", cards: ["j_luchador"] },
    "5️⃣": { color: "#e867b2ff", cards: ["j_dusk", "j_sock_and_buskin", "j_idol", "j_bloodstone"] },
    "🧬": { color: "#c689ff", cards: ["j_dna"] },
    "🃏": {
      color: "#79c15aff",
      cards: ["j_turtle_bean", "j_troubadour"],
      cardColors: {},
    },
    "💰": { color: "", cards: ["j_reserved_parking", "j_ticket", "j_mail"] },
    "🪙": { color: "var(--ui-text-dim)", cards: ["j_certificate"] },
    "🥷": { color: "#ff7a8a", cards: ["j_burglar"] },
  });

  const TRACKED_SPECTRALS = Object.freeze([
    "c_cryptid",
    "c_deja_vu",
    "c_ectoplasm",
    "c_soul",
  ]);

  const TAG_EMOJI = Object.freeze({
    "tag_negative": "🎞️",
    "tag_double": "🖇️",
    "tag_voucher": "🎟️",
  });

  const VOUCHER_EMOJI = Object.freeze({
    "v_directors_cut": "🔄",
    "v_retcon": "🔄",
    "v_blank": "📄",
    "v_antimatter": "🩻",
  });

  const ALERT_BOSSES = Object.freeze([
    "bl_ox",
    "bl_psychic",
    "bl_plant",
    "bl_hook",
    "bl_needle",
    "bl_final_heart",
    "bl_final_leaf",
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
      TRACKED_JOKERS.map((key) => [
        key,
        translateKey(key),
      ])
    )
  );

  const SPECTRAL_TRANSLATIONS = Object.freeze(
    Object.fromEntries(
      TRACKED_SPECTRALS.map((key) => [
        key,
        translateKey(key),
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

  const TAG_KEY_SET = new Set(Object.keys(TAG_EMOJI));
  const VOUCHER_KEY_SET = new Set(Object.keys(VOUCHER_EMOJI));
  const ALERT_BOSS_SET = new Set(ALERT_BOSSES);

  function isTrackedTag(tagKey) {
    return TAG_KEY_SET.has(tagKey);
  }

  function isTrackedVoucher(voucherKey) {
    return VOUCHER_KEY_SET.has(voucherKey);
  }

  function isTrackedBoss(bossKey) {
    return ALERT_BOSS_SET.has(bossKey);
  }

  function formatSummaryTag(tagKey, options = {}) {
    const { chineseOnly = false, isFirstTag = false } = options;
    if (!isTrackedTag(tagKey)) return null;
    const emoji = TAG_EMOJI[tagKey] || "";
    const negPrefix = tagKey === "tag_negative" && isFirstTag ? "‼️" : "";
    const translated = translateKey(tagKey);
    return `${negPrefix}${emoji}${translated}`;
  }

  function formatSummaryVoucher(voucherKey, options = {}) {
    if (!isTrackedVoucher(voucherKey)) return null;
    const emoji = VOUCHER_EMOJI[voucherKey] || "";
    const translated = translateKey(voucherKey);
    return emoji ? `${emoji}${translated}` : translated;
  }

  function formatSummaryBoss(bossKey, options = {}) {
    if (!isTrackedBoss(bossKey)) return null;
    const alert = "☠️";
    const translated = translateKey(bossKey);
    return `${alert}${translated}`;
  }

  function getTagDisplay(tagKey) {
    const emoji = TAG_EMOJI[tagKey] || "";
    const translated = translateKey(tagKey);
    return emoji ? `${emoji} ${translated}` : translated;
  }

  function getVoucherDisplay(voucherKey) {
    const emoji = VOUCHER_EMOJI[voucherKey] || "";
    const translated = translateKey(voucherKey);
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
    GAME_TRANSLATIONS: Object.freeze(zhLocale || {}),
    translateKey,
    nameToKey,
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
