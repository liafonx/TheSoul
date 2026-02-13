# AGENT.md

Last updated: 2026-02-13

## Purpose
This repository is a browser-based Balatro seed analyzer. The top priority for UI changes is perceived performance and interaction stability on both desktop and mobile.

## Project map

### Root files
- `index.html`: App shell (HTML structure only), top bar, body DOM, inline head scripts (locale/UA/asset-version init, Immolate bootstrap).
- `UI.js`: Ordered UI module loader (dynamically loads ui.data → ui.renderers → ui.utils → ui.search → ui.cards → ui.packs → ui.app).
- `ui.css`: Design tokens, responsive layout, button/window styles, card/packs/search/floating-window styling.
- `ui.state.js`: Global state variables (`lastRawOutput`, `lastSummariesByAnte`, `lastBaseSummariesByAnte`, `lastTrackingSummariesByAnte`), `_emojiSyncActive` guard flag, state query helpers (`hasActiveTrackingItems`, `hasActiveSearchOrTracking`), `applyEmojiFilter` shorthand, `buildSummaryLookup`, `clampAnteValue`.
- `ui.unlocks.js`: Unlock checkbox overlay (options array, selectedOptions, checkbox management).
- `ui.summary.js`: Summary rendering (renderSummaryList, applySummaryEmojiFilter, extractTrackingItems), setSummaryFloatingVisible, copySummaryToClipboard, onTrackingTermsStateChange.
- `ui.filters.js`: Settings panel (buildSummaryFilterUI) and Intro panel (buildEmojiLegendUI).
- `ui.search-integration.js`: Raw output parsing (parseRawOutputByAnte, internal), search extraction (extractSearchResults, internal), tracking extraction (extractTrackingResults), summary augmentation (augmentSummaryWithSearch), tracking cache (getExpandedTrackingTerms, invalidateTrackingCache), getAnalyzedAnteNumbers.
- `ui.floating.js`: Floating window management (open/close/toggle coordination, Esc, outside-click, scroll-to-top).
- `ui.analysis.js`: WASM analysis engine (createImmolateInstance, performAnalysis, computeSingleAnteQueue, summarizeOutput).
- `ui.locale.js`: UI localization (applyUiLocalization) and locale toggle.
- `ui.init.js`: Initialization (service worker, URL params, input validation, button wiring, search callback registration).
- `ui.app.js`: Main orchestrator for queue rendering, pagination, and cross-module wiring.
- `ui.search.js`: Search input, filter panel, active term management, highlight assignment.
- `ui.cards.js`: Card group rendering and card-item display.
- `ui.packs.js`: Pack section rendering, pack header/toggle behavior, pack filters.
- `sw.js`: Service worker for static asset caching (stale-while-revalidate) and navigation fallback.
- `balatro_analysis.js`: Analyzer logic (browser + Node use).
- `balatro_lists.js`: Shared lists, emoji metadata, label mappings.
- `docs/knowledge-base.md`: Prediction model summary (seed/config determinism, data flow).

### tests/
- `tests/balatro_analysis.test.js`: JS test runner (verifies analyzer against fixtures in `outputs/`).
- `tests/balatro_analysis_test.py`: Python parity test.
- `tests/i18n.test.js`: Localization unit tests.

### Localization
- `localization/i18n.global.js`: Central i18n module. Loads all locale maps, provides `t(key)`, `nameToKey(englishName)`, `setLocale()`, `getLocale()`. Both en-US and zh-CN do real lookups (English is NOT special-cased).
- `localization/en-US.ui.js`: English UI strings (`window.BalatroUiLocale_enUS`), keyed by `ui.*` semantic keys.
- `localization/ui-zh-CN.js`: Chinese UI strings (`window.BalatroUiLocale_zhCN`), same `ui.*` keys.
- `localization/generated/en-US.game.js`: English game names by internal key (`window.BalatroLocale_enUS = {j_seeing_double: "Seeing Double", ...}`).
- `localization/generated/zh-CN.game.js`: Chinese game names by internal key (`window.BalatroLocale_zhCN = {j_seeing_double: "重影", ...}`).
- `localization/generated/name-to-key.js`: Reverse map English name → internal key (`window.BalatroNameToKey = {"Seeing Double": "j_seeing_double", ...}`).
- `localization/generated/meta.json`: Build metadata from convert-localization.
- `tools/convert-localization.js`: Parses vanilla Lua locale files, outputs key-based game locale JS/JSON + name-to-key reverse map.
- `tools/build.bat`: Windows Emscripten build script for WASM.
- `tools/serve.py`: Local dev HTTP server with BrokenPipe handling.
- `tools/validate-localization.js`: Validates localization completeness.

## Runtime and caching contracts
- `index.html` must keep valid document structure: scripts/styles are declared inside `<head>`; do not reintroduce inline script blocks after `<body>`.
- All app logic lives in external `defer` JS files under `src/` (ui.state.js through ui.init.js). Only early bootstrapping (locale, UA detection, Immolate init) stays inline in `<head>`.
- Localization script load order (before `defer` modules): `generated/en-US.game.js` → `generated/zh-CN.game.js` → `generated/name-to-key.js` → `en-US.ui.js` → `ui-zh-CN.js` → `i18n.global.js`.
- `defer` script load order matters: ui.state → ui.unlocks → ui.summary → ui.filters → ui.search-integration → ui.floating → ui.analysis → ui.locale → ui.init → UI.js.
- Cross-module communication uses `window.*` exports. Each module defines its public API via `window.functionName = ...`.
- Do not reintroduce `document.write(...)` for scripts/styles.
- Service worker registration lives in `ui.init.js` and should run only when:
1. `navigator.serviceWorker` is available.
2. Context is secure or host is `localhost` / `127.0.0.1`.
- `sw.js` caching strategy:
1. Navigation requests: network-first with cache fallback.
2. Critical runtime assets (`script`/`style`/`worker`/`wasm`/`json`/`txt`): network-first with cache fallback.
3. Other static assets (e.g. images/fonts): stale-while-revalidate.
- If static assets or loader behavior changes, bump `CACHE_NAME` in `sw.js`.
- Service worker is registered with a versioned URL (`sw.js?v=...`); keep this to force timely SW updates after code changes.
- `immolate.wasm` is preloaded via `<link rel="preload" as="fetch" type="application/wasm">`; keep this hint unless you replace wasm loading strategy.

## Shared data contracts
- `BalatroSharedLists` is required for UI/analyzer startup; avoid silent fallback paths.
- Canonical tracked arrays use **internal keys** (not English display names):
1. `JOKER_NAMES` — e.g. `["j_blueprint", "j_brainstorm", ...]`
2. `SPECTRAL_NAMES` — e.g. `["c_cryptid", "c_soul", ...]`
3. `TAG_NAMES` — e.g. `["tag_negative", "tag_double", ...]`
4. `VOUCHER_NAMES` — e.g. `["v_directors_cut", "v_retcon", ...]`
5. `ALERT_BOSSES` — e.g. `["bl_ox", "bl_psychic", ...]`
- `ui.data.js` should consume canonical arrays directly; do not reintroduce compatibility aliases like `sharedLists.jokers` / `sharedLists.spectrals`.
- `balatro_lists.js` uses explicit tracked fallback maps (`TRACKED_*_FALLBACK_ZH`) and exports `TRACKED_JOKERS` / `TRACKED_SPECTRALS`; keep naming explicit (avoid misleading `LEGACY_*` names).

### Key-based localization architecture
- Internal keys (e.g. `j_seeing_double`, `bl_eye`, `tag_negative`, `v_crystal_ball`) are the canonical identifiers. English is just another locale.
- Data flow: `immolate.js` outputs English names → `BalatroNameToKey` converts to internal key → `BalatroI18n.t(key)` looks up current locale.
- `translateGameText(englishName)` in `ui.utils.js`: English name → key via `nameToKey()` → `t(key)` for display.
- `activeToggleTerms` Set in `ui.search.js` stores internal keys (lowercase).
- Raw output (`window.lastRawOutput`) always contains English names from immolate WASM; conversion to keys/locale happens at display time.

## Active UX contracts

### Theme and color system
- Primary theme color is fixed to `rgb(255, 211, 106)` via `--ui-primary` / `--ui-primary-rgb` in `ui.css`.
- Use tokenized variables only; do not introduce ad-hoc hardcoded colors unless required for semantic status.
- `anteNum`, `anteNumYellow`, `anteNumOrange`, `anteNumRed` currently all render with `--ui-primary`.

### Floating windows
- Active floating windows:
1. `#summaryFloatingWindow`
2. `#summaryFilterWindow`
3. `#searchFloatingWindow`
4. `#emojiLegendWindow`
- Opening one floating window must close the others (`closeOtherFloatingWindows(...)` in `index.html`).
- `Esc` closes all floating windows and unlock popup overlays.
- Outside click closes any currently open floating window.
- Bottom-right floating top button (`#scrollToTopButton`) appears after scroll threshold and smooth-scrolls to page top.

### Blur/solid behavior
- Blur capability is decided at startup in `index.html`:
1. Detect UA mobile/desktop.
2. Detect `backdrop-filter` support.
3. Apply `html.ua-blur` or `html.ua-no-blur`.
- `ui.css` variables control visual mode:
1. `--ui-glass-button-bg`
2. `--ui-glass-button-bg-hover`
3. `--ui-glass-window-bg`
- In `ua-no-blur`, floating windows/buttons must be solid and darker, with blur disabled.

### Search and filter behavior
- Search UI is rendered into `#searchFloatingWindow` (floating), toggled by `#searchFloatingToggle`.
- Search runs on input (debounced by frame scheduling in `ui.search.js`).
- Pressing `Enter` in search input closes the search floating window and does not trigger scroll-to-top jumps.
- Search filter toggles default to deselected (empty tracked-term set on initial load).
- When all Search Filters tracking toggles are deselected (no active tracked terms), Summary floating content must show `No tracking items`.
- Highlight semantics are split:
1. Tracking/toggle matches: `.highlight-track` (red).
2. Manual typed matches: `.highlight-search` (mint-cyan; current CSS value `#33fbc3`).
- Priority rule: if a card matches both manual search and tracked filters, manual search highlight (`.highlight-search`) takes precedence in the DOM. However, the item still appears in BOTH search and tracking sections of the floating summary (data extraction is independent of DOM highlight class).
- Separator cleanup rule: when filtering hides all trailing summary segments, leading separators (`|`, `、`, `,`) must auto-hide (no orphan left delimiter).
- Nearby mini summaries are effectively disabled when tracked-term set is empty (even if `summaryNearbyVisible` user flag is enabled), and `Nearby Summaries` setting button reflects hidden state.
- Filter panel is custom controlled (not native `<details>`):
1. `.filter-panel`
2. `.filter-summary` button
3. `.filter-panel-body`
4. `.is-open` state class
- Keep this CSS guard to prevent hidden-state regressions:
` .filter-panel-body[hidden] { display: none !important; } `

### Settings/search sync contract
- Top-right `Settings` floating window emoji icon buttons are the face-joker tracker toggles.
- These icon toggles sync with `Search Filters > Jokers` via `syncEmojiFilterToSearch()` in `ui.search.js`.
- `Search Filters` manual joker toggles and bulk actions (`Select all` / `Remove all`) must recompute top-right emoji icon state from active joker terms (`syncSearchFiltersToEmoji()`).
- Emoji icon state rule: icon is `off` only when all jokers in that emoji group are disabled; mixed groups remain `on`.
- Summary/mini-summary entries must respect active Search Filters across categories:
1. Joker groups: per-card behavior (in multi-card emoji groups, disabling one card hides only that card's summary segments).
2. Tag/Voucher/Boss/Spectral: disabling a filter hides corresponding summary/mini-summary segments and restoring re-shows them.
- Disabling via Settings emoji icons must not apply visual dimming (`.emojiFilterOff`) to cards; cards should only return to normal un-highlighted state.
- `cardSetHitFilterToggle` (`◎/◉`) hides/shows groups based on existing highlights (`.highlight`, `.highlight-track`, `.highlight-search`) and not on a separate filter channel.

### Intro window contract
- Intro button is `#emojiLegendButton` (label `Intro` / `说明` via i18n).
- Intro window has two tabs:
1. `Emoji Legend`
2. `UI Tips`
- `UI Tips` includes icon-only rows:
1. `🔍` open search floating window.
2. `▦ / ↔` toggle per-ante card layout (grid/carousel).
3. `◎ / ◉` toggle per-ante hit-only groups.
- Tabs remain sticky at top of intro scroll content.

### Pagination and queue rendering
- `ui.app.js` uses UA-based page size:
1. Desktop UA: 8 antes/page.
2. Mobile UA: 4 antes/page.
- Pagination select must label each page with ante range:
`Page N (Ante X-Y)` (or single ante).
- Re-rendering current page should avoid unnecessary scroll resets unless explicitly requested.
- `Nearby Summaries` list should render current ante plus next 3 future analyzed antes (not nearest-around selection).
- Ante TOC section (`#anteNavSection`) sits between config input container and `#scrollingContainer`; each ante button jumps via `goToAntePage` and highlights current page antes.

### Packs section
- Pack header row is toggleable and keyboard-accessible.
- Header includes visible toggle indicator (`▾`/`▸`) to communicate collapsible behavior.
- Keep visual language aligned with queue/ante section cards.

### Card group layout contract
- Group sizes are fixed by game design: `GROUP_SIZES = [2, 3, 4]` (`ui.cards.js`).
- No placeholder cards should be injected to force fixed 4-wide visuals.
- Grid mode: group width follows actual card count (2/3/4), wraps naturally by available width.
- Carousel mode (`.cardList.scrollable`): natural horizontal scroll; no forced snap-per-group.
- Group visual styling alternates yellow/blue-grey by index (`group-style-yellow` / `group-style-grey`), and both `group-badge` and `group-range` follow group color theme.

## Tracking and search data flow

### Architecture (data-based, not DOM-based)
- **Search results** (`extractSearchResults` in `ui.search-integration.js`, internal): Parses `window.lastRawOutput` directly. Matches manual search terms against ALL antes' Boss/Voucher/Tags/ShopItems. Returns `Map<anteNum, Array<displayName>>`.
- **Tracking results** (`extractTrackingResults` in `ui.search-integration.js`): Same raw-output parsing approach. Matches active toggle terms (expanded to include English + Chinese display names) against all antes. Shop items include `#slot` suffix (e.g. `"Blueprint#3"`).
- **Summary augmentation** (`augmentSummaryWithSearch`): Combines search + tracking results into `window.lastAugmentedSummary`. Search hits get `🔍:` prefix; tracking hits are appended after base summary.
- **DOM highlighting** (`searchAndHighlight` in `ui.search.js`): Separate from data extraction. Assigns `.highlight-search` (manual) or `.highlight-track` (tracked, only when not also manual-matched) to visible queue items.

### Pipeline entry points
There are three ways the summary/search pipeline runs:
1. **Toggle button click** → `syncSearchFiltersToEmoji()` → `scheduleSearchAndHighlight()` → `searchChangeCallbacks` → `ui.init.js` callback runs full pipeline: `invalidateTrackingCache` → `extractTrackingItems` → `renderSummaryList` → `refreshNearbySummaries` → `applyEmojiFilter`.
2. **Emoji icon click** (`ui.filters.js`) → sets `_emojiSyncActive=true` → runs full linear pipeline directly (emoji filter → sync toggle buttons → invalidate cache → extract → render → highlight). The `_emojiSyncActive` guard prevents `searchChangeCallbacks` from duplicating work.
3. **Boolean state transition** (first toggle on / last toggle off) → `ui.app.js` `onSearchChange` callback calls `onTrackingTermsStateChange` → `extractTrackingItems` → `renderSummaryList` → `renderCurrentPage` → `renderAnteNavigation`.

### Key globals
- `window.summaryEmojiFilter` — object, canonical source for emoji visibility (true/false per emoji).
- `window.lastBaseSummariesByAnte` — Map, base summary from analyzer (set once per analysis).
- `window.lastTrackingSummariesByAnte` — Map, tracking results (refreshed by `extractTrackingItems`).
- `window.lastAugmentedSummary` — Map, combined search+tracking+base (set by `augmentSummaryWithSearch`).
- `window.lastSummariesByAnte` — Map, the active summary map used for rendering (points to augmented or base).
- `window._emojiSyncActive` — boolean guard, prevents redundant callback execution during emoji click pipeline.

### Canonical tracking check
`window.hasActiveTrackingItems()` (defined in `ui.state.js`) is the single canonical function for checking if any tracking toggle is active. All callers use this — do not create alternative implementations.

### applyEmojiFilter shorthand
`window.applyEmojiFilter()` (defined in `ui.state.js`) calls `applySummaryEmojiFilterSync`. Use this instead of the old verbose fallback pattern `(window.applySummaryEmojiFilterSync || window.applySummaryEmojiFilter)?.()`.

### Caution: DO NOT use DOM-based extraction for tracking/search data
Previous implementation scanned `.highlight-track` elements from rendered DOM. This caused:
1. Only current page antes were found (pagination hides others).
2. Items matching both search + tracking got `.highlight-search` but NOT `.highlight-track`, so they were missed.
3. Shop slot `#number` was lost (not in DOM text).

Always use raw-output parsing (via `extractTrackingResults` / `augmentSummaryWithSearch`) for data extraction. `parseRawOutputByAnte` is internal to `ui.search-integration.js` and cached — do not export or call it directly.

### Caution: Emoji filter maps are NOT identical
- `summaryFaceCardMap` / `faceEmojiMap`: Only maps joker-category face card emojis (👥, 👑, 🃏, etc.) to their card entries.
- `summaryEmojiMap`: Maps ALL emojis including non-joker ones (♔ for King Cards, 🎞️ for tags, etc.).
- `♔` is in `summaryEmojiMap` but NOT in `faceEmojiMap`. Code checking face card visibility must handle this.
- `isSegmentTermVisible`: When tracking is active and a segment has emojis but matches no tracked card, it returns `false` (hides it). This prevents unrelated face card segments (e.g. ♔钢铁K) from appearing when only specific jokers are tracked.

### Caution: Avoid circular callbacks
- `_applySummaryEmojiFilterCore` is a pure DOM filter — it must NOT call `syncEmojiFilterToSearch`, `extractTrackingItems`, or `searchAndHighlight`.
- `syncEmojiFilterToSearch` (in `ui.search.js`) must NOT call `scheduleSearchAndHighlight` — the caller is responsible for triggering search after the full pipeline.
- `onTrackingTermsStateChange` is the correct entry point for boolean state transitions: extract data → render → filter.
- `searchAndHighlight` fires `searchChangeCallbacks` — listeners must not re-trigger search.
- The `_emojiSyncActive` guard (set by emoji click handler in `ui.filters.js`) prevents `searchChangeCallbacks` in `ui.init.js` and `ui.app.js` from running redundant work during the emoji pipeline.

### Scroll preservation
- `renderCurrentPage` with `skipScroll: true` preserves scroll position via `requestAnimationFrame` wrapper.
- `onTrackingTermsStateChange` saves/restores `window.scrollY` around its render cycle.
- Any RAF callback that triggers `searchAndHighlight` or `applySummaryEmojiFilter` should capture scroll position before and restore after.

## State invariants
- `window.summaryEmojiVisible` controls only emoji glyph visibility in summary text.
- `window.summaryEmojiFilter` controls summary/mini-summary face visibility and joker tracker sync state (no card dimming side effects).
- Do not merge these states.
- Do not reintroduce removed summary-language toggles (summary language follows locale).
- Do not reintroduce `SummaryState` computed layer (was removed — all summary data flows through `lastBaseSummariesByAnte` → `extractTrackingItems` → `augmentSummaryWithSearch` → `lastSummariesByAnte`).
- Do not create alternative "is tracking active" functions — use the single canonical `window.hasActiveTrackingItems()` from `ui.state.js`.

## Performance rules (UI)
- Prefer class toggles over frequent inline style writes.
- Batch DOM updates with fragments or single-pass rebuilds when possible.
- Avoid repeated full-tree queries in hot paths (`input`, `scroll`, `resize`).
- Keep animation/blur usage conservative; preserve `ua-no-blur` fallback quality.
- Maintain one-open-floating-window rule to reduce paint/interaction conflicts.
- Search hot-path contract (`ui.search.js`):
1. Use scoped search roots (`setSearchScope`) instead of whole-document scans.
2. Mark search DOM dirty (`markSearchDomDirty`) whenever queue/pack/card DOM is rebuilt.
- Mobile rendering contract:
1. Keep phased spritesheet preload in `ui.renderers.js` (priority first, deferred idle preload).
2. Keep `content-visibility: auto` on heavy ante containers in `ui.css` unless a measured regression requires removal.

## Regression checklist
- Floating windows:
1. One open at a time.
2. `Esc` closes all.
3. Outside click closes.
- Search:
1. Typing updates results.
2. `Enter` closes floating search window.
3. Track highlights remain red; manual search highlights remain mint-cyan.
4. `Search Filters` and top-right emoji tracker toggles stay in sync both directions.
- Tracking:
1. Enabling filter buttons shows matching items across ALL antes in floating summary (not just current page).
2. Items matching both manual search and tracking appear in both `🔍:` and tracking sections of summary.
3. Shop items in tracking results include `#slot` number suffix.
4. Toggling filter buttons does not cause page jumps (scroll position preserved).
5. Disabling all filter buttons clears tracking summary; re-enabling restores it.
6. No unrelated face card segments (e.g. ♔钢铁K) leak into tracking results when specific jokers are tracked.
- Filter panel:
1. Single-click open/close reliability.
2. Hidden body does not keep phantom spacing when collapsed.
- Pagination:
1. Desktop 8 / mobile 4 antes per page.
2. Selector shows ante ranges on every page option.
- Mobile:
1. No clipped cards/groups.
2. No touch lag from duplicated handlers.
3. No blur transparency in `ua-no-blur` mode.
4. Number inputs show no native spin arrows.
- Caching/runtime:
1. Service worker controls page after reload in supported contexts.
2. `immolate.wasm` still loads successfully (HTTP 200 / no wasm init failures).
3. No console errors after first load and reload.

## Local verification commands
```bash
python3 tools/serve.py --port 4173
```
Open `http://127.0.0.1:4173/index.html`.

```bash
node tests/balatro_analysis.test.js
node -c src/balatro_analysis.js
node -c src/ui.state.js
node -c src/ui.unlocks.js
node -c src/ui.summary.js
node -c src/ui.filters.js
node -c src/ui.search-integration.js
node -c src/ui.floating.js
node -c src/ui.analysis.js
node -c src/ui.locale.js
node -c src/ui.init.js
node -c src/ui.search.js
node -c src/ui.cards.js
node -c src/ui.packs.js
node -c src/ui.app.js
node -c sw.js
node -c localization/i18n.global.js
node -c localization/generated/en-US.game.js
node -c localization/generated/zh-CN.game.js
node -c localization/generated/name-to-key.js
node -c localization/en-US.ui.js
node -c localization/ui-zh-CN.js
```

## Playwright sanity workflow
Use Playwright CLI for interaction checks when regressions are reported:
1. Launch local app on `127.0.0.1:4173`.
2. Verify floating window open/close states.
3. Capture mobile viewport screenshots (e.g., iPhone 13 Pro Max) for clipping/overflow checks.

## Change guidance
- If a request conflicts with these contracts, update this file in the same PR/commit as code changes.
- Keep this file concise and operational; it is a maintenance guide, not product marketing.
