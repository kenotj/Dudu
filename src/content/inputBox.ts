import { TRIPLE_SPACE_WINDOW_MS } from '@/shared/constants';
import { sendToBackground } from '@/shared/messages';
import type { TranslateRequest, TranslateResponse } from '@/shared/messages';
import { loadSettings } from '@/lib/settings';
import { nextSegmentId } from '@/lib/batcher';
import { showToast } from './toast';

interface HistoryEntry {
  el: HTMLElement;
  original: string;
}

const history: HistoryEntry[] = [];

function isEditable(el: EventTarget | null): el is HTMLElement {
  if (!el || !(el instanceof HTMLElement)) return false;
  const tag = el.tagName;
  if (tag === 'TEXTAREA') return true;
  if (tag === 'INPUT') {
    const type = (el as HTMLInputElement).type;
    return ['text', 'search', 'email', 'url', 'tel', ''].includes(type || '');
  }
  return el.isContentEditable;
}

function getValue(el: HTMLElement): string {
  if (el instanceof HTMLTextAreaElement || el instanceof HTMLInputElement) return el.value;
  return el.textContent ?? '';
}

function setValue(el: HTMLElement, value: string): void {
  if (el instanceof HTMLTextAreaElement || el instanceof HTMLInputElement) {
    el.value = value;
    el.dispatchEvent(new Event('input', { bubbles: true }));
  } else {
    el.textContent = value;
    el.dispatchEvent(new InputEvent('input', { bubbles: true }));
  }
}

export function attachInputBoxHotkey(): () => void {
  const spaceTimestamps = new WeakMap<HTMLElement, number[]>();

  const onKeyDown = async (e: KeyboardEvent) => {
    if (e.key !== ' ' && e.code !== 'Space') return;
    const target = e.target;
    if (!isEditable(target)) return;

    const now = Date.now();
    const arr = spaceTimestamps.get(target) ?? [];
    arr.push(now);
    while (arr.length > 0 && now - arr[0] > TRIPLE_SPACE_WINDOW_MS) arr.shift();
    spaceTimestamps.set(target, arr);

    if (arr.length >= 3) {
      spaceTimestamps.set(target, []);
      e.preventDefault();
      const raw = getValue(target).replace(/\s{2,}$/, '');
      if (!raw.trim()) return;

      const settings = await loadSettings();
      const req: TranslateRequest = {
        type: 'translate',
        segments: [{ id: nextSegmentId(), text: raw }],
        targetLang: settings.targetLang,
        sourceLang: settings.sourceLang,
      };
      showToast('Translating…');
      const resp = await sendToBackground<TranslateRequest, TranslateResponse>(req);
      if (resp.ok && resp.result?.items[0]) {
        history.push({ el: target, original: raw });
        setValue(target, resp.result.items[0].text);
        showToast('Translated. Cmd/Ctrl+Z to undo.');
      } else {
        showToast(`Translation failed: ${resp.error ?? 'unknown'}`);
      }
    }
  };

  const onUndo = (e: KeyboardEvent) => {
    const isUndo = (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey;
    if (!isUndo) return;
    const last = history.pop();
    if (last && isEditable(last.el)) {
      setValue(last.el, last.original);
      e.preventDefault();
    }
  };

  document.addEventListener('keydown', onKeyDown, true);
  document.addEventListener('keydown', onUndo, true);
  return () => {
    document.removeEventListener('keydown', onKeyDown, true);
    document.removeEventListener('keydown', onUndo, true);
  };
}
