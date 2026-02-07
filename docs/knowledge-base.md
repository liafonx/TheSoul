# Knowledge Base: How The Soul Predicts Balatro Content

## Purpose
The Soul predicts Balatro run content in the browser from a seed plus run configuration.
It does this by running a deterministic analyzer (WebAssembly) and then post-processing the output into UI views and summaries.

## Core Idea
Balatro generation is deterministic when the same inputs are used.
Given the same:
- seed
- deck
- stake
- game version
- unlock state
- per-ante simulation depth

the analyzer returns the same future shop, pack, tag, voucher, and boss results.

## Primary Inputs
The prediction config is collected in `index.html`:
- `Seed`
- `Max Ante` (clamped to `1..39`)
- `Cards per Ante`
- `Deck`
- `Stake`
- `Version`
- `Omit results before Ante 9`
- unlock toggles (selected locked/unlocked items)

These inputs are converted into an `Immolate.Instance` and `Immolate.InstParams`.

## Prediction Engine
The deterministic engine is `immolate.js` + `immolate.wasm` (compiled from `include/immolate.cpp`).

For each ante, the app calls wasm methods to generate:
- next boss
- next voucher
- next tags
- shop queue items (`nextShopItem`)
- pack offers and pack contents (`nextPack`, plus pack-type methods)

This raw generation is assembled into text blocks like:
- `==ANTE N==`
- `Boss: ...`
- `Voucher: ...`
- `Tags: ...`
- `Shop Queue:`
- `Packs:`

## Processing Pipeline
1. Raw prediction text is produced in `performAnalysis()` (`index.html`).
2. Raw text is stored in `window.lastRawOutput`.
3. `balatro_analysis.js` parses raw lines and builds structured ante data:
- tracked jokers
- tracked spectrals
- tracked tags, vouchers, bosses
- king-card variants from standard packs
4. Summaries are generated (`summarizeText` / `summarizeToAnteMap`).
5. UI modules render:
- ante pages
- card groups
- pack sections
- floating summary and nearby mini summaries

## Why Results Are Predictable
Prediction is deterministic because generation is not random at runtime once the initial state is fixed.
The seed and config fully define the RNG path and generated content sequence for the queried scope.

## What Can Change Results
Changing any of these can change output:
- seed string
- game version code
- deck or stake
- unlock selections
- max ante / cards-per-ante depth
- locale does not change generation, but it changes display text

## Scope and Limits
- The app predicts within configured ante/card bounds, not infinite future state.
- Large workloads are guarded to avoid wasm memory/performance failures.
- Output quality depends on matching the target Balatro version and unlock state.

## Localization and Shared Lists
`balatro_lists.js` and localization files map tracked game names and display strings.
This layer affects display, filtering, and summaries, but not core generation order.

## Validation
Repository checks for parser and summary correctness:
- `node balatro_analysis.test.js`
- `python3 balatro_analysis_test.py`
- localization integrity tests in `localization/` and `tools/`

## Practical Workflow
1. Enter seed and config.
2. Run Analyze.
3. Inspect queue + packs per ante.
4. Use summary/focused filters to identify high-value targets quickly.
5. Copy summary or link for sharing and reproducibility.
