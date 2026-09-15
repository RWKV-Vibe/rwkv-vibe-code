'use client';

import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { PREVIEW_REFRESH_INTERVAL_MS } from '@/lib/constants';
import { DEFAULT_HTML } from '@/lib/html';
import {
  isPreviewHeightMessage,
  postPreviewScroll,
  PREVIEW_FRAME_WIDTH,
  withHeightReporter,
} from '@/lib/preview';
import type { GeneratedResult } from '@/types/chat';

interface ResultCardProps {
  result: GeneratedResult;
  index: number;
  /** iframe 的逻辑视口高度，由网格按"一屏两行"算出来 */
  viewportHeight: number;
  queued: boolean;
  /** 这一条已经生成完了（或整轮生成已经结束）：可以做最后一次重绘 */
  isComplete: boolean;
  onOpen: (index: number) => void;
}

/**
 * 决定 iframe 什么时候真的重新加载。
 *
 * 换 srcDoc 不是「更新一下内容」，而是整份文档重新解析、脚本重新执行 ——
 * 生成出来的页面普遍挂着 Tailwind CDN，每次重载都要在 iframe 里重跑一遍
 * JIT 编译。24 个 iframe 跟着每个 chunk 重载，主线程当然卡死。
 *
 * 所以这里把「数据更新」和「画面重绘」解耦，只在三种时机提交快照：
 *   - 首帧：第一次拿到可渲染的 HTML，立刻出画，不等；
 *   - 收尾：这一条生成完，保证最终形态一定被渲染出来；
 *   - 中途：只有卡片在视口内才刷，且最快 PREVIEW_REFRESH_INTERVAL_MS 一次。
 *
 * 一屏只露两行、总共六行，等于流式期间有四分之三的卡片完全不重绘。
 */
const useCommittedHtml = (
  html: string,
  isReady: boolean,
  isComplete: boolean,
  isVisible: boolean,
  isLoading: boolean,
) => {
  const [committedHtml, setCommittedHtml] = useState('');
  const lastCommitAtRef = useRef(0);

  /* 重新生成时丢掉上一轮的快照，让新内容重新享受「首帧立刻出画」 */
  useEffect(() => {
    if (isLoading) {
      setCommittedHtml('');
      lastCommitAtRef.current = 0;
    }
  }, [isLoading]);

  useEffect(() => {
    if (!isReady || html === committedHtml) return;

    const commit = () => {
      lastCommitAtRef.current = Date.now();
      setCommittedHtml(html);
    };

    if (!committedHtml || isComplete) {
      commit();
      return;
    }
    if (!isVisible) return;

    const wait =
      PREVIEW_REFRESH_INTERVAL_MS - (Date.now() - lastCommitAtRef.current);
    if (wait <= 0) {
      commit();
      return;
    }
    const timer = window.setTimeout(commit, wait);
    return () => window.clearTimeout(timer);
  }, [html, committedHtml, isComplete, isReady, isVisible]);

  return committedHtml;
};

/** 卡片是否在视口内（带一屏左右的预热余量） */
const useIsVisible = (ref: React.RefObject<HTMLElement | null>) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    if (typeof IntersectionObserver === 'undefined') {
      setIsVisible(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => setIsVisible(entries.some((entry) => entry.isIntersecting)),
      { rootMargin: '240px 0px' },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [ref]);

  return isVisible;
};

export const ResultCard = memo(function ResultCard({
  result,
  index,
  viewportHeight,
  queued,
  isComplete,
  onOpen,
}: ResultCardProps) {
  const { t } = useTranslation();
  const frameRef = useRef<HTMLIFrameElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollTopRef = useRef(0);
  const [contentHeight, setContentHeight] = useState(viewportHeight);

  const isReady = !result.isLoading && queued;
  const isVisible = useIsVisible(containerRef);
  const committedHtml = useCommittedHtml(
    result.htmlCode || DEFAULT_HTML,
    isReady,
    isComplete,
    isVisible,
    result.isLoading,
  );

  const srcDoc = useMemo(
    () => (committedHtml ? withHeightReporter(committedHtml, result.id) : ''),
    [committedHtml, result.id],
  );

  const showFrame = isReady && Boolean(srcDoc);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (!isPreviewHeightMessage(event.data, result.id)) return;
      setContentHeight(Math.max(event.data.height, viewportHeight));
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [result.id, viewportHeight]);

  /* 内容重新生成时回到顶部 */
  useEffect(() => {
    scrollTopRef.current = 0;
  }, [srcDoc]);

  /**
   * iframe 带 pointer-events-none（否则会吞掉点击、进不去详情页），
   * 所以滚轮事件在卡片上接，再把目标位置转发给 iframe 内部的页面。
   * 到顶 / 到底时不拦截，让滚动自然传回外层网格。
   */
  const handleWheel = useCallback(
    (event: WheelEvent) => {
      const maxScroll = contentHeight - viewportHeight;
      if (maxScroll <= 0) return;

      const current = scrollTopRef.current;
      const atTop = current <= 0;
      const atBottom = current >= maxScroll;
      if ((event.deltaY < 0 && atTop) || (event.deltaY > 0 && atBottom)) return;

      event.preventDefault();
      const next = Math.min(Math.max(current + event.deltaY, 0), maxScroll);
      scrollTopRef.current = next;
      postPreviewScroll(frameRef.current, result.id, next);
    },
    [contentHeight, result.id, viewportHeight],
  );

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !showFrame) return;
    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleWheel);
  }, [handleWheel, showFrame]);

  return (
    <div
      ref={containerRef}
      role="button"
      tabIndex={result.isLoading ? -1 : 0}
      onClick={() => !result.isLoading && onOpen(index)}
      onKeyDown={(event) => {
        if (!result.isLoading && (event.key === 'Enter' || event.key === ' ')) {
          event.preventDefault();
          onOpen(index);
        }
      }}
      style={{
        height: 'calc(var(--preview-viewport-height) * var(--preview-scale))',
      }}
      className={`group relative overflow-hidden rounded-2xl bg-white
                  ring-1 ring-gray-200 transition-[transform,box-shadow] duration-200
                  dark:bg-[#232323] dark:ring-white/10 ${
                    result.isLoading
                      ? 'cursor-not-allowed opacity-70'
                      : `cursor-pointer shadow-[0_1px_3px_rgba(0,0,0,0.06)]
                         hover:-translate-y-1 hover:shadow-[0_12px_32px_rgba(0,0,0,0.14)]
                         focus-visible:outline-none focus-visible:ring-2
                         focus-visible:ring-blue-500 dark:hover:shadow-[0_12px_32px_rgba(0,0,0,0.5)]`
                  }`}
    >
      {showFrame ? (
        <iframe
          ref={frameRef}
          srcDoc={srcDoc}
          className="pointer-events-none absolute left-0 top-0 block border-0 bg-white"
          style={{
            width: PREVIEW_FRAME_WIDTH,
            height: 'var(--preview-viewport-height)',
            transform: 'scale(var(--preview-scale))',
            transformOrigin: 'top left',
          }}
          title={t('detailpage.solution', { number: index + 1 })}
          sandbox="allow-scripts"
          loading="lazy"
          tabIndex={-1}
        />
      ) : (
        <div className="flex h-full w-full flex-col items-center justify-center gap-3">
          <Loader2 className="h-7 w-7 animate-spin text-blue-500" />
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {result.isLoading
              ? t('chatpage.generating')
              : t('chatpage.preparingRender')}
          </p>
        </div>
      )}

      {/* 编号角标：默认低调，hover 时跟着操作条一起点亮 */}
      <span
        className="pointer-events-none absolute left-3 top-3 z-10 rounded-full
                   bg-white/80 px-2.5 py-1 text-xs font-semibold tabular-nums
                   text-gray-700 shadow-sm ring-1 ring-black/5 backdrop-blur-md
                   transition-colors group-hover:bg-blue-600 group-hover:text-white
                   group-hover:ring-blue-600 dark:bg-black/50 dark:text-gray-100
                   dark:ring-white/10"
      >
        {index + 1}
      </span>

      {!result.isLoading && (
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-center
                     bg-linear-to-t from-black/70 via-black/25 to-transparent pb-3 pt-12
                     opacity-0 transition-opacity duration-200 group-hover:opacity-100"
        >
          <span className="text-sm font-medium text-white drop-shadow">
            {t('detailpage.solution', { number: index + 1 })}
          </span>
        </div>
      )}
    </div>
  );
});
