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
import { SUGGESTIONS } from '@/lib/suggestions';

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
    () =>
      SUGGESTIONS.map(({ key, Icon }) => ({
        key,
        Icon,
        label: t(`homepage.suggestions.${key}.label`),
        prompt: t(`homepage.suggestions.${key}.prompt`),
      })),
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
          <div className="mx-auto flex min-h-full max-w-4xl flex-col justify-center gap-6 py-6">
            <h2 className="text-center text-xl font-semibold text-gray-700 dark:text-gray-300">
              {t('chatpage.selectPrompt')}
            </h2>
            <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-2">
              {suggestions.map(({ key, Icon, label, prompt }) => (
                <button
                  key={key}
                  onClick={() => handleGenerate(prompt)}
                  title={prompt}
                  className="group flex h-full items-start gap-3 rounded-xl border border-gray-200
                             bg-white p-3.5 text-left transition duration-200
                             hover:-translate-y-0.5 hover:border-blue-400 hover:shadow-lg
                             hover:shadow-blue-500/5 focus-visible:outline-none
                             focus-visible:ring-2 focus-visible:ring-blue-500
                             dark:border-white/10 dark:bg-white/[0.04]
                             dark:hover:border-blue-400/40 dark:hover:bg-white/[0.07]"
                >
                  <span
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg
                               bg-blue-50 text-blue-600 transition-colors
                               group-hover:bg-blue-600 group-hover:text-white
                               dark:bg-blue-500/10 dark:text-blue-400
                               dark:group-hover:bg-blue-500 dark:group-hover:text-white"
                  >
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-gray-900 dark:text-gray-100">
                      {label}
                    </span>
                    <span className="mt-1 line-clamp-2 text-xs leading-relaxed text-gray-500 dark:text-gray-400">
                      {prompt}
                    </span>
                  </span>
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
