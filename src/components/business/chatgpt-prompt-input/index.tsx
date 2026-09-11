'use client';

import * as React from 'react';
import { ArrowUp } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/cn';

interface ChatgptPromptInputProps
  extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'onSubmit'> {
  onSubmit?: (content: string) => void;
  disabled?: boolean;
}

const ChatgptPromptInputComponent = React.forwardRef<
  HTMLTextAreaElement,
  ChatgptPromptInputProps
>(({ className, onSubmit, disabled = false, onChange, onKeyDown, placeholder, defaultValue, value: valueProp, ...props }, ref) => {
  const { t } = useTranslation();
  const internalTextareaRef = React.useRef<HTMLTextAreaElement>(null);
  const [internalValue, setInternalValue] = React.useState(
    defaultValue?.toString() || '',
  );

  const isControlled = valueProp !== undefined;
  const value = isControlled ? (valueProp as string) : internalValue;

  React.useImperativeHandle(ref, () => internalTextareaRef.current!, []);
  React.useLayoutEffect(() => {
    const textarea = internalTextareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      const newHeight = Math.min(textarea.scrollHeight, 200);
      textarea.style.height = `${newHeight}px`;
    }
  }, [value]);

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
        'flex items-center gap-4 rounded-[32px] p-8 shadow-xl transition-colors bg-white border-2 dark:bg-[#303030] dark:border-gray-600',
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
        className="custom-scrollbar flex-1 resize-none border-0 bg-transparent text-3xl text-foreground dark:text-white placeholder:text-muted-foreground dark:placeholder:text-gray-400 focus:ring-0 focus-visible:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
        style={{ minHeight: '60px', maxHeight: '300px' }}
      />

      <button
        type="button"
        onClick={handleSubmit}
        disabled={!hasValue || disabled}
        className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-full text-sm font-medium transition-colors focus-visible:outline-none disabled:pointer-events-none bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 disabled:bg-gray-300 dark:disabled:bg-gray-600 cursor-pointer disabled:cursor-not-allowed"
      >
        <ArrowUp className="h-9 w-9" />
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
    prevProps.placeholder === nextProps.placeholder &&
    prevProps.defaultValue === nextProps.defaultValue,
);
