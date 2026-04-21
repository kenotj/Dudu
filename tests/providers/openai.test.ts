import { describe, it, expect, vi, afterEach } from 'vitest';
import { openaiProvider } from '../../src/providers/openai';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('openaiProvider', () => {
  it('sends a chat completion with Bearer auth and returns parsed items', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          choices: [
            { message: { content: JSON.stringify({ items: [{ id: 'a', text: 'Bonjour' }] }) } },
          ],
          usage: { prompt_tokens: 10, completion_tokens: 3 },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    );
    vi.stubGlobal('fetch', fetchMock);

    const result = await openaiProvider.translate(
      { segments: [{ id: 'a', text: 'Hello' }], targetLang: 'fr' },
      { apiKey: 'sk-test', model: 'gpt-4o-mini' },
    );

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [, init] = fetchMock.mock.calls[0];
    expect((init!.headers as any).Authorization).toBe('Bearer sk-test');
    expect(result.items).toEqual([{ id: 'a', text: 'Bonjour' }]);
    expect(result.usage?.inputTokens).toBe(10);
  });

  it('includes box-fit constraint phrase when segment has a constraint', async () => {
    let capturedBody = '';
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation(async (_url: string, init: RequestInit) => {
        capturedBody = init.body as string;
        return new Response(
          JSON.stringify({
            choices: [{ message: { content: JSON.stringify({ items: [{ id: 'a', text: 'X' }] }) } }],
          }),
          { status: 200 },
        );
      }),
    );
    await openaiProvider.translate(
      {
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
        targetLang: 'en',
      },
      { apiKey: 'sk-test' },
    );
    const parsed = JSON.parse(capturedBody);
    const userContent = parsed.messages.find((m: any) => m.role === 'user').content;
    const systemContent = parsed.messages.find((m: any) => m.role === 'system').content;
    expect(userContent).toContain('maxChars="6"');
    expect(systemContent).toMatch(/at most N characters|MUST render in at most/);
  });

  it('throws on missing API key', async () => {
    await expect(
      openaiProvider.translate({ segments: [{ id: 'a', text: 'x' }], targetLang: 'fr' }, {}),
    ).rejects.toThrow(/missing API key/);
  });
});
