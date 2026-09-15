'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Home, Settings, Wand2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { ChatgptPromptInput } from '@/components/business/chatgpt-prompt-input';
import { LanguageSwitcher } from '@/components/ui/language-switcher';
import { PromptOptimizeDialog } from '@/components/business/PromptOptimizeDialog';
import { ModelSettingsDialog } from '@/components/business/ModelSettingsDialog';
import { GenerationStatus } from '@/components/chat/generation-status';
import { ResultGrid } from '@/components/chat/result-grid';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { IconTooltip } from '@/components/ui/tooltip';
import { useGeneration } from '@/hooks/use-generation';
import { useIframeQueue } from '@/hooks/use-iframe-queue';

const SUGGESTION_KEYS = [
  'hotel',
  'museum',
  'cafe',
  'retroShop',
  'pomodoro',
  'saas',
] as const;

export const ChatPage = () => {
  const router = useRouter();
  const { t } = useTranslation();
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const hydratedResults = useRef(false);

  const {
    hydrated,
    results,
    isGenerating,
    tokenRate,
    totalTokens,
    completedIndexes,
    completedTaskCount,
    totalCount,
    initialPrompt,
    generate,
    stop,
    openDetail,
  } = useGeneration();

  const { iframeRenderQueue, resetQueue, hydrateQueue } =
    useIframeQueue(results);

  const [isOptimizeDialogOpen, setIsOptimizeDialogOpen] = useState(false);
  const [isSettingsDialogOpen, setIsSettingsDialogOpen] = useState(false);
  const [promptSeed, setPromptSeed] = useState('');

  useEffect(() => {
    if (!hydrated || hydratedResults.current) return;
    hydratedResults.current = true;
    hydrateQueue(results);
  }, [hydrated, hydrateQueue, results]);

  useEffect(() => {
    if (initialPrompt) setPromptSeed(initialPrompt);
  }, [initialPrompt]);

  const suggestions = useMemo(
    () => SUGGESTION_KEYS.map((key) => t(`homepage.suggestions.${key}`)),
    [t],
  );

  const handleGenerate = useCallback(
    (prompt: string) => {
      resetQueue();
      void generate(prompt);
    },
    [generate, resetQueue],
  );

  const handleSubmit = useCallback(
    (content?: string) => {
      const valueToSubmit = content || inputRef.current?.value || '';
      if (valueToSubmit.trim()) {
        handleGenerate(valueToSubmit);
      }
    },
    [handleGenerate],
  );

  const handleUseOptimizedPrompt = useCallback((optimizedPrompt: string) => {
    setPromptSeed(optimizedPrompt);
  }, []);

  return (
    <div className="flex h-screen flex-col bg-gray-50 dark:bg-[#1a1a1a]">
      <PromptOptimizeDialog
        isOpen={isOptimizeDialogOpen}
        initialPrompt={inputRef.current?.value || promptSeed || initialPrompt}
        onClose={() => setIsOptimizeDialogOpen(false)}
        onUsePrompt={handleUseOptimizedPrompt}
      />
      <ModelSettingsDialog
        isOpen={isSettingsDialogOpen}
        onClose={() => setIsSettingsDialogOpen(false)}
      />

      {/*
       * 工具栏里的每一个控件都统一成 h-9 / rounded-lg：
       * 图标按钮走 Button 的 toolbar 变体，分组用 Separator，
       * 说明文字全部从 title 换成 Tooltip（title 要悬停一秒才出、样式还跟系统走）。
       */}
      <header
        className="flex h-14 shrink-0 items-center gap-2 border-b border-gray-200
                   bg-white px-3 dark:border-white/10 dark:bg-[#212121]"
      >
        <IconTooltip label={t('chatpage.backToHome')}>
          <Button
            variant="toolbar"
            size="icon-sm"
            onClick={() => router.push('/')}
            aria-label={t('chatpage.backToHome')}
          >
            <Home />
          </Button>
        </IconTooltip>

        <div className="min-w-0 flex-1">
          <ChatgptPromptInput
            ref={inputRef}
            size="sm"
            key={promptSeed || initialPrompt}
            defaultValue={promptSeed || initialPrompt}
            placeholder={t('chatpage.inputPlaceholder')}
            onSubmit={handleSubmit}
          />
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <IconTooltip label={t('chatpage.optimizePrompt')}>
            <Button
              variant="toolbar"
              size="icon-sm"
              onClick={() => setIsOptimizeDialogOpen(true)}
              aria-label={t('chatpage.optimizePrompt')}
            >
              <Wand2 />
            </Button>
          </IconTooltip>
          <IconTooltip label={t('modelSettings.title')}>
            <Button
              variant="toolbar"
              size="icon-sm"
              onClick={() => setIsSettingsDialogOpen(true)}
              aria-label={t('modelSettings.title')}
            >
              <Settings />
            </Button>
          </IconTooltip>

          {results.length > 0 && (
            <>
              <Separator orientation="vertical" className="mx-1 h-5" />
              <GenerationStatus
                isGenerating={isGenerating}
                completedTaskCount={completedTaskCount}
                totalCount={totalCount}
                tokenRate={tokenRate}
                totalTokens={totalTokens}
                onStop={stop}
              />
            </>
          )}

          <Separator orientation="vertical" className="mx-1 h-5" />
          <LanguageSwitcher />
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-4">
        {results.length === 0 ? (
          <div className="mx-auto flex h-full max-w-4xl flex-col items-center justify-center gap-6">
            <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-300">
              {t('chatpage.selectPrompt')}
            </h2>
            <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-2">
              {suggestions.map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => handleGenerate(suggestion)}
                  className="line-clamp-2 rounded-xl border border-gray-200 bg-white px-4 py-3
                             text-left text-sm text-gray-700 transition-colors
                             hover:border-blue-400 hover:bg-blue-50
                             dark:border-gray-700 dark:bg-[#2a2a2a] dark:text-gray-200
                             dark:hover:border-blue-500 dark:hover:bg-[#343434]"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <ResultGrid
            results={results}
            iframeRenderQueue={iframeRenderQueue}
            completedIndexes={completedIndexes}
            isGenerating={isGenerating}
            onOpenDetail={openDetail}
          />
        )}
      </main>
    </div>
  );
};
