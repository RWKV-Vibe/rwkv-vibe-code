'use client';

import { useRef, useState } from 'react';
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
import {
  CHAT_PAGE_PROMPT_KEY,
  clearAppCache,
  clearChatPageCache,
} from '@/lib/storage';
import { SUGGESTION_GROUPS } from '@/lib/suggestions';

export const HomePage = () => {
  const router = useRouter();
  const { t } = useTranslation();
  const { logout } = useAuth();
  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = (content: string) => {
    if (!content.trim()) return;
    clearChatPageCache();
    sessionStorage.setItem(CHAT_SHOULD_GENERATE_KEY, '1');
    sessionStorage.setItem(CHAT_INITIAL_MESSAGE_KEY, content);
    localStorage.setItem(CHAT_PAGE_PROMPT_KEY, content);
    router.push('/chat');
    setInputValue('');
  };

  /** 点示例只填进输入框，用户还能改两笔再发，所以顺手把光标交回去 */
  const handlePickSuggestion = (prompt: string) => {
    setInputValue(prompt);
    inputRef.current?.focus();
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

      {/*
       * 示例从 6 条涨到 10 条后内容会比视口高，所以这里自己滚动，
       * 再用 min-h-full + justify-center 保证内容不高时仍然垂直居中。
       */}
      <main className="flex-1 overflow-y-auto px-4 py-10 sm:px-6">
        <div className="mx-auto flex min-h-full w-full max-w-3xl flex-col justify-center">
          <h1
            className="text-center text-3xl font-semibold tracking-tight
                       text-gray-900 sm:text-4xl dark:text-white"
          >
            {t('homepage.title')}
          </h1>

          <div className="mt-8">
            <ChatgptPromptInput
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onSubmit={handleSubmit}
              placeholder={t('homepage.inputPlaceholder')}
            />
          </div>

          <div className="mt-10 space-y-6">
            {SUGGESTION_GROUPS.map(({ group, items }) => (
              <section key={group}>
                <div className="mb-3 flex items-center gap-3">
                  <h2
                    className="text-xs font-medium uppercase tracking-wider
                               text-gray-400 dark:text-gray-500"
                  >
                    {t(`homepage.groups.${group}`)}
                  </h2>
                  <span className="h-px flex-1 bg-gray-200 dark:bg-white/10" />
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  {items.map(({ key, Icon }) => {
                    const label = t(`homepage.suggestions.${key}.label`);
                    const prompt = t(`homepage.suggestions.${key}.prompt`);
                    return (
                      <button
                        key={key}
                        onClick={() => handlePickSuggestion(prompt)}
                        title={prompt}
                        className="group flex h-full items-start gap-3 rounded-xl border
                                   border-gray-200 bg-white p-3.5 text-left transition
                                   duration-200 hover:-translate-y-0.5 hover:border-blue-400
                                   hover:shadow-lg hover:shadow-blue-500/5
                                   focus-visible:outline-none focus-visible:ring-2
                                   focus-visible:ring-blue-500 focus-visible:ring-offset-2
                                   focus-visible:ring-offset-gray-50
                                   dark:border-white/10 dark:bg-white/[0.04]
                                   dark:hover:border-blue-400/40 dark:hover:bg-white/[0.07]
                                   dark:hover:shadow-black/40 dark:focus-visible:ring-offset-[#212121]"
                      >
                        <span
                          className="flex h-8 w-8 shrink-0 items-center justify-center
                                     rounded-lg bg-blue-50 text-blue-600 transition-colors
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
                          {/* 完整文案有 200+ 字，裁成两行卡片才高矮一致，悬停 title 里看全文 */}
                          <span className="mt-1 line-clamp-2 text-xs leading-relaxed text-gray-500 dark:text-gray-400">
                            {prompt}
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
};
