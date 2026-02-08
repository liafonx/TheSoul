# AGENT.md

Last updated: 2026-02-08

## Purpose
This repository is a browser-based Balatro seed analyzer. The top priority for UI changes is perceived performance and interaction stability on both desktop and mobile.

## Project map

### Core files
- `index.html`: App shell, top bar controls, floating-window lifecycle, locale/theme bootstrapping, and main analyze flow wiring.
- `UI.js`: Ordered UI module loader.
- `ui.css`: Design tokens, responsive layout, button/window styles, card/packs/search/floating-window styling.
- `ui.app.js`: Main orchestrator for queue rendering, pagination, and cross-module wiring.
- `ui.search.js`: Search input, filter panel, active term management, highlight assignment.
- `ui.cards.js`: Card group rendering and card-item display.
- `ui.packs.js`: Pack section rendering, pack header/toggle behavior, pack filters.
- `sw.js`: Service worker for static asset caching (stale-while-revalidate) and navigation fallback.
- `balatro_analysis.js`: Analyzer logic (browser + Node use).
- `balatro_lists.js`: Shared lists, emoji metadata, label mappings.
- `docs/knowledge-base.md`: Prediction model summary (seed/config determinism, data flow).

### Localization
- `localization/i18n.global.js`
- `localization/ui-zh-CN.js`
- `localization/generated/zh-CN.game.js`

## Runtime and caching contracts
- `index.html` must keep valid document structure: scripts/styles are declared inside `<head>`; do not reintroduce script blocks before `<head>`.
- Do not reintroduce `document.write(...)` for scripts/styles.
- Service worker registration lives in `index.html` and should run only when:
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
- Canonical tracked arrays are:
1. `JOKER_NAMES`
2. `SPECTRAL_NAMES`
3. `TAG_NAMES`
4. `VOUCHER_NAMES`
5. `ALERT_BOSSES`
- `ui.data.js` should consume canonical arrays directly; do not reintroduce compatibility aliases like `sharedLists.jokers` / `sharedLists.spectrals`.
- `balatro_lists.js` uses explicit tracked fallback maps (`TRACKED_*_FALLBACK_ZH`) and exports `TRACKED_JOKERS` / `TRACKED_SPECTRALS`; keep naming explicit (avoid misleading `LEGACY_*` names).

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
- Priority rule: if a card matches both manual search and tracked filters, manual search highlight (`.highlight-search`) takes precedence.
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

## State invariants
- `window.summaryEmojiVisible` controls only emoji glyph visibility in summary text.
- `window.summaryEmojiFilter` controls summary/mini-summary face visibility and joker tracker sync state (no card dimming side effects).
- Do not merge these states.
- Do not reintroduce removed summary-language toggles (summary language follows locale).

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
python3 serve.py --port 4173
```
Open `http://127.0.0.1:4173/index.html`.

```bash
node balatro_analysis.test.js
node -c balatro_analysis.js
node -c ui.search.js
node -c ui.cards.js
node -c ui.packs.js
node -c ui.app.js
node -c sw.js
```

## Playwright sanity workflow
Use Playwright CLI for interaction checks when regressions are reported:
1. Launch local app on `127.0.0.1:4173`.
2. Verify floating window open/close states.
3. Capture mobile viewport screenshots (e.g., iPhone 13 Pro Max) for clipping/overflow checks.

## Change guidance
- If a request conflicts with these contracts, update this file in the same PR/commit as code changes.
- Keep this file concise and operational; it is a maintenance guide, not product marketing.
