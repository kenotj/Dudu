import { ProviderError, type TextBatch, type TranslationProvider, type TranslationResult } from './types';

async function translateOne(
  text: string,
  targetLang: string,
  sourceLang: string | undefined,
  signal?: AbortSignal,
): Promise<string> {
  const sl = sourceLang && sourceLang !== 'auto' ? sourceLang : 'auto';
  const url = new URL('https://translate.googleapis.com/translate_a/single');
  url.searchParams.set('client', 'gtx');
  url.searchParams.set('sl', sl);
  url.searchParams.set('tl', targetLang);
  url.searchParams.set('dt', 't');
  url.searchParams.set('q', text);

  const resp = await fetch(url.toString(), { signal });
  if (!resp.ok) {
    throw new ProviderError(`google-free ${resp.status}`, 'google-free', resp.status);
  }
  const data = (await resp.json()) as unknown;
  if (!Array.isArray(data) || !Array.isArray(data[0])) {
    throw new ProviderError('google-free bad payload', 'google-free');
  }
  let out = '';
  for (const seg of data[0] as Array<unknown>) {
    if (Array.isArray(seg) && typeof seg[0] === 'string') {
      out += seg[0];
    }
  }
  return out.trim();
}

export const googleFreeProvider: TranslationProvider = {
  id: 'google-free',
  label: 'Google Translate (free)',
  requiresKey: false,
  supportsConstraint: false,
  maxBatchChars: 3000,
  async translate(batch: TextBatch, _config, signal): Promise<TranslationResult> {
    const items: TranslationResult['items'] = [];
    for (const seg of batch.segments) {
      if (signal?.aborted) throw new ProviderError('aborted', 'google-free');
      try {
        const text = await translateOne(seg.text, batch.targetLang, batch.sourceLang, signal);
        items.push({ id: seg.id, text });
      } catch (e) {
        items.push({ id: seg.id, text: seg.text });
      }
    }
    return { items };
  },
};
