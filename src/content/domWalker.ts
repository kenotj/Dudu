import { DATA_ATTR_DONE, DOM_SKIP_TAGS } from '@/shared/constants';
import { classify, type NodeRole } from './classify';

export interface Candidate {
  element: HTMLElement;
  role: NodeRole;
  text: string;
}

function isBlockLike(el: Element): boolean {
  const cs = typeof getComputedStyle === 'function' ? getComputedStyle(el) : null;
  if (!cs) return true;
  return (
    cs.display === 'block' ||
    cs.display === 'flex' ||
    cs.display === 'grid' ||
    cs.display === 'list-item' ||
    cs.display === 'table-cell' ||
    cs.display === 'inline-block'
  );
}

function directTextContent(el: Element): string {
  let t = '';
  for (const child of Array.from(el.childNodes)) {
    if (child.nodeType === Node.TEXT_NODE) t += child.textContent ?? '';
    else if (child.nodeType === Node.ELEMENT_NODE) {
      const ce = child as Element;
      if (!DOM_SKIP_TAGS.has(ce.tagName) && (ce.textContent ?? '').length < 120) {
        t += ce.textContent ?? '';
      }
    }
  }
  return t.trim();
}

export function collectCandidates(root: Element): Candidate[] {
  const out: Candidate[] = [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT, {
    acceptNode(node: Node): number {
      const el = node as Element;
      if (DOM_SKIP_TAGS.has(el.tagName)) return NodeFilter.FILTER_REJECT;
      if ((el as HTMLElement).hasAttribute?.(DATA_ATTR_DONE)) return NodeFilter.FILTER_SKIP;
      if (el.getAttribute?.('translate') === 'no') return NodeFilter.FILTER_REJECT;
      if (el.classList?.contains('notranslate')) return NodeFilter.FILTER_REJECT;
      if ((el as HTMLElement).isContentEditable) return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    },
  });

  const seen = new Set<Element>();
  let current: Node | null = walker.currentNode;
  while (current) {
    const el = current as Element;
    if (!seen.has(el) && isBlockLike(el)) {
      const text = directTextContent(el);
      if (text.length >= 2) {
        const { role } = classify(el);
        if (role !== 'skip') {
          out.push({ element: el as HTMLElement, role, text });
          seen.add(el);
        }
      }
    }
    current = walker.nextNode();
  }

  // Also include UI-role elements that may not be block-level (e.g., inline-block buttons)
  const uiEls = root.querySelectorAll?.(
    'button, a, [role="button"], [role="menuitem"], [role="tab"], label',
  );
  if (uiEls) {
    uiEls.forEach((el) => {
      if (seen.has(el)) return;
      if ((el as HTMLElement).hasAttribute(DATA_ATTR_DONE)) return;
      const text = directTextContent(el);
      if (text.length < 2) return;
      const { role } = classify(el);
      if (role !== 'skip') {
        out.push({ element: el as HTMLElement, role, text });
        seen.add(el);
      }
    });
  }

  return out;
}
