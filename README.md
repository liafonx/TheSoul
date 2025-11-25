# The Soul

The Soul is a web-based seed analyzer for **Balatro**. It runs entirely in the browser and bundles a WebAssembly port of the native analyzer, letting players inspect seeds, unlocked content, and ante-by-ante shop data without installing anything.

## Features

- Analyze Balatro seeds directly in the browser using the built-in WebAssembly module.
- Toggle decks, stakes, Balatro versions, and unlocked jokers/vouchers/tags to match your save file.
- Export summaries or copy sharable links so other players can inspect the same seed.
- Ship a Node + Python CLI for validating raw game outputs and regression tests.

## Repository layout

- `index.html`, `UI.js`, `ui.*.js`, `ui.css`, `base.css` power the user interface.
- `immolate.js` / `immolate.wasm` are generated with Emscripten from `include/immolate.cpp`.
- `balatro_analysis.js` contains the shared analyzer logic (browser + Node CLI).
- `balatro_analysis.test.js` and `balatro_analysis_test.py` verify analyzer output against fixtures in `outputs/`.

## Run locally

Because browsers block `file://` fetches for `.wasm`, serve the repo through any static server:

```bash
git clone https://github.com/spectralpack/TheSoul.git
cd TheSoul
python3 -m http.server 4173
```

Open `http://localhost:4173` and the UI will load from `index.html`. Use a different port if `4173` is taken.

## Rebuilding the WebAssembly module

The checked-in `immolate.js`/`immolate.wasm` pair is produced with Emscripten. Rebuild only if you modify the C++ source in `include/`:

```bash
em++ -O3 --closure 1 -lembind -o immolate.js include/immolate.cpp -s EXPORT_NAME="'Immolate'"
```

On Windows you can double-click `build.bat`, which runs the same command. Commit the updated `.js` and `.wasm` so Vercel (or any static host) can serve them.

## CLI usage & tests

The analyzer can also run against raw Balatro output files.

```bash
# Summarize raw text files
node balatro_analysis.js outputs/example_analysis.txt

# Verify shop/tag parsing for every fixture in outputs/
node balatro_analysis.test.js

# Python parity test (optional, uses stdlib only)
python3 balatro_analysis_test.py
```

Both test runners assume the `outputs/` directory is populated with `*_analysis.txt` fixtures.

## Deploying to Vercel

This project is a static site, so no build step is required.

1. Push the repo to GitHub/GitLab/Bitbucket.
2. In the Vercel dashboard choose **Add New Project → Other** and import the repository.
3. Leave **Install Command** blank, set **Build Command** blank, and set **Output Directory** to `.`.
4. Deploy; Vercel will upload the existing files. Future pushes to the default branch redeploy automatically.

CLI alternative:

```bash
npm install -g vercel
vercel login
vercel           # answer “Other” and set output directory to "."
vercel --prod    # create the production deployment
```

Once deployed, verify the live site downloads `immolate.wasm` successfully (Network tab) and smoke-test the export/copy link flows.

## Production site

The latest stable deployment lives at https://spectralpack.github.io/TheSoul/.
