"use strict";

const hasNodeEnv =
  typeof module !== "undefined" && typeof module.exports !== "undefined";
const nodeFs = hasNodeEnv ? require("fs") : null;
const nodePath = hasNodeEnv ? require("path") : null;

// Load shared lists from balatro_lists.js
let sharedLists = null;
if (hasNodeEnv) {
  try {
    sharedLists = require("./balatro_lists.js");
  } catch (err) {
    console.warn("Failed to load balatro_lists.js:", err.message);
  }
} else if (typeof globalThis !== "undefined" && globalThis.BalatroSharedLists) {
  sharedLists = globalThis.BalatroSharedLists;
}

if (!sharedLists) {
  console.warn("BalatroSharedLists not found. Using empty defaults.");
  sharedLists = {};
}

const {
  JOKER_TRANSLATIONS = {},
  SPECTRAL_TRANSLATIONS = {},
  TAG_EMOJI = {},
  ALERT_BOSSES = [],
  VOUCHER_EMOJI = {},
  JOKER_NAMES = [],
  SPECTRAL_NAMES = [],
  TAG_NAMES = [],
  VOUCHER_NAMES = [],
  SUMMARY_FACE_EMOJI = {},
  KING_DISPLAY = {},
  SPECTRAL_PACK_PREFIXES = [],
  BUFFOON_PACK_PREFIXES = [],
  translateKey = (_key, fallback) => fallback ?? _key,
  isTrackedTag = (tagName) => Boolean(TAG_EMOJI[tagName]),
  isTrackedVoucher = (voucherName) => Boolean(VOUCHER_EMOJI[voucherName]),
  isTrackedBoss = (bossName) => ALERT_BOSSES.includes(bossName),
  formatSummaryTag = (tagName, options = {}) => {
    const { chineseOnly = false, isFirstTag = false } = options;
    const emoji = TAG_EMOJI[tagName] || "";
    const negPrefix = tagName === "Negative Tag" && isFirstTag ? "‼️" : "";
    if (chineseOnly) return `${negPrefix}${emoji}${translateKey(tagName, tagName)}`;
    return emoji ? `${negPrefix}${emoji}${tagName}` : tagName;
  },
  formatSummaryVoucher = (voucherName, options = {}) => {
    const { chineseOnly = false } = options;
    const emoji = VOUCHER_EMOJI[voucherName] || "";
    if (!emoji) return voucherName || null;
    if (chineseOnly) return `${emoji}${translateKey(voucherName, voucherName)}`;
    return `${emoji}${voucherName}`;
  },
  formatSummaryBoss = (bossName, options = {}) => {
    const { chineseOnly = false } = options;
    if (!ALERT_BOSSES.includes(bossName)) return null;
    if (chineseOnly) return `☠️${translateKey(bossName, bossName)}`;
    return `☠️${bossName}`;
  },
} = sharedLists;

// Pre-compiled regex patterns
const RE_ANTE_HEADER = /^\s*(?:==)?\s*ANTE\s+(\d+)(?:==)?/i;
const RE_SHOP_LINE = /^(\d+)\)\s+(.*)$/;
const RE_KING_SUIT = /\bKing of ([A-Za-z]+)/i;

// Build regex maps for name matching
const escapeRegExp = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const JOKER_PATTERNS = Object.fromEntries(
  JOKER_NAMES.map((name) => [name, new RegExp(`\\b${escapeRegExp(name)}\\b`)])
);
const NEGATIVE_JOKER_PATTERNS = Object.fromEntries(
  JOKER_NAMES.map((name) => [name, new RegExp(`\\bNegative\\s+${escapeRegExp(name)}\\b`)])
);
const SPECTRAL_PATTERNS = Object.fromEntries(
  SPECTRAL_NAMES.map((name) => [name, new RegExp(`\\b${escapeRegExp(name)}\\b`)])
);

// Build joker name -> face emoji lookup (lazy initialized)
let jokerFaceEmojiMap = null;
function getFaceEmoji(jokerName) {
  if (!jokerFaceEmojiMap) {
    jokerFaceEmojiMap = {};
    for (const [emoji, cfg] of Object.entries(SUMMARY_FACE_EMOJI)) {
      if (!cfg?.cards) continue;
      const cards = Array.isArray(cfg.cards) ? cfg.cards : Object.keys(cfg.cards);
      for (const name of cards) {
        jokerFaceEmojiMap[name] ??= emoji;
      }
    }
  }
  return jokerFaceEmojiMap[jokerName] || "";
}

// Utility functions
const splitCsv = (str) => (str || "").split(",").map((s) => s.trim()).filter(Boolean);
const normalizeText = (text) => (text || "").replace(/\r\n|\r/g, "\n");

function startsWithAny(line, prefixes) {
  return Array.isArray(prefixes) && prefixes.some((p) => line.startsWith(p));
}

// Extract king card variants (Red Seal, Steel, Gold)
function getKingVariants(cardText) {
  const variants = [];
  if (/\bRed Seal\b/i.test(cardText)) variants.push("Red Seal");
  if (/\bSteel\b/i.test(cardText)) variants.push("Steel");
  if (/\bGold\b/i.test(cardText)) variants.push("Gold");
  return variants;
}

// Format king display name
function formatKingDisplay(cardText, chineseOnly = false) {
  const variants = getKingVariants(cardText);
  if (!variants.length) return null;
  const english = `${variants.join(" ")} King`;
  if (!chineseOnly) return english;

  const prefix = variants.join(" ");
  const chinese = KING_DISPLAY[prefix];
  return chinese || english;
}

/**
 * AnteData - Collects and formats data for a single ante
 */
class AnteData {
  constructor(number) {
    this.number = number;
    this.jesterCards = [];
    this.orderCounter = 0;
    this.buffoonJesters = [];
    this.buffoonSeen = new Set();
    this.spectralCards = [];
    this.spectralSeen = new Set();
    this.tagOrder = [];
    this.tagNames = [];
    this.kingCards = [];
    this.kingSeen = new Set();
    this.voucher = null;
    this.boss = null;
  }

  addJester(name, negative, index) {
    if (!JOKER_TRANSLATIONS[name]) return;
    this.jesterCards.push({
      name,
      negative: Boolean(negative),
      index,
      order: this.orderCounter++,
    });
  }

  addBuffoonJester(name) {
    if (!JOKER_TRANSLATIONS[name] || this.buffoonSeen.has(name)) return;
    this.buffoonSeen.add(name);
    this.buffoonJesters.push(name);
  }

  addSpectral(name) {
    if (!SPECTRAL_TRANSLATIONS[name] || this.spectralSeen.has(name)) return;
    this.spectralSeen.add(name);
    this.spectralCards.push(name);
  }

  addTag(tagName) {
    if (!this.tagOrder.includes(tagName)) this.tagOrder.push(tagName);
    if (isTrackedTag(tagName) && !this.tagNames.includes(tagName)) {
      this.tagNames.push(tagName);
    }
  }

  addKing(name) {
    const normalized = (name || "").trim();
    if (!normalized || this.kingSeen.has(normalized)) return;
    this.kingSeen.add(normalized);
    this.kingCards.push(normalized);
  }

  getTagDisplay(options = {}) {
    const { chineseOnly = false } = options;
    const firstIsNegative = this.tagOrder[0] === "Negative Tag";
    return this.tagNames
      .map((tag) => {
        return formatSummaryTag(tag, { chineseOnly, isFirstTag: firstIsNegative });
      })
      .filter(Boolean);
  }

  hasOutput() {
    const hasTrackedBoss = Boolean(this.boss && isTrackedBoss(this.boss));
    const hasTrackedVoucher = Boolean(this.voucher && isTrackedVoucher(this.voucher));
    return (
      hasTrackedBoss ||
      hasTrackedVoucher ||
      this.getTagDisplay().length > 0 ||
      this.jesterCards.length > 0 ||
      this.spectralCards.length > 0 ||
      this.kingCards.length > 0 ||
      this.buffoonJesters.length > 0
    );
  }

  formatOutput(options = {}) {
    const { chineseOnly = false } = options;
    const parts = [];
    const bossDisplay = this.boss && isTrackedBoss(this.boss)
      ? formatSummaryBoss(this.boss, { chineseOnly })
      : null;
    const voucherDisplay = this.voucher && isTrackedVoucher(this.voucher)
      ? formatSummaryVoucher(this.voucher, { chineseOnly })
      : null;

    // Boss/voucher segment
    if (chineseOnly) {
      const headParts = [bossDisplay, voucherDisplay].filter(Boolean);
      if (headParts.length) parts.push(headParts.join("、"));
    } else {
      const headParts = [bossDisplay, voucherDisplay].filter(Boolean);
      if (headParts.length) parts.push(headParts.join("、"));
    }

    // Tags
    const tagDisplay = this.getTagDisplay({ chineseOnly });
    if (tagDisplay.length) parts.push(tagDisplay.join("、"));

    // Spectrals
    if (this.spectralCards.length) {
      const spectrals = this.spectralCards.map((name) => {
        const cn = translateKey(name, SPECTRAL_TRANSLATIONS[name] || name);
        return chineseOnly ? cn : name;
      });
      parts.push(`💠${spectrals.join("、")}`);
    }

    // Kings
    if (this.kingCards.length) {
      const kings = this.kingCards.map((k) => formatKingDisplay(k, chineseOnly)).filter(Boolean);
      if (kings.length) parts.push(`♔${kings.join("、")}`);
    }

    // Buffoon jokers
    if (this.buffoonJesters.length) {
      const buffoons = this.buffoonJesters.map((name, i) => {
        const cn = translateKey(name, JOKER_TRANSLATIONS[name] || name);
        const face = getFaceEmoji(name);
        const base = chineseOnly ? cn : name;
        return i === 0 ? `👝${face}${base}` : `${face}${base}`;
      });
      parts.push(buffoons.join("、"));
    }

    // Shop jokers
    if (this.jesterCards.length) {
      const jesters = this.jesterCards
        .slice()
        .sort((a, b) => a.order - b.order)
        .map(({ name, negative, index }) => {
          const cn = translateKey(name, JOKER_TRANSLATIONS[name] || name);
          const face = getFaceEmoji(name);
          const neg = negative ? "‼️" : "";
          return chineseOnly
            ? `${face}${cn}${neg}#${index}`
            : `${face}${name}${neg}#${index}`;
        });
      parts.push(jesters.join("、"));
    }

    return `${this.number}：${parts.join(" | ")}`;
  }

  toPlainObject() {
    return {
      number: this.number,
      tagNames: [...this.tagNames],
      tagEmojis: this.getTagDisplay(),
      spectralCards: [...this.spectralCards],
      kingCards: [...this.kingCards],
      buffoonJesters: [...this.buffoonJesters],
      jesterCards: this.jesterCards.map(({ name, negative, index, order }) => ({
        name, negative, index, order,
      })),
      voucher: this.voucher,
      boss: this.boss,
    };
  }
}

/**
 * Parse analysis output and collect ante data
 */
function collectAnteData(lines) {
  const anteList = [];
  let currentAnte = null;
  let state = null;

  const flush = () => {
    if (currentAnte?.hasOutput()) anteList.push(currentAnte);
  };

  for (const rawLine of lines) {
    const anteMatch = RE_ANTE_HEADER.exec(rawLine);
    if (anteMatch) {
      flush();
      currentAnte = new AnteData(anteMatch[1]);
      state = null;
      continue;
    }

    if (!currentAnte) continue;

    const line = rawLine.trim();
    if (!line) {
      state = null;
      continue;
    }

    // State transitions
    if (line.startsWith("Shop Queue")) { state = "shop"; continue; }
    if (line.startsWith("Packs")) { state = "packs"; continue; }

    // Single-line data
    if (line.startsWith("Tags:")) {
      splitCsv(line.slice(5)).forEach((tag) => currentAnte.addTag(tag));
      state = null;
      continue;
    }
    if (line.startsWith("Voucher:")) {
      currentAnte.voucher = line.slice(8).trim() || null;
      state = null;
      continue;
    }
    if (line.startsWith("Boss:")) {
      currentAnte.boss = line.slice(5).trim() || null;
      state = null;
      continue;
    }

    // Process shop queue items
    if (state === "shop") {
      const match = RE_SHOP_LINE.exec(line);
      if (!match) continue;

      const index = parseInt(match[1], 10);
      const itemStr = match[2];

      // Check each tracked joker
      for (const name of JOKER_NAMES) {
        if (!itemStr.includes(name)) continue;
        const negative = NEGATIVE_JOKER_PATTERNS[name]?.test(itemStr);
        currentAnte.addJester(name, negative, index);
      }
      continue;
    }

    // Process pack contents
    if (state === "packs") {
      const dashIdx = line.indexOf("-");
      const cardList = dashIdx >= 0 ? line.slice(dashIdx + 1) : "";

      // Standard pack - check for special kings
      if (line.includes("Standard Pack")) {
        splitCsv(cardList).forEach((card) => {
          const suitMatch = RE_KING_SUIT.exec(card);
          if (!suitMatch) return;
          const variants = getKingVariants(card);
          if (!variants.length) return;
          const suit = suitMatch[1].charAt(0).toUpperCase() + suitMatch[1].slice(1).toLowerCase();
          currentAnte.addKing(`${variants.join(" ")} King of ${suit}`);
        });
        continue;
      }

      // Buffoon pack - check for tracked jokers
      if (startsWithAny(line, BUFFOON_PACK_PREFIXES)) {
        splitCsv(cardList).forEach((card) => {
          for (const name of JOKER_NAMES) {
            if (JOKER_PATTERNS[name]?.test(card)) currentAnte.addBuffoonJester(name);
          }
        });
        continue;
      }

      // Spectral pack - check for tracked spectrals
      if (startsWithAny(line, SPECTRAL_PACK_PREFIXES)) {
        splitCsv(cardList).forEach((card) => {
          for (const name of SPECTRAL_NAMES) {
            if (SPECTRAL_PATTERNS[name]?.test(card)) currentAnte.addSpectral(name);
          }
        });
        continue;
      }
    }
  }

  flush();
  return anteList;
}

// Public API functions
function formatAnteDataList(anteList, options = {}) {
  return anteList.map((ante) => ante.formatOutput(options));
}

function collectAnteDetails(lines) {
  return collectAnteData(lines).map((ante) => ante.toPlainObject());
}

function parseLines(lines, options = {}) {
  return formatAnteDataList(collectAnteData(lines), options);
}

function summarizeText(text, options = {}) {
  const lines = normalizeText(text).split("\n");
  return formatAnteDataList(collectAnteData(lines), options).join("\n");
}

function summarizeToAnteMap(text, options = {}) {
  const lines = normalizeText(text).split("\n");
  const anteList = collectAnteData(lines);
  const summaries = formatAnteDataList(anteList, options);
  const map = new Map();
  anteList.forEach((ante, idx) => {
    const num = Number(ante.number);
    if (!Number.isNaN(num) && !map.has(num)) {
      map.set(num, summaries[idx]);
    }
  });
  return map;
}

function parseFile(filePath) {
  if (!nodeFs) throw new Error("parseFile is only available in Node environments.");
  const raw = nodeFs.readFileSync(filePath, { encoding: "utf8" });
  return parseLines(normalizeText(raw).split("\n"));
}

// Export module
const exported = {
  parseFile,
  parseLines,
  collectAnteDetails,
  TAG_EMOJI,
  summarizeText,
  summarizeToAnteMap,
  trackedLists: {
    jokers: JOKER_NAMES,
    spectrals: SPECTRAL_NAMES,
    tags: TAG_NAMES,
    bosses: ALERT_BOSSES,
    vouchers: VOUCHER_NAMES,
  },
};

if (hasNodeEnv) module.exports = exported;
if (typeof window !== "undefined") window.BalatroAnalysis = exported;

// CLI entry point
if (hasNodeEnv && require.main === module) {
  const inputFiles = process.argv.slice(2);
  if (!inputFiles.length) {
    console.error("Usage: node balatro_analysis.js <analysis.txt> [more files...]");
    process.exit(1);
  }

  let exitCode = 0;
  for (const file of inputFiles) {
    try {
      parseFile(nodePath.resolve(file)).forEach((line) => console.log(line));
    } catch (err) {
      console.error(`Failed to process ${file}: ${err.message}`);
      exitCode = 1;
    }
  }
  process.exit(exitCode);
}
