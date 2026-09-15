'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import {
  Building2,
  Coffee,
  Gamepad2,
  Landmark,
  LayoutDashboard,
  Timer,
  Trash2,
  type LucideIcon,
} from 'lucide-react';
import { ChatgptPromptInput } from '@/components/business/chatgpt-prompt-input';
import { LanguageSwitcher } from '@/components/ui/language-switcher';
import { useAuth } from '@/components/providers/auth-provider';
import {
  CHAT_INITIAL_MESSAGE_KEY,
  CHAT_SHOULD_GENERATE_KEY,
} from '@/lib/constants';
import {
  CHAT_PAGE_PROMPT_KEY,
  clearAppCache,
  clearChatPageCache,
} from '@/lib/storage';

/** 每条示例配一个图标，长文案裁成三行后仍能一眼分辨是哪一类 */
const SUGGESTIONS: ReadonlyArray<{ key: string; Icon: LucideIcon }> = [
  { key: 'hotel', Icon: Building2 },
  { key: 'museum', Icon: Landmark },
  { key: 'cafe', Icon: Coffee },
  { key: 'retroShop', Icon: Gamepad2 },
  { key: 'pomodoro', Icon: Timer },
  { key: 'saas', Icon: LayoutDashboard },
];

export const HomePage = () => {
  const router = useRouter();
  const { t } = useTranslation();
  const { logout } = useAuth();
  const [inputValue, setInputValue] = useState('');

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
    <div className="flex min-h-screen flex-col bg-gray-50 dark:bg-[#212121]">
      {/*
       * 顶栏走正常文档流，不再用 fixed —— 原来主体是垂直居中的，
       * 窗口一矮 fixed 的按钮就压在示例列表上面。
       */}
      <header className="flex h-14 shrink-0 items-center justify-between px-4 sm:px-6">
        <span className="text-sm font-semibold tracking-tight text-gray-900 dark:text-white">
          RWKV <span className="text-blue-600 dark:text-blue-400">Vibe Code</span>
        </span>

        <div className="flex items-center gap-1">
          <button
            onClick={handleClearCache}
            className="flex h-10 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium
                       text-gray-500 transition-colors hover:bg-red-50 hover:text-red-600
                       dark:text-gray-400 dark:hover:bg-red-500/10 dark:hover:text-red-400"
            title={t('homepage.clearCacheTitle')}
          >
            <Trash2 className="h-4 w-4" />
            <span className="hidden sm:inline">{t('homepage.clearCache')}</span>
          </button>
          <LanguageSwitcher />
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center px-4 pb-14 sm:px-6">
        <div className="w-full max-w-3xl">
          <h1
            className="text-center text-3xl font-semibold tracking-tight
                       text-gray-900 sm:text-4xl dark:text-white"
          >
            {t('homepage.title')}
          </h1>

          <div className="mt-8">
            <ChatgptPromptInput
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onSubmit={handleSubmit}
              placeholder={t('homepage.inputPlaceholder')}
            />
          </div>

          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            {SUGGESTIONS.map(({ key, Icon }) => {
              const text = t(`homepage.suggestions.${key}`);
              return (
                <button
                  key={key}
                  onClick={() => setInputValue(text)}
                  title={text}
                  className="group flex items-start gap-3 rounded-xl border border-gray-200
                             bg-white p-3.5 text-left transition-all
                             hover:-translate-y-0.5 hover:border-blue-400 hover:shadow-md
                             focus-visible:outline-none focus-visible:ring-2
                             focus-visible:ring-blue-500 dark:border-white/10
                             dark:bg-[#2a2a2a] dark:hover:border-blue-500"
                >
                  <span
                    className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center
                               rounded-lg bg-blue-50 text-blue-600 transition-colors
                               group-hover:bg-blue-600 group-hover:text-white
                               dark:bg-blue-500/10 dark:text-blue-400"
                  >
                    <Icon className="h-4 w-4" />
                  </span>
                  {/* 示例文案最长有 130+ 字，裁成三行才不会把卡片撑得高矮不齐 */}
                  <span className="line-clamp-3 text-sm leading-relaxed text-gray-700 dark:text-gray-200">
                    {text}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </main>
    </div>
  );
};
