import { render } from 'preact';
import { useEffect, useState } from 'preact/hooks';
import { loadSettings, saveSettings, type Settings } from '@/lib/settings';
import { SUPPORTED_LANGUAGES } from '@/shared/constants';
import { listProviders } from '@/providers/registry';

function Options() {
  const [s, setS] = useState<Settings | null>(null);
  const [stats, setStats] = useState<{ entries: number } | null>(null);

  useEffect(() => {
    loadSettings().then(setS);
    chrome.runtime.sendMessage({ type: 'cache-stats' }, (resp) => {
      if (resp?.ok) setStats(resp.stats);
    });
  }, []);

  if (!s) return <div class="wrap">Loading…</div>;

  const update = (patch: Partial<Settings>) => {
    const next = { ...s, ...patch } as Settings;
    setS(next);
    saveSettings(patch);
  };

  const updateProvider = (id: keyof Settings['providers'], field: string, value: string) => {
    const providers = { ...s.providers, [id]: { ...(s.providers as any)[id], [field]: value } };
    update({ providers } as Partial<Settings>);
  };

  return (
    <div class="wrap">
      <h1>Dudu Translate — Options</h1>
      <p class="sub">
        Bring your own API key or use the free mode. Keys are stored locally on this device only.
      </p>

      <section>
        <h2>General</h2>
        <div class="row">
          <label>Target language</label>
          <select value={s.targetLang} onChange={(e) => update({ targetLang: (e.target as HTMLSelectElement).value })}>
            {SUPPORTED_LANGUAGES.map((l) => (
              <option value={l.code}>{l.name}</option>
            ))}
          </select>
        </div>
        <div class="row">
          <label>Source language</label>
          <select value={s.sourceLang} onChange={(e) => update({ sourceLang: (e.target as HTMLSelectElement).value })}>
            <option value="auto">Auto-detect</option>
            {SUPPORTED_LANGUAGES.map((l) => (
              <option value={l.code}>{l.name}</option>
            ))}
          </select>
        </div>
        <div class="row">
          <label>Provider</label>
          <select
            value={s.provider}
            onChange={(e) => update({ provider: (e.target as HTMLSelectElement).value as Settings['provider'] })}
          >
            {listProviders().map((p) => (
              <option value={p.id}>{p.label}</option>
            ))}
          </select>
        </div>
        <div class="row">
          <label>Display style</label>
          <select
            value={s.displayStyle}
            onChange={(e) => update({ displayStyle: (e.target as HTMLSelectElement).value as Settings['displayStyle'] })}
          >
            <option value="dashed">Dashed underline</option>
            <option value="underline">Solid underline</option>
            <option value="highlight">Highlight</option>
            <option value="none">None</option>
          </select>
        </div>
        <div class="row">
          <label>Auto-translate</label>
          <input
            type="checkbox"
            checked={s.autoTranslate}
            onChange={(e) => update({ autoTranslate: (e.target as HTMLInputElement).checked })}
          />
        </div>
        <div class="row">
          <label>Box-fit for UI</label>
          <input
            type="checkbox"
            checked={s.boxFitEnabled}
            onChange={(e) => update({ boxFitEnabled: (e.target as HTMLInputElement).checked })}
          />
        </div>
        <div class="row">
          <label>Input-box hotkey</label>
          <input
            type="checkbox"
            checked={s.inputBoxHotkey}
            onChange={(e) => update({ inputBoxHotkey: (e.target as HTMLInputElement).checked })}
          />
        </div>
        <div class="row">
          <label>Subtitle mode</label>
          <select
            value={s.subtitleMode}
            onChange={(e) => update({ subtitleMode: (e.target as HTMLSelectElement).value as Settings['subtitleMode'] })}
          >
            <option value="bilingual">Bilingual</option>
            <option value="translation">Translation only</option>
            <option value="off">Off</option>
          </select>
        </div>
        <div class="row">
          <label>Monthly token cap (0 = none)</label>
          <input
            type="number"
            min={0}
            value={s.monthlyTokenCap}
            onInput={(e) => update({ monthlyTokenCap: Number((e.target as HTMLInputElement).value) || 0 })}
          />
        </div>
      </section>

      <section>
        <h2>OpenAI</h2>
        <div class="row">
          <label>API key</label>
          <input
            type="password"
            placeholder="sk-..."
            value={s.providers.openai.apiKey}
            onInput={(e) => updateProvider('openai', 'apiKey', (e.target as HTMLInputElement).value)}
          />
        </div>
        <div class="row">
          <label>Model</label>
          <input
            type="text"
            value={s.providers.openai.model}
            onInput={(e) => updateProvider('openai', 'model', (e.target as HTMLInputElement).value)}
          />
        </div>
      </section>

      <section>
        <h2>Anthropic Claude</h2>
        <div class="row">
          <label>API key</label>
          <input
            type="password"
            placeholder="sk-ant-..."
            value={s.providers.anthropic.apiKey}
            onInput={(e) => updateProvider('anthropic', 'apiKey', (e.target as HTMLInputElement).value)}
          />
        </div>
        <div class="row">
          <label>Model</label>
          <input
            type="text"
            value={s.providers.anthropic.model}
            onInput={(e) => updateProvider('anthropic', 'model', (e.target as HTMLInputElement).value)}
          />
        </div>
      </section>

      <section>
        <h2>Google Gemini</h2>
        <div class="row">
          <label>API key</label>
          <input
            type="password"
            value={s.providers.gemini.apiKey}
            onInput={(e) => updateProvider('gemini', 'apiKey', (e.target as HTMLInputElement).value)}
          />
        </div>
        <div class="row">
          <label>Model</label>
          <input
            type="text"
            value={s.providers.gemini.model}
            onInput={(e) => updateProvider('gemini', 'model', (e.target as HTMLInputElement).value)}
          />
        </div>
      </section>

      <section>
        <h2>DeepL</h2>
        <div class="row">
          <label>API key</label>
          <input
            type="password"
            value={s.providers.deepl.apiKey}
            onInput={(e) => updateProvider('deepl', 'apiKey', (e.target as HTMLInputElement).value)}
          />
        </div>
        <div class="row">
          <label>Endpoint</label>
          <input
            type="text"
            value={s.providers.deepl.endpoint}
            onInput={(e) => updateProvider('deepl', 'endpoint', (e.target as HTMLInputElement).value)}
          />
          <div class="hint">
            Use <code>api-free.deepl.com</code> for the free tier, <code>api.deepl.com</code> for Pro.
          </div>
        </div>
      </section>

      <section>
        <h2>Cache</h2>
        <div class="stats">{stats ? `${stats.entries} cached translations.` : 'Loading stats…'}</div>
      </section>
    </div>
  );
}

render(<Options />, document.getElementById('root')!);
