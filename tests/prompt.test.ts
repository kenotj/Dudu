import { describe, it, expect } from 'vitest';
import { buildBatchPrompt, parseJsonBatchResponse } from '../src/lib/prompt';

describe('prompt', () => {
  it('includes constraint when provided', () => {
    const prompt = buildBatchPrompt({
      targetLang: 'en',
      segments: [
        {
          id: 'a',
          text: '收藏',
          constraint: {
            maxChars: 6,
            maxPixelWidth: 50,
            fontFamily: 'sans-serif',
            fontSizePx: 14,
            fontWeight: '500',
            lines: 1,
          },
        },
      ],
    });
    expect(prompt).toContain('maxChars="6"');
    expect(prompt).toContain('<source>收藏</source>');
  });

  it('omits constraint when absent', () => {
    const prompt = buildBatchPrompt({
      targetLang: 'fr',
      segments: [{ id: 'a', text: 'Hello' }],
    });
    expect(prompt).not.toContain('<constraint');
    expect(prompt).toContain('<source>Hello</source>');
  });

  it('parses JSON even with code fences and prose', () => {
    const raw = 'Here you go:\n```json\n{"items":[{"id":"a","text":"Bonjour"}]}\n```';
    const parsed = parseJsonBatchResponse(raw);
    expect(parsed.items).toEqual([{ id: 'a', text: 'Bonjour' }]);
  });

  it('returns empty items on malformed input', () => {
    const parsed = parseJsonBatchResponse('nope');
    expect(parsed.items).toEqual([]);
  });
});
