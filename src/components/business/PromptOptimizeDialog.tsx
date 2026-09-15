'use client';

import { useState, useRef, useCallback, useEffect, memo, useMemo } from 'react';
import { Wand2, Copy, X, Loader2, Check, Square } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { AIService } from '@/lib/ai';
import { OPTIMIZE_COUNT } from '@/lib/constants';

interface PromptOptimizeDialogProps {
  isOpen: boolean;
  initialPrompt: string;
  onClose: () => void;
  onUsePrompt: (prompt: string) => void;
}

interface OptimizedResult {
  id: string;
  content: string;
  isLoading: boolean;
}

export const PromptOptimizeDialog = memo(
  ({
    isOpen,
    initialPrompt,
    onClose,
    onUsePrompt,
  }: PromptOptimizeDialogProps) => {
    const { t } = useTranslation();
    const [optimizeInput, setOptimizeInput] = useState(initialPrompt);
    const [optimizedResults, setOptimizedResults] = useState<OptimizedResult[]>(
      [],
    );
    const [isOptimizing, setIsOptimizing] = useState(false);
    const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
    const optimizeAbortControllerRef = useRef<AbortController | null>(null);

    useEffect(() => {
      if (isOpen) {
        setOptimizeInput(initialPrompt);
        setOptimizedResults([]);
        setIsOptimizing(false);
        setCopiedIndex(null);
      }
    }, [isOpen, initialPrompt]);

    const handleStartOptimize = useCallback(() => {
      if (!optimizeInput.trim()) return;

      setIsOptimizing(true);
      const placeholders: OptimizedResult[] = Array.from(
        { length: OPTIMIZE_COUNT },
        (_, i) => ({
          id: `optimize-${i}`,
          content: '',
          isLoading: true,
        }),
      );
      setOptimizedResults(placeholders);

      const controller = new AbortController();
      optimizeAbortControllerRef.current = controller;

      AIService.optimizePrompt(
        optimizeInput,
        OPTIMIZE_COUNT,
        (index, content) => {
          setOptimizedResults((prev) =>
            prev.map((result, i) =>
              i === index ? { ...result, content, isLoading: false } : result,
            ),
          );
        },
        controller,
      )
        .then(() => setIsOptimizing(false))
        .catch((error: unknown) => {
          if (!(error instanceof Error && error.name === 'AbortError')) {
            console.error('优化失败:', error);
          }
          setIsOptimizing(false);
          setOptimizedResults((prev) =>
            prev.map((result) => ({ ...result, isLoading: false })),
          );
        });
    }, [optimizeInput]);

    const handleStopOptimize = useCallback(() => {
      optimizeAbortControllerRef.current?.abort();
      optimizeAbortControllerRef.current = null;
      setIsOptimizing(false);
      setOptimizedResults((prev) =>
        prev.map((result) => ({ ...result, isLoading: false })),
      );
    }, []);

    const handleClose = useCallback(() => {
      optimizeAbortControllerRef.current?.abort();
      setOptimizedResults([]);
      setIsOptimizing(false);
      setCopiedIndex(null);
      onClose();
    }, [onClose]);

    const runningTaskCount = useMemo(
      () => optimizedResults.filter((result) => result.isLoading).length,
      [optimizedResults],
    );

    const completedTaskCount = useMemo(
      () =>
        optimizedResults.filter((result) => !result.isLoading && result.content)
          .length,
      [optimizedResults],
    );

    const handleCopyOptimized = useCallback(
      async (index: number, content: string) => {
        try {
          await navigator.clipboard.writeText(content);
          setCopiedIndex(index);
          setTimeout(() => setCopiedIndex(null), 2000);
        } catch (error) {
          console.error('复制失败:', error);
        }
      },
      [],
    );

    const handleUseOptimized = useCallback(
      (content: string) => {
        onUsePrompt(content);
        handleClose();
      },
      [onUsePrompt, handleClose],
    );

    if (!isOpen) return null;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
        <div className="bg-white dark:bg-[#2d2d2d] rounded-2xl shadow-2xl w-full max-w-5xl h-[72vh] overflow-hidden flex flex-col">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
            <div className="flex items-center gap-2">
              <Wand2 className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">
                {t('promptOptimize.title')}
              </h2>
            </div>
            <button
              onClick={handleClose}
              className="rounded-lg p-2 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <X className="h-4 w-4 text-gray-500 dark:text-gray-400" />
            </button>
          </div>

          <div className="flex-1 flex flex-col px-5 py-4 min-h-0 overflow-hidden">
            <div className="mb-4 flex-shrink-0">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                    {t('promptOptimize.inputLabel')}
                  </h3>
                  {optimizedResults.length > 0 && (
                    <div className="flex items-center gap-1.5 px-2.5 py-1 bg-gray-100 dark:bg-gray-800 rounded-lg">
                      {isOptimizing ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin text-purple-600 dark:text-purple-400" />
                          <span className="text-xs font-medium text-purple-600 dark:text-purple-400">
                            {t('promptOptimize.generating', {
                              running: runningTaskCount,
                              total: OPTIMIZE_COUNT,
                            })}
                          </span>
                        </>
                      ) : (
                        <>
                          <Check className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
                          <span className="text-xs font-medium text-green-600 dark:text-green-400">
                            {t('promptOptimize.completed', {
                              completed: completedTaskCount,
                              total: OPTIMIZE_COUNT,
                            })}
                          </span>
                        </>
                      )}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {isOptimizing && (
                    <button
                      onClick={handleStopOptimize}
                      className="flex h-9 items-center gap-1.5 rounded-xl px-3 text-sm font-medium
                                 bg-red-600 hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600
                                 text-white transition-colors flex-shrink-0"
                    >
                      <Square className="h-4 w-4" />
                      {t('promptOptimize.stop')}
                    </button>
                  )}
                  <button
                    onClick={handleStartOptimize}
                    disabled={!optimizeInput.trim() || isOptimizing}
                    className="flex h-9 items-center gap-1.5 rounded-xl px-3 text-sm font-medium
                               bg-purple-600 hover:bg-purple-700 dark:bg-purple-500 dark:hover:bg-purple-600
                               text-white transition-colors
                               disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                  >
                    <Wand2 className="h-4 w-4" />
                    {isOptimizing
                      ? t('promptOptimize.generatingButton')
                      : t('promptOptimize.generate')}
                  </button>
                </div>
              </div>
              <textarea
                value={optimizeInput}
                onChange={(e) => setOptimizeInput(e.target.value)}
                placeholder={t('promptOptimize.placeholder')}
                rows={3}
                className="w-full p-3 bg-gray-50 dark:bg-gray-800 rounded-xl
                           text-gray-900 dark:text-gray-200 text-sm leading-relaxed
                           border border-gray-300 dark:border-gray-600
                           focus:border-purple-500 dark:focus:border-purple-400
                           focus:outline-none resize-none
                           placeholder:text-gray-400 dark:placeholder:text-gray-500"
              />
            </div>

            <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex-shrink-0">
                {t('promptOptimize.resultsLabel')}
              </h3>
              {optimizedResults.length === 0 ? (
                <div className="flex-1 flex items-center justify-center bg-gray-50 dark:bg-gray-800 rounded-xl border border-dashed border-gray-300 dark:border-gray-600 overflow-hidden">
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {t('promptOptimize.empty')}
                  </p>
                </div>
              ) : (
                <div className="flex-1 grid grid-cols-5 gap-3 overflow-hidden">
                  {optimizedResults.map((result, index) => (
                    <div
                      key={result.id}
                      className="relative group bg-purple-50 dark:bg-purple-900/20 rounded-xl border border-purple-300 dark:border-purple-700 overflow-hidden hover:shadow-md transition-shadow h-full flex flex-col"
                    >
                      {result.isLoading ? (
                        <div className="flex-1 flex items-center justify-center p-4">
                          <Loader2 className="h-6 w-6 animate-spin text-purple-600 dark:text-purple-400" />
                        </div>
                      ) : (
                        <>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              void handleCopyOptimized(index, result.content);
                            }}
                            className="absolute top-2 right-2 p-1.5 rounded-md
                                     bg-white/90 dark:bg-gray-800/90 hover:bg-white dark:hover:bg-gray-800
                                     border border-gray-300 dark:border-gray-600
                                     opacity-0 group-hover:opacity-100 transition-opacity
                                     shadow-sm z-10"
                            title={t('promptOptimize.copy')}
                          >
                            {copiedIndex === index ? (
                              <Check className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
                            ) : (
                              <Copy className="h-3.5 w-3.5 text-gray-700 dark:text-gray-300" />
                            )}
                          </button>

                          <div
                            className="flex-1 p-3 overflow-y-auto cursor-pointer scrollbar-thin scrollbar-thumb-purple-300 scrollbar-track-transparent hover:scrollbar-thumb-purple-400"
                            onClick={() => handleUseOptimized(result.content)}
                            style={{ scrollbarWidth: 'thin' }}
                          >
                            <p className="text-gray-900 dark:text-gray-200 text-xs leading-relaxed whitespace-pre-wrap">
                              {result.content || t('chatpage.generating')}
                            </p>
                          </div>

                          <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-purple-100 dark:from-purple-900/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                            <p className="text-xs font-medium text-purple-900 dark:text-purple-100 text-center">
                              {t('promptOptimize.useThis')}
                            </p>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-gray-200 dark:border-gray-700 flex-shrink-0">
            <button
              onClick={handleClose}
              className="h-10 rounded-xl px-4 text-sm font-medium
                         bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600
                         text-gray-900 dark:text-gray-100
                         transition-colors"
            >
              {t('promptOptimize.close')}
            </button>
          </div>
        </div>
      </div>
    );
  },
);

PromptOptimizeDialog.displayName = 'PromptOptimizeDialog';
