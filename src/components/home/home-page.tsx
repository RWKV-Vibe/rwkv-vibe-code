'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { Trash2 } from 'lucide-react';
import { ChatgptPromptInput } from '@/components/business/chatgpt-prompt-input';
import { LanguageSwitcher } from '@/components/ui/language-switcher';
import { useAuth } from '@/components/providers/auth-provider';
import {
  CHAT_INITIAL_MESSAGE_KEY,
  CHAT_SHOULD_GENERATE_KEY,
} from '@/lib/constants';
import { CHAT_PAGE_PROMPT_KEY, clearAppCache, clearChatPageCache } from '@/lib/storage';

const SUGGESTION_KEYS = [
  'hotel',
  'museum',
  'cafe',
  'retroShop',
  'pomodoro',
  'saas',
] as const;

export const HomePage = () => {
  const router = useRouter();
  const { t } = useTranslation();
  const { logout } = useAuth();
  const [inputValue, setInputValue] = useState('');

  const suggestions = SUGGESTION_KEYS.map((key) =>
    t(`homepage.suggestions.${key}`),
  );

  const handleSubmit = (content: string) => {
    if (!content.trim()) return;
    clearChatPageCache();
    sessionStorage.setItem(CHAT_SHOULD_GENERATE_KEY, '1');
    sessionStorage.setItem(CHAT_INITIAL_MESSAGE_KEY, content);
    localStorage.setItem(CHAT_PAGE_PROMPT_KEY, content);
    router.push('/chat');
    setInputValue('');
  };

  const handleClearCache = () => {
    if (confirm(t('homepage.clearCacheConfirm'))) {
      clearAppCache({
        includeAuth: true,
        includeModelSettings: true,
        includeSessionStorage: true,
      });
      logout();
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-gradient-to-b from-background to-muted/20 dark:from-[#212121] dark:to-[#212121] px-8 md:px-16 lg:px-24 xl:px-32 py-16">
      <div className="fixed top-6 right-6 z-50 flex items-center gap-4">
        <button
          onClick={handleClearCache}
          className="flex items-center justify-center gap-2 h-16 px-6 rounded-2xl
                     bg-red-600 hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600
                     text-white text-lg font-semibold shadow-lg hover:shadow-xl
                     transition-all duration-200 hover:scale-105
                     border-2 border-red-400 dark:border-red-400"
          title={t('homepage.clearCacheTitle')}
        >
          <Trash2 className="h-6 w-6" />
          <span>{t('homepage.clearCache')}</span>
        </button>
        <LanguageSwitcher />
      </div>

      <div className="w-full max-w-[2000px] mx-auto flex flex-col items-center gap-16">
        <h1 className="text-8xl md:text-9xl xl:text-[13rem] font-extrabold tracking-tight text-foreground dark:text-white text-center leading-[0.9]">
          {t('homepage.title')}
        </h1>

        <div className="w-full max-w-[1400px]">
          <ChatgptPromptInput
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onSubmit={handleSubmit}
            placeholder={t('homepage.inputPlaceholder')}
          />
        </div>

        <div className="w-full grid grid-cols-2 gap-8 xl:gap-10">
          {suggestions.map((suggestion) => (
            <button
              key={suggestion}
              onClick={() => setInputValue(suggestion)}
              className="w-full px-10 py-8 rounded-2xl text-3xl xl:text-4xl font-semibold leading-relaxed
                         bg-secondary hover:bg-secondary/85 dark:bg-[#2d3135] dark:hover:bg-[#3b4045]
                         text-secondary-foreground dark:text-white transition-all duration-200 text-left
                         border border-transparent hover:border-primary/20 dark:hover:border-white/10 shadow-lg
                         hover:shadow-xl hover:scale-[1.02] transform"
            >
              {suggestion}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
