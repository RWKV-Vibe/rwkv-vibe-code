import { DETAIL_CHANNEL_NAME } from '@/lib/constants';
import { CHAT_PAGE_PROMPT_KEY, CHAT_PAGE_RESULTS_KEY } from '@/lib/storage';
import { DEFAULT_HTML, isPlaceholderHtml } from '@/lib/html';
import type { GeneratedResult } from '@/types/chat';
import { GENERATION_COUNT } from '@/lib/constants';

export type ResultUpdate = { content: string; htmlCode: string };

export type DetailChannelMessage =
  | { type: 'DETAIL_READY'; index: number }
  | {
      type: 'UPDATE_CONTENT';
      index: number;
      htmlCode: string;
      content: string;
    }
  | { type: 'INIT_DETAIL'; index: number; htmlCode: string }
  | { type: 'GENERATION_COMPLETE' }
  | { type: 'GENERATION_ERROR' };

export const createPlaceholders = (
  count = GENERATION_COUNT,
): GeneratedResult[] =>
  Array.from({ length: count }, (_, i) => ({
    id: `result-${i}`,
    content: '',
    htmlCode: DEFAULT_HTML,
    isLoading: true,
  }));

export const parseChatResults = (raw: string | null): GeneratedResult[] => {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as GeneratedResult[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export const loadChatResults = (): GeneratedResult[] => {
  if (typeof localStorage === 'undefined') return [];
  return parseChatResults(localStorage.getItem(CHAT_PAGE_RESULTS_KEY));
};

export const saveChatResults = (results: GeneratedResult[]): void => {
  if (typeof localStorage === 'undefined' || results.length === 0) return;
  localStorage.setItem(CHAT_PAGE_RESULTS_KEY, JSON.stringify(results));
};

export const loadChatPrompt = (): string => {
  if (typeof localStorage === 'undefined') return '';
  return localStorage.getItem(CHAT_PAGE_PROMPT_KEY) || '';
};

export const saveChatPrompt = (prompt: string): void => {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(CHAT_PAGE_PROMPT_KEY, prompt);
};

export const getCompletedIndexes = (
  results: GeneratedResult[],
): Set<number> => {
  const completed = new Set<number>();
  results.forEach((result, index) => {
    if (!result.isLoading && result.htmlCode && !isPlaceholderHtml(result.htmlCode)) {
      completed.add(index);
    }
  });
  return completed;
};

export const mergeResultsWithBuffer = (
  results: GeneratedResult[],
  buffer: Map<number, ResultUpdate>,
): GeneratedResult[] =>
  results.map((result, index) => {
    const update = buffer.get(index);
    if (!update?.htmlCode) return result;
    return {
      ...result,
      content: update.content,
      htmlCode: update.htmlCode,
      isLoading: false,
    };
  });

export const createDetailChannel = (): BroadcastChannel =>
  new BroadcastChannel(DETAIL_CHANNEL_NAME);

/**
 * 只广播 indexes 里点名的那几条。
 *
 * 原来是把整个 buffer 无差别发一遍：24 份完整 HTML 每次刷新都要走一次
 * structured clone，而绝大多数时候一个详情页都没开，这些消息全都发给了空气。
 * 现在由调用方交叉「本轮真的变了的」和「真的有窗口在听的」，再决定发什么。
 */
export const postDetailUpdates = (
  channel: BroadcastChannel,
  updates: Map<number, ResultUpdate>,
  indexes: Iterable<number>,
): void => {
  for (const index of indexes) {
    const update = updates.get(index);
    if (!update) continue;
    const message: DetailChannelMessage = {
      type: 'UPDATE_CONTENT',
      index,
      htmlCode: update.htmlCode,
      content: update.content,
    };
    channel.postMessage(message);
  }
};
