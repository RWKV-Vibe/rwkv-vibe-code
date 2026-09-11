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
import { useGeneration } from '@/hooks/use-generation';
import { useIframeQueue } from '@/hooks/use-iframe-queue';
import {
  isLayoutMode,
  LAYOUT_MODES,
  type LayoutMode,
} from '@/lib/chat-sync';
import { CHAT_LAYOUT_MODE_KEY } from '@/lib/constants';

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
  const hydratedLayout = useRef(false);

  const {
    hydrated,
    results,
    isGenerating,
    tokenRate,
    totalTokens,
    completedTaskCount,
    totalCount,
    initialPrompt,
    generate,
    stop,
    openDetail,
  } = useGeneration();

  const { iframeRenderQueue, resetQueue, hydrateQueue } =
    useIframeQueue(results);

  const [layoutMode, setLayoutMode] = useState<LayoutMode>('8x3');
  const [isOptimizeDialogOpen, setIsOptimizeDialogOpen] = useState(false);
  const [isSettingsDialogOpen, setIsSettingsDialogOpen] = useState(false);
  const [promptSeed, setPromptSeed] = useState('');

  useEffect(() => {
    if (!hydrated || hydratedLayout.current) return;
    hydratedLayout.current = true;
    const saved = localStorage.getItem(CHAT_LAYOUT_MODE_KEY);
    if (isLayoutMode(saved)) setLayoutMode(saved);
    hydrateQueue(results);
  }, [hydrated, hydrateQueue, results]);

  useEffect(() => {
    if (initialPrompt) setPromptSeed(initialPrompt);
  }, [initialPrompt]);

  useEffect(() => {
    if (hydrated) {
      localStorage.setItem(CHAT_LAYOUT_MODE_KEY, layoutMode);
    }
  }, [hydrated, layoutMode]);

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
    <div className="flex flex-col h-screen bg-background dark:bg-[#1e1e1e]">
      <div className="fixed top-6 left-6 z-50">
        <button
          onClick={() => router.push('/')}
          className="flex items-center justify-center h-16 w-16 rounded-full
                     bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600
                     text-white shadow-lg hover:shadow-xl
                     transition-all duration-200 hover:scale-105
                     border-2 border-blue-400 dark:border-blue-400"
          title={t('chatpage.backToHome')}
        >
          <Home className="h-6 w-6" />
        </button>
      </div>

      <div className="fixed top-6 right-6 z-50 flex items-center justify-end gap-4 flex-wrap max-w-[95vw]">
        <div
          className="flex items-center gap-2 rounded-3xl px-4 py-4
                     bg-white dark:bg-gray-800
                     border-4 border-gray-200 dark:border-gray-600
                     shadow-2xl"
        >
          {LAYOUT_MODES.map((mode) => (
            <button
              key={mode}
              onClick={() => setLayoutMode(mode)}
              className={`px-6 py-4 rounded-2xl text-2xl font-bold transition-all duration-200 border-2 ${
                layoutMode === mode
                  ? 'bg-blue-600 dark:bg-blue-500 text-white border-blue-500 dark:border-blue-400 shadow-lg'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 border-gray-200 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
              title={`${t('chatpage.layoutMode')}: ${mode}`}
            >
              {mode}
            </button>
          ))}
        </div>
        <button
          onClick={() => setIsSettingsDialogOpen(true)}
          className="flex items-center justify-center h-[104px] w-[104px] rounded-3xl
                     bg-white dark:bg-gray-800
                     hover:bg-gray-50 dark:hover:bg-gray-700
                     text-gray-900 dark:text-white
                     shadow-2xl hover:shadow-3xl
                     transition-all duration-200 hover:scale-105
                     border-4 border-gray-200 dark:border-gray-600
                     hover:border-gray-300 dark:hover:border-gray-500"
          title={t('modelSettings.title')}
          aria-label={t('modelSettings.title')}
        >
          <Settings className="h-14 w-14" />
        </button>
        <LanguageSwitcher />
      </div>

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

      <div className="border-b border-border dark:border-gray-700 bg-white dark:bg-[#252525]">
        <div className="max-w-[2400px] mx-auto p-6">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <ChatgptPromptInput
                ref={inputRef}
                key={promptSeed || initialPrompt}
                defaultValue={promptSeed || initialPrompt}
                placeholder={t('chatpage.inputPlaceholder')}
                onSubmit={handleSubmit}
              />
            </div>

            <button
              onClick={() => setIsOptimizeDialogOpen(true)}
              className="flex items-center justify-center h-16 w-16 rounded-full
                         bg-purple-600 hover:bg-purple-700 dark:bg-purple-500 dark:hover:bg-purple-600
                         text-white shadow-lg hover:shadow-xl
                         transition-all duration-200 hover:scale-105
                         border-2 border-purple-400 dark:border-purple-400"
              title={t('chatpage.optimizePrompt')}
            >
              <Wand2 className="h-6 w-6" />
            </button>

            {results.length > 0 && (
              <GenerationStatus
                isGenerating={isGenerating}
                completedTaskCount={completedTaskCount}
                totalCount={totalCount}
                tokenRate={tokenRate}
                totalTokens={totalTokens}
                onStop={stop}
              />
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 bg-gray-50 dark:bg-[#1a1a1a]">
        {results.length === 0 ? (
          <div className="max-w-[1400px] mx-auto flex flex-col items-center justify-center h-full gap-8">
            <h2 className="text-4xl font-bold text-gray-700 dark:text-gray-300">
              {t('chatpage.selectPrompt')}
            </h2>
            <div className="w-full grid grid-cols-2 gap-6">
              {suggestions.map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => handleGenerate(suggestion)}
                  className="w-full px-8 py-6 rounded-xl text-2xl font-semibold
                             bg-white dark:bg-[#2d3135] hover:bg-gray-50 dark:hover:bg-[#3b4045]
                             text-gray-700 dark:text-white transition-all duration-200
                             border-2 border-gray-200 dark:border-gray-700 hover:border-blue-400 dark:hover:border-blue-500
                             shadow-lg hover:shadow-xl hover:scale-[1.02] transform"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <ResultGrid
            results={results}
            layoutMode={layoutMode}
            iframeRenderQueue={iframeRenderQueue}
            onOpenDetail={openDetail}
          />
        )}
      </div>
    </div>
  );
};
