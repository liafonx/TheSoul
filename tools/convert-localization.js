#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const DEFAULT_EN = "/Users/liafo/Development/GitWorkspace/Balatro_src/desktop/localization/en-us.lua";
const DEFAULT_ZH = "/Users/liafo/Development/GitWorkspace/Balatro_src/desktop/localization/zh_CN.lua";
const OUT_DIR = path.join(ROOT, "localization", "generated");
const OUT_JSON = path.join(OUT_DIR, "zh-CN.game.json");
const OUT_JS = path.join(OUT_DIR, "zh-CN.game.js");
const OUT_META = path.join(OUT_DIR, "zh-CN.meta.json");

const NAME_ENTRY_RE = /([A-Za-z0-9_]+)\s*=\s*\{\s*name\s*=\s*"((?:[^"\\]|\\.)*)"/gms;
const SCALAR_RE = /([A-Za-z0-9_]+)\s*=\s*"((?:[^"\\]|\\.)*)"/gms;

function parseArgs(argv) {
  const parsed = {
    en: DEFAULT_EN,
    zh: DEFAULT_ZH,
    outDir: OUT_DIR,
  };

  argv.forEach((arg) => {
    if (arg.startsWith("--en=")) parsed.en = arg.slice("--en=".length);
    if (arg.startsWith("--zh=")) parsed.zh = arg.slice("--zh=".length);
    if (arg.startsWith("--out=")) parsed.outDir = path.resolve(arg.slice("--out=".length));
  });
  return parsed;
}

function decodeLuaString(value) {
  return value
    .replace(/\\n/g, "\n")
    .replace(/\\t/g, "\t")
    .replace(/\\"/g, "\"")
    .replace(/\\\\/g, "\\");
}

function extractMapByRegex(text, regex) {
  const out = new Map();
  let match;
  while ((match = regex.exec(text))) {
    const key = match[1];
    const value = decodeLuaString(match[2]);
    if (!out.has(key)) out.set(key, value);
  }
  return out;
}

function sortedObject(input) {
  return Object.fromEntries(Object.entries(input).sort(([a], [b]) => a.localeCompare(b)));
}

function buildTranslationMap(enText, zhText) {
  const enNames = extractMapByRegex(enText, NAME_ENTRY_RE);
  const zhNames = extractMapByRegex(zhText, NAME_ENTRY_RE);
  const enScalars = extractMapByRegex(enText, SCALAR_RE);
  const zhScalars = extractMapByRegex(zhText, SCALAR_RE);

  const collisions = [];
  const translations = {};

  const addTranslation = (english, chinese, sourceKey) => {
    if (!english || !chinese) return;
    const prev = translations[english];
    if (prev && prev !== chinese) {
      collisions.push({ english, previous: prev, next: chinese, sourceKey });
      return;
    }
    translations[english] = chinese;
  };

  enNames.forEach((english, key) => {
    if (!zhNames.has(key)) return;
    addTranslation(english, zhNames.get(key), key);
  });

  // Pull extra scalar keys needed by this project (ranks/suits/seals/stickers).
  [
    "Ace",
    "King",
    "Queen",
    "Jack",
    "Spades",
    "Hearts",
    "Clubs",
    "Diamonds",
    "red_seal",
    "blue_seal",
    "gold_seal",
    "purple_seal",
    "eternal",
    "perishable",
    "rental",
  ].forEach((key) => {
    const enValue = enScalars.get(key);
    const zhValue = zhScalars.get(key);
    if (!enValue || !zhValue) return;
    addTranslation(enValue, zhValue, key);
  });

  // Normalize known naming variants used by this repository.
  const aliasPairs = [
    ["Seance", "Séance"],
    ["Riff-raff", "Riff-Raff"],
    ["Mail In Rebate", "Mail-In Rebate"],
    ["Drivers License", "Driver's License"],
  ];
  aliasPairs.forEach(([alias, canonical]) => {
    if (!translations[alias] && translations[canonical]) {
      translations[alias] = translations[canonical];
    }
  });

  return {
    translations: sortedObject(translations),
    meta: {
      enNameEntries: enNames.size,
      zhNameEntries: zhNames.size,
      enScalarEntries: enScalars.size,
      zhScalarEntries: zhScalars.size,
      translationCount: Object.keys(translations).length,
      collisions,
    },
  };
}

function toBrowserModuleContent(localeMap) {
  const json = JSON.stringify(localeMap, null, 2);
  return `(function (global) {\n` +
    `  "use strict";\n` +
    `  var locale = Object.freeze(${json});\n` +
    `  if (typeof module === "object" && module.exports) {\n` +
    `    module.exports = locale;\n` +
    `  }\n` +
    `  if (global) {\n` +
    `    global.BalatroLocale_zhCN = locale;\n` +
    `  }\n` +
    `})(typeof globalThis !== "undefined" ? globalThis : this);\n`;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const enPath = path.resolve(args.en);
  const zhPath = path.resolve(args.zh);
  const outDir = path.resolve(args.outDir);

  if (!fs.existsSync(enPath)) throw new Error(`Missing en locale file: ${enPath}`);
  if (!fs.existsSync(zhPath)) throw new Error(`Missing zh locale file: ${zhPath}`);

  const enText = fs.readFileSync(enPath, "utf8");
  const zhText = fs.readFileSync(zhPath, "utf8");
  const { translations, meta } = buildTranslationMap(enText, zhText);

  fs.mkdirSync(outDir, { recursive: true });
  const jsonPath = path.join(outDir, path.basename(OUT_JSON));
  const jsPath = path.join(outDir, path.basename(OUT_JS));
  const metaPath = path.join(outDir, path.basename(OUT_META));

  fs.writeFileSync(jsonPath, JSON.stringify(translations, null, 2) + "\n", "utf8");
  fs.writeFileSync(jsPath, toBrowserModuleContent(translations), "utf8");
  fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2) + "\n", "utf8");

  console.log(`Generated ${jsonPath}`);
  console.log(`Generated ${jsPath}`);
  console.log(`Generated ${metaPath}`);
  console.log(`Translation entries: ${meta.translationCount}`);
  console.log(`Collisions: ${meta.collisions.length}`);
}

if (require.main === module) {
  try {
    main();
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
}
