(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.BalatroSharedLists = factory();
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  // Emoji categories for jokers used in summaries.
  // Each entry: emoji -> { color, cards, cardColors? }
  // color may be empty to use default text color.
  const SUMMARY_FACE_EMOJI = Object.freeze({
    "👥": {
      color: "#76b1ff", // soft bright blue
      cards: ["Blueprint", "Brainstorm", "Invisible Joker"],
    },
    "🎪": {
      color: "#ff7a7a", // warm coral red
      cards: ["Showman"],
    },
    "💿": {
      color: "#5fd4d4", // bright aqua teal
      cards: ["Seance", "Sixth Sense"],
    },
    "👑": {
      color: "#ffd36a", // rich gold
      cards: ["Baron", "Mime"],
    },
    "🥤": {
      color: "#ff7a8a", // soft pink-red
      cards: ["Diet Cola"],
    },
    "🥊": {
      color: "", // #ff7a8a
      cards: ["Luchador"],
    },
    "5️⃣": {
      color: "#e867b2ff", // mint green, distinct from red/yellow
      cards: ["Dusk", "Sock and Buskin", "The Idol"],
    },
    "🧬": {
      color: "#c689ff", // bright lavender
      cards: ["DNA"],
    },
    "🃏": {
      color: "",
      cards: ["Burglar", "Turtle Bean", "Juggler", "Troubadour"],
      cardColors: {
        Burglar: "rgb(255, 122, 138)",
      },
    },
    "💴": {
      color: "#79c15aff", // money green
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

  const ALERT_BOSSES = Object.freeze([
    "The Ox",
    "The Psychic",
    "The Plant",
    "The Hook",
    "The Needle",
    "Crimson Heart",
    "Verdant Leaf",
  ]);

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
  };

  return Object.freeze(shared);
});
