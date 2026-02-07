#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const GAME_JSON = path.join(ROOT, "localization", "generated", "zh-CN.game.json");
const META_JSON = path.join(ROOT, "localization", "generated", "zh-CN.meta.json");
const UI_DATA_JS = path.join(ROOT, "ui.data.js");

const REQUIRED_KEYS = [
  "Joker",
  "Blueprint",
  "Baron",
  "Cryptid",
  "The Soul",
  "Negative Tag",
  "Double Tag",
  "Voucher Tag",
  "Director's Cut",
  "Retcon",
  "The Ox",
  "The Psychic",
  "Foil",
  "Holographic",
  "Polychrome",
  "Red Seal",
  "Eternal",
  "Perishable",
  "Rental",
  "Spades",
  "Hearts",
  "Clubs",
  "Diamonds",
  "King",
  "Queen",
  "Jack",
  "Ace",
];

function readJson(filePath) {
  if (!fs.existsSync(filePath)) throw new Error(`Missing file: ${filePath}`);
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function extractUiDataNames(filePath) {
  const text = fs.readFileSync(filePath, "utf8");
  const regex = /\{\s*name:\s*"((?:[^"\\]|\\.)+)"\s*,\s*pos:\s*\{/g;
  const names = new Set();
  let match;
  while ((match = regex.exec(text))) {
    names.add(match[1]);
  }
  return names;
}

function fail(message) {
  console.error(`Validation failed: ${message}`);
  process.exit(1);
}

function main() {
  const locale = readJson(GAME_JSON);
  const meta = readJson(META_JSON);
  const uiNames = extractUiDataNames(UI_DATA_JS);

  const localeKeys = Object.keys(locale);
  if (localeKeys.length < 300) fail(`Locale too small (${localeKeys.length} entries)`);
  if (Array.isArray(meta.collisions) && meta.collisions.length > 0) {
    const criticalCollisions = meta.collisions.filter(
      (item) => REQUIRED_KEYS.includes(item.english) || uiNames.has(item.english)
    );
    if (criticalCollisions.length > 0) {
      fail(`Found ${criticalCollisions.length} critical translation collisions`);
    }
    console.warn(`Warning: ignored ${meta.collisions.length} non-critical collisions`);
  }

  const missingRequired = REQUIRED_KEYS.filter((key) => !locale[key]);
  if (missingRequired.length) {
    fail(`Missing required keys: ${missingRequired.join(", ")}`);
  }

  const missingUiNames = Array.from(uiNames).filter((name) => !locale[name]);
  if (missingUiNames.length > 0) {
    const sample = missingUiNames.slice(0, 20).join(", ");
    fail(`Missing ${missingUiNames.length} ui.data names in locale map. Sample: ${sample}`);
  }

  console.log("Localization validation passed.");
  console.log(`Locale entries: ${localeKeys.length}`);
  console.log(`ui.data name coverage: ${uiNames.size}/${uiNames.size}`);
}

if (require.main === module) {
  try {
    main();
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
}
