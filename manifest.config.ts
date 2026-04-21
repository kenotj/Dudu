import { defineManifest } from '@crxjs/vite-plugin';
import pkg from './package.json' with { type: 'json' };

export default defineManifest({
  manifest_version: 3,
  name: 'Dudu Translate',
  description:
    'Open-source bilingual translation with box-fit UI translation. BYO API key or use the free mode.',
  version: pkg.version,
  icons: {
    16: 'icons/icon-16.png',
    32: 'icons/icon-32.png',
    48: 'icons/icon-48.png',
    128: 'icons/icon-128.png',
  },
  action: {
    default_title: 'Dudu Translate',
    default_popup: 'src/popup/index.html',
    default_icon: {
      16: 'icons/icon-16.png',
      32: 'icons/icon-32.png',
    },
  },
  options_page: 'src/options/index.html',
  background: {
    service_worker: 'src/background/index.ts',
    type: 'module',
  },
  content_scripts: [
    {
      matches: ['<all_urls>'],
      js: ['src/content/index.ts'],
      run_at: 'document_idle',
      all_frames: false,
    },
    {
      matches: ['https://*.youtube.com/*'],
      js: ['src/subtitles/youtube.ts'],
      run_at: 'document_start',
    },
    {
      matches: ['https://*.netflix.com/*'],
      js: ['src/subtitles/netflix.ts'],
      run_at: 'document_start',
    },
  ],
  permissions: ['storage', 'scripting', 'activeTab', 'contextMenus'],
  host_permissions: [
    '<all_urls>',
    'https://translate.googleapis.com/*',
    'https://api.openai.com/*',
    'https://api.anthropic.com/*',
    'https://generativelanguage.googleapis.com/*',
    'https://api-free.deepl.com/*',
    'https://api.deepl.com/*',
  ],
  commands: {
    'toggle-translation': {
      suggested_key: { default: 'Alt+A', mac: 'Alt+A' },
      description: 'Toggle Dudu translation on the current page',
    },
    'translate-whole-page': {
      suggested_key: { default: 'Alt+W', mac: 'Alt+W' },
      description: 'Translate the entire current page',
    },
  },
  web_accessible_resources: [
    {
      resources: ['src/pdf/viewer.html', 'icons/*'],
      matches: ['<all_urls>'],
    },
  ],
});
