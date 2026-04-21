const USAGE_KEY = 'dudu.usage.v1';

interface UsageRecord {
  monthKey: string;
  inputTokens: number;
  outputTokens: number;
}

function currentMonthKey(): string {
  const d = new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

async function read(): Promise<UsageRecord> {
  const stored = await chrome.storage.local.get(USAGE_KEY);
  const rec = stored[USAGE_KEY] as UsageRecord | undefined;
  const m = currentMonthKey();
  if (!rec || rec.monthKey !== m) {
    return { monthKey: m, inputTokens: 0, outputTokens: 0 };
  }
  return rec;
}

export async function recordUsage(inputTokens = 0, outputTokens = 0): Promise<void> {
  const rec = await read();
  rec.inputTokens += inputTokens;
  rec.outputTokens += outputTokens;
  await chrome.storage.local.set({ [USAGE_KEY]: rec });
}

export async function getUsage(): Promise<UsageRecord> {
  return read();
}

export async function isOverCap(cap: number): Promise<boolean> {
  if (!cap || cap <= 0) return false;
  const rec = await read();
  return rec.inputTokens + rec.outputTokens >= cap;
}
