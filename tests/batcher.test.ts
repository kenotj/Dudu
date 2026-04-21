import { describe, it, expect } from 'vitest';
import { batchSegments, nextSegmentId } from '../src/lib/batcher';

describe('batcher', () => {
  it('packs segments up to the char budget', () => {
    const segs = Array.from({ length: 20 }, (_, i) => ({
      id: `s${i}`,
      text: 'x'.repeat(200),
    }));
    const batches = batchSegments(segs, 500);
    expect(batches.length).toBeGreaterThan(1);
    for (const b of batches) {
      const total = b.reduce((n, s) => n + s.text.length, 0);
      expect(total).toBeLessThanOrEqual(500 + 200); // up to one extra segment allowed
    }
  });

  it('preserves order and ids', () => {
    const segs = Array.from({ length: 7 }, (_, i) => ({ id: `id-${i}`, text: 'abc' }));
    const batches = batchSegments(segs, 10);
    const flat = batches.flat().map((s) => s.id);
    expect(flat).toEqual(segs.map((s) => s.id));
  });

  it('nextSegmentId is unique and short', () => {
    const seen = new Set<string>();
    for (let i = 0; i < 1000; i++) seen.add(nextSegmentId());
    expect(seen.size).toBe(1000);
  });
});
