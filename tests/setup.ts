import 'fake-indexeddb/auto';

// Minimal chrome.* shim for tests that touch settings/storage.
const storage = new Map<string, unknown>();
(globalThis as any).chrome = {
  storage: {
    local: {
      async get(key: string | string[]) {
        const keys = Array.isArray(key) ? key : [key];
        const out: Record<string, unknown> = {};
        for (const k of keys) if (storage.has(k)) out[k] = storage.get(k);
        return out;
      },
      async set(obj: Record<string, unknown>) {
        for (const [k, v] of Object.entries(obj)) storage.set(k, v);
      },
    },
  },
  runtime: { lastError: null, sendMessage: () => {}, onMessage: { addListener: () => {} } },
};

// Provide a minimal CanvasRenderingContext2D.measureText in jsdom
const origCreate = document.createElement.bind(document);
document.createElement = ((tag: string, opts?: ElementCreationOptions) => {
  const el = origCreate(tag as keyof HTMLElementTagNameMap, opts) as HTMLElement;
  if (tag === 'canvas') {
    (el as HTMLCanvasElement).getContext = ((type: string) => {
      if (type !== '2d') return null;
      return {
        font: '',
        measureText(text: string) {
          // jsdom has no real font metrics, emulate a monospace-like width.
          const size = parseFloat(String((this as any).font).match(/(\d+)px/)?.[1] ?? '14');
          return { width: text.length * size * 0.5 };
        },
      } as unknown as CanvasRenderingContext2D;
    }) as HTMLCanvasElement['getContext'];
  }
  return el;
}) as typeof document.createElement;

// OffscreenCanvas not present in jsdom — fall back to <canvas>.
(globalThis as any).OffscreenCanvas = undefined;
