import * as React from 'react';
import { ArrowUp } from 'lucide-react';

// --- Utility Function ---
type ClassValue = string | number | boolean | null | undefined;
function cn(...inputs: ClassValue[]): string {
  return inputs.filter(Boolean).join(' ');
}

interface ChatgptPromptInputProps
  extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'onSubmit'> {
  onSubmit?: (content: string) => void;
  disabled?: boolean;
}

const ChatgptPromptInputComponent = React.forwardRef<
  HTMLTextAreaElement,
  ChatgptPromptInputProps
>(({ className, onSubmit, disabled = false, ...props }, ref) => {
  const internalTextareaRef = React.useRef<HTMLTextAreaElement>(null);
  const [internalValue, setInternalValue] = React.useState('');

  // 使用外部传入的 value 或内部 state
  const isControlled = props.value !== undefined;
  const value = isControlled ? (props.value as string) : internalValue;

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
    if (props.onChange) props.onChange(e);
  };

  const hasValue = value.trim().length > 0;

  const handleSubmit = () => {
    if (hasValue && onSubmit && !disabled) {
      const content = value.trim();
      onSubmit(content);
      // 不再清空输入框，保留用户的问题
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
    if (props.onKeyDown) props.onKeyDown(e);
  };

  return (
    <div
      className={cn(
        'flex items-center gap-4 rounded-[32px] p-8 shadow-xl transition-colors bg-white border-2 dark:bg-[#303030] dark:border-gray-600',
        className,
      )}
    >
      <textarea
        ref={internalTextareaRef}
        rows={1}
        value={value}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        placeholder="描述你想要创建的网页..."
        className="custom-scrollbar flex-1 resize-none border-0 bg-transparent text-3xl text-foreground dark:text-white placeholder:text-muted-foreground dark:placeholder:text-gray-400 focus:ring-0 focus-visible:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
        style={{ minHeight: '60px', maxHeight: '300px' }}
        {...props}
      />

      <button
        type="button"
        onClick={handleSubmit}
        disabled={!hasValue || disabled}
        className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-full text-sm font-medium transition-colors focus-visible:outline-none disabled:pointer-events-none bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 disabled:bg-gray-300 dark:disabled:bg-gray-600 cursor-pointer disabled:cursor-not-allowed"
      >
        <ArrowUp className="h-9 w-9" />
        <span className="sr-only">发送</span>
      </button>
    </div>
  );
});

ChatgptPromptInputComponent.displayName = 'ChatgptPromptInput';

// 使用 React.memo 包装组件，避免不必要的重渲染
// 自定义比较函数，只比较基本值类型的 props，不比较函数引用
export const ChatgptPromptInput = React.memo(
  ChatgptPromptInputComponent,
  (prevProps, nextProps) => {
    // 只比较基本值类型的 props，如果都相等则返回 true（不重新渲染）
    return (
      prevProps.value === nextProps.value &&
      prevProps.disabled === nextProps.disabled &&
      prevProps.placeholder === nextProps.placeholder
    );
  },
);
