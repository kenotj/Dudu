import { z } from 'zod';
import { DEFAULT_PROVIDER, DEFAULT_TARGET_LANG } from '@/shared/constants';

const ProviderKeysSchema = z.object({
  openai: z
    .object({
      apiKey: z.string().default(''),
      model: z.string().default('gpt-4o-mini'),
      endpoint: z.string().default('https://api.openai.com/v1/chat/completions'),
    })
    .default({}),
  anthropic: z
    .object({
      apiKey: z.string().default(''),
      model: z.string().default('claude-haiku-4-5-20251001'),
      endpoint: z.string().default('https://api.anthropic.com/v1/messages'),
    })
    .default({}),
  gemini: z
    .object({
      apiKey: z.string().default(''),
      model: z.string().default('gemini-1.5-flash'),
    })
    .default({}),
  deepl: z
    .object({
      apiKey: z.string().default(''),
      endpoint: z.string().default('https://api-free.deepl.com/v2/translate'),
    })
    .default({}),
});

export const SettingsSchema = z.object({
  provider: z
    .enum(['google-free', 'openai', 'anthropic', 'gemini', 'deepl'])
    .default(DEFAULT_PROVIDER as any),
  targetLang: z.string().default(DEFAULT_TARGET_LANG),
  sourceLang: z.string().default('auto'),
  displayStyle: z.enum(['dashed', 'underline', 'highlight', 'none']).default('dashed'),
  autoTranslate: z.boolean().default(false),
  boxFitEnabled: z.boolean().default(true),
  inputBoxHotkey: z.boolean().default(true),
  subtitleMode: z.enum(['bilingual', 'translation', 'off']).default('bilingual'),
  siteRules: z
    .record(z.enum(['always', 'never', 'ask']))
    .default({})
    .describe('hostname → rule'),
  monthlyTokenCap: z.number().int().nonnegative().default(0),
  providers: ProviderKeysSchema.default({}),
});

export type Settings = z.infer<typeof SettingsSchema>;
export type ProviderKey = keyof z.infer<typeof ProviderKeysSchema>;

const STORAGE_KEY = 'dudu.settings.v1';

export async function loadSettings(): Promise<Settings> {
  const stored = await chrome.storage.local.get(STORAGE_KEY);
  const parsed = SettingsSchema.safeParse(stored[STORAGE_KEY] ?? {});
  if (!parsed.success) {
    return SettingsSchema.parse({});
  }
  return parsed.data;
}

export async function saveSettings(patch: Partial<Settings>): Promise<Settings> {
  const current = await loadSettings();
  const merged = SettingsSchema.parse({ ...current, ...patch });
  await chrome.storage.local.set({ [STORAGE_KEY]: merged });
  return merged;
}

export function getSiteRule(settings: Settings, hostname: string): 'always' | 'never' | 'ask' {
  return settings.siteRules[hostname] ?? 'ask';
}
