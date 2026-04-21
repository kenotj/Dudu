# Dudu Translate

Open-source Chrome extension for bilingual webpage translation. Bring your own API key, or use the free mode. Inspired by Immersive Translate.

## Why Dudu?

Most browser translators either replace every word (breaking UI layouts) or show translations only below paragraphs. Dudu does both, and it does a third thing neither of them does well:

> **Box-fit UI translation.** Buttons, nav chips, badges, and menu items live in containers with fixed widths. When Dudu classifies an element as "UI-constrained", it measures the box and the rendered font, computes a character budget, and tells the LLM: *"your translation must render in at most N characters at this font."* If the result still overflows, it retries with a tighter budget, then falls back to ellipsis. Chinese to English UIs stop looking broken.

## Features

- **Bilingual webpage translation** — original + translation side by side.
- **Box-fit for UI text** — buttons, nav links, tag pills, and menu items auto-measured and constrained.
- **Real-time dynamic content** — a MutationObserver watches for new DOM (SPA routes, infinite scroll, chat messages) and translates within ~250ms. Box-fit re-measures each node at its current size.
- **Auto language detection** — script-ratio heuristic (Latin / CJK / Cyrillic / Arabic / Devanagari). Skip when already in your target language.
- **Viewport-gated translation** — `IntersectionObserver` translates what's visible first.
- **Translation cache** — IndexedDB, LRU ~20k entries, 30-day TTL, survives reloads.
- **Multiple providers, BYOK**:
  - OpenAI (GPT-4o-mini, configurable)
  - Anthropic Claude (Haiku 4.5, configurable)
  - Google Gemini (Flash, configurable)
  - DeepL (Free or Pro)
  - **Google Translate (free mode)** — zero-setup, best-effort.
- **YouTube & Netflix subtitle overlays** — bilingual dual-line captions.
- **PDF translation viewer** — drag in a PDF or open `viewer.html?file=<url>`; PDF.js text layer translated with box-fit per span.
- **Input-box hotkey** — triple-space in any input/textarea/contenteditable translates the field in place; Cmd/Ctrl+Z undoes.
- **Keyboard shortcuts** — Alt+A toggle, Alt+W translate whole page.
- **Per-site rules** — always / never / ask per hostname.
- **Monthly token cap** — stops LLM spend before it runs away.
- **Security** — API keys in `chrome.storage.local` only; all API calls go through the service worker; logger redacts anything that looks like a secret.

## Install (dev)

```bash
npm install
npm run build
```

Then in Chrome: `chrome://extensions` → Developer mode → Load unpacked → select `dist/`.

For live development: `npm run dev`.

## Configure

Click the extension icon → **Open options**.

- Pick your target language.
- Pick a provider. Free mode works out of the box. For LLM providers, paste your API key.
- Toggle **Box-fit for UI** to opt in/out of the size-constrained translation.

## How box-fit works

1. The content script walks the DOM, classifying every text-bearing element as `body`, `ui`, or `skip`.
2. `ui` = matches `button, a, [role=button], [role=menuitem], [role=tab], label, .badge, nav a` — or small (`<300x60`) with `overflow:hidden` / `text-overflow:ellipsis` / single line.
3. For each `ui` node: `getBoundingClientRect()` + `getComputedStyle()` → font string → `OffscreenCanvas.measureText` gives per-character advance → `maxChars = floor(rect.width * lines * 0.95 / advance)`.
4. That `SizeConstraint` is embedded in the LLM prompt as a `<constraint maxChars="N" ...>` tag.
5. Translation comes back, gets measured against the same box. If it overflows: one retry at 0.85x budget. Still overflows: apply CSS `text-overflow:ellipsis` and put the full text in `title`.
6. Non-LLM providers (DeepL, Google free) skip the constraint — their output is just truncated with ellipsis when needed.

## Testing

```bash
npm test            # unit tests (vitest + jsdom)
npm run typecheck   # tsc --noEmit
npm run build       # full production build
```

## Project layout

- `src/content/` — DOM walker, classifier, injector, mutation watcher, viewport gate, input-box hotkey.
- `src/lib/boxFit.ts` — the box-fit measurement + budget calculator.
- `src/providers/` — one file per translation backend.
- `src/background/` — service worker, cache, rate limiter, usage tracking.
- `src/subtitles/` — YouTube + Netflix caption hooks.
- `src/pdf/` — PDF.js-based viewer with translated text overlay.
- `src/popup/`, `src/options/` — Preact UIs.

## License

MIT.

## Status

v0.1.0 — MVP. Tested on modern Chrome (MV3). Not yet published to the Chrome Web Store.

## Known limitations

- Shadow DOM and cross-origin iframes are skipped.
- The Google free endpoint is unofficial and can be rate-limited — configure a real provider for reliable use.
- Subtitle hooks depend on YouTube/Netflix internals and may need updates when those services refactor.
- Canvas `measureText` is ~2% off for Latin, worse for CJK ligatures; a 5% safety margin + retry-at-0.85x absorbs most of it.
