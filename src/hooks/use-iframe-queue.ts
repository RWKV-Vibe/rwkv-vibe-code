'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { IFRAME_BATCH_DELAY_MS, IFRAME_BATCH_SIZE } from '@/lib/constants';
import type { GeneratedResult } from '@/types/chat';

export const useIframeQueue = (results: GeneratedResult[]) => {
  const [iframeRenderQueue, setIframeRenderQueue] = useState<Set<number>>(
    new Set(),
  );
  const isBatchProcessing = useRef(false);
  const resultsRef = useRef(results);

  useEffect(() => {
    resultsRef.current = results;
  }, [results]);

  const resetQueue = useCallback(() => {
    setIframeRenderQueue(new Set());
    isBatchProcessing.current = false;
  }, []);

  const hydrateQueue = useCallback((saved: GeneratedResult[]) => {
    const readyIndexes = saved
      .map((result, index) => ({ result, index }))
      .filter(({ result }) => !result.isLoading && result.htmlCode)
      .map(({ index }) => index);
    setIframeRenderQueue(new Set(readyIndexes));
  }, []);

  useEffect(() => {
    const readyIndexes = results
      .map((result, index) => ({ result, index }))
      .filter(({ result }) => !result.isLoading && result.htmlCode)
      .map(({ index }) => index)
      .sort((a, b) => a - b);

    const notInQueue = readyIndexes.filter(
      (index) => !iframeRenderQueue.has(index),
    );
    if (notInQueue.length === 0 || isBatchProcessing.current) {
      return;
    }

    isBatchProcessing.current = true;

    const processBatch = () => {
      setIframeRenderQueue((prevQueue) => {
        const currentReadyIndexes = resultsRef.current
          .map((result, index) => ({ result, index }))
          .filter(({ result }) => !result.isLoading && result.htmlCode)
          .map(({ index }) => index)
          .sort((a, b) => a - b);

        const stillNotInQueue = currentReadyIndexes.filter(
          (index) => !prevQueue.has(index),
        );

        if (stillNotInQueue.length === 0) {
          isBatchProcessing.current = false;
          return prevQueue;
        }

        const newQueue = new Set(prevQueue);
        stillNotInQueue.slice(0, IFRAME_BATCH_SIZE).forEach((index) => {
          newQueue.add(index);
        });

        if (stillNotInQueue.length > IFRAME_BATCH_SIZE) {
          window.setTimeout(processBatch, IFRAME_BATCH_DELAY_MS);
        } else {
          isBatchProcessing.current = false;
        }

        return newQueue;
      });
    };

    processBatch();
  }, [results, iframeRenderQueue]);

  return { iframeRenderQueue, resetQueue, hydrateQueue };
};
