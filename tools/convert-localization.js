#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const DEFAULT_EN = "/Users/liafo/Development/GitWorkspace/Balatro_src/desktop/localization/en-us.lua";
const DEFAULT_ZH = "/Users/liafo/Development/GitWorkspace/Balatro_src/desktop/localization/zh_CN.lua";
const OUT_DIR = path.join(ROOT, "localization", "generated");

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
  const enUS = {};
  const zhCN = {};
  const nameToKey = {};

  const addEntry = (key, english, chinese) => {
    if (!key || !english) return;
    enUS[key] = english;
    if (chinese) zhCN[key] = chinese;
    if (!nameToKey[english]) {
      nameToKey[english] = key;
    }
  };

  // Extract name entries (key → {name: "..."}) from both locales
  enNames.forEach((english, key) => {
    const chinese = zhNames.get(key) || "";
    addEntry(key, english, chinese);
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
  ].forEach((scalarKey) => {
    const enValue = enScalars.get(scalarKey);
    const zhValue = zhScalars.get(scalarKey);
    if (!enValue) return;
    addEntry(scalarKey, enValue, zhValue || "");
  });

  // Normalize known naming variants used by this repository.
  // These aliases map alternate English spellings to existing internal keys.
  const aliasPairs = [
    ["Seance", "Séance"],
    ["Riff-raff", "Riff-Raff"],
    ["Mail In Rebate", "Mail-In Rebate"],
    ["Drivers License", "Driver's License"],
  ];
  aliasPairs.forEach(([alias, canonical]) => {
    const canonicalKey = nameToKey[canonical];
    if (canonicalKey && !nameToKey[alias]) {
      nameToKey[alias] = canonicalKey;
      // Also ensure the alias appears in enUS under the same key
      // (the canonical English form is already there)
    }
  });

  return {
    enUS: sortedObject(enUS),
    zhCN: sortedObject(zhCN),
    nameToKey: sortedObject(nameToKey),
    meta: {
      enNameEntries: enNames.size,
      zhNameEntries: zhNames.size,
      enScalarEntries: enScalars.size,
      zhScalarEntries: zhScalars.size,
      enUSCount: Object.keys(enUS).length,
      zhCNCount: Object.keys(zhCN).length,
      nameToKeyCount: Object.keys(nameToKey).length,
      collisions,
    },
  };
}

function toBrowserModuleContent(map, globalVarName) {
  const json = JSON.stringify(map, null, 2);
  return `(function (global) {\n` +
    `  "use strict";\n` +
    `  var locale = Object.freeze(${json});\n` +
    `  if (typeof module === "object" && module.exports) {\n` +
    `    module.exports = locale;\n` +
    `  }\n` +
    `  if (global) {\n` +
    `    global.${globalVarName} = locale;\n` +
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
  const { enUS, zhCN, nameToKey, meta } = buildTranslationMap(enText, zhText);

  fs.mkdirSync(outDir, { recursive: true });

  // en-US game locale (key → English name)
  const enJsPath = path.join(outDir, "en-US.game.js");
  const enJsonPath = path.join(outDir, "en-US.game.json");
  fs.writeFileSync(enJsPath, toBrowserModuleContent(enUS, "BalatroLocale_enUS"), "utf8");
  fs.writeFileSync(enJsonPath, JSON.stringify(enUS, null, 2) + "\n", "utf8");

  // zh-CN game locale (key → Chinese name)
  const zhJsPath = path.join(outDir, "zh-CN.game.js");
  const zhJsonPath = path.join(outDir, "zh-CN.game.json");
  fs.writeFileSync(zhJsPath, toBrowserModuleContent(zhCN, "BalatroLocale_zhCN"), "utf8");
  fs.writeFileSync(zhJsonPath, JSON.stringify(zhCN, null, 2) + "\n", "utf8");

  // Name-to-key reverse map (English name → internal key)
  const n2kJsPath = path.join(outDir, "name-to-key.js");
  const n2kJsonPath = path.join(outDir, "name-to-key.json");
  fs.writeFileSync(n2kJsPath, toBrowserModuleContent(nameToKey, "BalatroNameToKey"), "utf8");
  fs.writeFileSync(n2kJsonPath, JSON.stringify(nameToKey, null, 2) + "\n", "utf8");

  // Meta
  const metaPath = path.join(outDir, "meta.json");
  fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2) + "\n", "utf8");

  console.log(`Generated ${enJsPath}`);
  console.log(`Generated ${zhJsPath}`);
  console.log(`Generated ${n2kJsPath}`);
  console.log(`  en-US entries: ${meta.enUSCount}`);
  console.log(`  zh-CN entries: ${meta.zhCNCount}`);
  console.log(`  name-to-key entries: ${meta.nameToKeyCount}`);
  console.log(`  Collisions: ${meta.collisions.length}`);
}

if (require.main === module) {
  try {
    main();
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
}
