import { render } from 'preact';
import { useEffect, useState } from 'preact/hooks';
import { loadSettings, saveSettings, type Settings } from '@/lib/settings';
import { SUPPORTED_LANGUAGES } from '@/shared/constants';
import { listProviders } from '@/providers/registry';

function Popup() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    loadSettings().then(setSettings);
    chrome.tabs.query({ active: true, currentWindow: true }).then(([tab]) => {
      if (!tab?.id) return;
      chrome.tabs
        .sendMessage(tab.id, { type: 'popup-get-state' })
        .then((resp) => setEnabled(!!resp?.enabled))
        .catch(() => setEnabled(false));
    });
  }, []);

  const update = async (patch: Partial<Settings>) => {
    const next = await saveSettings(patch);
    setSettings(next);
  };

  const toggle = async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) return;
    await chrome.tabs.sendMessage(tab.id, { type: 'popup-toggle' }).catch(() => {});
    setEnabled((v) => !v);
  };

  if (!settings) return <div class="popup">Loading…</div>;

  const providers = listProviders();
  const currentProvider = providers.find((p) => p.id === settings.provider);
  const needsKey =
    currentProvider?.requiresKey &&
    !(settings.providers as any)?.[settings.provider]?.apiKey;

  return (
    <div class="popup">
      <h1>Dudu Translate</h1>

      {settings.provider === 'google-free' && (
        <div class="banner">
          Free mode is best-effort. Add an API key in Options for reliable translation.
        </div>
      )}
      {needsKey && (
        <div class="banner">
          Missing API key for {currentProvider?.label}. Open Options to configure.
        </div>
      )}

      <div class="row">
        <label>Target</label>
        <select
          value={settings.targetLang}
          onChange={(e) => update({ targetLang: (e.target as HTMLSelectElement).value })}
        >
          {SUPPORTED_LANGUAGES.map((l) => (
            <option value={l.code}>{l.name}</option>
          ))}
        </select>
      </div>

      <div class="row">
        <label>Provider</label>
        <select
          value={settings.provider}
          onChange={(e) =>
            update({ provider: (e.target as HTMLSelectElement).value as Settings['provider'] })
          }
        >
          {providers.map((p) => (
            <option value={p.id}>{p.label}</option>
          ))}
        </select>
      </div>

      <div class="row">
        <label>Box-fit UI</label>
        <input
          type="checkbox"
          checked={settings.boxFitEnabled}
          onChange={(e) => update({ boxFitEnabled: (e.target as HTMLInputElement).checked })}
        />
      </div>

      <div class="row">
        <label>Auto-translate</label>
        <input
          type="checkbox"
          checked={settings.autoTranslate}
          onChange={(e) => update({ autoTranslate: (e.target as HTMLInputElement).checked })}
        />
      </div>

      <button class={enabled ? 'primary off' : 'primary'} onClick={toggle}>
        {enabled ? 'Restore original' : 'Translate this page'}
      </button>

      <div class="link">
        <a onClick={() => chrome.runtime.openOptionsPage()}>Open options</a>
      </div>
    </div>
  );
}

render(<Popup />, document.getElementById('root')!);
