import { BATCH_MAX_CHARS } from '@/shared/constants';
import type { TextSegment } from '@/providers/types';

export function batchSegments(
  segments: TextSegment[],
  maxChars: number = BATCH_MAX_CHARS,
): TextSegment[][] {
  const batches: TextSegment[][] = [];
  let current: TextSegment[] = [];
  let currentChars = 0;
  for (const seg of segments) {
    const len = seg.text.length;
    if (current.length > 0 && currentChars + len > maxChars) {
      batches.push(current);
      current = [];
      currentChars = 0;
    }
    current.push(seg);
    currentChars += len;
  }
  if (current.length > 0) batches.push(current);
  return batches;
}

let idCounter = 0;

export function nextSegmentId(): string {
  idCounter = (idCounter + 1) >>> 0;
  return `s${idCounter.toString(36)}`;
}
