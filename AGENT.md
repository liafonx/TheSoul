# AGENT.md

## Project overview
The Soul is a browser-based Balatro seed analyzer built on a WebAssembly analyzer (`immolate.js` + `immolate.wasm`).

Current UX includes:
- Config form (`Config Analyze`) for seed/deck/stake/version and run limits.
- Per-ante queue + packs rendering.
- Floating summary panel and nearby mini-summaries.
- Localization toggle (`zh-CN` default, `en-US` optional).
- Emoji legend and emoji-based filtering controls.

## Current behavior contract

### Analyze config
- Main heading is `Config Analyze`.
- `Max Ante` is clamped to `1-39` with default `39`.
- `Cards per Ante` default is `300`.
- `Omit results before Ante 9` is supported.

### Summary actions
- The old `Summarize` action is replaced by `Copy Summary`.
- `Copy Summary` behavior:
1. If no raw analysis exists, show "Nothing to summarize yet.".
2. If summary is stale/missing, generate summary first.
3. Copy summary text to clipboard.
- There is no `with English` toggle anymore.
- Summary language follows current locale:
1. `zh-CN`: Chinese summary output.
2. `en-US`: English-only summary output.

### Emoji settings and legend
- Top-right button is `Settings` (not `Filter`).
- Emoji legend button is next to language toggle.
- Legend includes `👝` meaning "in packs" and it should always remain visible in text.

Emoji controls are intentionally split:
1. Global `Emojis: visible/hidden`:
- Only hides/shows emoji glyph characters in summary text.
- Must not disable whole entries.

2. Square emoji icon buttons:
- Control entry-level filtering/dimming behavior.
- Only joker-face categories are represented as square buttons.
- Voucher/tag/boss/spectral categories are not shown as square buttons.

### Search
- Search accepts English comma `,` and Chinese comma `，`.
- Term thresholds:
1. Chinese term: min length 1.
2. Non-Chinese term: min length 3.

## Architecture

## Core entry points
- `index.html`: app shell, settings UI, locale handling, summary panels, analysis flow.
- `UI.js`: sequential UI module loader.
- `balatro_analysis.js`: analyzer parser/summary logic (browser + Node).
- `balatro_lists.js`: shared tracked lists, emoji metadata, translation helpers.

## UI modules (loaded by `UI.js`)
1. `ui.data.js`
2. `ui.renderers.js`
3. `ui.utils.js`
4. `ui.search.js`
5. `ui.cards.js`
6. `ui.packs.js`
7. `ui.app.js`

## Localization files
- `localization/generated/zh-CN.game.js`
- `localization/ui-zh-CN.js`
- `localization/i18n.global.js`

`index.html` uses versioned asset loading (`?v=...`) to reduce stale-cache issues in local dev.

## Important implementation notes
- Keep `window.summaryEmojiVisible` independent from `window.summaryEmojiFilter`.
- Do not reintroduce `with English` checkbox.
- Do not expand square emoji filter buttons beyond joker-face groups unless explicitly requested.
- Preserve negative marker emphasis (`‼️`) as red/bold even when color mode is set to default.

## Testing
- Main regression check:
```bash
node balatro_analysis.test.js
```

- Syntax check quick pass:
```bash
node -c balatro_analysis.js
node -c ui.utils.js
node -c ui.search.js
node -c ui.cards.js
node -c ui.packs.js
node -c ui.app.js
node -c localization/ui-zh-CN.js
```

## Mistakes log (historical)
1. I previously conflated global emoji visibility and per-emoji entry filters.
2. I previously added non-joker square emoji filter icons (voucher/tag/boss/spectral), which was not desired.
3. I previously diverged summary behavior from requested UX and then corrected it.
