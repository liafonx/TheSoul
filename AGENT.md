# AGENT.md

## Project overview
The Soul is a browser-based Balatro seed analyzer. It ships a WebAssembly build of the native analyzer and a UI that renders per-ante shop queues, packs, tags, bosses, vouchers, and emoji-based summaries.

## Core architecture
- The WASM analyzer produces raw data (shop queues, tags, bosses, vouchers, packs).
- JavaScript parses and formats that data into per-ante summaries and UI-ready structures.
- The UI is modularized into focused files: utils, search, cards, packs, renderers, data.

## Key entry points
- `index.html`: app shell, WASM initialization, settings form, summary window, analysis logic.
- `immolate.js` / `immolate.wasm`: Emscripten output for the analyzer.
- `UI.js`: module loader that initializes the UI layer.

## Core logic files
- `balatro_analysis.js`: main analyzer logic (browser + CLI), summary formatting, ante parsing.
- `balatro_lists.js`: shared lists and emoji metadata (e.g., summary-face emoji mapping, pack prefix lists, king display mapping).

## UI Module Architecture

The UI is split into focused modules loaded in dependency order:

```
UI.js (loader)
  ├── ui.data.js     (game data: jokers, tags, vouchers, etc.)
  ├── ui.renderers.js (canvas rendering helpers)
  ├── ui.utils.js    (shared utilities)
  ├── ui.search.js   (search/highlight functionality)
  ├── ui.cards.js    (card group rendering)
  ├── ui.packs.js    (pack rendering/filtering)
  └── ui.app.js      (main orchestrator)
```

### Module Dependencies
- `ui.utils.js` → requires `BalatroSharedLists`
- `ui.search.js` → requires `BalatroData`, `BalatroUtils`
- `ui.cards.js` → requires `BalatroUtils`, `BalatroRenderers`
- `ui.packs.js` → requires `BalatroUtils`, `BalatroRenderers`
- `ui.app.js` → requires all above modules

---

## Detailed File Reference

### HTML: `index.html`
The main app shell containing:
- **WASM initialization**: Sets up `Immolate` module and `asVector` helper for C++ vector bindings.
- **Settings form**: Seed input, max ante, cards per ante, deck/stake/version selects.
- **Unlocks popup**: Checkbox overlay (`#checkboxesOverlay`) for toggling 61 unlockable items.
- **Summary UI**: Floating summary window (`#summaryFloatingWindow`) and filter window (`#summaryFilterWindow`).
- **Core functions**:
  - `performAnalysis()`: Creates Immolate instance, iterates through antes, extracts shop queue/packs/tags/vouchers/bosses.
  - `summarizeOutput()`: Loads `balatro_analysis.js` and generates per-ante summaries.
  - `copyLink()`: Encodes current settings + unlocks into a shareable URL.
  - `renderSummaryList()`: Renders clickable summary items with emoji coloring.
  - `applySummaryEmojiFilter()`: Shows/hides summary segments based on emoji category toggles.
  - `computeSingleAnteQueue()`: Re-runs analysis for a single ante with custom card limit.

### CSS: `base.css` (~225 lines)
Foundational shared styles:
- **Resets**: Body, h1, p margin/padding reset.
- **Typography**: Sans-serif font, line-height, color scheme.
- **Form elements**: Input, select, button styling with borders, padding, focus states.
- **Layout containers**: `.container`, `.input-section`, `.output-section` flexbox layout.
- **Unlocks popup**: Modal overlay and 6-column checkbox grid.

### CSS: `ui.css` (~1480 lines)
Main UI styling with dark theme:
- **CSS variables**: `--card-width`, `--card-height`, `--card-gap`, `--negative-face-color`.
- **Dark theme**: `#1e1e1e` background, `#d9d9d9` text.
- **Summary windows**: Fixed position overlays with blur backdrop.
- **Pagination**: Golden accent colors.
- **Search/filter panel**: Collapsible `<details>` with toggle buttons.
- **Card display**: Carousel and grid layouts with grouping.
- **Modifier overlays**: Gradient backgrounds for editions.
- **Highlight**: `.highlight` class with red border (`#ff5a5a`).
- **Loading spinner**: CSS animation for buttons.

### JavaScript: `immolate.js`
Emscripten-generated WASM module loader:
- Loads `immolate.wasm` binary.
- Exposes `Immolate.Instance`, `Immolate.InstParams`, `Immolate.VOUCHERS`, `Immolate.packInfo`.
- Provides methods for shop items, packs, bosses, vouchers, tags.

### JavaScript: `balatro_lists.js` (~160 lines)
Shared data lists (UMD module for Node + browser):
- **SUMMARY_FACE_EMOJI**: Emoji → color/cards mapping for joker categories.
- **JOKER_TRANSLATIONS**: English → Chinese joker names.
- **SPECTRAL_TRANSLATIONS**: English → Chinese spectral names.
- **TAG_EMOJI**, **VOUCHER_EMOJI**: Tag/voucher emojis.
- **ALERT_BOSSES**: Boss names that trigger warnings.
- **Pack prefixes**: For type detection.

### JavaScript: `balatro_analysis.js` (~340 lines)
Main analyzer logic (browser + Node.js), refactored for clarity and maintainability:
- **Pre-compiled patterns**: `RE_ANTE_HEADER`, `RE_SHOP_LINE`, `RE_KING_SUIT` for efficient parsing.
- **Name pattern maps**: `JOKER_PATTERNS`, `NEGATIVE_JOKER_PATTERNS`, `SPECTRAL_PATTERNS` built at module load using `Object.fromEntries()`.
- **Lazy emoji lookup**: `getFaceEmoji(jokerName)` builds lookup on first call.
- **Utility functions**: `splitCsv`, `normalizeText`, `startsWithAny`, `getKingVariants`, `formatKingDisplay` (consolidated from two separate functions).
- **Helper functions**: `findJokerInLine` abstracts joker matching logic for shop/pack lines.
- **AnteData class**: Stores per-ante data with methods `addJester`, `addBuffoonJester`, `addSpectral`, `addTag`, `addKing`, `formatOutput`, `toPlainObject`.
- **Core functions**:
  - `collectAnteData(lines)`: State machine parser for raw output with cleaner state transitions.
  - `summarizeText(text, options)`: Main entry point for browser.
  - `summarizeToAnteMap(text, options)`: Returns `Map<anteNumber, summaryLine>`.
- **Options**: `{ chineseOnly: true }` for Chinese-only output.
- **Defensive coding**: All imports from `BalatroSharedLists` have default values; guards against undefined data.
- **Modern JS style**: Arrow functions, optional chaining (`?.`), nullish coalescing (`??=`), destructuring.

### JavaScript: `UI.js` (~60 lines)
UI module loader:
- Loads scripts in order: `ui.data.js` → `ui.renderers.js` → `ui.utils.js` → `ui.search.js` → `ui.cards.js` → `ui.packs.js` → `ui.app.js`.
- Calls `window.initShopUI()` after all modules loaded.
- Applies filter-row layout restructuring.

### JavaScript: `ui.utils.js` (~180 lines)
Shared UI utilities (exports `BalatroUtils`):
- **Face emoji maps**: `summaryFaceEmojiMap`, `summaryFaceCardMap` built from `BalatroSharedLists`.
- **getFaceInfoForSegment(text)**: Returns `{ emoji, color, cn }` for matching card name.
- **setButtonLoadingState(btn, flag)**: Adds spinner animation, disables button.
- **createElement(tag, className, text)**: DOM helper.
- **renderSummarySegments(text, options)**: Parses summary text into colored spans.
- **cleanSummaryLine(rawLine)**: Removes ante prefix from summary line.
- **setupDragScroll(element)**: Mouse drag-to-scroll for carousels.
- **setupPointerDragScroll(element)**: Pointer-based drag scroll with callbacks.
- Initializes `window.summaryEmojiFilter` state.

### JavaScript: `ui.search.js` (~150 lines)
Search and highlight functionality (exports `BalatroSearch`):
- **activeToggleTerms**: Set of active search terms from toggle buttons.
- **jokerFilterButtons**: Map for emoji filter sync.
- **searchAndHighlight()**: Applies `.highlight` class to matching items, swaps to Chinese names in text-only view.
- **createSearchUI()**: Creates search input and filter toggle panel.
- **onSearchChange(callback)**: Register for search change events.
- **syncEmojiFilterToSearch()**: Syncs emoji filters to search toggles.

### JavaScript: `ui.cards.js` (~250 lines)
Card rendering and grouping (exports `BalatroCards`):
- **GROUP_SIZES**: [2, 3, 4] for card grouping.
- **getGroupSize/setGroupSize**: Group size state management.
- **buildQueueNodes(items, options)**: Creates DOM elements for queue items.
- **buildCardEntry(node, groupIndex, position, isLast)**: Wraps node with group indicator.
- **renderCardGroups(cardList, queueNodes)**: Renders grouped cards into container.
- **createGroupControls(onSizeChange)**: Creates group size buttons.
- **createLayoutToggle(cardList, onLayoutChange)**: Creates carousel/grid toggle.
- **applyGroupHighlightFilter(cardList, hideNonHighlighted)**: Hides groups without highlights.
- Callback system: `onGroupSizeChange`, `onGroupRender`, `onGroupFilterUpdate`.

### JavaScript: `ui.packs.js` (~200 lines)
Pack rendering and filtering (exports `BalatroPacks`):
- **PACK_FILTERS**: Filter definitions (ALL, SPECTRAL_BUFFOON, STANDARD, ARCANA, CELESTIAL).
- **getPackTypesPresent(packs)**: Returns Set of pack types in list.
- **getDefaultPackFilter(typesPresent)**: Determines initial filter based on available types.
- **shouldShowPack(packName, activeFilter)**: Filter visibility check.
- **renderPackCard(cardName, packType)**: Renders single pack card with modifiers.
- **createPackSection(packs, onRender)**: Creates collapsible pack section with filter buttons.

### JavaScript: `ui.data.js` (~360 lines)
Data definitions for canvas rendering:
- **BalatroData.jokers[]**: 150+ jokers with spritesheet positions.
- **BalatroData.tarotsAndPlanets[]**: 52 tarots/planets/spectrals.
- **BalatroData.tags[]**: 24 tags.
- **BalatroData.vouchers[]**: 32 vouchers.
- **BalatroData.bosses[]**: 30 bosses.
- **BalatroData.editionMap**: Edition → spritesheet index.
- **BalatroData.stickerMap**: Sticker → position.
- **Tracked lists**: Sorted copies for search filters.

### JavaScript: `ui.renderers.js` (~475 lines)
Canvas rendering helpers:
- **maskToCanvas(canvas, itemName, type, modifiers, stickers)**: Renders joker/tarot with overlays.
- **renderStandardCard(canvas, rank, suit, modifiers, seal)**: Renders playing cards.
- **renderBoss(canvas, bossName)**: Renders boss chip.
- **renderTag(canvas, tagName)**: Renders tag.
- **renderVoucher(canvas, voucherName)**: Renders voucher.
- **parseCardItem(item)**: Extracts name, modifiers, stickers from text.
- **determineItemType(itemName)**: Returns "joker", "tarot", or "unknown".
- **getPackTypeFromName(packName)**: Returns pack type string.

### JavaScript: `ui.app.js` (~400 lines)
Main UI orchestrator:
- **initShopUI()**: Initializes all UI components:
  - Creates search UI via `BalatroSearch.createSearchUI()`.
  - Creates scrolling and pagination containers.
  - Sets up module communication via callbacks.
- **extractShopQueues(text)**: Parses raw output into ante data objects.
- **renderMiniSummaries(anteNum, container)**: Renders 4-ante lookahead strips.
- **renderAnteQueue(queueData)**: Renders single ante's content (meta, cards, packs).
- **renderCurrentPage()**: Renders paginated ante view.
- **renderPaginationControls()**: Creates prev/next/select navigation.
- **displayShopQueues()**: Main refresh function.
- **Global exports**: `window.refreshShopDisplay`, `window.goToAntePage`, `window.setGroupButtonsLoading`, `window.syncEmojiFilterToSearch`.

## Summary layout, styling, and coloring logic
- Summary UI has two surfaces: a floating full summary window and per-ante mini summaries inside each ante block.
- Floating summary (`#summaryFloatingWindow`) lists per-ante rows with an Ante button and a summary text line.
- Mini summaries live in `.miniSummaryWrapper` and render as compact rows with horizontally scrollable text.
- Summary segments are split on `、` and `|` with delimiter spans.
- Emoji-to-card mapping comes from `SUMMARY_FACE_EMOJI` in `balatro_lists.js`.
- Shared face info lookup is centralized in `ui.utils.js`.
- Summary filter UI toggles emoji visibility by hiding elements with matching `data-face-emoji`.
- Card set highlighting uses `.highlight` class with fixed color in CSS.

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
