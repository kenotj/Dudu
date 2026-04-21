import { describe, it, expect, beforeEach } from 'vitest';
import { classify } from '../src/content/classify';

function mount(html: string): HTMLElement {
  document.body.innerHTML = html;
  return document.body.firstElementChild as HTMLElement;
}

describe('classify', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('returns ui for <button>', () => {
    const el = mount('<button>Submit</button>');
    expect(classify(el).role).toBe('ui');
  });

  it('returns ui for <a> with text', () => {
    const el = mount('<a href="#">Home</a>');
    expect(classify(el).role).toBe('ui');
  });

  it('returns ui for role="menuitem"', () => {
    const el = mount('<div role="menuitem">Settings</div>');
    expect(classify(el).role).toBe('ui');
  });

  it('returns skip for <script>', () => {
    document.body.innerHTML = '<script>var a = 1;</script>';
    const el = document.body.querySelector('script')!;
    expect(classify(el).role).toBe('skip');
  });

  it('returns skip for translate="no"', () => {
    const el = mount('<p translate="no">Do not touch</p>');
    expect(classify(el).role).toBe('skip');
  });

  it('returns skip for empty text', () => {
    const el = mount('<p></p>');
    expect(classify(el).role).toBe('skip');
  });

  it('returns skip inside contenteditable', () => {
    document.body.innerHTML = '<div contenteditable="true"><p>Editor text</p></div>';
    const p = document.body.querySelector('p')!;
    expect(classify(p).role).toBe('skip');
  });

  it('returns body for <p>', () => {
    const el = mount('<p>This is a paragraph of body text.</p>');
    expect(classify(el).role).toBe('body');
  });
});
