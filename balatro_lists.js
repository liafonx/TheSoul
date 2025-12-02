(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.BalatroSharedLists = factory();
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  const JOKER_TRANSLATIONS = Object.freeze({
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
    // "Cloud 9": "9霄",
    // "Card Sharp": "老千",
    Photograph: "照片",
    // "To the Moon": "月球",
    // Bull: "斗牛",
    // "Trading Card": "交易卡",
    "Golden Ticket": "门票",
    // "Mr. Bones": "骷髅",
    // Acrobat: "杂技",
    Certificate: "证书",
    "Hanging Chad": "选票",
    // "The Duo": "二重奏",
    // Satellite: "卫星",
    // "Driver's License": "驾照",
    Dusk: "黄昏",
    "Sock and Buskin": "喜与悲",
    "The Idol": "偶像",
    Luchador: "摔角手",
    Juggler: "杂耍",
    Troubadour: "吟游诗人",
  });

  const SPECTRAL_TRANSLATIONS = Object.freeze({
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

  // special vouchers we want to surface in summaries/search
  const VOUCHER_EMOJI = Object.freeze({
    "Director's Cut": "🔄",
    Retcon: "🔄",
  });

  // Emoji categories for jokers used in summaries.
  // Each entry: emoji -> { color, cards }
  // color may be empty to use default text color.
  const SUMMARY_FACE_EMOJI = Object.freeze({
    "👥": {
      color: "#4fa3ff", // blue
      cards: ["Blueprint", "Brainstorm", "Invisible Joker"],
    },
    "🎪": {
      color: "#ff5a5a", // red
      cards: ["Showman"],
    },
    "💿": {
      color: "#6bd1e3ff", // purple
      cards: ["Seance", "Sixth Sense"],
    },
    "👑": {
      color: "#ffd966", // yellow
      cards: ["Baron", "Mime"],
    },
    "🥤": {
      color: "#ff5a5a", // red
      cards: ["Diet Cola"],
    },
    "🥊": {
      color: "#ff5a5a", // red
      cards: ["Luchador"],
    },
    "5️⃣": {
      color: "#ffd966", // green
      cards: ["Dusk", "Sock and Buskin", "The Idol"],
    },
    "🧬": {
      color: "#cf6bd4", // default violet
      cards: ["DNA"],
    },
    "➕": {
      color: "#cf6bd4", // shared violet
      cards: ["Burglar", "Turtle Bean", "Juggler", "Troubadour"],
    },
    "💴": {
      color: "#5eb95eff", // default color
      cards: ["Reserved Parking", "Golden Ticket"],
    },
    "🧱": {
      color: "", // default color
      cards: ["Photograph", "Hanging Chad"],
    },
    "🪙": {
      color: "", // default color
      cards: ["Certificate"],
    },
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

  const shared = {
    JOKER_TRANSLATIONS,
    SPECTRAL_TRANSLATIONS,
    TAG_EMOJI,
    ALERT_BOSSES,
    VOUCHER_EMOJI,
    SUMMARY_FACE_EMOJI,
    JOKER_NAMES: Object.freeze(Object.keys(JOKER_TRANSLATIONS)),
    SPECTRAL_NAMES: Object.freeze(Object.keys(SPECTRAL_TRANSLATIONS)),
    TAG_NAMES: Object.freeze(Object.keys(TAG_EMOJI)),
    VOUCHER_NAMES: Object.freeze(Object.keys(VOUCHER_EMOJI)),
    BOSSES: ALERT_BOSSES,
  };

  return Object.freeze(shared);
});
