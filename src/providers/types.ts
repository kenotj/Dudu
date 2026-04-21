export type Lang = string;

export interface SizeConstraint {
  maxChars: number;
  maxPixelWidth: number;
  fontFamily: string;
  fontSizePx: number;
  fontWeight: string;
  lines: number;
  shrinkFactor?: number;
}

export interface TextSegment {
  id: string;
  text: string;
  constraint?: SizeConstraint;
  context?: string;
}

export interface TextBatch {
  segments: TextSegment[];
  sourceLang?: Lang;
  targetLang: Lang;
}

export interface TranslationResult {
  items: Array<{ id: string; text: string; truncated?: boolean }>;
  usage?: { inputTokens?: number; outputTokens?: number };
}

export interface ProviderConfig {
  apiKey?: string;
  model?: string;
  endpoint?: string;
}

export interface TranslationProvider {
  id: string;
  label: string;
  requiresKey: boolean;
  supportsConstraint: boolean;
  maxBatchChars: number;
  defaultModel?: string;
  translate(batch: TextBatch, config: ProviderConfig, signal?: AbortSignal): Promise<TranslationResult>;
}

export class ProviderError extends Error {
  constructor(
    message: string,
    public readonly providerId: string,
    public readonly status?: number,
  ) {
    super(message);
    this.name = 'ProviderError';
  }
}
