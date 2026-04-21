import { describe, it, expect, vi, afterEach } from 'vitest';
import { googleFreeProvider } from '../../src/providers/googleFree';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('googleFreeProvider', () => {
  it('hits translate_a/single and concatenates segment results', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify([
            [
              ['Bonjour ', 'Hello '],
              ['monde', 'world'],
            ],
          ]),
          { status: 200 },
        ),
      ),
    );
    const out = await googleFreeProvider.translate(
      { segments: [{ id: 'a', text: 'Hello world' }], targetLang: 'fr' },
      {},
    );
    expect(out.items[0].id).toBe('a');
    expect(out.items[0].text).toContain('Bonjour');
  });

  it('falls back to original text on failure', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('err', { status: 500 })));
    const out = await googleFreeProvider.translate(
      { segments: [{ id: 'a', text: 'Hello' }], targetLang: 'fr' },
      {},
    );
    expect(out.items[0].text).toBe('Hello');
  });
});
