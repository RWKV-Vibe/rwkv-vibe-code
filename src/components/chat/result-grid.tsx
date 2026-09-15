'use client';

import { memo, useEffect, useRef, useState } from 'react';
import { ResultCard } from '@/components/chat/result-card';
import { GRID_COLUMNS, GRID_ROWS_PER_SCREEN } from '@/lib/constants';
import {
  PREVIEW_FRAME_WIDTH,
  PREVIEW_VIEWPORT_HEIGHT,
  PREVIEW_VIEWPORT_HEIGHT_MAX,
  PREVIEW_VIEWPORT_HEIGHT_MIN,
} from '@/lib/preview';
import type { GeneratedResult } from '@/types/chat';

interface ResultGridProps {
  results: GeneratedResult[];
  iframeRenderQueue: Set<number>;
  /** 已经生成完的下标；卡片据此决定要不要再做最后一次重绘 */
  completedIndexes: Set<number>;
  isGenerating: boolean;
  onOpenDetail: (index: number) => void;
}

const GAP_PX = 16;

/** 窄屏自动降列，保证单列不会窄到读不出内容 */
const columnsForWidth = (width: number): number => {
  if (width < 640) return 1;
  if (width < 1024) return 2;
  if (width < 1440) return 3;
  return GRID_COLUMNS;
};

const clamp = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), max);

interface GridMetrics {
  columns: number;
  /** iframe 从 1280px 逻辑宽度缩到实际列宽的比例 */
  scale: number;
  /** iframe 的逻辑视口高度，由"一屏两行"反推 */
  viewportHeight: number;
}

/**
 * 一个 ResizeObserver 同时算出列数、缩放比和卡片高度：
 * - 宽度决定列数和缩放比（iframe 始终按 1280px 桌面视口渲染）；
 * - 可视区高度决定每行多高，让一屏正好停在 GRID_ROWS_PER_SCREEN 行。
 */
const useGridMetrics = () => {
  const gridRef = useRef<HTMLDivElement>(null);
  const [metrics, setMetrics] = useState<GridMetrics>({
    columns: GRID_COLUMNS,
    scale: 0,
    viewportHeight: PREVIEW_VIEWPORT_HEIGHT,
  });

  useEffect(() => {
    const grid = gridRef.current;
    /*
     * 行高要按"一屏能看到多少"算，而网格自己会被 24 张卡撑到好几屏高，
     * 所以量的是外层滚动容器（<main>）的可视高度，再去掉它的上下内边距。
     */
    const viewport = grid?.parentElement;
    if (!grid || !viewport) return;

    const update = () => {
      const width = grid.clientWidth;
      if (width <= 0) return;

      const columns = columnsForWidth(width);
      const columnWidth = (width - GAP_PX * (columns - 1)) / columns;
      const scale = columnWidth / PREVIEW_FRAME_WIDTH;

      const { paddingTop, paddingBottom } = getComputedStyle(viewport);
      const visibleHeight =
        viewport.clientHeight -
        (parseFloat(paddingTop) || 0) -
        (parseFloat(paddingBottom) || 0);
      const rowHeight =
        (visibleHeight - GAP_PX * (GRID_ROWS_PER_SCREEN - 1)) /
        GRID_ROWS_PER_SCREEN;

      setMetrics({
        columns,
        scale: scale > 0 ? scale : 0,
        viewportHeight:
          scale > 0 && rowHeight > 0
            ? clamp(
                Math.round(rowHeight / scale),
                PREVIEW_VIEWPORT_HEIGHT_MIN,
                PREVIEW_VIEWPORT_HEIGHT_MAX,
              )
            : PREVIEW_VIEWPORT_HEIGHT,
      });
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(grid);
    observer.observe(viewport);
    return () => observer.disconnect();
  }, []);

  return { gridRef, ...metrics };
};

export const ResultGrid = memo(function ResultGrid({
  results,
  iframeRenderQueue,
  completedIndexes,
  isGenerating,
  onOpenDetail,
}: ResultGridProps) {
  const { gridRef, columns, scale, viewportHeight } = useGridMetrics();

  return (
    <div
      ref={gridRef}
      className="grid w-full"
      style={{
        gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
        gap: GAP_PX,
        ['--preview-scale' as string]: String(scale),
        ['--preview-viewport-height' as string]: `${viewportHeight}px`,
      }}
    >
      {results.map((result, index) => (
        <ResultCard
          key={result.id}
          result={result}
          index={index}
          viewportHeight={viewportHeight}
          queued={iframeRenderQueue.has(index)}
          /* 整轮结束后一律按「完成」处理，保证没被标记完成的那几条也能收尾重绘一次 */
          isComplete={!isGenerating || completedIndexes.has(index)}
          onOpen={onOpenDetail}
        />
      ))}
    </div>
  );
});
