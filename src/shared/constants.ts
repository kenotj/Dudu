export const APP_ID = 'dudu';

export const DATA_ATTR_DONE = 'data-dudu-done';
export const DATA_ATTR_ORIGINAL = 'data-dudu-original';
export const DATA_ATTR_MODE = 'data-dudu-mode';
export const TRANSLATION_CLASS = 'dudu-translation';
export const UI_TRANSLATED_CLASS = 'dudu-ui-translated';

export const DEFAULT_TARGET_LANG = 'en';
export const DEFAULT_PROVIDER = 'google-free';

export const SUPPORTED_LANGUAGES: Array<{ code: string; name: string }> = [
  { code: 'en', name: 'English' },
  { code: 'zh-CN', name: 'Chinese (Simplified)' },
  { code: 'zh-TW', name: 'Chinese (Traditional)' },
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
  { code: 'ja', name: 'Japanese' },
  { code: 'ko', name: 'Korean' },
  { code: 'ru', name: 'Russian' },
  { code: 'pt', name: 'Portuguese' },
  { code: 'ar', name: 'Arabic' },
  { code: 'hi', name: 'Hindi' },
  { code: 'it', name: 'Italian' },
  { code: 'nl', name: 'Dutch' },
  { code: 'pl', name: 'Polish' },
  { code: 'tr', name: 'Turkish' },
  { code: 'vi', name: 'Vietnamese' },
];

export const DOM_SKIP_TAGS = new Set([
  'SCRIPT',
  'STYLE',
  'NOSCRIPT',
  'CODE',
  'PRE',
  'TEXTAREA',
  'INPUT',
  'SVG',
  'MATH',
  'CANVAS',
  'IFRAME',
  'OBJECT',
  'EMBED',
  'AUDIO',
  'VIDEO',
]);

export const UI_ROLE_SELECTOR =
  'button, a, [role="button"], [role="menuitem"], [role="tab"], [role="option"], label, .badge, .tag, .chip, nav a, li.menu-item';

export const CACHE_DB_NAME = 'dudu-cache';
export const CACHE_STORE = 'translations';
export const CACHE_MAX_ENTRIES = 20_000;
export const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export const BATCH_MAX_CHARS = 1500;
export const MUTATION_DEBOUNCE_MS = 250;
export const TRIPLE_SPACE_WINDOW_MS = 600;
