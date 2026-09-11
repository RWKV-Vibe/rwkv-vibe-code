'use client';

import { memo } from 'react';
import { Check, Loader2, Square } from 'lucide-react';
import { useTranslation } from 'react-i18next';

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
    <div className="flex items-center gap-6">
      <div className="flex items-center gap-4 px-8 py-4 bg-gray-100 dark:bg-gray-800 rounded-full">
        {isGenerating ? (
          <Loader2 className="h-10 w-10 animate-spin text-blue-600 dark:text-blue-400" />
        ) : (
          <Check className="h-10 w-10 text-green-600 dark:text-green-400" />
        )}
        <span
          className={`text-4xl font-bold ${
            isGenerating
              ? 'text-blue-600 dark:text-blue-400'
              : 'text-green-600 dark:text-green-400'
          }`}
        >
          {completedTaskCount}/{totalCount}
        </span>
      </div>

      {isGenerating && tokenRate > 0 && (
        <div className="flex flex-col items-center gap-1 px-8 py-4 bg-purple-100 dark:bg-purple-900/30 rounded-full">
          <span className="text-3xl font-bold text-purple-600 dark:text-purple-400">
            {t('chatpage.tokenRate', { rate: tokenRate.toLocaleString() })}
          </span>
          <span className="text-xs text-purple-600 dark:text-purple-400 font-medium">
            {t('chatpage.totalTokens', {
              count: totalTokens.toLocaleString(),
            })}
          </span>
        </div>
      )}

      {isGenerating && (
        <button
          onClick={onStop}
          className="flex items-center justify-center h-20 w-20 rounded-full
                     bg-red-600 hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600
                     text-white shadow-lg hover:shadow-xl
                     transition-all duration-200 hover:scale-105
                     border-2 border-red-400 dark:border-red-400"
          title={t('chatpage.stopGenerate')}
        >
          <Square className="h-10 w-10" />
        </button>
      )}
    </div>
  );
});
