import { loadSettings, saveSettings, type Settings } from '@/lib/settings';
import { cacheGet, cachePut, cacheStats } from './cacheStore';
import { backoffRetry } from './rateLimiter';
import { getUsage, isOverCap, recordUsage } from './usageTracker';
import { getProvider } from '@/providers/registry';
import { bucketMaxChars } from '@/lib/boxFit';
import { cacheKey } from '@/lib/hash';
import { logger } from '@/lib/logger';
import type { TextBatch, TextSegment, TranslationResult } from '@/providers/types';
import type { TranslateRequest, TranslateResponse } from '@/shared/messages';

function providerConfigFor(id: string, settings: Settings) {
  switch (id) {
    case 'openai':
      return { ...settings.providers.openai };
    case 'anthropic':
      return { ...settings.providers.anthropic };
    case 'gemini':
      return { ...settings.providers.gemini };
    case 'deepl':
      return { ...settings.providers.deepl };
    default:
      return {};
  }
}

function segmentCacheKey(seg: TextSegment, targetLang: string, providerId: string, model?: string): string {
  const bucket = seg.constraint ? bucketMaxChars(seg.constraint.maxChars) : 0;
  return cacheKey([seg.text, '', targetLang, '', providerId, '', model ?? '', '', bucket]);
}

async function handleTranslate(req: TranslateRequest): Promise<TranslateResponse> {
  try {
    const settings = await loadSettings();
    const providerId = settings.provider;
    const provider = getProvider(providerId);
    const config = providerConfigFor(providerId, settings);
    const model = (config as { model?: string }).model;

    if (await isOverCap(settings.monthlyTokenCap)) {
      return { ok: false, error: 'monthly-token-cap-reached' };
    }

    const needFetch: TextSegment[] = [];
    const cached: Record<string, string> = {};

    for (const seg of req.segments) {
      const key = segmentCacheKey(seg, req.targetLang, providerId, model);
      const hit = await cacheGet(key);
      if (hit !== undefined) {
        cached[seg.id] = hit;
      } else {
        needFetch.push(seg);
      }
    }

    const fetched: Record<string, string> = {};
    if (needFetch.length > 0) {
      const batch: TextBatch = {
        segments: needFetch,
        targetLang: req.targetLang,
        sourceLang: req.sourceLang,
      };
      const result = await backoffRetry(providerId, () => provider.translate(batch, config));
      if (result.usage) {
        await recordUsage(result.usage.inputTokens ?? 0, result.usage.outputTokens ?? 0);
      }
      for (const item of result.items) {
        fetched[item.id] = item.text;
        const seg = needFetch.find((s) => s.id === item.id);
        if (seg) {
          const key = segmentCacheKey(seg, req.targetLang, providerId, model);
          await cachePut(key, item.text);
        }
      }
    }

    const merged: TranslationResult = {
      items: req.segments.map((s) => ({
        id: s.id,
        text: cached[s.id] ?? fetched[s.id] ?? s.text,
      })),
    };
    return { ok: true, result: merged };
  } catch (e) {
    const err = e instanceof Error ? e.message : String(e);
    logger.error('translate failed', { err });
    return { ok: false, error: err };
  }
}

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  (async () => {
    try {
      switch (msg?.type) {
        case 'ping':
          sendResponse({ ok: true });
          return;
        case 'get-settings':
          sendResponse({ ok: true, settings: await loadSettings() });
          return;
        case 'set-settings':
          sendResponse({ ok: true, settings: await saveSettings(msg.payload ?? {}) });
          return;
        case 'cache-stats':
          sendResponse({ ok: true, stats: await cacheStats(), usage: await getUsage() });
          return;
        case 'translate':
          sendResponse(await handleTranslate(msg as TranslateRequest));
          return;
        default:
          sendResponse({ ok: false, error: 'unknown-message-type' });
      }
    } catch (e) {
      sendResponse({ ok: false, error: e instanceof Error ? e.message : String(e) });
    }
  })();
  return true;
});

chrome.commands?.onCommand.addListener(async (command) => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) return;
  await chrome.tabs.sendMessage(tab.id, { type: 'command', command }).catch(() => {});
});

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus?.create({
    id: 'dudu-toggle',
    title: 'Toggle Dudu translation',
    contexts: ['page'],
  });
});

chrome.contextMenus?.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === 'dudu-toggle' && tab?.id) {
    await chrome.tabs.sendMessage(tab.id, { type: 'command', command: 'toggle-translation' }).catch(() => {});
  }
});

logger.info('Dudu service worker started');
