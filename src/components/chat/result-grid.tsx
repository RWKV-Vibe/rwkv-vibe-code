'use client';

import { memo } from 'react';
import { ResultCard } from '@/components/chat/result-card';
import { LAYOUT_MODE_COLUMNS, type LayoutMode } from '@/lib/chat-sync';
import type { GeneratedResult } from '@/types/chat';

interface ResultGridProps {
  results: GeneratedResult[];
  layoutMode: LayoutMode;
  iframeRenderQueue: Set<number>;
  onOpenDetail: (index: number) => void;
}

export const ResultGrid = memo(function ResultGrid({
  results,
  layoutMode,
  iframeRenderQueue,
  onOpenDetail,
}: ResultGridProps) {
  return (
    <div
      className="grid w-full gap-4"
      style={{
        gridTemplateColumns: `repeat(${LAYOUT_MODE_COLUMNS[layoutMode]}, minmax(0, 1fr))`,
      }}
    >
      {results.map((result, index) => (
        <ResultCard
          key={result.id}
          result={result}
          index={index}
          queued={iframeRenderQueue.has(index)}
          onOpen={onOpenDetail}
        />
      ))}
    </div>
  );
});
