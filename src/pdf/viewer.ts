import { loadSettings } from '@/lib/settings';
import { sendToBackground } from '@/shared/messages';
import { nextSegmentId } from '@/lib/batcher';
import { computeBudget } from '@/lib/boxFit';
import type { TranslateRequest, TranslateResponse } from '@/shared/messages';
import type { TextSegment } from '@/providers/types';

const statusEl = document.getElementById('status') as HTMLElement;
const viewerEl = document.getElementById('viewer') as HTMLElement;
const fileInput = document.getElementById('file') as HTMLInputElement;

function setStatus(msg: string): void {
  statusEl.textContent = msg;
}

async function loadPdfJs(): Promise<any> {
  const mod = (await import('pdfjs-dist')) as any;
  // The worker URL is resolved at build time by Vite via the ?url import.
  const worker: string = (
    await import(/* @vite-ignore */ 'pdfjs-dist/build/pdf.worker.mjs?url')
  ).default;
  mod.GlobalWorkerOptions.workerSrc = worker;
  return mod;
}

interface TextSpan {
  el: HTMLSpanElement;
  rect: { width: number; height: number };
  fontFamily: string;
  fontSizePx: number;
  text: string;
}

async function renderPage(pdf: any, pageNum: number, container: HTMLElement): Promise<TextSpan[]> {
  const page = await pdf.getPage(pageNum);
  const viewport = page.getViewport({ scale: 1.4 });
  const pageDiv = document.createElement('div');
  pageDiv.className = 'page';
  pageDiv.style.width = `${viewport.width}px`;
  pageDiv.style.height = `${viewport.height}px`;
  const canvas = document.createElement('canvas');
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  const ctx = canvas.getContext('2d')!;
  pageDiv.appendChild(canvas);
  await page.render({ canvasContext: ctx, viewport }).promise;

  const textContent = await page.getTextContent();
  const layer = document.createElement('div');
  layer.className = 'text-layer';
  layer.style.width = `${viewport.width}px`;
  layer.style.height = `${viewport.height}px`;
  pageDiv.appendChild(layer);

  const translationLayer = document.createElement('div');
  translationLayer.className = 'translation-layer';
  translationLayer.style.width = `${viewport.width}px`;
  translationLayer.style.height = `${viewport.height}px`;
  pageDiv.appendChild(translationLayer);
  container.appendChild(pageDiv);

  const spans: TextSpan[] = [];
  for (const item of textContent.items as any[]) {
    if (!item.str?.trim()) continue;
    const tx = item.transform;
    const fontSize = Math.hypot(tx[2], tx[3]);
    const x = tx[4];
    const y = viewport.height - tx[5];
    const span = document.createElement('span');
    span.textContent = item.str;
    span.style.left = `${x}px`;
    span.style.top = `${y - fontSize}px`;
    span.style.fontSize = `${fontSize}px`;
    span.style.fontFamily = item.fontName || 'sans-serif';
    layer.appendChild(span);
    const rect = span.getBoundingClientRect();
    spans.push({
      el: span,
      rect: { width: Math.max(rect.width, item.width || 0), height: fontSize * 1.2 },
      fontFamily: span.style.fontFamily,
      fontSizePx: fontSize,
      text: item.str,
    });
  }

  // Return spans for later translation
  return spans;
}

async function translateSpans(spans: TextSpan[]): Promise<void> {
  const settings = await loadSettings();
  const segments: TextSegment[] = spans.map((s) => ({
    id: nextSegmentId(),
    text: s.text,
    constraint: computeBudget({
      rect: s.rect,
      computedStyle: {
        fontFamily: s.fontFamily,
        fontSize: `${s.fontSizePx}px`,
        fontWeight: '400',
        fontStyle: 'normal',
        lineHeight: 'normal',
      } as any,
      sampleText: s.text,
    }),
  }));

  const chunkSize = 20;
  for (let i = 0; i < segments.length; i += chunkSize) {
    const chunk = segments.slice(i, i + chunkSize);
    const req: TranslateRequest = {
      type: 'translate',
      segments: chunk,
      targetLang: settings.targetLang,
      sourceLang: settings.sourceLang,
    };
    const resp = await sendToBackground<TranslateRequest, TranslateResponse>(req);
    if (!resp.ok || !resp.result) continue;
    for (let j = 0; j < chunk.length; j++) {
      const t = resp.result.items[j]?.text;
      const s = spans[i + j];
      if (!t || !s) continue;
      const overlay = document.createElement('span');
      overlay.textContent = t;
      overlay.style.left = s.el.style.left;
      overlay.style.top = s.el.style.top;
      overlay.style.fontSize = s.el.style.fontSize;
      overlay.style.maxWidth = `${s.rect.width}px`;
      overlay.style.overflow = 'hidden';
      overlay.style.textOverflow = 'ellipsis';
      overlay.title = t;
      s.el.parentElement!.parentElement!.querySelector('.translation-layer')!.appendChild(overlay);
    }
    setStatus(`Translated ${Math.min(i + chunkSize, segments.length)} / ${segments.length} spans`);
  }
}

fileInput.addEventListener('change', async () => {
  const file = fileInput.files?.[0];
  if (!file) return;
  setStatus('Loading PDF…');
  try {
    const pdfjs = await loadPdfJs();
    const buf = await file.arrayBuffer();
    const pdf = await pdfjs.getDocument({ data: buf }).promise;
    viewerEl.innerHTML = '';
    const allSpans: TextSpan[] = [];
    for (let i = 1; i <= pdf.numPages; i++) {
      setStatus(`Rendering page ${i} / ${pdf.numPages}…`);
      const spans = await renderPage(pdf, i, viewerEl);
      allSpans.push(...spans);
    }
    setStatus(`Translating ${allSpans.length} text spans…`);
    await translateSpans(allSpans);
    setStatus('Done.');
  } catch (e) {
    setStatus(`Error: ${(e as Error).message}`);
  }
});

// Query param: ?file=<url>
(async () => {
  const url = new URLSearchParams(location.search).get('file');
  if (!url) return;
  try {
    setStatus('Fetching remote PDF…');
    const pdfjs = await loadPdfJs();
    const pdf = await pdfjs.getDocument({ url }).promise;
    viewerEl.innerHTML = '';
    const allSpans: TextSpan[] = [];
    for (let i = 1; i <= pdf.numPages; i++) {
      setStatus(`Rendering page ${i} / ${pdf.numPages}…`);
      const spans = await renderPage(pdf, i, viewerEl);
      allSpans.push(...spans);
    }
    await translateSpans(allSpans);
    setStatus('Done.');
  } catch (e) {
    setStatus(`Error: ${(e as Error).message}`);
  }
})();
