# Releases

Prebuilt, unpacked Chrome extension archives. Download a zip, unzip it, and load the resulting folder in `chrome://extensions` with Developer mode on.

## Install

1. Download the zip for the release you want (see files in this directory).
2. Unzip it anywhere. You'll get a folder containing `manifest.json`, `service-worker-loader.js`, `assets/`, `icons/`, and the popup/options/pdf HTML files.
3. Open `chrome://extensions` in Chrome.
4. Enable **Developer mode** (top right).
5. Click **Load unpacked** and select the unzipped folder.

The Dudu owl icon will appear in your extensions toolbar.

## v0.1.0 — MVP

- `dudu-translate-v0.1.0.zip` — lean build (≈630 KB), recommended for normal use.
- `dudu-translate-v0.1.0-with-sourcemaps.zip` — same build plus `.map` files (≈1 MB) for debugging.

### What's in v0.1.0

- Bilingual webpage translation with real-time MutationObserver + IntersectionObserver pipeline.
- Box-fit UI translation for buttons/nav/menus (LLM providers only).
- Providers: Google Translate free mode (no setup), OpenAI, Anthropic Claude, Google Gemini, DeepL (BYOK).
- YouTube + Netflix bilingual subtitle overlays.
- PDF.js viewer with translated text layer.
- Triple-space input-box hotkey with Cmd/Ctrl+Z undo.
- IndexedDB translation cache, per-provider rate limiter, monthly token cap.
- Owl mascot logo, Preact popup & options UI, keyboard shortcuts (Alt+A / Alt+W).

### SHA-256

```
9b99cc88ff16066b79bffa9cf9fd40a240351cffdb5baa78a966d159ff4fe5e0  dudu-translate-v0.1.0.zip
b47a75c5a0865522785cabcab890f786a5f4339c76d15fe550ac1c9dc98a963e  dudu-translate-v0.1.0-with-sourcemaps.zip
```

Verify locally:

```bash
shasum -a 256 dudu-translate-v0.1.0.zip
```

## Building from source yourself

```bash
git clone https://github.com/kenotj/Dudu.git
cd Dudu
git checkout claude/open-source-translation-extension-ZcXtg
npm install
npm run build
# dist/ is the unpacked extension
```
