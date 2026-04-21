import { ProviderError, type TextBatch, type TranslationProvider, type TranslationResult } from './types';
import { SYSTEM_TRANSLATION_PROMPT, buildBatchPrompt, parseJsonBatchResponse } from '@/lib/prompt';

export const openaiProvider: TranslationProvider = {
  id: 'openai',
  label: 'OpenAI',
  requiresKey: true,
  supportsConstraint: true,
  maxBatchChars: 3000,
  defaultModel: 'gpt-4o-mini',
  async translate(batch: TextBatch, config, signal): Promise<TranslationResult> {
    if (!config.apiKey) throw new ProviderError('missing API key', 'openai');
    const endpoint = config.endpoint || 'https://api.openai.com/v1/chat/completions';
    const model = config.model || this.defaultModel || 'gpt-4o-mini';

    const body = {
      model,
      temperature: 0.2,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: SYSTEM_TRANSLATION_PROMPT },
        { role: 'user', content: buildBatchPrompt(batch) },
      ],
    };
    const resp = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify(body),
      signal,
    });
    if (!resp.ok) {
      const text = await resp.text().catch(() => '');
      throw new ProviderError(`openai ${resp.status} ${text.slice(0, 200)}`, 'openai', resp.status);
    }
    const data = (await resp.json()) as any;
    const content: string = data?.choices?.[0]?.message?.content ?? '';
    const parsed = parseJsonBatchResponse(content);
    const byId = new Map(parsed.items.map((i) => [i.id, i.text]));
    return {
      items: batch.segments.map((s) => ({ id: s.id, text: byId.get(s.id) ?? s.text })),
      usage: {
        inputTokens: data?.usage?.prompt_tokens,
        outputTokens: data?.usage?.completion_tokens,
      },
    };
  },
};
