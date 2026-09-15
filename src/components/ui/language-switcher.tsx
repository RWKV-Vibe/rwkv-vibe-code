'use client';

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, ChevronDown, Globe } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/cn';

const LANGUAGES = [
  { code: 'zh', label: '中文' },
  { code: 'en', label: 'English' },
  { code: 'ja', label: 'Nihongo' },
  { code: 'hi', label: 'हिंदी' },
] as const;

/**
 * 原来是手写的 dropdown：自己 useRef + mousedown 监听做点击外部关闭，
 * 没有 Esc、没有焦点管理、菜单也不会翻转避让。改挂 Radix Popover，
 * 这些行为它都带，组件里只剩「当前是哪种语言」这一件事。
 */
export const LanguageSwitcher = () => {
  const { i18n } = useTranslation();
  const [open, setOpen] = useState(false);

  // i18n.language 可能带地区后缀（zh-CN / en-US），前缀匹配才不会整列都不高亮
  const current =
    LANGUAGES.find((lang) => i18n.language?.startsWith(lang.code)) ??
    LANGUAGES[0];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="toolbar"
          size="sm"
          className="gap-1.5 rounded-lg px-2 text-xs [&_svg]:size-3.5"
        >
          <Globe />
          {/* 定宽，避免切到 English 时整条工具栏跟着横向抖一下 */}
          <span className="min-w-14 text-left">{current.label}</span>
          <ChevronDown
            className={cn(
              'transition-transform duration-200',
              open && 'rotate-180',
            )}
          />
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-40">
        {LANGUAGES.map((lang) => {
          const isActive = lang.code === current.code;
          return (
            <button
              key={lang.code}
              onClick={() => {
                void i18n.changeLanguage(lang.code);
                setOpen(false);
              }}
              className={cn(
                `flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-2
                 text-left text-sm transition-colors
                 hover:bg-gray-100 dark:hover:bg-white/10`,
                isActive
                  ? 'font-medium text-blue-600 dark:text-blue-400'
                  : 'text-gray-700 dark:text-gray-200',
              )}
            >
              {lang.label}
              {isActive && <Check className="h-4 w-4 shrink-0" />}
            </button>
          );
        })}
      </PopoverContent>
    </Popover>
  );
};
