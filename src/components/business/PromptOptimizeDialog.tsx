import { useState, useRef, useCallback, useEffect, memo } from 'react';
import { Wand2, Copy, X, Loader2, Check } from 'lucide-react';
import { AIService } from '@/service/ai';

interface PromptOptimizeDialogProps {
  isOpen: boolean;
  initialPrompt: string;
  onClose: () => void;
  onUsePrompt: (prompt: string) => void;
}

interface OptimizedResult {
  id: string;
  content: string;
  isLoading: boolean;
}

export const PromptOptimizeDialog = memo(
  ({
    isOpen,
    initialPrompt,
    onClose,
    onUsePrompt,
  }: PromptOptimizeDialogProps) => {
    const [optimizeInput, setOptimizeInput] = useState(initialPrompt);
    const [optimizedResults, setOptimizedResults] = useState<OptimizedResult[]>(
      [],
    );
    const [isOptimizing, setIsOptimizing] = useState(false);
    const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
    const optimizeAbortControllerRef = useRef<AbortController | null>(null);
    const totalCount = 5;

    // 同步 initialPrompt 变化 - 当 Dialog 打开时更新输入内容
    useEffect(() => {
      if (isOpen) {
        setOptimizeInput(initialPrompt);
        setOptimizedResults([]);
        setIsOptimizing(false);
        setCopiedIndex(null);
      }
    }, [isOpen, initialPrompt]);

    // 开始优化
    const handleStartOptimize = useCallback(() => {
      if (!optimizeInput.trim()) {
        return;
      }

      setIsOptimizing(true);

      // 初始化占位符
      const placeholders: OptimizedResult[] = Array.from(
        { length: totalCount },
        (_, i) => ({
          id: `optimize-${i}`,
          content: '',
          isLoading: true,
        }),
      );
      setOptimizedResults(placeholders);

      // 创建新的 AbortController
      const newAbortController = new AbortController();
      optimizeAbortControllerRef.current = newAbortController;

      // 调用优化接口
      AIService.optimizePrompt(
        optimizeInput,
        totalCount,
        (index, content) => {
          setOptimizedResults((prev) =>
            prev.map((result, i) =>
              i === index
                ? {
                    ...result,
                    content,
                    isLoading: false,
                  }
                : result,
            ),
          );
        },
        newAbortController,
      )
        .then(() => {
          setIsOptimizing(false);
        })
        .catch((error) => {
          if (error.name !== 'AbortError') {
            console.error('优化失败:', error);
          }
          setIsOptimizing(false);
          // 将所有仍在加载的结果标记为加载完成
          setOptimizedResults((prev) =>
            prev.map((result) => ({ ...result, isLoading: false })),
          );
        });
    }, [optimizeInput]);

    // 关闭 Dialog
    const handleClose = useCallback(() => {
      if (optimizeAbortControllerRef.current) {
        optimizeAbortControllerRef.current.abort();
      }
      setOptimizedResults([]);
      setIsOptimizing(false);
      setCopiedIndex(null);
      onClose();
    }, [onClose]);

    // 复制指定索引的优化后的 Prompt
    const handleCopyOptimized = useCallback(
      async (index: number, content: string) => {
        try {
          await navigator.clipboard.writeText(content);
          setCopiedIndex(index);
          setTimeout(() => setCopiedIndex(null), 2000);
        } catch (error) {
          console.error('复制失败:', error);
        }
      },
      [],
    );

    // 使用指定索引的优化后的 Prompt
    const handleUseOptimized = useCallback(
      (content: string) => {
        onUsePrompt(content);
        handleClose();
      },
      [onUsePrompt, handleClose],
    );

    if (!isOpen) {
      return null;
    }

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
        <div className="bg-white dark:bg-[#2d2d2d] rounded-3xl shadow-2xl w-[60vw] h-[70vh] overflow-hidden flex flex-col">
          {/* Dialog Header */}
          <div className="flex items-center justify-between px-8 py-4 border-b-4 border-gray-200 dark:border-gray-700 flex-shrink-0">
            <div className="flex items-center gap-6">
              <Wand2 className="h-16 w-16 text-purple-600 dark:text-purple-400" />
              <h2 className="text-7xl font-bold text-gray-900 dark:text-gray-100">
                优化 Prompt
              </h2>
            </div>
            <button
              onClick={handleClose}
              className="p-4 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <X className="h-10 w-10 text-gray-500 dark:text-gray-400" />
            </button>
          </div>

          {/* Dialog Content */}
          <div className="flex-1 flex flex-col px-8 py-4 min-h-0 overflow-hidden">
            {/* 输入区域 */}
            <div className="mb-4 flex-shrink-0">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-5xl font-bold text-gray-700 dark:text-gray-300">
                  输入你的需求：
                </h3>
                <button
                  onClick={handleStartOptimize}
                  disabled={!optimizeInput.trim() || isOptimizing}
                  className="flex items-center gap-5 px-12 py-6 rounded-2xl text-4xl font-bold
                             bg-purple-600 hover:bg-purple-700 dark:bg-purple-500 dark:hover:bg-purple-600
                             text-white transition-all duration-200 hover:scale-105
                             disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100
                             shadow-xl flex-shrink-0"
                >
                  <Wand2 className="h-10 w-10" />
                  {isOptimizing ? '生成中...' : '生成优化'}
                </button>
              </div>
              <textarea
                value={optimizeInput}
                onChange={(e) => setOptimizeInput(e.target.value)}
                placeholder="输入你想要创建的网页需求..."
                rows={3}
                className="w-full p-8 bg-gray-50 dark:bg-gray-800 rounded-2xl
                           text-gray-900 dark:text-gray-200 text-4xl leading-relaxed
                           border-2 border-gray-300 dark:border-gray-600
                           focus:border-purple-500 dark:focus:border-purple-400
                           focus:outline-none resize-none
                           placeholder:text-gray-400 dark:placeholder:text-gray-500"
              />
            </div>

            {/* 优化结果网格 */}
            <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
              <h3 className="text-5xl font-bold text-gray-700 dark:text-gray-300 mb-3 flex-shrink-0">
                优化后的 Prompt（选择一个使用）：
              </h3>
              {optimizedResults.length === 0 ? (
                <div className="flex-1 flex items-center justify-center bg-gray-50 dark:bg-gray-800 rounded-2xl border-2 border-dashed border-gray-300 dark:border-gray-600 overflow-hidden">
                  <p className="text-5xl text-gray-500 dark:text-gray-400">
                    点击"生成优化"按钮开始优化...
                  </p>
                </div>
              ) : (
                <div className="flex-1 grid grid-cols-5 gap-4 overflow-hidden">
                  {optimizedResults.map((result, index) => (
                    <div
                      key={result.id}
                      className="relative group bg-purple-50 dark:bg-purple-900/20 rounded-2xl border-2 border-purple-300 dark:border-purple-700 overflow-hidden hover:shadow-lg transition-all h-full flex flex-col"
                    >
                      {result.isLoading ? (
                        <div className="flex-1 flex items-center justify-center p-8">
                          <Loader2 className="h-24 w-24 animate-spin text-purple-600 dark:text-purple-400" />
                        </div>
                      ) : (
                        <>
                          {/* 复制按钮 - 右上角 */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCopyOptimized(index, result.content);
                            }}
                            className="absolute top-4 right-4 p-5 rounded-lg
                                     bg-white/90 dark:bg-gray-800/90 hover:bg-white dark:hover:bg-gray-800
                                     border border-gray-300 dark:border-gray-600
                                     opacity-0 group-hover:opacity-100 transition-all
                                     shadow-md hover:shadow-lg z-10"
                            title="复制此 Prompt"
                          >
                            {copiedIndex === index ? (
                              <Check className="h-10 w-10 text-green-600 dark:text-green-400" />
                            ) : (
                              <Copy className="h-10 w-10 text-gray-700 dark:text-gray-300" />
                            )}
                          </button>

                          {/* 内容 */}
                          <div
                            className="flex-1 p-10 overflow-y-auto cursor-pointer scrollbar-thin scrollbar-thumb-purple-300 scrollbar-track-transparent hover:scrollbar-thumb-purple-400"
                            onClick={() => handleUseOptimized(result.content)}
                            style={{ scrollbarWidth: 'thin' }}
                          >
                            <p className="text-gray-900 dark:text-gray-200 text-3xl leading-relaxed whitespace-pre-wrap">
                              {result.content || '生成中...'}
                            </p>
                          </div>

                          {/* 悬停提示 */}
                          <div
                            className="absolute bottom-0 left-0 right-0 p-5 bg-gradient-to-t from-purple-100 dark:from-purple-900/50 to-transparent
                                        opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
                          >
                            <p className="text-3xl font-medium text-purple-900 dark:text-purple-100 text-center">
                              点击使用此 Prompt
                            </p>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Dialog Footer */}
          <div className="flex items-center justify-end gap-4 px-8 py-4 border-t-4 border-gray-200 dark:border-gray-700 flex-shrink-0">
            <button
              onClick={handleClose}
              className="px-12 py-6 rounded-2xl text-4xl font-bold
                         bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600
                         text-gray-900 dark:text-gray-100
                         transition-colors shadow-lg"
            >
              关闭
            </button>
          </div>
        </div>
      </div>
    );
  },
);

PromptOptimizeDialog.displayName = 'PromptOptimizeDialog';
