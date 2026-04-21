<p align="center">
  <img src="./docs/logo.svg" alt="Dudu Translate — a cute teal owl reading an open book labelled Dudu" width="180" />
</p>

<h1 align="center">Dudu Translate</h1>

<p align="center">
  <em>读读 · <strong>dúdu</strong> · "read, read"</em><br/>
  Open-source bilingual translation for the browser, with <strong>box-fit UI translation</strong> that makes buttons stop overflowing.
</p>

<p align="center">
  <a href="#install"><img alt="MV3" src="https://img.shields.io/badge/Chrome-MV3-14B8A6?style=flat-square"></a>
  <a href="#testing"><img alt="tests" src="https://img.shields.io/badge/tests-34%20passing-16a34a?style=flat-square"></a>
  <img alt="typescript" src="https://img.shields.io/badge/TypeScript-strict-3178C6?style=flat-square">
  <img alt="license" src="https://img.shields.io/badge/license-MIT-6b7280?style=flat-square">
  <img alt="status" src="https://img.shields.io/badge/status-v0.1.0%20MVP-f59e0b?style=flat-square">
</p>

---

## Why Dudu?

Most browser translators either replace every word and wreck the layout, or tuck translations under paragraphs and ignore the UI entirely. Dudu does both — and does a third thing neither of them does well:

> 🪶 **Box-fit UI translation.** Buttons, nav chips, badges, and menu items live inside fixed-width boxes. When Dudu classifies an element as UI-constrained, it measures the box at its rendered font, computes a character budget, and tells the LLM: *"your translation must render in at most N characters at this font."* If the result still overflows, it retries with a tighter budget, then falls back to ellipsis. Chinese → English UIs stop looking broken.

## ✨ Features

| | |
|---|---|
| 📖 **Bilingual webpage translation** | Original + translation side by side. |
| 🧩 **Box-fit for UI** | Auto-measured constraints for buttons, nav, tags, menus. |
| ⚡ **Real-time dynamic content** | `MutationObserver` catches SPA routes, infinite scroll, chat, and re-measures on every change. |
| 🧠 **Auto language detection** | Script-ratio heuristic for Latin / CJK / Cyrillic / Arabic / Devanagari. |
| 👁 **Viewport-gated** | `IntersectionObserver` translates what's visible first to save tokens. |
| 💾 **IndexedDB cache** | LRU ~20k entries, 30-day TTL, bucketed so similar buttons share entries. |
| 🎬 **YouTube + Netflix subtitles** | Dual-line bilingual overlay via timedtext hooks. |
| 📄 **PDF translation viewer** | PDF.js viewer with box-fit on every text span. |
| ⌨️ **Input-box hotkey** | Triple-space in any field translates in place; Cmd/Ctrl+Z undoes. |
| 🔒 **Security-first** | Keys in `chrome.storage.local` only, all fetches from the service worker, secrets redacted from logs. |

### Providers

| Provider | Key required | Box-fit | Notes |
|---|:---:|:---:|---|
| **Google Translate (free)** | — | — | Zero-setup, best-effort, unofficial endpoint. |
| **OpenAI** | ✅ | ✅ | Default `gpt-4o-mini`, configurable. |
| **Anthropic Claude** | ✅ | ✅ | Default `claude-haiku-4-5-20251001`, configurable. |
| **Google Gemini** | ✅ | ✅ | Default `gemini-1.5-flash`, configurable. |
| **DeepL** | ✅ | — | Free or Pro endpoint; best raw MT quality, but cannot honor length constraints. |

## 🚀 Install

```bash
npm install
npm run build
```

Then in Chrome: `chrome://extensions` → **Developer mode** → **Load unpacked** → pick `dist/`.

For live development with HMR:

```bash
npm run dev
```

## ⚙️ Configure

Click the extension icon → **Open options**.

1. Pick your target language.
2. Pick a provider. Free mode works out of the box; for LLM providers, paste your API key.
3. Toggle **Box-fit for UI** if you want the size-aware translation on (it is, by default).

## 🧩 How box-fit works

```
classify(el)  →  'body' | 'ui' | 'skip'
                    │
       ┌────────────┴────────────┐
       ▼                         ▼
   body: bilingual           ui: size-constrained replace
   sibling <font>
                         measureBudget(el):
                             rect × lines × 0.95
                             ÷ canvas.measureText advance
                             = maxChars

                         provider.translate(text, constraint)
                         if overflow → retry at 0.85× budget
                         if still overflow → CSS ellipsis + title
```

1. The content script walks the DOM and classifies each text-bearing element.
2. UI = matches `button, a, [role=button], [role=menuitem], [role=tab], label, nav a, .badge, .tag, .chip` — **or** small (`<300 × 60 px`) with `overflow:hidden` / `text-overflow:ellipsis` / single line.
3. For each UI node: `getBoundingClientRect()` + `getComputedStyle()` → font string → `OffscreenCanvas.measureText` → average advance → `maxChars = floor(rect.width × lines × 0.95 / advance)`.
4. The `SizeConstraint` is embedded in the LLM prompt as `<constraint maxChars="N" fontFamily="..." fontSizePx="14" fontWeight="500" lines="1"/>`.
5. Remeasure; if over → one retry at 0.85× budget → if still over, apply `text-overflow:ellipsis` and stash the full text in `title`.
6. Non-LLM providers skip the constraint and fall back to ellipsis when needed.

## ⌨️ Keyboard shortcuts

| Shortcut | Action |
|---|---|
| <kbd>Alt</kbd>+<kbd>A</kbd> | Toggle translation on the current page |
| <kbd>Alt</kbd>+<kbd>W</kbd> | Translate the whole page right now |
| <kbd>Space</kbd> <kbd>Space</kbd> <kbd>Space</kbd> | Translate the focused input / textarea / contenteditable |
| <kbd>Cmd</kbd>/<kbd>Ctrl</kbd>+<kbd>Z</kbd> | Undo the last input-box translation |

## 🧪 Testing

```bash
npm test            # 34 unit tests (vitest + jsdom)
npm run typecheck   # tsc --noEmit
npm run build       # full production build into dist/
```

## 📁 Project layout

```
src/
├── content/          DOM walker, classifier, injector, mutation/viewport gates, triple-space hotkey
├── lib/
│   ├── boxFit.ts     ← the box-fit measurement + budget (core differentiator)
│   ├── classify→     body | ui | skip heuristic (in content/)
│   ├── prompt.ts     constraint-aware LLM prompt builder
│   ├── batcher.ts    token-budget packer
│   ├── langDetect.ts script-ratio language detector
│   └── settings.ts   zod-validated chrome.storage wrapper
├── providers/        one file per backend (openai, anthropic, gemini, deepl, googleFree)
├── background/       MV3 service worker: cache, rate limiter, usage tracker, message router
├── subtitles/        YouTube + Netflix timedtext hooks + dual-line overlay
├── pdf/              PDF.js viewer with translated text-layer overlay
├── popup/, options/  Preact UIs
└── shared/           types, constants, messaging protocol
```

## 🎨 Branding

- Mascot: a friendly teal owl, reading.
- Name: **Dudu** — a romanization of **读读** (*dúdu*, "read, read"), hinting at the bilingual nature of the extension (read original, read translation).
- Palette: teal `#14B8A6`, cream `#F5E8D4`, peach accent `#F4B183`, ink `#111827`.

### Regenerate the 16 / 32 / 48 / 128 px icons from the master SVG

The master lives at [`docs/logo.svg`](./docs/logo.svg). Regenerate the four PNG icon sizes after any edit:

```bash
npm run icons
```

Under the hood this uses [`sharp`](https://sharp.pixelplumbing.com/) to rasterize `docs/logo.svg` into `public/icons/icon-{16,32,48,128}.png`.

## 🧭 Roadmap

- [ ] Per-site rule editor in the options page (currently editable via settings only)
- [ ] `liblib.tv` E2E snapshot fixture for box-fit regression testing
- [ ] Shadow DOM + same-origin iframe support
- [ ] LibreTranslate provider
- [ ] Chrome Web Store listing

## 📦 Status

**v0.1.0 — MVP.** Builds cleanly on Chrome MV3. 34/34 unit tests passing. Not yet published.

## ⚠️ Known limitations

- Shadow DOM and cross-origin iframes are skipped.
- The Google free endpoint is unofficial and can be rate-limited — add an API key for reliability.
- Subtitle hooks depend on YouTube / Netflix internals and may need updating if those services refactor.
- Canvas `measureText` is ~2% off for Latin, worse for CJK ligatures; a 5% safety margin + retry-at-0.85× absorbs most of it.

## 📜 License

MIT.

<p align="center"><sub>Built with TypeScript, Vite, @crxjs/vite-plugin, Preact, idb, zod, and pdfjs-dist.</sub></p>
