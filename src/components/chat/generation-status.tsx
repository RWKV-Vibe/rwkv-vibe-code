'use client';

import { memo } from 'react';
import { Check, Loader2, Square } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { IconTooltip } from '@/components/ui/tooltip';

interface GenerationStatusProps {
  isGenerating: boolean;
  completedTaskCount: number;
  totalCount: number;
  tokenRate: number;
  totalTokens: number;
  onStop: () => void;
}

export const GenerationStatus = memo(function GenerationStatus({
  isGenerating,
  completedTaskCount,
  totalCount,
  tokenRate,
  totalTokens,
  onStop,
}: GenerationStatusProps) {
  const { t } = useTranslation();

  return (
    <div className="flex shrink-0 items-center gap-1">
      {/*
       * 原来是蓝色计数条 + 紫色速率条两块撞色的胶囊，跟旁边的灰色图标按钮各说各话。
       * 这里合成一条中性状态条：底色只做衬托，状态全交给左边那个图标去表达，
       * 速率降级成次要信息挂在同一条里，不再单独占一块颜色。
       */}
      <IconTooltip
        label={t('chatpage.totalTokens', {
          count: totalTokens.toLocaleString(),
        })}
      >
        <Badge variant="muted" size="lg" className="gap-2">
          <span className="flex items-center gap-1.5">
            {isGenerating ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-600 dark:text-blue-400" />
            ) : (
              <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
            )}
            <span className="font-medium text-gray-700 dark:text-gray-200">
              {completedTaskCount}/{totalCount}
            </span>
          </span>

          {isGenerating && tokenRate > 0 && (
            /* 窄屏整段藏掉——连同分隔线，否则会留下一根没有下文的竖线 */
            <span className="hidden items-center gap-2 lg:flex">
              <span className="h-3.5 w-px bg-gray-300 dark:bg-white/15" />
              <span className="text-gray-500 dark:text-gray-400">
                {t('chatpage.tokenRate', { rate: tokenRate.toLocaleString() })}
              </span>
            </span>
          )}
        </Badge>
      </IconTooltip>

      {isGenerating && (
        <IconTooltip label={t('chatpage.stopGenerate')}>
          <Button
            variant="destructive-soft"
            size="icon-sm"
            onClick={onStop}
            aria-label={t('chatpage.stopGenerate')}
          >
            <Square className="fill-current" />
          </Button>
        </IconTooltip>
      )}
    </div>
  );
});
