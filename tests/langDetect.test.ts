import { describe, it, expect } from 'vitest';
import { detectLang, normalizeLang, shouldTranslate } from '../src/lib/langDetect';

describe('langDetect', () => {
  it('detects Chinese', () => {
    expect(detectLang('你好，世界')).toBe('zh');
  });
  it('detects Japanese', () => {
    expect(detectLang('こんにちは、世界')).toBe('ja');
  });
  it('detects Russian', () => {
    expect(detectLang('Привет, мир')).toBe('ru');
  });
  it('defaults to English for Latin script', () => {
    expect(detectLang('Hello world')).toBe('en');
  });
  it('returns und for numeric/punctuation', () => {
    expect(detectLang('12345')).toBe('und');
  });
});

describe('shouldTranslate', () => {
  it('skips when detected matches target', () => {
    expect(shouldTranslate('en', 'en', 'auto')).toBe(false);
  });
  it('translates when detected differs', () => {
    expect(shouldTranslate('zh', 'en', 'auto')).toBe(true);
  });
  it('respects a non-auto source restriction', () => {
    expect(shouldTranslate('ja', 'en', 'zh')).toBe(false);
    expect(shouldTranslate('zh', 'en', 'zh')).toBe(true);
  });
});

describe('normalizeLang', () => {
  it('strips region', () => {
    expect(normalizeLang('zh-CN')).toBe('zh');
    expect(normalizeLang('EN-US')).toBe('en');
  });
});
