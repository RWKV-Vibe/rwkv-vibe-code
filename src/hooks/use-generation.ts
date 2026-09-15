'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { AIService } from '@/lib/ai';
import {
  CHAT_INITIAL_MESSAGE_KEY,
  CHAT_SHOULD_GENERATE_KEY,
  GENERATION_COUNT,
  PERSIST_THROTTLE_MS,
  UI_FLUSH_THROTTLE_MS,
} from '@/lib/constants';
import { getGenerationStore } from '@/lib/generation-store';
import { isAiGenerationComplete } from '@/lib/html';
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
  type DetailChannelMessage,
} from '@/lib/chat-sync';
import type { GeneratedResult } from '@/types/chat';

const isAbortError = (error: unknown): boolean =>
  error instanceof Error && error.name === 'AbortError';

/**
 * 流式生成的状态机。
 *
 * 性能上的三条原则（改之前每一条都是反着的）：
 * 1. 每次刷新只碰「这一轮真的变过」的下标，没变的结果保持对象引用不变，
 *    memo 过的卡片就不会重渲染、iframe 也就不会重新加载；
 * 2. 落盘和广播都比 UI 刷新慢一个数量级，绝不放在每帧的路径上；
 * 3. token 速率 / 完成数这类纯展示状态也攒到刷新点一起提交，
 *    不让它们单独触发整页重渲染。
 */
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
  const abortControllerRef = useRef<AbortController | null>(null);
  const processedInitialRef = useRef(false);
  const isGeneratingRef = useRef(false);

  /** 本轮刷新窗口内被写过的下标；刷完就清空 */
  const dirtyIndexesRef = useRef<Set<number>>(new Set());
  const flushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastFlushAtRef = useRef(0);

  const persistTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /** 当前真的有详情页窗口在监听的下标；没人听就不广播 */
  const detailListenersRef = useRef<Set<number>>(new Set());
  const channelRef = useRef<BroadcastChannel | null>(null);

  const tokenRateRef = useRef(0);
  const totalTokensRef = useRef(0);
  const completedRef = useRef<Set<number>>(new Set());
  const completedDirtyRef = useRef(false);

  useEffect(() => {
    isGeneratingRef.current = isGenerating;
  }, [isGenerating]);

  /** setResults + 同步更新 ref，让落盘能拿到最新值而不用等下一次 render */
  const commitResults = useCallback(
    (updater: (prev: GeneratedResult[]) => GeneratedResult[]) => {
      setResults((prev) => {
        const next = updater(prev);
        resultsRef.current = next;
        return next;
      });
    },
    [],
  );

  const persistNow = useCallback(() => {
    if (persistTimerRef.current) {
      clearTimeout(persistTimerRef.current);
      persistTimerRef.current = null;
    }
    saveChatResults(resultsRef.current);
  }, []);

  const schedulePersist = useCallback(() => {
    if (persistTimerRef.current) return;
    persistTimerRef.current = setTimeout(() => {
      persistTimerRef.current = null;
      saveChatResults(resultsRef.current);
    }, PERSIST_THROTTLE_MS);
  }, []);

  const flushUpdates = useCallback(() => {
    const dirty = dirtyIndexesRef.current;
    if (dirty.size === 0) return;

    const touched = new Set(dirty);
    dirty.clear();
    lastFlushAtRef.current = Date.now();

    const buffer = store.updateBuffer;

    // 只发给真的开着的详情页；平时这里是空集，一条消息都不发。
    const channel = channelRef.current;
    const listeners = detailListenersRef.current;
    if (channel && listeners.size > 0) {
      const targets: number[] = [];
      for (const index of touched) {
        if (listeners.has(index)) targets.push(index);
      }
      if (targets.length > 0) postDetailUpdates(channel, buffer, targets);
    }

    commitResults((prev) => {
      let changed = false;
      const next = prev.map((result, index) => {
        if (!touched.has(index)) return result;
        const update = buffer.get(index);
        if (!update) return result;
        changed = true;
        return {
          ...result,
          content: update.content,
          htmlCode: update.htmlCode,
          isLoading: false,
        };
      });
      // 没有实质变化就把原数组还回去，避免白白让整个网格重渲染一次
      return changed ? next : prev;
    });

    setTokenRate(tokenRateRef.current);
    setTotalTokens(totalTokensRef.current);
    if (completedDirtyRef.current) {
      completedDirtyRef.current = false;
      setCompletedIndexes(new Set(completedRef.current));
    }

    schedulePersist();
  }, [commitResults, schedulePersist, store]);

  /**
   * 前沿 + 后沿节流：窗口空闲时第一条更新立刻出画（首帧不等），
   * 窗口内的后续更新攒到窗口末尾一次性提交。
   *
   * 改之前这里有个 `immediate` 通道，条件是「htmlCode 长度 > 1000」——
   * 也就是说开头一千字之后每一个 chunk 都在走立即刷新，节流形同虚设。
   */
  const scheduleFlush = useCallback(() => {
    if (flushTimerRef.current) return;
    const wait = UI_FLUSH_THROTTLE_MS - (Date.now() - lastFlushAtRef.current);
    if (wait <= 0) {
      flushUpdates();
      return;
    }
    flushTimerRef.current = setTimeout(() => {
      flushTimerRef.current = null;
      flushUpdates();
    }, wait);
  }, [flushUpdates]);

  const cancelTimers = useCallback(() => {
    if (flushTimerRef.current) {
      clearTimeout(flushTimerRef.current);
      flushTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    const saved = loadChatResults();
    resultsRef.current = saved;
    setResults(saved);
    const completed = getCompletedIndexes(saved);
    completedRef.current = completed;
    setCompletedIndexes(completed);
    setInitialPrompt(loadChatPrompt());
    abortControllerRef.current = store.abortController;
    if (store.isGenerating) {
      setIsGenerating(true);
    }
    setHydrated(true);
  }, [store]);

  /* 关标签页 / 切后台时把还没落盘的结果补上 */
  useEffect(() => {
    const handlePageHide = () => persistNow();
    window.addEventListener('pagehide', handlePageHide);
    return () => window.removeEventListener('pagehide', handlePageHide);
  }, [persistNow]);

  useEffect(() => {
    return () => {
      cancelTimers();
      if (persistTimerRef.current) {
        clearTimeout(persistTimerRef.current);
        persistTimerRef.current = null;
        saveChatResults(resultsRef.current);
      }
      store.abortController = abortControllerRef.current;
      store.isGenerating = isGeneratingRef.current;
    };
  }, [cancelTimers, store]);

  const stop = useCallback(() => {
    store.abortController?.abort();
    store.abortController = null;
    abortControllerRef.current = null;
    cancelTimers();

    const buffer = store.updateBuffer;
    commitResults((prev) =>
      prev.map((result, index) => {
        const update = buffer.get(index);
        return update
          ? {
              ...result,
              content: update.content,
              htmlCode: update.htmlCode,
              isLoading: false,
            }
          : { ...result, isLoading: false };
      }),
    );
    dirtyIndexesRef.current.clear();
    persistNow();

    setIsGenerating(false);
    store.isGenerating = false;
  }, [cancelTimers, commitResults, persistNow, store]);

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

      completedRef.current = new Set();
      completedDirtyRef.current = false;
      setCompletedIndexes(new Set());
      tokenRateRef.current = 0;
      totalTokensRef.current = 0;
      setTokenRate(0);
      setTotalTokens(0);
      cancelTimers();
      lastFlushAtRef.current = 0;
      dirtyIndexesRef.current.clear();
      store.updateBuffer.clear();

      const placeholders = createPlaceholders(GENERATION_COUNT);
      resultsRef.current = placeholders;
      setResults(placeholders);

      const channel = createDetailChannel();
      channelRef.current = channel;
      /*
       * 详情页挂载时会广播一次 DETAIL_READY，记下来之后只给它推它关心的那一条。
       * 这个集合刻意跨轮次保留：详情页只在挂载时报一次到，重新生成时清空的话，
       * 已经开着的那个窗口就再也收不到实时更新了。窗口关掉后最多多发几条消息，
       * 无害；真正要省掉的是「一个详情页都没开」那个常态。
       */
      channel.onmessage = (event: MessageEvent<DetailChannelMessage>) => {
        const data = event.data;
        if (data?.type === 'DETAIL_READY') {
          detailListenersRef.current.add(data.index);
        }
      };

      const closeChannel = () => {
        channelRef.current = null;
        window.setTimeout(() => channel.close(), 500);
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
            if (currentTokenRate !== undefined) {
              tokenRateRef.current = currentTokenRate;
            }
            if (currentTotalTokens !== undefined) {
              totalTokensRef.current = currentTotalTokens;
            }

            store.updateBuffer.set(index, { content, htmlCode });
            dirtyIndexesRef.current.add(index);

            if (
              (isComplete || isAiGenerationComplete(content)) &&
              !completedRef.current.has(index)
            ) {
              completedRef.current.add(index);
              completedDirtyRef.current = true;
            }

            scheduleFlush();
          },
          controller,
        );

        cancelTimers();
        lastFlushAtRef.current = 0;
        flushUpdates();

        const finalResults = mergeResultsWithBuffer(
          resultsRef.current,
          store.updateBuffer,
        );
        resultsRef.current = finalResults;
        setResults(finalResults);
        persistNow();

        channel.postMessage({ type: 'GENERATION_COMPLETE' });
        closeChannel();
      } catch (error: unknown) {
        if (!isAbortError(error)) {
          console.error('生成失败:', error);
        }
        cancelTimers();
        commitResults((prev) =>
          prev.map((result) => ({ ...result, isLoading: false })),
        );
        persistNow();
        channel.postMessage({ type: 'GENERATION_ERROR' });
        closeChannel();
      } finally {
        if (store.abortController === controller) {
          setIsGenerating(false);
          store.isGenerating = false;
          abortControllerRef.current = null;
          store.abortController = null;
        }
      }
    },
    [
      cancelTimers,
      commitResults,
      flushUpdates,
      persistNow,
      scheduleFlush,
      store,
    ],
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
      const current = resultsRef.current[index];
      if (!current || current.isLoading) return;

      /* 新窗口是从 localStorage 读的，这里必须同步写一次，不能等节流 */
      const finalResults = mergeResultsWithBuffer(
        resultsRef.current,
        store.updateBuffer,
      );
      resultsRef.current = finalResults;
      setResults(finalResults);
      persistNow();
      window.open(`/detail?index=${index}`, '_blank', 'noopener,noreferrer');
    },
    [persistNow, store],
  );

  return {
    hydrated,
    results,
    isGenerating,
    tokenRate,
    totalTokens,
    completedIndexes,
    completedTaskCount: completedIndexes.size,
    totalCount: GENERATION_COUNT,
    initialPrompt,
    generate,
    stop,
    openDetail,
  };
};
