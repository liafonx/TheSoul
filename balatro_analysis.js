"use strict";

const hasNodeEnv =
  typeof module !== "undefined" && typeof module.exports !== "undefined";
const nodeFs = hasNodeEnv ? require("fs") : null;
const nodePath = hasNodeEnv ? require("path") : null;

const JOKER_TRANSLATIONS = Object.freeze({
  DNA: "DNA",
  Blueprint: "蓝图",
  Baron: "男爵",
  Brainstorm: "头脑风暴",
  Mime: "哑剧",
  Showman: "🎪马戏团",
  Burglar: "窃贼",
  "Reserved Parking": "车位",
  "Turtle Bean": "黑龟豆",
  Seance: "通灵",
  "Sixth Sense": "第六感",
  "Diet Cola": "可乐",
  "Invisible Joker": "隐形小丑",
});

const SPECTRAL_TRANSLATIONS = Object.freeze({
  Cryptid: "神秘生物",
  "Deja Vu": "既视感",
  Ectoplasm: "灵质",
  "The Soul": "灵魂",
});

const KING_DISPLAY = Object.freeze({
  "Red Seal": "红封K",
  "Steel": "钢铁K",
  "Gold": "黄金K",
  "Red Seal Steel": "红封钢K",
  "Red Seal Gold": "红封金K",
});

const JOKER_NAMES = Object.freeze(Object.keys(JOKER_TRANSLATIONS));
const SPECTRAL_NAMES = Object.freeze(Object.keys(SPECTRAL_TRANSLATIONS));

const TAG_EMOJI = Object.freeze({
  "Negative Tag": "🔘",
  "Double Tag": "🖇️",
  "Voucher Tag": "🎟️",
});

const ALERT_BOSSES = Object.freeze(["The Ox", "The Psychic", "The Plant"]);

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
    this.jesterCards = new Map();
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
    const current = this.jesterCards.get(name);
    if (!current) {
      this.jesterCards.set(name, {
        negative,
        index,
        order: this.orderCounter++,
      });
      return;
    }
    if (current.negative) {
      return;
    }
    if (negative) {
      this.jesterCards.set(name, {
        negative: true,
        index,
        order: this.orderCounter++,
      });
    }
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
    const specialVoucher =
      this.voucher === "Hieroglyph" || this.voucher === "Petroglyph";
    const showNegative = hasNegative && (firstIsNegative || specialVoucher);
    const voucherTriggered = showNegative && !firstIsNegative && specialVoucher;

    for (const tagName of this.tagNames) {
      const emoji = TAG_EMOJI[tagName];
      if (!emoji) continue;

      if (tagName === "Negative Tag") {
        if (!showNegative) continue;
        display.push(voucherTriggered ? `‼️${emoji}` : emoji);
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
        this.jesterCards.size ||
        this.spectralCards.length ||
        this.kingCards.length ||
        this.buffoonJesters.length
    );
  }

  formatOutput(specialFlags) {
    const parts = [];

    const { display: tagDisplay } = this.getTagOutput();
    if (tagDisplay.length) {
      parts.push(tagDisplay.join(""));
    }

    if (ALERT_BOSSES.includes(this.boss)) {
      parts.unshift("☠️");
    }

    if (this.spectralCards.length) {
      const spectral = this.spectralCards.map(
        (name) => `${SPECTRAL_TRANSLATIONS[name] || name}(${name})`
      );
      parts.push(`💠${spectral.join("、")}`);
    }

    if (this.kingCards.length) {
      const kingDisplay = this.kingCards.map(formatKingName).filter(Boolean);
      parts.push(`♔${kingDisplay.join("、")}`);
    }

    if (this.buffoonJesters.length) {
      const buffoon = this.buffoonJesters.map((name, idx) => {
        const chinese = JOKER_TRANSLATIONS[name] || name;
        const entry = `${chinese}(${name})`;
        return idx === 0 ? `👝${entry}` : entry;
      });
      parts.push(buffoon.join("、"));
    }

    if (this.jesterCards.size) {
      const entries = [...this.jesterCards.entries()].sort(
        (a, b) => a[1].order - b[1].order
      );
      const anteNumber = Number.parseInt(this.number, 10) || 0;
      const jesterParts = entries.map(([name, info]) => {
        const chinese = JOKER_TRANSLATIONS[name] || name;
        const negativeSuffix = info.negative ? "🔘" : "";
        let entry = `${chinese}${negativeSuffix}(${name} #${info.index})`;
        if (
          (name === "Sixth Sense" || name === "Seance") &&
          anteNumber > 8 &&
          specialFlags &&
          !specialFlags[name]
        ) {
          entry = `💿${entry}`;
          specialFlags[name] = true;
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
      jesterCards: [...this.jesterCards.entries()].map(([name, info]) => ({
        name,
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

function formatAnteDataList(anteList) {
  const specialFlags = { "Sixth Sense": false, Seance: false };
  return anteList.map((ante) => ante.formatOutput(specialFlags));
}

function collectAnteDetails(lines) {
  return collectAnteData(lines).map((ante) => ante.toPlainObject());
}

function parseLines(lines) {
  return formatAnteDataList(collectAnteData(lines));
}

function normalizeText(text) {
  return (text || "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
}

function summarizeText(text) {
  return parseLines(normalizeText(text).split("\n")).join("\n");
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
