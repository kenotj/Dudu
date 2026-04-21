import { ProviderError, type TextBatch, type TranslationProvider, type TranslationResult } from './types';
import { SYSTEM_TRANSLATION_PROMPT, buildBatchPrompt, parseJsonBatchResponse } from '@/lib/prompt';

export const anthropicProvider: TranslationProvider = {
  id: 'anthropic',
  label: 'Anthropic Claude',
  requiresKey: true,
  supportsConstraint: true,
  maxBatchChars: 3000,
  defaultModel: 'claude-haiku-4-5-20251001',
  async translate(batch: TextBatch, config, signal): Promise<TranslationResult> {
    if (!config.apiKey) throw new ProviderError('missing API key', 'anthropic');
    const endpoint = config.endpoint || 'https://api.anthropic.com/v1/messages';
    const model = config.model || this.defaultModel || 'claude-haiku-4-5-20251001';

    const body = {
      model,
      max_tokens: 2048,
      system: SYSTEM_TRANSLATION_PROMPT,
      messages: [{ role: 'user', content: buildBatchPrompt(batch) }],
    };
    const resp = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': config.apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify(body),
      signal,
    });
    if (!resp.ok) {
      const text = await resp.text().catch(() => '');
      throw new ProviderError(`anthropic ${resp.status} ${text.slice(0, 200)}`, 'anthropic', resp.status);
    }
    const data = (await resp.json()) as any;
    const content: string = Array.isArray(data?.content)
      ? data.content
          .filter((b: any) => b.type === 'text')
          .map((b: any) => b.text)
          .join('')
      : '';
    const parsed = parseJsonBatchResponse(content);
    const byId = new Map(parsed.items.map((i) => [i.id, i.text]));
    return {
      items: batch.segments.map((s) => ({ id: s.id, text: byId.get(s.id) ?? s.text })),
      usage: {
        inputTokens: data?.usage?.input_tokens,
        outputTokens: data?.usage?.output_tokens,
      },
    };
  },
};
