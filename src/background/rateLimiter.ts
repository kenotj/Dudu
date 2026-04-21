interface Bucket {
  queue: Array<() => void>;
  lastRun: number;
  minIntervalMs: number;
  running: number;
  maxConcurrent: number;
}

const buckets = new Map<string, Bucket>();

const DEFAULTS: Record<string, { minIntervalMs: number; maxConcurrent: number }> = {
  'google-free': { minIntervalMs: 500, maxConcurrent: 1 },
  openai: { minIntervalMs: 50, maxConcurrent: 4 },
  anthropic: { minIntervalMs: 50, maxConcurrent: 4 },
  gemini: { minIntervalMs: 50, maxConcurrent: 4 },
  deepl: { minIntervalMs: 50, maxConcurrent: 4 },
};

function getBucket(providerId: string): Bucket {
  let b = buckets.get(providerId);
  if (!b) {
    const cfg = DEFAULTS[providerId] ?? { minIntervalMs: 100, maxConcurrent: 2 };
    b = { queue: [], lastRun: 0, minIntervalMs: cfg.minIntervalMs, running: 0, maxConcurrent: cfg.maxConcurrent };
    buckets.set(providerId, b);
  }
  return b;
}

export async function withRateLimit<T>(providerId: string, fn: () => Promise<T>): Promise<T> {
  const b = getBucket(providerId);
  await new Promise<void>((resolve) => {
    const tryRun = () => {
      const now = Date.now();
      const since = now - b.lastRun;
      if (b.running < b.maxConcurrent && since >= b.minIntervalMs) {
        b.running += 1;
        b.lastRun = now;
        resolve();
        return;
      }
      const wait = Math.max(b.minIntervalMs - since, 10);
      setTimeout(tryRun, wait);
    };
    tryRun();
  });
  try {
    return await fn();
  } finally {
    const b2 = getBucket(providerId);
    b2.running = Math.max(0, b2.running - 1);
  }
}

export async function backoffRetry<T>(
  providerId: string,
  fn: () => Promise<T>,
  maxAttempts = 3,
): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await withRateLimit(providerId, fn);
    } catch (e) {
      lastErr = e;
      const status = (e as { status?: number })?.status ?? 0;
      if (status !== 429 && status < 500) throw e;
      const delay = 500 * Math.pow(2, attempt) + Math.random() * 200;
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw lastErr;
}
