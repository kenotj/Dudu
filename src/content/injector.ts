import {
  DATA_ATTR_DONE,
  DATA_ATTR_MODE,
  DATA_ATTR_ORIGINAL,
  TRANSLATION_CLASS,
  UI_TRANSLATED_CLASS,
} from '@/shared/constants';
import { fnv1a } from '@/lib/hash';

export type InjectMode = 'body' | 'ui';

export function injectBodyTranslation(
  el: HTMLElement,
  translation: string,
  targetLang: string,
): void {
  if (!translation || translation.trim().length === 0) return;
  removeExistingTranslation(el);

  const cs = getComputedStyle(el);
  const isInline = cs.display === 'inline';

  const wrapper = document.createElement('font');
  wrapper.className = TRANSLATION_CLASS;
  wrapper.lang = targetLang;
  wrapper.setAttribute(DATA_ATTR_MODE, 'body');
  wrapper.textContent = translation;
  if (!isInline) {
    wrapper.style.display = 'block';
  }
  wrapper.style.contain = 'layout';

  el.appendChild(wrapper);
  markDone(el, el.textContent ?? '');
}

export function replaceUiTranslation(
  el: HTMLElement,
  translation: string,
  options: { overflow?: boolean } = {},
): void {
  if (!translation || translation.trim().length === 0) return;
  if (!el.hasAttribute(DATA_ATTR_ORIGINAL)) {
    el.setAttribute(DATA_ATTR_ORIGINAL, el.textContent ?? '');
  }
  el.textContent = translation;
  el.classList.add(UI_TRANSLATED_CLASS);
  el.setAttribute(DATA_ATTR_MODE, 'ui');
  if (options.overflow) {
    el.title = translation;
    el.style.textOverflow = 'ellipsis';
    el.style.overflow = 'hidden';
    el.style.whiteSpace = el.style.whiteSpace || 'nowrap';
  }
  markDone(el, translation);
}

export function markDone(el: HTMLElement, text: string): void {
  el.setAttribute(DATA_ATTR_DONE, fnv1a(text));
}

export function removeExistingTranslation(el: HTMLElement): void {
  el.querySelectorAll(`:scope > .${TRANSLATION_CLASS}`).forEach((n) => n.remove());
}

export function restoreElement(el: HTMLElement): void {
  const mode = el.getAttribute(DATA_ATTR_MODE);
  if (mode === 'body') {
    removeExistingTranslation(el);
  } else if (mode === 'ui') {
    const orig = el.getAttribute(DATA_ATTR_ORIGINAL);
    if (orig !== null) el.textContent = orig;
    el.classList.remove(UI_TRANSLATED_CLASS);
    el.removeAttribute(DATA_ATTR_ORIGINAL);
  }
  el.removeAttribute(DATA_ATTR_DONE);
  el.removeAttribute(DATA_ATTR_MODE);
}

export function restoreAll(root: ParentNode = document): void {
  root.querySelectorAll(`[${DATA_ATTR_DONE}]`).forEach((n) => restoreElement(n as HTMLElement));
  root.querySelectorAll(`.${TRANSLATION_CLASS}`).forEach((n) => n.remove());
}
