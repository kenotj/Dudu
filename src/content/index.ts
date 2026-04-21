import './styles.css';
import { loadSettings, getSiteRule, type Settings } from '@/lib/settings';
import { detectLang, shouldTranslate } from '@/lib/langDetect';
import { batchSegments, nextSegmentId } from '@/lib/batcher';
import { fitsInBudget, measureElementBudget } from '@/lib/boxFit';
import { collectCandidates, type Candidate } from './domWalker';
import { injectBodyTranslation, replaceUiTranslation, restoreAll } from './injector';
import { MutationWatcher } from './mutationWatcher';
import { IntersectionGate } from './intersectionGate';
import { attachInputBoxHotkey } from './inputBox';
import { showToast } from './toast';
import { sendToBackground } from '@/shared/messages';
import type { TranslateRequest, TranslateResponse } from '@/shared/messages';
import type { TextSegment } from '@/providers/types';
import { DATA_ATTR_DONE } from '@/shared/constants';
import { logger } from '@/lib/logger';

interface EngineState {
  enabled: boolean;
  settings: Settings;
  gate: IntersectionGate;
  watcher: MutationWatcher;
  detachInput?: () => void;
  pending: Set<HTMLElement>;
  idToElement: Map<string, { el: HTMLElement; role: 'body' | 'ui' }>;
}

const state: EngineState = {
  enabled: false,
  settings: undefined as unknown as Settings,
  gate: new IntersectionGate(),
  watcher: null as unknown as MutationWatcher,
  pending: new Set(),
  idToElement: new Map(),
};

async function init(): Promise<void> {
  state.settings = await loadSettings();
  document.documentElement.setAttribute('data-dudu-style', state.settings.displayStyle);

  const host = location.hostname;
  const rule = getSiteRule(state.settings, host);
  const autoOn = state.settings.autoTranslate || rule === 'always';
  if (rule === 'never') return;

  state.watcher = new MutationWatcher((roots) => onMutationBatch(roots));
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg?.type === 'command') {
      if (msg.command === 'toggle-translation') toggle();
      else if (msg.command === 'translate-whole-page') enable();
    } else if (msg?.type === 'popup-toggle') {
      toggle();
    } else if (msg?.type === 'popup-get-state') {
      return Promise.resolve({ enabled: state.enabled });
    }
  });

  if (autoOn) enable();
}

function enable(): void {
  if (state.enabled) return;
  state.enabled = true;
  showToast('Dudu: translating…');
  processRoot(document.body);
  state.watcher.start(document.body);
  if (state.settings.inputBoxHotkey) {
    state.detachInput = attachInputBoxHotkey();
  }
}

function disable(): void {
  if (!state.enabled) return;
  state.enabled = false;
  state.watcher.stop();
  state.gate.dispose();
  state.detachInput?.();
  state.detachInput = undefined;
  restoreAll(document);
  showToast('Dudu: original restored');
}

function toggle(): void {
  if (state.enabled) disable();
  else enable();
}

function onMutationBatch(roots: Element[]): void {
  if (!state.enabled) return;
  for (const root of roots) {
    if (!root.isConnected) continue;
    processRoot(root);
  }
}

function processRoot(root: Element): void {
  const candidates = collectCandidates(root);
  const { targetLang, sourceLang } = state.settings;

  for (const cand of candidates) {
    if (cand.element.hasAttribute(DATA_ATTR_DONE)) continue;
    if (state.pending.has(cand.element)) continue;

    const detected = detectLang(cand.text);
    if (!shouldTranslate(detected, targetLang, sourceLang)) continue;

    state.pending.add(cand.element);
    state.gate.whenVisible(cand.element, () => translateCandidate(cand));
  }
}

async function translateCandidate(cand: Candidate): Promise<void> {
  try {
    const { targetLang, sourceLang, boxFitEnabled, provider } = state.settings;
    const id = nextSegmentId();
    const segment: TextSegment = { id, text: cand.text };
    const useConstraint = boxFitEnabled && cand.role === 'ui' && providerSupportsConstraint(provider);
    if (useConstraint) {
      segment.constraint = measureElementBudget(cand.element);
    }

    const req: TranslateRequest = {
      type: 'translate',
      segments: [segment],
      targetLang,
      sourceLang,
      tabUrl: location.href,
    };
    const resp = await sendToBackground<TranslateRequest, TranslateResponse>(req);
    if (!resp.ok || !resp.result?.items[0]) {
      state.pending.delete(cand.element);
      return;
    }

    let translation = resp.result.items[0].text.trim();

    if (cand.role === 'ui') {
      translation = await enforceFit(cand.element, cand.text, translation, useConstraint);
      replaceUiTranslation(cand.element, translation, { overflow: !useConstraint });
    } else {
      injectBodyTranslation(cand.element, translation, targetLang);
    }
  } catch (e) {
    logger.warn('translate candidate failed', { err: (e as Error).message });
  } finally {
    state.pending.delete(cand.element);
  }
}

async function enforceFit(
  el: HTMLElement,
  originalText: string,
  firstAttempt: string,
  hadConstraint: boolean,
): Promise<string> {
  if (!hadConstraint) return firstAttempt;
  const budget = measureElementBudget(el);
  if (fitsInBudget(firstAttempt, budget)) return firstAttempt;

  // one retry with tighter budget
  const tighter = measureElementBudget(el, 0.85);
  const id = nextSegmentId();
  const req: TranslateRequest = {
    type: 'translate',
    segments: [{ id, text: originalText, constraint: tighter }],
    targetLang: state.settings.targetLang,
    sourceLang: state.settings.sourceLang,
  };
  const resp = await sendToBackground<TranslateRequest, TranslateResponse>(req);
  const retry = resp.ok ? resp.result?.items[0]?.text?.trim() ?? firstAttempt : firstAttempt;
  if (fitsInBudget(retry, budget)) return retry;
  return retry; // still won't fit — caller applies ellipsis
}

function providerSupportsConstraint(providerId: string): boolean {
  return providerId === 'openai' || providerId === 'anthropic' || providerId === 'gemini';
}

init().catch((e) => logger.error('init failed', { err: (e as Error).message }));
