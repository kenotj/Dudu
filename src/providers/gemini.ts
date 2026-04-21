import { ProviderError, type TextBatch, type TranslationProvider, type TranslationResult } from './types';
import { SYSTEM_TRANSLATION_PROMPT, buildBatchPrompt, parseJsonBatchResponse } from '@/lib/prompt';

export const geminiProvider: TranslationProvider = {
  id: 'gemini',
  label: 'Google Gemini',
  requiresKey: true,
  supportsConstraint: true,
  maxBatchChars: 3000,
  defaultModel: 'gemini-1.5-flash',
  async translate(batch: TextBatch, config, signal): Promise<TranslationResult> {
    if (!config.apiKey) throw new ProviderError('missing API key', 'gemini');
    const model = config.model || this.defaultModel || 'gemini-1.5-flash';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
      model,
    )}:generateContent?key=${encodeURIComponent(config.apiKey)}`;

    const body = {
      systemInstruction: { role: 'system', parts: [{ text: SYSTEM_TRANSLATION_PROMPT }] },
      contents: [{ role: 'user', parts: [{ text: buildBatchPrompt(batch) }] }],
      generationConfig: {
        temperature: 0.2,
        responseMimeType: 'application/json',
      },
    };
    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal,
    });
    if (!resp.ok) {
      const text = await resp.text().catch(() => '');
      throw new ProviderError(`gemini ${resp.status} ${text.slice(0, 200)}`, 'gemini', resp.status);
    }
    const data = (await resp.json()) as any;
    const content: string = data?.candidates?.[0]?.content?.parts?.map((p: any) => p.text).join('') ?? '';
    const parsed = parseJsonBatchResponse(content);
    const byId = new Map(parsed.items.map((i) => [i.id, i.text]));
    return {
      items: batch.segments.map((s) => ({ id: s.id, text: byId.get(s.id) ?? s.text })),
      usage: {
        inputTokens: data?.usageMetadata?.promptTokenCount,
        outputTokens: data?.usageMetadata?.candidatesTokenCount,
      },
    };
  },
};
