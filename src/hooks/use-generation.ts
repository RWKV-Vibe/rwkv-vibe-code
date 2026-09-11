'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { AIService } from '@/lib/ai';
import {
  CHAT_INITIAL_MESSAGE_KEY,
  CHAT_SHOULD_GENERATE_KEY,
  GENERATION_COUNT,
  UI_FLUSH_THROTTLE_MS,
} from '@/lib/constants';
import { getGenerationStore } from '@/lib/generation-store';
import { isAiGenerationComplete, isHtmlReadyToRender } from '@/lib/html';
import {
  CHAT_PAGE_PROCESSED_FLAG_KEY,
  CHAT_PAGE_RESULTS_KEY,
} from '@/lib/storage';
import {
  createDetailChannel,
  createPlaceholders,
  getCompletedIndexes,
  loadChatPrompt,
  loadChatResults,
  mergeResultsWithBuffer,
  postDetailUpdates,
  saveChatPrompt,
  saveChatResults,
  type ResultUpdate,
} from '@/lib/chat-sync';
import type { GeneratedResult } from '@/types/chat';

const isAbortError = (error: unknown): boolean =>
  error instanceof Error && error.name === 'AbortError';

export const useGeneration = () => {
  const store = getGenerationStore();
  const [hydrated, setHydrated] = useState(false);
  const [results, setResults] = useState<GeneratedResult[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [tokenRate, setTokenRate] = useState(0);
  const [totalTokens, setTotalTokens] = useState(0);
  const [completedIndexes, setCompletedIndexes] = useState<Set<number>>(
    new Set(),
  );
  const [initialPrompt, setInitialPrompt] = useState('');

  const resultsRef = useRef(results);
  const updateBuffer = useRef<Map<number, ResultUpdate>>(store.updateBuffer);
  const abortControllerRef = useRef<AbortController | null>(null);
  const flushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const processedInitialRef = useRef(false);
  const isGeneratingRef = useRef(false);

  useEffect(() => {
    resultsRef.current = results;
  }, [results]);

  useEffect(() => {
    isGeneratingRef.current = isGenerating;
  }, [isGenerating]);

  const persistNow = useCallback((next: GeneratedResult[]) => {
    saveChatResults(next);
  }, []);

  const flushUpdates = useCallback(
    (channel?: BroadcastChannel) => {
      if (updateBuffer.current.size === 0) return;

      const updates = new Map(updateBuffer.current);
      if (channel) {
        postDetailUpdates(channel, updates);
      }

      setResults((prev) => {
        const next = prev.map((result, index) => {
          const update = updates.get(index);
          return update
            ? {
                ...result,
                content: update.content,
                htmlCode: update.htmlCode,
                isLoading: false,
              }
            : result;
        });
        persistNow(next);
        return next;
      });
    },
    [persistNow],
  );

  useEffect(() => {
    const saved = loadChatResults();
    setResults(saved);
    setCompletedIndexes(getCompletedIndexes(saved));
    setInitialPrompt(loadChatPrompt());
    abortControllerRef.current = store.abortController;
    if (store.isGenerating) {
      setIsGenerating(true);
    }
    setHydrated(true);
  }, [store]);

  useEffect(() => {
    return () => {
      if (flushTimerRef.current) {
        clearTimeout(flushTimerRef.current);
      }
      store.abortController = abortControllerRef.current;
      store.isGenerating = isGeneratingRef.current;
    };
  }, [store]);

  const stop = useCallback(() => {
    store.abortController?.abort();
    store.abortController = null;
    abortControllerRef.current = null;

    if (flushTimerRef.current) {
      clearTimeout(flushTimerRef.current);
      flushTimerRef.current = null;
    }

    setResults((prev) => {
      const updates = updateBuffer.current;
      const next =
        updates.size > 0
          ? prev.map((result, index) => {
              const update = updates.get(index);
              return update
                ? {
                    ...result,
                    content: update.content,
                    htmlCode: update.htmlCode,
                    isLoading: false,
                  }
                : { ...result, isLoading: false };
            })
          : prev.map((result) => ({ ...result, isLoading: false }));
      persistNow(next);
      return next;
    });

    setIsGenerating(false);
    store.isGenerating = false;
  }, [persistNow, store]);

  const generate = useCallback(
    async (userPrompt: string) => {
      store.abortController?.abort();

      const controller = new AbortController();
      abortControllerRef.current = controller;
      store.abortController = controller;
      setIsGenerating(true);
      store.isGenerating = true;

      localStorage.removeItem(CHAT_PAGE_RESULTS_KEY);
      localStorage.removeItem(CHAT_PAGE_PROCESSED_FLAG_KEY);
      saveChatPrompt(userPrompt);
      setInitialPrompt(userPrompt);

      setCompletedIndexes(new Set());
      setTokenRate(0);
      setTotalTokens(0);
      updateBuffer.current.clear();
      store.updateBuffer.clear();

      const placeholders = createPlaceholders(GENERATION_COUNT);
      setResults(placeholders);

      const channel = createDetailChannel();

      const scheduleFlush = (immediate: boolean) => {
        if (immediate) {
          if (flushTimerRef.current) {
            clearTimeout(flushTimerRef.current);
            flushTimerRef.current = null;
          }
          flushUpdates(channel);
          return;
        }
        if (flushTimerRef.current) return;
        flushTimerRef.current = setTimeout(() => {
          flushTimerRef.current = null;
          flushUpdates(channel);
        }, UI_FLUSH_THROTTLE_MS);
      };

      try {
        await AIService.generateMultipleResponses(
          userPrompt,
          GENERATION_COUNT,
          (
            index,
            content,
            htmlCode,
            isComplete = false,
            currentTokenRate,
            currentTotalTokens,
          ) => {
            if (currentTokenRate !== undefined) setTokenRate(currentTokenRate);
            if (currentTotalTokens !== undefined) {
              setTotalTokens(currentTotalTokens);
            }

            const updateData = { content, htmlCode };
            updateBuffer.current.set(index, updateData);
            store.updateBuffer.set(index, updateData);

            if (isComplete || isAiGenerationComplete(content)) {
              setCompletedIndexes((prev) => {
                if (prev.has(index)) return prev;
                const next = new Set(prev);
                next.add(index);
                return next;
              });
            }

            scheduleFlush(isHtmlReadyToRender(content, htmlCode));
          },
          controller,
        );

        if (flushTimerRef.current) {
          clearTimeout(flushTimerRef.current);
          flushTimerRef.current = null;
        }
        flushUpdates(channel);

        const finalResults = mergeResultsWithBuffer(
          resultsRef.current,
          updateBuffer.current,
        );
        persistNow(finalResults);
        setResults(finalResults);

        channel.postMessage({ type: 'GENERATION_COMPLETE' });
        window.setTimeout(() => channel.close(), 500);
      } catch (error: unknown) {
        if (!isAbortError(error)) {
          console.error('生成失败:', error);
        }
        setResults((prev) =>
          prev.map((result) => ({ ...result, isLoading: false })),
        );
        channel.postMessage({ type: 'GENERATION_ERROR' });
        window.setTimeout(() => channel.close(), 500);
      } finally {
        if (store.abortController === controller) {
          setIsGenerating(false);
          store.isGenerating = false;
          abortControllerRef.current = null;
          store.abortController = null;
        }
      }
    },
    [flushUpdates, persistNow, store],
  );

  useEffect(() => {
    if (!hydrated || processedInitialRef.current) return;
    processedInitialRef.current = true;

    const shouldGenerate =
      sessionStorage.getItem(CHAT_SHOULD_GENERATE_KEY) === '1';
    const initialMessage =
      sessionStorage.getItem(CHAT_INITIAL_MESSAGE_KEY) || '';
    sessionStorage.removeItem(CHAT_SHOULD_GENERATE_KEY);
    sessionStorage.removeItem(CHAT_INITIAL_MESSAGE_KEY);

    if (shouldGenerate && initialMessage.trim()) {
      localStorage.setItem(CHAT_PAGE_PROCESSED_FLAG_KEY, 'true');
      void generate(initialMessage);
    }
  }, [generate, hydrated]);

  const openDetail = useCallback(
    (index: number) => {
      const current = results[index];
      if (!current || current.isLoading) return;

      const finalResults = mergeResultsWithBuffer(
        results,
        updateBuffer.current.size > 0
          ? updateBuffer.current
          : store.updateBuffer,
      );
      persistNow(finalResults);
      window.open(`/detail?index=${index}`, '_blank', 'noopener,noreferrer');
    },
    [persistNow, results, store.updateBuffer],
  );

  return {
    hydrated,
    results,
    isGenerating,
    tokenRate,
    totalTokens,
    completedTaskCount: completedIndexes.size,
    totalCount: GENERATION_COUNT,
    initialPrompt,
    generate,
    stop,
    openDetail,
  };
};
