import type { SizeConstraint } from '@/providers/types';

let sharedCtx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null = null;

function getCtx(): CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D {
  if (sharedCtx) return sharedCtx;
  if (typeof OffscreenCanvas !== 'undefined') {
    const c = new OffscreenCanvas(256, 64);
    sharedCtx = c.getContext('2d') as OffscreenCanvasRenderingContext2D;
  } else {
    const c = document.createElement('canvas');
    c.width = 256;
    c.height = 64;
    sharedCtx = c.getContext('2d') as CanvasRenderingContext2D;
  }
  if (!sharedCtx) throw new Error('2D canvas context unavailable');
  return sharedCtx;
}

export function buildFontString(cs: CSSStyleDeclaration): string {
  const style = cs.fontStyle || 'normal';
  const variant = 'normal';
  const weight = cs.fontWeight || '400';
  const size = cs.fontSize || '14px';
  const family = cs.fontFamily || 'sans-serif';
  return `${style} ${variant} ${weight} ${size} / ${cs.lineHeight || 'normal'} ${family}`;
}

export function measureTextWidth(text: string, font: string): number {
  const ctx = getCtx();
  ctx.font = font;
  return ctx.measureText(text).width;
}

export interface BudgetInput {
  rect: { width: number; height: number };
  computedStyle: Pick<
    CSSStyleDeclaration,
    'fontFamily' | 'fontSize' | 'fontWeight' | 'fontStyle' | 'lineHeight'
  >;
  sampleText: string;
  shrinkFactor?: number;
}

export function computeBudget(input: BudgetInput): SizeConstraint {
  const { rect, computedStyle: cs, sampleText } = input;
  const shrink = input.shrinkFactor ?? 1;
  const fontSizePx = parseFloat(cs.fontSize) || 14;
  const lineHeightPx =
    cs.lineHeight && cs.lineHeight !== 'normal' ? parseFloat(cs.lineHeight) : fontSizePx * 1.2;
  const lines = Math.max(1, Math.floor(rect.height / (lineHeightPx || fontSizePx * 1.2)));
  const usableWidth = rect.width * lines * 0.95 * shrink;
  const font = buildFontString(cs as CSSStyleDeclaration);

  const sample = sampleText && sampleText.length > 0 ? sampleText : 'abcdefghij';
  const sampleWidth = measureTextWidth(sample, font);
  const avgAdvance = sampleWidth / Math.max(1, sample.length);
  const avg = avgAdvance > 0 ? avgAdvance : fontSizePx * 0.5;

  const maxChars = Math.max(1, Math.floor(usableWidth / avg));
  return {
    maxChars,
    maxPixelWidth: rect.width * lines * 0.95 * shrink,
    fontFamily: cs.fontFamily,
    fontSizePx,
    fontWeight: String(cs.fontWeight || '400'),
    lines,
    shrinkFactor: shrink,
  };
}

export function measureElementBudget(el: HTMLElement, shrinkFactor = 1): SizeConstraint {
  const rect = el.getBoundingClientRect();
  const cs = getComputedStyle(el);
  return computeBudget({
    rect: { width: rect.width, height: rect.height },
    computedStyle: cs,
    sampleText: el.textContent?.trim() || '',
    shrinkFactor,
  });
}

export function fitsInBudget(text: string, budget: SizeConstraint): boolean {
  const font = `${budget.fontWeight} ${budget.fontSizePx}px ${budget.fontFamily}`;
  return measureTextWidth(text, font) <= budget.maxPixelWidth;
}

export function bucketMaxChars(maxChars: number): number {
  return Math.max(5, Math.round(maxChars / 5) * 5);
}
