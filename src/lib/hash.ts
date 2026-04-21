export function fnv1a(input: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(36);
}

export function cacheKey(parts: (string | number | undefined)[]): string {
  return fnv1a(parts.map((p) => (p === undefined ? '' : String(p))).join(''));
}
