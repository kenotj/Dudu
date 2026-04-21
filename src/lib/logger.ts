const SECRET_KEY_RE = /key|token|secret|authorization|bearer/i;

function redact(value: unknown, depth = 0): unknown {
  if (depth > 4) return '[depth]';
  if (value === null || value === undefined) return value;
  if (typeof value === 'string') return value;
  if (typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map((v) => redact(v, depth + 1));
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    if (SECRET_KEY_RE.test(k)) {
      out[k] = typeof v === 'string' && v.length > 0 ? `[redacted:${v.length}]` : '[redacted]';
    } else {
      out[k] = redact(v, depth + 1);
    }
  }
  return out;
}

function fmt(args: unknown[]): unknown[] {
  return args.map((a) => redact(a));
}

export const logger = {
  debug(...args: unknown[]): void {
    console.debug('[dudu]', ...fmt(args));
  },
  info(...args: unknown[]): void {
    console.info('[dudu]', ...fmt(args));
  },
  warn(...args: unknown[]): void {
    console.warn('[dudu]', ...fmt(args));
  },
  error(...args: unknown[]): void {
    console.error('[dudu]', ...fmt(args));
  },
};
