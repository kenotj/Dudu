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
let inFlight = false;

function getVideo(): HTMLVideoElement | null {
  return document.querySelector('video') as HTMLVideoElement | null;
}

function ensureOverlay(): SubtitleOverlay | null {
  const video = getVideo();
  if (!video) return null;
  if (!overlay) overlay = createOverlay(video);
  return overlay;
}

function parseTtml(xmlText: string): Cue[] {
  const out: Cue[] = [];
  try {
    const doc = new DOMParser().parseFromString(xmlText, 'application/xml');
    const paragraphs = doc.getElementsByTagName('p');
    for (const p of Array.from(paragraphs)) {
      const begin = toMs(p.getAttribute('begin'));
      const end = toMs(p.getAttribute('end'));
      const text = (p.textContent ?? '').replace(/\s+/g, ' ').trim();
      if (!text || begin === null || end === null) continue;
      out.push({ startMs: begin, endMs: end, text });
    }
  } catch {
    /* ignore */
  }
  return out;
}

function toMs(time: string | null): number | null {
  if (!time) return null;
  if (/^\d+(\.\d+)?t$/.test(time)) return null;
  const m = /^(\d+):(\d+):(\d+)(?:\.(\d+))?$/.exec(time);
  if (!m) {
    const n = parseFloat(time);
    return Number.isFinite(n) ? n * 1000 : null;
  }
  const [, hh, mm, ss, frac] = m;
  const sec = Number(hh) * 3600 + Number(mm) * 60 + Number(ss) + (frac ? Number(`0.${frac}`) : 0);
  return sec * 1000;
}

async function translatePending(): Promise<void> {
  if (inFlight) return;
  const batch = cues.filter((c) => !c.translated).slice(0, 20);
  if (batch.length === 0) return;
  inFlight = true;
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
    logger.warn('netflix translate failed', { err: (e as Error).message });
  } finally {
    inFlight = false;
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

function hookXhr(): void {
  const origOpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function (this: XMLHttpRequest, ...args: any[]) {
    (this as any).__duduUrl = args[1];
    return (origOpen as any).apply(this, args);
  } as typeof XMLHttpRequest.prototype.open;

  const origSend = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.send = function (this: XMLHttpRequest, ...args: any[]) {
    this.addEventListener('load', () => {
      try {
        const url: string | undefined = (this as any).__duduUrl;
        if (url && /timedtext|ttml/.test(url) && this.responseText) {
          const parsed = parseTtml(this.responseText);
          if (parsed.length > 0) {
            cues.length = 0;
            cues.push(...parsed);
          }
        }
      } catch {
        /* ignore */
      }
    });
    return (origSend as any).apply(this, args);
  } as typeof XMLHttpRequest.prototype.send;
}

(function init() {
  hookXhr();
  rafId = requestAnimationFrame(tick);
  window.addEventListener('pagehide', () => {
    if (rafId) cancelAnimationFrame(rafId);
    overlay?.dispose();
  });
})();
