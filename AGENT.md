# AGENT.md

## Project overview
The Soul is a browser-based Balatro seed analyzer. It ships a WebAssembly build of the native analyzer and a UI that renders per-ante shop queues, packs, tags, bosses, vouchers, and emoji-based summaries.

## Core architecture
- The WASM analyzer produces raw data (shop queues, tags, bosses, vouchers, packs).
- JavaScript parses and formats that data into per-ante summaries and UI-ready structures.
- The UI layers render card images, text-only views, summary windows, and filters.

## Key entry points
- `index.html`: app shell and script/style entry.
- `immolate.js` / `immolate.wasm`: Emscripten output for the analyzer.

## Core logic files
- `balatro_analysis.js`: main analyzer logic (browser + CLI), summary formatting, ante parsing.
- `balatro_lists.js`: shared lists and emoji metadata (e.g., summary-face emoji mapping, pack prefix lists, king display mapping).

## UI layers
- `UI.js`: UI bootstrap and wiring.
- `ui.app.js`: runtime UI logic (rendering card sets, search/highlight, summary panes).
- `ui.renderers.js`: canvas rendering helpers for cards, tags, bosses, vouchers.
- `ui.data.js`: data helpers and shared UI-side state.
- `ui.css`: main UI styling.
- `base.css`: shared/base styles.

## Summary layout, styling, and coloring logic
- Summary UI has two surfaces: a floating full summary window and per-ante mini summaries inside each ante block.
- Floating summary (`#summaryFloatingWindow`) lists per-ante rows with an Ante button and a summary text line.
- Mini summaries live in `.miniSummaryWrapper` and render as compact rows with an ante label and a single-line, horizontally scrollable text strip.
- Summary segments are split on `、` and further on `|`:
  - `、` and `|` are rendered as their own spans with default color.
  - Non-delimiter chunks are rendered as `.summaryFaceSegment` (main summary) or `.miniSummaryItem` (mini summary).
- Emoji-to-card mapping comes from `SUMMARY_FACE_EMOJI` in `balatro_lists.js`. It defines:
  - `color`: a hex color for the emoji category.
  - `cards`: a list of English card names in that emoji category.
  - `cardColors` (optional): per-card color overrides keyed by English name.
- Chinese names for jokers come from `JOKER_TRANSLATIONS` by English card name.
- When a summary chunk matches a mapped card name, it receives:
  - `data-face-emoji` with the emoji category.
  - Optional inline color (the category color).
  - A `negativeFace` class if the chunk includes `‼️`.
- Negative-face segments use `--negative-face-color` from `ui.css`.
- Summary filter UI toggles emoji visibility by hiding elements with matching `data-face-emoji`:
  - Applies to the floating summary, mini summaries, and card set items.
  - Also hides redundant `、` delimiters between now-hidden items.
- The "Colors: default" toggle forces summary text back to default color while keeping emoji filtering active.
- Card set highlighting is controlled by `.highlight` on queue items, voucher/tag/boss items, and pack items.
  - Current highlight color for card borders and labels is fixed to `#ff5a5a` in `ui.css`.
  - Summary colors remain per-emoji unless the color-off toggle is active.
- Vouchers, tags, and bosses are rendered as their own canvas-based items:
  - Each has a container (`.voucherContainer`, `.tagContainer`, `.bossContainer`) with a canvas and a label.
  - They participate in search filtering and highlight the same way as card items (via `.highlight`).
  - Tag lists are rendered in a compact vertical list (`.tagsContainer`) and use small label text to fit dense layouts.

## Tests
- `balatro_analysis.test.js`: Node-based analyzer tests against `outputs/` fixtures.
- `balatro_analysis_test.py`: Python parity tests.

## Supporting scripts
- `build.bat`: Windows build for `immolate.js`/`immolate.wasm`.
- `serve.py`: local static server helper.

## Directories
- `include/`: C++ source for the WASM analyzer (e.g., `immolate.cpp`).
- `images/`: UI assets and icons.
- `outputs/`: test fixtures for analyzer output.

## Typical workflows
- Local dev: run a static server and open `index.html`.
- Analyzer updates: edit `include/immolate.cpp`, rebuild WASM, and refresh UI.
- UI work: edit `ui.*.js` and `ui.css`, reload the page.
- Tests: run `node balatro_analysis.test.js` or `python3 balatro_analysis_test.py`.
