"use strict";

const hasNodeEnv =
  typeof module !== "undefined" && typeof module.exports !== "undefined";
const nodeFs = hasNodeEnv ? require("fs") : null;
const nodePath = hasNodeEnv ? require("path") : null;

const JOKER_TRANSLATIONS = Object.freeze({
  "DNA": "DNA",
  "Blueprint": "蓝图",
  "Baron": "男爵",
  "Brainstorm": "头脑风暴",
  "Mime": "哑剧",
  "Showman": "马戏团",
  "Burglar": "窃贼",
  "Reserved Parking": "车位",
  "Turtle Bean": "黑龟豆",
  "Seance": "通灵",
  "Sixth Sense": "第六感",
  "Diet Cola": "可乐",
  "Invisible Joker": "隐形小丑",
});

const SPECTRAL_TRANSLATIONS = Object.freeze({
  "Cryptid": "神秘生物",
  "Deja Vu": "既视感",
  "Ectoplasm": "灵质",
  "The Soul": "灵魂",
});

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
    this.hasRedSealKing = false;
    this.voucher = null;
    this.boss = null;
  }

  addJester(name, negative, index) {
    if (!Object.prototype.hasOwnProperty.call(JOKER_TRANSLATIONS, name)) {
      return;
    }
    const current = this.jesterCards.get(name);
    if (!current) {
      this.jesterCards.set(name, { negative, index, order: this.orderCounter++ });
      return;
    }
    if (current.negative) {
      return;
    }
    if (negative) {
      this.jesterCards.set(name, { negative: true, index, order: this.orderCounter++ });
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
      if (tagName === "Negative Tag") {
        if (!showNegative) {
          continue;
        }
        const emoji = TAG_EMOJI[tagName];
        if (!emoji) {
          continue;
        }
        display.push(voucherTriggered ? `‼️${emoji}` : emoji);
        names.push(tagName);
        continue;
      }
      const emoji = TAG_EMOJI[tagName];
      if (emoji) {
        display.push(emoji);
        names.push(tagName);
      }
    }

    return { display, names };
  }

  setRedSealKing() {
    this.hasRedSealKing = true;
  }

  hasOutput() {
    const tagOutput = this.getTagOutput();
    return Boolean(
      tagOutput.display.length ||
        this.jesterCards.size ||
        this.spectralCards.length ||
        this.hasRedSealKing ||
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

    if (this.hasRedSealKing) {
      parts.push("♦️红封K(Red Seal King)");
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
        const prefix = name === "Showman" ? "🎪" : "";
        const negativeSuffix = info.negative ? "🔘" : "";
        let entry = `${prefix}${chinese}${negativeSuffix}(${name} #${info.index})`;
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
      hasRedSealKing: this.hasRedSealKing,
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
        parts[1]
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean)
          .forEach((tag) => currentAnte.addTag(tag));
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
      for (const name of Object.keys(JOKER_TRANSLATIONS)) {
        if (!itemStr.includes(name)) {
          continue;
        }
        const negPattern = new RegExp(`\\bNegative\\s+${escapeRegExp(name)}\\b`);
        const negative = negPattern.test(itemStr);
        currentAnte.addJester(name, negative, index);
      }
      continue;
    }

    if (state === "packs") {
      if (line.startsWith("Standard Pack -")) {
        if (/Red\s+Seal\s+King/i.test(line)) {
          currentAnte.setRedSealKing();
        }
        continue;
      }
      const dashIndex = line.indexOf("-");
      const cardList = dashIndex >= 0 ? line.slice(dashIndex + 1) : line;

      if (BUFFOON_PACK_PREFIXES.some((prefix) => line.startsWith(prefix))) {
        cardList
          .split(",")
          .map((card) => card.trim())
          .filter(Boolean)
          .forEach((card) => {
            for (const name of Object.keys(JOKER_TRANSLATIONS)) {
              const namePattern = new RegExp(`\\b${escapeRegExp(name)}\\b`);
              if (namePattern.test(card)) {
                currentAnte.addBuffoonJester(name);
              }
            }
          });
        continue;
      }

      if (SPECTRAL_PACK_PREFIXES.some((prefix) => line.startsWith(prefix))) {
        cardList
          .split(",")
          .map((card) => card.trim())
          .filter(Boolean)
          .forEach((card) => {
            for (const name of Object.keys(SPECTRAL_TRANSLATIONS)) {
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
    console.error("Usage: node balatro_analysis.js <analysis.txt> [more files...]");
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
