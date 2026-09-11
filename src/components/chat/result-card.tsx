'use client';

import { memo } from 'react';
import { Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { MarkdownRenderer } from '@/components/business/MarkdownRenderer';
import { DEFAULT_HTML } from '@/lib/html';
import type { GeneratedResult } from '@/types/chat';

interface ResultCardProps {
  result: GeneratedResult;
  index: number;
  queued: boolean;
  onOpen: (index: number) => void;
}

export const ResultCard = memo(function ResultCard({
  result,
  index,
  queued,
  onOpen,
}: ResultCardProps) {
  const { t } = useTranslation();

  return (
    <div
      className={`group flex flex-col rounded-lg overflow-hidden border-2 border-gray-300 dark:border-gray-600 transition-all ${
        result.isLoading
          ? 'cursor-not-allowed opacity-70'
          : 'hover:border-blue-400 hover:shadow-xl cursor-pointer'
      }`}
      onClick={() => onOpen(index)}
    >
      {result.isLoading ? (
        <div className="w-full h-[1760px] bg-white dark:bg-[#2d2d2d] flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500 mx-auto mb-2" />
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {t('chatpage.generating')}
            </p>
          </div>
        </div>
      ) : (
        <>
          <div className="relative h-[1700px] bg-white border-b-2 border-gray-300 dark:border-gray-600 overflow-auto will-change-contents">
            {queued ? (
              <iframe
                srcDoc={result.htmlCode || DEFAULT_HTML}
                className="w-full border-0 bg-white block pointer-events-none"
                title={`Preview ${index + 1}`}
                sandbox="allow-scripts"
                loading="lazy"
                style={{
                  height: '200vh',
                  contentVisibility: 'auto',
                }}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gray-50 dark:bg-[#2d2d2d]">
                <div className="text-center">
                  <Loader2 className="h-8 w-8 animate-spin text-blue-500 mx-auto mb-2" />
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {t('chatpage.preparingRender')}
                  </p>
                </div>
              </div>
            )}
          </div>
          <div
            className="h-[260px] bg-white dark:bg-[#1e1e1e] relative overflow-auto will-change-scroll"
            style={{ scrollBehavior: 'smooth', isolation: 'isolate' }}
          >
            <div className="p-4">
              <MarkdownRenderer content={result.content} />
            </div>
          </div>
        </>
      )}
    </div>
  );
});
