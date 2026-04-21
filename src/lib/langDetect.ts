const SCRIPT_RANGES: Array<[string, RegExp]> = [
  ['zh', /[一-鿿㐀-䶿]/g],
  ['ja', /[぀-ゟ゠-ヿ]/g],
  ['ko', /[가-힯ᄀ-ᇿ]/g],
  ['ar', /[؀-ۿݐ-ݿ]/g],
  ['he', /[֐-׿]/g],
  ['ru', /[Ѐ-ӿ]/g],
  ['hi', /[ऀ-ॿ]/g],
  ['th', /[฀-๿]/g],
  ['el', /[Ͱ-Ͽ]/g],
];

export function detectLang(text: string): string {
  if (!text) return 'und';
  const sample = text.slice(0, 400);
  const letters = sample.replace(/[^\p{L}]/gu, '');
  if (letters.length === 0) return 'und';
  let best = 'en';
  let bestCount = 0;
  for (const [code, re] of SCRIPT_RANGES) {
    const matches = sample.match(re);
    const count = matches ? matches.length : 0;
    if (count > bestCount) {
      best = code;
      bestCount = count;
    }
  }
  if (bestCount / letters.length >= 0.25) return best;
  if (/[À-ɏ]/.test(sample)) return 'lat';
  return 'en';
}

export function normalizeLang(code: string): string {
  return code.toLowerCase().split('-')[0];
}

export function shouldTranslate(
  detected: string,
  target: string,
  sourceSetting: string,
): boolean {
  if (!detected || detected === 'und') return true;
  const t = normalizeLang(target);
  const d = normalizeLang(detected);
  if (d === t) return false;
  if (sourceSetting === 'auto') return true;
  return normalizeLang(sourceSetting) === d;
}
