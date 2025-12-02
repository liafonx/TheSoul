"use strict";

const hasNodeEnv =
  typeof module !== "undefined" && typeof module.exports !== "undefined";
const nodeFs = hasNodeEnv ? require("fs") : null;
const nodePath = hasNodeEnv ? require("path") : null;

let sharedLists = null;
if (hasNodeEnv) {
  try {
    sharedLists = require("./balatro_lists.js");
  } catch (err) {
    sharedLists = null;
  }
} else if (
  typeof globalThis !== "undefined" &&
  globalThis.BalatroSharedLists
) {
  sharedLists = globalThis.BalatroSharedLists;
}

const KING_DISPLAY = Object.freeze({
  "Red Seal": "红封K",
  "Steel": "钢铁K",
  "Gold": "黄金K",
  "Red Seal Steel": "红封钢K",
  "Red Seal Gold": "红封金K",
});

if (!sharedLists) {
  throw new Error(
    "BalatroSharedLists not found. Ensure balatro_lists.js is loaded."
  );
}

const {
  JOKER_TRANSLATIONS,
  SPECTRAL_TRANSLATIONS,
  TAG_EMOJI,
  ALERT_BOSSES,
  VOUCHER_EMOJI,
  JOKER_NAMES,
  SPECTRAL_NAMES,
  TAG_NAMES,
  VOUCHER_NAMES,
} = sharedLists;

const SPECTRAL_PACK_PREFIXES = [
  "Spectral Pack -",
  "Jumbo Spectral Pack -",
  "Mega Spectral Pack -",
  "Arcana Pack -",
];

const BUFFOON_PACK_PREFIXES = [
  "Buffoon Pack -",
  "Jumbo Buffoon Pack -",
  "Mega Buffoon Pack -",
];

const RE_ANTE_HEADER = /^\s*(?:==)?\s*ANTE\s+(\d+)(?:==)?/i;

function escapeRegExp(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function splitCsv(listStr) {
  return (listStr || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function capitalizeWord(word) {
  return word && word.length
    ? word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    : word;
}

function isPackLine(line, baseName) {
  // Matches: "<baseName> -", "Jumbo <baseName> -", or "Mega <baseName> -"
  return (
    line.startsWith(`${baseName} -`) ||
    line.startsWith(`Jumbo ${baseName} -`) ||
    line.startsWith(`Mega ${baseName} -`)
  );
}

function formatKingName(name) {
  const variants = normalizeKingVariants(name);
  if (!variants.length) return null; // omit plain kings

  const prefix = variants.join(" ");
  const chinese = KING_DISPLAY[prefix] || "";
  if (!chinese) return null;

  return `${chinese}(${prefix} King)`;
}

function formatKingNameChineseOnly(name) {
  const variants = normalizeKingVariants(name);
  if (!variants.length) return null; // omit plain kings

  const prefix = variants.join(" ");
  const chinese = KING_DISPLAY[prefix] || "";
  if (!chinese) return null;

  return chinese;
}

function normalizeKingVariants(cardText) {
  const hasRed = /\bRed Seal\b/i.test(cardText);
  const hasSteel = /\bSteel\b/i.test(cardText);
  const hasGold = /\bGold\b/i.test(cardText);

  if (!hasRed && !hasSteel && !hasGold) return [];

  const result = [];
  if (hasRed) result.push("Red Seal");
  if (hasSteel) result.push("Steel");
  if (hasGold) result.push("Gold");
  return result;
}

class AnteData {
  constructor(number) {
    this.number = number;
    this.jesterCards = [];
    this.orderCounter = 0;
    this.buffoonJesters = [];
    this.buffoonSeen = new Set();
    this.spectralCards = [];
    this.spectralSeen = new Set();
    this.tagNames = [];
    this.kingCards = [];
    this.kingSeen = new Set();
    this.voucher = null;
    this.boss = null;
  }

  addJester(name, negative, index) {
    if (!Object.prototype.hasOwnProperty.call(JOKER_TRANSLATIONS, name)) {
      return;
    }
    this.jesterCards.push({
      name,
      negative: Boolean(negative),
      index,
      order: this.orderCounter++,
    });
  }

  addBuffoonJester(name) {
    if (!Object.prototype.hasOwnProperty.call(JOKER_TRANSLATIONS, name)) {
      return;
    }
    if (this.buffoonSeen.has(name)) {
      return;
    }
    this.buffoonSeen.add(name);
    this.buffoonJesters.push(name);
  }

  addSpectral(name) {
    if (!Object.prototype.hasOwnProperty.call(SPECTRAL_TRANSLATIONS, name)) {
      return;
    }
    if (this.spectralSeen.has(name)) {
      return;
    }
    this.spectralSeen.add(name);
    this.spectralCards.push(name);
  }

  addTag(tagName) {
    if (!TAG_EMOJI[tagName]) {
      return;
    }
    if (!this.tagNames.includes(tagName)) {
      this.tagNames.push(tagName);
    }
  }

  addKing(name) {
    if (!name) {
      return;
    }
    const normalized = name.trim();
    if (this.kingSeen.has(normalized)) {
      return;
    }
    this.kingSeen.add(normalized);
    this.kingCards.push(normalized);
  }

  getTagOutput() {
    const display = [];
    const names = [];
    const hasNegative = this.tagNames.includes("Negative Tag");
    const firstIsNegative = hasNegative && this.tagNames[0] === "Negative Tag";

    for (const tagName of this.tagNames) {
      const emoji = TAG_EMOJI[tagName];
      if (!emoji) continue;

      if (tagName === "Negative Tag") {
        const needsBang = firstIsNegative;
        display.push(needsBang ? `‼️${emoji}` : emoji);
      } else {
        display.push(emoji);
      }
      names.push(tagName);
    }

    return { display, names };
  }

  hasOutput() {
    const tagOutput = this.getTagOutput();
    return Boolean(
      tagOutput.display.length ||
        this.jesterCards.length ||
        this.spectralCards.length ||
        this.kingCards.length ||
        this.buffoonJesters.length
    );
  }

  formatOutput(options = {}) {
    const chineseOnly = Boolean(options.chineseOnly);
    const parts = [];

    const { display: tagDisplay } = this.getTagOutput();
    const voucherEmoji =
      this.voucher && VOUCHER_EMOJI && VOUCHER_EMOJI[this.voucher]
        ? VOUCHER_EMOJI[this.voucher]
        : "";

    let bossVoucherSegment = "";
    if (ALERT_BOSSES.includes(this.boss)) {
      bossVoucherSegment += "‼️☠️";
    }
    if (voucherEmoji) {
      bossVoucherSegment += voucherEmoji;
    }
    if (bossVoucherSegment) {
      parts.push(bossVoucherSegment);
    }
    if (tagDisplay.length) {
      parts.push(tagDisplay.join(""));
    }

    if (this.spectralCards.length) {
      const spectral = this.spectralCards.map((name) => {
        const chinese = SPECTRAL_TRANSLATIONS[name] || name;
        return chineseOnly ? chinese : `${chinese}(${name})`;
      });
      parts.push(`💠${spectral.join("、")}`);
    }

    if (this.kingCards.length) {
      const kingDisplay = this.kingCards
        .map((name) =>
          chineseOnly ? formatKingNameChineseOnly(name) : formatKingName(name)
        )
        .filter(Boolean);
      parts.push(`♔${kingDisplay.join("、")}`);
    }

    if (this.buffoonJesters.length) {
      const buffoon = this.buffoonJesters.map((name, idx) => {
        const chinese = JOKER_TRANSLATIONS[name] || name;
        const base = chineseOnly ? chinese : `${chinese}(${name})`;
        return idx === 0 ? `👝${base}` : base;
      });
      parts.push(buffoon.join("、"));
    }

    if (this.jesterCards.length) {
      const entries = this.jesterCards
        .slice()
        .sort((a, b) => a.order - b.order);
      const jesterParts = entries.map((info) => {
        const chinese = JOKER_TRANSLATIONS[info.name] || info.name;
        const negativeSuffix = info.negative ? "‼️" : "";
        let entry;
        if (chineseOnly) {
          // Chinese-only: name + per-occurrence negative marker + #index
          entry = `${chinese}${negativeSuffix}#${info.index}`;
        } else {
          // Mixed format with English name and index in parentheses
          entry = `${chinese}${negativeSuffix}(${info.name} #${info.index})`;
        }
        return entry;
      });
      parts.push(jesterParts.join("、"));
    }

    return `${this.number}：${parts.join(" | ")}`;
  }

  toPlainObject() {
    const tagOutput = this.getTagOutput();
    return {
      number: this.number,
      tagNames: [...this.tagNames],
      tagEmojis: [...tagOutput.display],
      tagOutputNames: [...tagOutput.names],
      spectralCards: [...this.spectralCards],
      kingCards: [...this.kingCards],
      buffoonJesters: [...this.buffoonJesters],
      jesterCards: this.jesterCards.map((info) => ({
        name: info.name,
        negative: info.negative,
        index: info.index,
        order: info.order,
      })),
      voucher: this.voucher,
      boss: this.boss,
    };
  }
}

function collectAnteData(lines) {
  const anteList = [];
  let currentAnte = null;
  let state = null;

  const flush = () => {
    if (currentAnte && currentAnte.hasOutput()) {
      anteList.push(currentAnte);
    }
  };

  for (const rawLine of lines) {
    const anteMatch = RE_ANTE_HEADER.exec(rawLine);
    if (anteMatch) {
      flush();
      currentAnte = new AnteData(anteMatch[1]);
      state = null;
      continue;
    }
    if (!currentAnte) {
      continue;
    }
    const line = rawLine.trim();
    if (!line) {
      state = null;
      continue;
    }
    if (line.startsWith("Shop Queue")) {
      state = "shop";
      continue;
    }
    if (line.startsWith("Packs")) {
      state = "packs";
      continue;
    }
    if (line.startsWith("Tags")) {
      const parts = line.split(":");
      if (parts.length > 1) {
        splitCsv(parts[1]).forEach((tag) => currentAnte.addTag(tag));
      }
      state = null;
      continue;
    }
    if (line.startsWith("Voucher")) {
      const [, voucherValue = ""] = line.split(":");
      currentAnte.voucher = voucherValue.trim() || null;
      state = null;
      continue;
    }
    if (line.startsWith("Boss")) {
      const [, bossValue = ""] = line.split(":");
      currentAnte.boss = bossValue.trim() || null;
      state = null;
      continue;
    }

    if (state === "shop") {
      const match = /^(\d+)\)\s+(.*)$/.exec(line);
      if (!match) {
        continue;
      }
      const index = Number.parseInt(match[1], 10) || 0;
      const itemStr = match[2];
      for (const name of JOKER_NAMES) {
        if (!itemStr.includes(name)) {
          continue;
        }
        const negPattern = new RegExp(
          `\\bNegative\\s+${escapeRegExp(name)}\\b`
        );
        const negative = negPattern.test(itemStr);
        currentAnte.addJester(name, negative, index);
      }
      continue;
    }

    if (state === "packs") {
      if (isPackLine(line, "Standard Pack")) {
        const dashIndex = line.indexOf("-");
        const cardList = dashIndex >= 0 ? line.slice(dashIndex + 1) : "";
        splitCsv(cardList).forEach((card) => {
          const suitMatch = /\bKing of ([A-Za-z]+)/i.exec(card);
          if (!suitMatch) return;
          const variants = normalizeKingVariants(card);
          if (!variants.length) return; // skip plain kings
          const suit = capitalizeWord(suitMatch[1]);
          const variantPrefix = variants.join(" ");
          currentAnte.addKing(`${variantPrefix} King of ${suit}`);
        });
        continue;
      }
      const dashIndex = line.indexOf("-");
      const cardList = dashIndex >= 0 ? line.slice(dashIndex + 1) : line;

      if (isPackLine(line, "Buffoon Pack")) {
        splitCsv(cardList).forEach((card) => {
          for (const name of JOKER_NAMES) {
            const namePattern = new RegExp(`\\b${escapeRegExp(name)}\\b`);
            if (namePattern.test(card)) {
              currentAnte.addBuffoonJester(name);
            }
          }
        });
        continue;
      }

      if (
        isPackLine(line, "Spectral Pack") ||
        isPackLine(line, "Arcana Pack")
      ) {
        splitCsv(cardList).forEach((card) => {
          for (const name of SPECTRAL_NAMES) {
            const specPattern = new RegExp(`\\b${escapeRegExp(name)}\\b`);
            if (specPattern.test(card)) {
              currentAnte.addSpectral(name);
            }
          }
        });
        continue;
      }
    }
  }

  flush();
  return anteList;
}

function formatAnteDataList(anteList, options = {}) {
  return anteList.map((ante) => ante.formatOutput(options));
}

function collectAnteDetails(lines) {
  return collectAnteData(lines).map((ante) => ante.toPlainObject());
}

function parseLines(lines, options = {}) {
  return formatAnteDataList(collectAnteData(lines), options);
}

function normalizeText(text) {
  return (text || "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
}

function summarizeText(text, options = {}) {
  return parseLines(normalizeText(text).split("\n"), options).join("\n");
}

function parseFile(filePath) {
  if (!nodeFs) {
    throw new Error("parseFile is only available in Node environments.");
  }
  const raw = nodeFs.readFileSync(filePath, { encoding: "utf8" });
  const lines = normalizeText(raw).split("\n");
  return parseLines(lines);
}

const exported = {
  parseFile,
  parseLines,
  collectAnteDetails,
  TAG_EMOJI,
  summarizeText,
  trackedLists: {
    jokers: JOKER_NAMES,
    spectrals: SPECTRAL_NAMES,
    tags: TAG_NAMES,
    bosses: ALERT_BOSSES,
    vouchers: VOUCHER_NAMES,
  },
};

if (hasNodeEnv) {
  module.exports = exported;
}

if (typeof window !== "undefined") {
  window.BalatroAnalysis = exported;
}

if (hasNodeEnv && require.main === module) {
  const inputFiles = process.argv.slice(2);
  if (inputFiles.length === 0) {
    console.error(
      "Usage: node balatro_analysis.js <analysis.txt> [more files...]"
    );
    process.exit(1);
  }
  let exitCode = 0;
  for (const file of inputFiles) {
    try {
      const resolved = nodePath.resolve(file);
      const results = parseFile(resolved);
      results.forEach((line) => console.log(line));
    } catch (err) {
      console.error(`Failed to process ${file}: ${err.message}`);
      exitCode = 1;
    }
  }
  process.exit(exitCode);
}
