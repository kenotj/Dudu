import { ProviderError, type TextBatch, type TranslationProvider, type TranslationResult } from './types';

function toDeeplLang(code: string): string {
  const upper = code.toUpperCase();
  if (upper.startsWith('ZH')) return 'ZH';
  if (upper.startsWith('EN')) return 'EN-US';
  if (upper.startsWith('PT')) return 'PT-BR';
  return upper.split('-')[0];
}

export const deeplProvider: TranslationProvider = {
  id: 'deepl',
  label: 'DeepL',
  requiresKey: true,
  supportsConstraint: false,
  maxBatchChars: 10_000,
  async translate(batch: TextBatch, config, signal): Promise<TranslationResult> {
    if (!config.apiKey) throw new ProviderError('missing API key', 'deepl');
    const endpoint = config.endpoint || 'https://api-free.deepl.com/v2/translate';

    const params = new URLSearchParams();
    params.set('target_lang', toDeeplLang(batch.targetLang));
    if (batch.sourceLang && batch.sourceLang !== 'auto') {
      params.set('source_lang', toDeeplLang(batch.sourceLang));
    }
    for (const seg of batch.segments) {
      params.append('text', seg.text);
    }

    const resp = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `DeepL-Auth-Key ${config.apiKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
      signal,
    });
    if (!resp.ok) {
      const text = await resp.text().catch(() => '');
      throw new ProviderError(`deepl ${resp.status} ${text.slice(0, 200)}`, 'deepl', resp.status);
    }
    const data = (await resp.json()) as any;
    const translations: string[] = Array.isArray(data?.translations)
      ? data.translations.map((t: any) => String(t.text ?? ''))
      : [];
    return {
      items: batch.segments.map((s, i) => ({ id: s.id, text: translations[i] ?? s.text })),
    };
  },
};
