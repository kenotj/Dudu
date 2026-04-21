import type { TranslationProvider } from './types';
import { googleFreeProvider } from './googleFree';
import { openaiProvider } from './openai';
import { anthropicProvider } from './anthropic';
import { geminiProvider } from './gemini';
import { deeplProvider } from './deepl';

export const providers: Record<string, TranslationProvider> = {
  'google-free': googleFreeProvider,
  openai: openaiProvider,
  anthropic: anthropicProvider,
  gemini: geminiProvider,
  deepl: deeplProvider,
};

export function getProvider(id: string): TranslationProvider {
  const p = providers[id];
  if (!p) throw new Error(`unknown provider: ${id}`);
  return p;
}

export function listProviders(): TranslationProvider[] {
  return Object.values(providers);
}
