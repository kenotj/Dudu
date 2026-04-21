import { createOverlay, type SubtitleOverlay, type CueLine } from './overlay';
import { sendToBackground } from '@/shared/messages';
import type { TranslateRequest, TranslateResponse } from '@/shared/messages';
import { loadSettings } from '@/lib/settings';
import { nextSegmentId } from '@/lib/batcher';
import { logger } from '@/lib/logger';

interface Cue {
  startMs: number;
  endMs: number;
  text: string;
  translated?: string;
}

const cues: Cue[] = [];
let overlay: SubtitleOverlay | null = null;
let rafId: number | null = null;
let translationInFlight = false;

function getVideo(): HTMLVideoElement | null {
  return document.querySelector('video.html5-main-video') as HTMLVideoElement | null;
}

function ensureOverlay(): SubtitleOverlay | null {
  const video = getVideo();
  if (!video) return null;
  if (!overlay) overlay = createOverlay(video);
  return overlay;
}

function parseTimedText(body: string): Cue[] {
  try {
    const json = JSON.parse(body);
    if (Array.isArray(json?.events)) {
      const out: Cue[] = [];
      for (const evt of json.events) {
        if (!evt.segs || typeof evt.tStartMs !== 'number') continue;
        const text = evt.segs.map((s: { utf8?: string }) => s.utf8 ?? '').join('').trim();
        if (!text) continue;
        const dur = typeof evt.dDurationMs === 'number' ? evt.dDurationMs : 3000;
        out.push({ startMs: evt.tStartMs, endMs: evt.tStartMs + dur, text });
      }
      return out;
    }
  } catch {
    // fall through
  }
  return [];
}

async function translatePending(): Promise<void> {
  if (translationInFlight) return;
  const batch = cues.filter((c) => !c.translated).slice(0, 20);
  if (batch.length === 0) return;
  translationInFlight = true;
  try {
    const settings = await loadSettings();
    if (settings.subtitleMode === 'off') return;
    const segments = batch.map((c) => ({ id: nextSegmentId(), text: c.text }));
    const req: TranslateRequest = {
      type: 'translate',
      segments,
      targetLang: settings.targetLang,
      sourceLang: settings.sourceLang,
    };
    const resp = await sendToBackground<TranslateRequest, TranslateResponse>(req);
    if (resp.ok && resp.result) {
      for (let i = 0; i < batch.length; i++) {
        const item = resp.result.items[i];
        if (item) batch[i].translated = item.text;
      }
    }
  } catch (e) {
    logger.warn('subtitle translate failed', { err: (e as Error).message });
  } finally {
    translationInFlight = false;
  }
}

function tick(): void {
  const video = getVideo();
  const ov = ensureOverlay();
  if (!video || !ov) {
    rafId = requestAnimationFrame(tick);
    return;
  }
  const nowMs = video.currentTime * 1000;
  const active = cues.filter((c) => nowMs >= c.startMs && nowMs <= c.endMs);
  const lines: CueLine[] = active.map((c) => ({
    original: c.text,
    translation: c.translated,
  }));
  ov.render(lines);
  void translatePending();
  rafId = requestAnimationFrame(tick);
}

function hookFetch(): void {
  const origFetch = window.fetch;
  window.fetch = async function (...args: Parameters<typeof fetch>) {
    const resp = await origFetch.apply(this, args);
    try {
      const url = typeof args[0] === 'string' ? args[0] : (args[0] as Request).url;
      if (url && /\/api\/timedtext/.test(url)) {
        const clone = resp.clone();
        clone
          .text()
          .then((body) => {
            const parsed = parseTimedText(body);
            if (parsed.length > 0) {
              cues.length = 0;
              cues.push(...parsed);
            }
          })
          .catch(() => {});
      }
    } catch {
      /* noop */
    }
    return resp;
  };
}

(function init() {
  hookFetch();
  rafId = requestAnimationFrame(tick);
  window.addEventListener('pagehide', () => {
    if (rafId) cancelAnimationFrame(rafId);
    overlay?.dispose();
  });
})();
