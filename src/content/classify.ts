import { DOM_SKIP_TAGS, UI_ROLE_SELECTOR } from '@/shared/constants';

export type NodeRole = 'body' | 'ui' | 'skip';

export interface ClassifyResult {
  role: NodeRole;
  reason?: string;
}

function hasMeaningfulText(el: Element): boolean {
  const t = (el.textContent ?? '').trim();
  return t.length >= 2;
}

function isInsideSkipped(el: Element): boolean {
  let cur: Element | null = el;
  while (cur) {
    if (DOM_SKIP_TAGS.has(cur.tagName)) return true;
    const translate = cur.getAttribute?.('translate');
    if (translate === 'no') return true;
    if (cur.classList?.contains('notranslate')) return true;
    if ((cur as HTMLElement).isContentEditable) return true;
    const ce = cur.getAttribute?.('contenteditable');
    if (ce !== null && ce !== undefined && ce !== 'false') return true;
    cur = cur.parentElement;
  }
  return false;
}

function isSmallBox(rect: DOMRect): boolean {
  return rect.width > 0 && rect.height > 0 && rect.width < 300 && rect.height < 60;
}

export function classify(el: Element): ClassifyResult {
  if (DOM_SKIP_TAGS.has(el.tagName)) return { role: 'skip', reason: 'skip-tag' };
  if (isInsideSkipped(el)) return { role: 'skip', reason: 'in-skipped-ancestor' };
  if (!hasMeaningfulText(el)) return { role: 'skip', reason: 'no-text' };
  if ((el as HTMLElement).dataset?.duduDone) return { role: 'skip', reason: 'already-done' };

  // UI heuristic
  if (el.matches && el.matches(UI_ROLE_SELECTOR)) {
    return { role: 'ui', reason: 'ui-role' };
  }

  if (typeof (el as HTMLElement).getBoundingClientRect !== 'function') {
    return { role: 'body', reason: 'no-rect' };
  }

  const rect = (el as HTMLElement).getBoundingClientRect();
  const cs = typeof getComputedStyle === 'function' ? getComputedStyle(el) : null;
  if (!cs) return { role: 'body' };

  const overflowHidden =
    cs.overflow === 'hidden' ||
    cs.overflowX === 'hidden' ||
    cs.textOverflow === 'ellipsis' ||
    cs.whiteSpace === 'nowrap';

  const fontSize = parseFloat(cs.fontSize || '14');
  const singleLine = rect.height > 0 && rect.height < fontSize * 2;

  if (isSmallBox(rect) && (overflowHidden || singleLine)) {
    return { role: 'ui', reason: 'small-constrained' };
  }

  return { role: 'body', reason: 'default-body' };
}

export function isTranslatableTextNode(node: Node): boolean {
  if (node.nodeType !== Node.TEXT_NODE) return false;
  const text = (node.textContent ?? '').trim();
  if (text.length < 2) return false;
  if (/^[\s\d\p{P}\p{S}]+$/u.test(text)) return false;
  return true;
}
