import type { SizeConstraint, TextSegment, TranslationResult } from '@/providers/types';

export type MessageType =
  | 'translate'
  | 'get-settings'
  | 'set-settings'
  | 'toggle-page'
  | 'cache-stats'
  | 'ping';

export interface TranslateRequest {
  type: 'translate';
  segments: TextSegment[];
  targetLang: string;
  sourceLang?: string;
  tabUrl?: string;
}

export interface TranslateResponse {
  ok: boolean;
  result?: TranslationResult;
  error?: string;
}

export interface Message<T = unknown> {
  type: MessageType;
  payload?: T;
}

export function sendToBackground<Req, Resp>(message: Req): Promise<Resp> {
  return new Promise((resolve, reject) => {
    try {
      chrome.runtime.sendMessage(message, (resp: Resp) => {
        const err = chrome.runtime.lastError;
        if (err) {
          reject(new Error(err.message));
          return;
        }
        resolve(resp);
      });
    } catch (e) {
      reject(e);
    }
  });
}

export type { SizeConstraint, TextSegment };
