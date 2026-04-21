import { describe, it, expect } from 'vitest';
import { bucketMaxChars, computeBudget, fitsInBudget } from '../src/lib/boxFit';

describe('boxFit', () => {
  it('computes a max-char budget that scales with box width', () => {
    const small = computeBudget({
      rect: { width: 80, height: 20 },
      computedStyle: {
        fontFamily: 'sans-serif',
        fontSize: '14px',
        fontWeight: '400',
        fontStyle: 'normal',
        lineHeight: 'normal',
      } as any,
      sampleText: 'abcdef',
    });
    const big = computeBudget({
      rect: { width: 320, height: 20 },
      computedStyle: {
        fontFamily: 'sans-serif',
        fontSize: '14px',
        fontWeight: '400',
        fontStyle: 'normal',
        lineHeight: 'normal',
      } as any,
      sampleText: 'abcdef',
    });
    expect(small.maxChars).toBeGreaterThan(0);
    expect(big.maxChars).toBeGreaterThan(small.maxChars);
  });

  it('shrinkFactor reduces the budget', () => {
    const full = computeBudget({
      rect: { width: 200, height: 20 },
      computedStyle: {
        fontFamily: 'sans-serif',
        fontSize: '16px',
        fontWeight: '400',
        fontStyle: 'normal',
        lineHeight: 'normal',
      } as any,
      sampleText: 'abcd',
    });
    const shrunk = computeBudget({
      rect: { width: 200, height: 20 },
      computedStyle: {
        fontFamily: 'sans-serif',
        fontSize: '16px',
        fontWeight: '400',
        fontStyle: 'normal',
        lineHeight: 'normal',
      } as any,
      sampleText: 'abcd',
      shrinkFactor: 0.85,
    });
    expect(shrunk.maxChars).toBeLessThan(full.maxChars);
  });

  it('fitsInBudget accepts strings at or below the budget', () => {
    const budget = computeBudget({
      rect: { width: 100, height: 20 },
      computedStyle: {
        fontFamily: 'sans-serif',
        fontSize: '14px',
        fontWeight: '400',
        fontStyle: 'normal',
        lineHeight: 'normal',
      } as any,
      sampleText: 'abcd',
    });
    const short = 'OK';
    const long = 'supercalifragilisticexpialidocious';
    expect(fitsInBudget(short, budget)).toBe(true);
    expect(fitsInBudget(long, budget)).toBe(false);
  });

  it('bucketMaxChars rounds to the nearest 5', () => {
    expect(bucketMaxChars(3)).toBe(5);
    expect(bucketMaxChars(12)).toBe(10);
    expect(bucketMaxChars(13)).toBe(15);
    expect(bucketMaxChars(27)).toBe(25);
  });
});
