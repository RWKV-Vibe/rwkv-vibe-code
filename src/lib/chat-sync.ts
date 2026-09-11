import { DETAIL_CHANNEL_NAME } from '@/lib/constants';
import { CHAT_PAGE_PROMPT_KEY, CHAT_PAGE_RESULTS_KEY } from '@/lib/storage';
import { DEFAULT_HTML, isPlaceholderHtml } from '@/lib/html';
import type { GeneratedResult } from '@/types/chat';
import { GENERATION_COUNT } from '@/lib/constants';

export type LayoutMode = '12x2' | '8x3' | '6x4';

export const LAYOUT_MODES: LayoutMode[] = ['12x2', '8x3', '6x4'];

export const LAYOUT_MODE_COLUMNS: Record<LayoutMode, number> = {
  '12x2': 12,
  '8x3': 8,
  '6x4': 6,
};

export const isLayoutMode = (value: string | null): value is LayoutMode =>
  value === '12x2' || value === '8x3' || value === '6x4';

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

export const postDetailUpdates = (
  channel: BroadcastChannel,
  updates: Map<number, ResultUpdate>,
): void => {
  updates.forEach((update, index) => {
    const message: DetailChannelMessage = {
      type: 'UPDATE_CONTENT',
      index,
      htmlCode: update.htmlCode,
      content: update.content,
    };
    channel.postMessage(message);
  });
};
