import { describe, it, expect } from 'vitest';
import 'fake-indexeddb/auto';
import { cacheGet, cachePut } from '../src/background/cacheStore';

describe('cacheStore', () => {
  it('round-trips a translation', async () => {
    await cachePut('k1', 'Bonjour');
    expect(await cacheGet('k1')).toBe('Bonjour');
    expect(await cacheGet('missing')).toBeUndefined();
  });
});
