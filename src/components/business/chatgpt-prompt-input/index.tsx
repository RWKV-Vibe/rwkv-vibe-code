'use client';

import * as React from 'react';
import { ArrowUp } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/cn';

type PromptInputSize = 'lg' | 'sm';

interface ChatgptPromptInputProps
  extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'onSubmit'> {
  onSubmit?: (content: string) => void;
  disabled?: boolean;
  /** lg：首页主输入框；sm：聊天页顶栏 */
  size?: PromptInputSize;
}

const SIZE_STYLES: Record<
  PromptInputSize,
  {
    wrapper: string;
    textarea: string;
    button: string;
    icon: string;
    minHeight: number;
    maxHeight: number;
  }
> = {
  lg: {
    wrapper: 'gap-3 rounded-2xl px-4 py-3 shadow-sm',
    textarea: 'text-base leading-6',
    button: 'h-10 w-10',
    icon: 'h-5 w-5',
    minHeight: 40,
    maxHeight: 200,
  },
  sm: {
    // min-h-9 是为了跟聊天页顶栏其余控件（图标按钮、状态条、语言切换）同高
    wrapper: 'min-h-9 gap-2 rounded-lg px-2.5 py-1.5',
    textarea: 'text-xs leading-5',
    button: 'h-7 w-7',
    icon: 'h-3.5 w-3.5',
    minHeight: 20,
    maxHeight: 40,
  },
};

const ChatgptPromptInputComponent = React.forwardRef<
  HTMLTextAreaElement,
  ChatgptPromptInputProps
>(({ className, onSubmit, disabled = false, size = 'lg', onChange, onKeyDown, placeholder, defaultValue, value: valueProp, ...props }, ref) => {
  const { t } = useTranslation();
  const internalTextareaRef = React.useRef<HTMLTextAreaElement>(null);
  const [internalValue, setInternalValue] = React.useState(
    defaultValue?.toString() || '',
  );

  const styles = SIZE_STYLES[size];
  const isControlled = valueProp !== undefined;
  const value = isControlled ? (valueProp as string) : internalValue;

  React.useImperativeHandle(ref, () => internalTextareaRef.current!, []);
  React.useLayoutEffect(() => {
    const textarea = internalTextareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      const newHeight = Math.min(textarea.scrollHeight, styles.maxHeight);
      textarea.style.height = `${newHeight}px`;
    }
  }, [value, styles.maxHeight]);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (!isControlled) {
      setInternalValue(e.target.value);
    }
    onChange?.(e);
  };

  const hasValue = value.trim().length > 0;

  const handleSubmit = () => {
    if (hasValue && onSubmit && !disabled) {
      onSubmit(value.trim());
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (
      e.key === 'Enter' &&
      !e.shiftKey &&
      !(e.nativeEvent as KeyboardEvent).isComposing &&
      !disabled
    ) {
      e.preventDefault();
      handleSubmit();
    }
    onKeyDown?.(e);
  };

  return (
    <div
      className={cn(
        'flex items-center border bg-white transition-colors dark:bg-[#303030] dark:border-gray-600',
        styles.wrapper,
        className,
      )}
    >
      <textarea
        {...props}
        ref={internalTextareaRef}
        rows={1}
        value={value}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        placeholder={placeholder}
        className={cn(
          'custom-scrollbar flex-1 resize-none border-0 bg-transparent text-foreground dark:text-white placeholder:text-muted-foreground dark:placeholder:text-gray-400 focus:ring-0 focus-visible:outline-none disabled:opacity-50 disabled:cursor-not-allowed',
          styles.textarea,
        )}
        style={{ minHeight: styles.minHeight, maxHeight: styles.maxHeight }}
      />

      <button
        type="button"
        onClick={handleSubmit}
        disabled={!hasValue || disabled}
        className={cn(
          'flex shrink-0 items-center justify-center rounded-full font-medium transition-colors focus-visible:outline-none disabled:pointer-events-none bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 disabled:bg-gray-300 dark:disabled:bg-gray-600 cursor-pointer disabled:cursor-not-allowed',
          styles.button,
        )}
      >
        <ArrowUp className={styles.icon} />
        <span className="sr-only">{t('common.send')}</span>
      </button>
    </div>
  );
});

ChatgptPromptInputComponent.displayName = 'ChatgptPromptInput';

export const ChatgptPromptInput = React.memo(
  ChatgptPromptInputComponent,
  (prevProps, nextProps) =>
    prevProps.value === nextProps.value &&
    prevProps.disabled === nextProps.disabled &&
    prevProps.size === nextProps.size &&
    prevProps.placeholder === nextProps.placeholder &&
    prevProps.defaultValue === nextProps.defaultValue,
);
