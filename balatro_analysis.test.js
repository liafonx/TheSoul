#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const { collectAnteDetails, summarizeText } = require("./balatro_analysis");
// Run via: `node balatro_analysis.test.js`

function normalizeText(value) {
  return value.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
}

function escapeRegExp(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}


function buildRawAnteMap(lines) {
  const map = new Map();
  let current = null;
  let state = null;

  for (const rawLine of lines) {
    const anteMatch = /^\s*(?:==)?\s*ANTE\s+(\d+)(?:==)?/i.exec(rawLine);
    if (anteMatch) {
      current = {
        number: anteMatch[1],
        tags: [],
        shopEntries: new Map(),
      };
      map.set(current.number, current);
      state = null;
      continue;
    }
    if (!current) continue;

    const line = rawLine.trim();
    if (!line) {
      state = null;
      continue;
    }

    if (line.startsWith("Shop Queue")) {
      state = "shop";
      continue;
    }
    if (line.startsWith("Tags")) {
      const [, tagList = ""] = line.split(":");
      current.tags = tagList
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean);
      state = null;
      continue;
    }
    if (line.startsWith("Boss") || line.startsWith("Voucher")) {
      state = null;
      continue;
    }

    if (state === "shop") {
      const match = /^(\d+)\)\s+(.*)$/.exec(line);
      if (match) {
        current.shopEntries.set(Number.parseInt(match[1], 10), match[2]);
      }
    }
  }

  return map;
}

function verifyFile(inputPath) {
  const rawText = normalizeText(fs.readFileSync(inputPath, "utf8"));
  const lines = rawText.split("\n");

  const anteDetails = collectAnteDetails(lines);
  if (!anteDetails.length) {
    console.warn(`No relevant antes found in ${path.basename(inputPath)}, skipping.`);
    return;
  }

  const rawMap = buildRawAnteMap(lines);
  const sampleIndices = Array.from({ length: anteDetails.length }, (_, i) => i);

  sampleIndices.forEach((idx) => {
    const summary = anteDetails[idx];
    const raw = rawMap.get(summary.number);
    if (!raw) {
      throw new Error(`Ante ${summary.number} missing in raw data for ${inputPath}`);
    }

    (summary.tagOutputNames || []).forEach((tagName) => {
      if (!raw.tags.includes(tagName)) {
        throw new Error(
          `Ante ${summary.number}: expected tag "${tagName}" not found in raw data`
        );
      }
    });

    summary.jesterCards.forEach(({ name, index, negative }) => {
      const shopLine = raw.shopEntries.get(index);
      if (!shopLine) {
        throw new Error(
          `Ante ${summary.number}: no shop entry #${index} in raw data for ${name}`
        );
      }
      const namePattern = new RegExp(`\\b${escapeRegExp(name)}\\b`);
      if (!namePattern.test(shopLine)) {
        throw new Error(
          `Ante ${summary.number}: shop entry #${index} does not mention ${name}`
        );
      }
      const rawNegative = new RegExp(`\\bNegative\\s+${escapeRegExp(name)}\\b`).test(
        shopLine
      );
      if (rawNegative !== negative) {
        throw new Error(
          `Ante ${summary.number}: negative flag mismatch for ${name} at #${index}`
        );
      }
    });
  });

  console.log(
    `✓ ${path.basename(inputPath)} (${sampleIndices.length} antes verified)`
  );
}

function runFixtureTests() {
  const outputsDir = path.join(__dirname, "outputs");
  if (!fs.existsSync(outputsDir)) {
    console.error(`Outputs directory not found: ${outputsDir}`);
    process.exit(1);
  }

  const fixtures = fs
    .readdirSync(outputsDir)
    .filter((file) => file.toLowerCase().endsWith(".txt"));

  if (fixtures.length === 0) {
    console.log("No analysis inputs found in outputs/. Nothing to test.");
    return;
  }

  fixtures.forEach((file) => {
    const inputPath = path.join(outputsDir, file);
    verifyFile(inputPath);
  });

  console.log("Fixture verification complete.");
}

function runKingTests() {
  const fixture = normalizeText(`
==ANTE 1==
Boss: The Ox
Voucher: X
Tags:
Shop Queue:
Packs:
Standard Pack - Red Seal King of Hearts

==ANTE 2==
Boss: The Ox
Voucher: X
Tags:
Shop Queue:
Packs:
Standard Pack - Steel King of Clubs

==ANTE 3==
Boss: The Ox
Voucher: X
Tags:
Shop Queue:
Packs:
Standard Pack - Gold King of Diamonds

==ANTE 4==
Boss: The Ox
Voucher: X
Tags:
Shop Queue:
Packs:
Standard Pack - Red Seal Steel King of Spades

==ANTE 5==
Boss: The Ox
Voucher: X
Tags:
Shop Queue:
Packs:
Standard Pack - Red Seal Gold King of Hearts
`).split("\n");

  const details = collectAnteDetails(fixture);
  if (details.length !== 5) {
    throw new Error(`Expected 5 antes in king test fixture, got ${details.length}`);
  }

  const expectedKingCards = [
    ["Red Seal King of Hearts"],
    ["Steel King of Clubs"],
    ["Gold King of Diamonds"],
    ["Red Seal Steel King of Spades"],
    ["Red Seal Gold King of Hearts"],
  ];

  details.forEach((ante, idx) => {
    const expected = expectedKingCards[idx];
    if (!Array.isArray(ante.kingCards)) {
      throw new Error(`Ante ${ante.number}: kingCards missing`);
    }
    const sameLength = ante.kingCards.length === expected.length;
    const allMatch =
      sameLength &&
      expected.every((name, i) => ante.kingCards[i] === name);
    if (!allMatch) {
      throw new Error(
        `Ante ${ante.number}: kingCards mismatch.\nExpected: ${JSON.stringify(
          expected
        )}\nGot:      ${JSON.stringify(ante.kingCards)}`
      );
    }
  });

  const summary = summarizeText(fixture.join("\n")).split("\n");
  const expectedSnippets = [
    "♔红封K(Red Seal King)",
    "♔钢铁K(Steel King)",
    "♔黄金K(Gold King)",
    "♔红封钢K(Red Seal Steel King)",
    "♔红封金K(Red Seal Gold King)",
  ];

  summary.forEach((line, idx) => {
    const snippet = expectedSnippets[idx];
    if (!line.includes(snippet)) {
      throw new Error(
        `Ante line ${idx + 1}: expected to contain "${snippet}", got: ${line}`
      );
    }
  });

  console.log("✓ King variant formatting verified");
}


function runAllTests() {
  runFixtureTests();
  runKingTests();
}

if (require.main === module) {
  try {
    runAllTests();
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
}

module.exports = {
  runFixtureTests,
  runKingTests,
  runAllTests,
};
