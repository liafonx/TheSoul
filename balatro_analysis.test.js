#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const { collectAnteDetails } = require("./balatro_analysis");
// Run via: `node balatro_analysis.test.js`

function normalizeText(value) {
  return value.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
}

function escapeRegExp(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function hashString(str) {
  let hash = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
    hash >>>= 0;
  }
  return hash >>> 0;
}

function createRng(seed) {
  let state = seed >>> 0;
  return () => {
    state = Math.imul(state, 1664525) + 1013904223;
    return state >>> 0;
  };
}

function pickSampleIndices(total, sampleSize, seed) {
  if (total === 0) return [];
  const rng = createRng(seed || 0x12345678);
  const indices = Array.from({ length: total }, (_, i) => i);
  for (let i = indices.length - 1; i > 0; i--) {
    const j = rng() % (i + 1);
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }
  return indices.slice(0, Math.min(sampleSize, total)).sort((a, b) => a - b);
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
  const sampleIndices = pickSampleIndices(
    anteDetails.length,
    20,
    hashString(path.basename(inputPath))
  );

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

if (require.main === module) {
  try {
    runFixtureTests();
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
}

module.exports = {
  runFixtureTests,
};
