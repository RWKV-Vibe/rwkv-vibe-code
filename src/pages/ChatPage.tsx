import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ChatgptPromptInput } from '@/components/business/chatgpt-prompt-input';
import { MarkdownRenderer } from '@/components/business/MarkdownRenderer';
import { Loader2, Sparkles } from 'lucide-react';
import { AIService } from '@/service/ai';
import { useTranslation } from 'react-i18next';

interface GeneratedResult {
  id: string;
  content: string;
  htmlCode: string;
  isLoading: boolean;
}

const DEFAULT_HTML = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>加载中...</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-gradient-to-br from-blue-50 to-indigo-100 min-h-screen flex items-center justify-center p-4">
  <div class="text-center">
    <div class="animate-pulse">
      <div class="h-8 w-48 bg-gray-300 rounded mx-auto mb-4"></div>
      <div class="h-4 w-64 bg-gray-200 rounded mx-auto"></div>
    </div>
  </div>
</body>
</html>`;

export const ChatPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const initialMessage = (location.state as { initialMessage?: string })
    ?.initialMessage;

  // 从 sessionStorage 恢复状态
  const [results, setResults] = useState<GeneratedResult[]>(() => {
    const saved = sessionStorage.getItem('chatPageResults');
    return saved ? JSON.parse(saved) : [];
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [prompt, setPrompt] = useState(() => {
    return sessionStorage.getItem('chatPagePrompt') || '';
  });
  const totalCount = 24;

  // iframe 渲染队列控制
  const [iframeRenderQueue, setIframeRenderQueue] = useState<Set<number>>(
    () => {
      // 如果有已保存的结果，将所有有内容的 iframe 加入队列（页面刷新恢复）
      const saved = sessionStorage.getItem('chatPageResults');
      if (saved) {
        const savedResults = JSON.parse(saved);
        const readyIndexes = savedResults
          .map((result: GeneratedResult, index: number) => ({ result, index }))
          .filter(
            ({ result }: { result: GeneratedResult }) =>
              !result.isLoading && result.htmlCode,
          )
          .map(({ index }: { index: number }) => index);
        return new Set(readyIndexes);
      }
      return new Set();
    },
  );

  // 标记是否是第一次渲染（页面会话的第一次生成）
  const hasRenderedOnce = useRef(false);

  const batchSize = 8; // 后续每批渲染 8 个 iframe
  const isBatchProcessing = useRef(false); // 标记是否正在批处理中
  const resultsRef = useRef(results); // 存储最新的 results 引用
  const abortControllerRef = useRef<AbortController | null>(null); // 用于取消正在进行的请求

  // 更新 resultsRef
  useEffect(() => {
    resultsRef.current = results;
  }, [results]);

  // 存储每个 Markdown 容器的引用
  const markdownContainerRefs = useRef<Map<number, HTMLDivElement>>(new Map());

  // 滚动 Markdown 容器到底部 - 使用 requestAnimationFrame 确保在渲染后执行
  const scrollMarkdownToBottom = (index: number) => {
    requestAnimationFrame(() => {
      const container = markdownContainerRefs.current.get(index);
      if (container) {
        // 直接设置 scrollTop，smooth behavior 已在 CSS 中定义
        container.scrollTop = container.scrollHeight;
      }
    });
  };

  // 监听结果变化，自动滚动正在生成的 Markdown
  useEffect(() => {
    if (isGenerating) {
      results.forEach((result, index) => {
        if (!result.isLoading && result.content) {
          scrollMarkdownToBottom(index);
        }
      });
    }
  }, [results, isGenerating]);

  // iframe 渲染队列管理 - 逐步加载 iframe
  useEffect(() => {
    // 找出所有已经有内容（不再 loading）的结果索引
    const readyIndexes = results
      .map((result, index) => ({ result, index }))
      .filter(({ result }) => !result.isLoading && result.htmlCode)
      .map(({ index }) => index)
      .sort((a, b) => a - b); // 按索引排序，确保顺序渲染

    // 找出还没有在队列中的索引（按顺序）
    const notInQueue = readyIndexes.filter(
      (index) => !iframeRenderQueue.has(index),
    );

    if (notInQueue.length === 0) {
      return; // 没有需要处理的
    }

    // 第一次渲染：一次性全部加载
    if (!hasRenderedOnce.current) {
      setIframeRenderQueue(new Set(readyIndexes));
      hasRenderedOnce.current = true;
      return;
    }

    // 后续渲染：如果没有正在进行的批处理，启动新的批处理
    if (!isBatchProcessing.current) {
      isBatchProcessing.current = true;

      const processBatch = () => {
        setIframeRenderQueue((prevQueue) => {
          // 实时获取最新的 ready 但未渲染的索引
          const currentReadyIndexes = resultsRef.current
            .map((result, index) => ({ result, index }))
            .filter(({ result }) => !result.isLoading && result.htmlCode)
            .map(({ index }) => index)
            .sort((a, b) => a - b);

          const stillNotInQueue = currentReadyIndexes.filter(
            (index) => !prevQueue.has(index),
          );

          if (stillNotInQueue.length === 0) {
            isBatchProcessing.current = false;
            return prevQueue;
          }

          const newQueue = new Set(prevQueue);

          // 每次添加最多 batchSize 个（按顺序）
          const toAdd = stillNotInQueue.slice(0, batchSize);
          toAdd.forEach((index) => newQueue.add(index));

          // 如果还有剩余，继续下一批
          if (stillNotInQueue.length > batchSize) {
            setTimeout(processBatch, 300);
          } else {
            isBatchProcessing.current = false;
          }

          return newQueue;
        });
      };

      processBatch();
    }
  }, [results, iframeRenderQueue, batchSize]);

  // 保存状态到 sessionStorage
  useEffect(() => {
    if (results.length > 0) {
      sessionStorage.setItem('chatPageResults', JSON.stringify(results));
    }
  }, [results]);

  useEffect(() => {
    if (prompt) {
      sessionStorage.setItem('chatPagePrompt', prompt);
    }
  }, [prompt]);

  // 处理初始消息 - 只执行一次，并且如果已经有结果就不重复执行
  const hasProcessedInitialMessage = useRef(false);
  useEffect(() => {
    // 如果已经有保存的结果，说明之前已经生成过了，不需要再处理
    const hasExistingResults = results.length > 0 && !results[0]?.isLoading;

    if (
      initialMessage &&
      !hasProcessedInitialMessage.current &&
      !hasExistingResults
    ) {
      hasProcessedInitialMessage.current = true;
      // 标记已处理，避免返回后重复执行
      sessionStorage.setItem('hasProcessedInitialMessage', 'true');
      handleGenerate(initialMessage);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleGenerate = useCallback(
    async (userPrompt: string) => {
      // 取消之前正在进行的请求
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        console.log('已取消之前的生成请求');
      }

      // 创建新的 AbortController
      const newAbortController = new AbortController();
      abortControllerRef.current = newAbortController;

      setPrompt(userPrompt);
      setIsGenerating(true);

      // 清除旧的结果和标记
      sessionStorage.removeItem('chatPageResults');
      sessionStorage.removeItem('hasProcessedInitialMessage');

      // 清空 iframe 渲染队列，重置批处理标记
      setIframeRenderQueue(new Set());
      isBatchProcessing.current = false;

      // 初始化 24 个占位符
      const placeholders: GeneratedResult[] = Array.from(
        { length: totalCount },
        (_, i) => ({
          id: `result-${i}`,
          content: '',
          htmlCode: DEFAULT_HTML,
          isLoading: true,
        }),
      );
      setResults(placeholders);

      // 追踪哪些index已经开始接收数据（用于计数）
      const startedIndexes = new Set<number>();

      try {
        await AIService.generateMultipleResponses(
          userPrompt,
          totalCount,
          (index, content, htmlCode) => {
            // 实时更新每个结果
            setResults((prev) =>
              prev.map((result, i) =>
                i === index
                  ? {
                      ...result,
                      content,
                      htmlCode,
                      isLoading: false,
                    }
                  : result,
              ),
            );

            // 标记该index已开始接收数据
            if (!startedIndexes.has(index)) {
              startedIndexes.add(index);
            }
          },
          newAbortController,
        );
      } catch (error: unknown) {
        // 检查是否是用户主动取消
        if (error instanceof Error && error.name === 'AbortError') {
          console.log('生成已被用户取消');
        } else {
          console.error('生成失败:', error);
        }
        // 将所有仍在加载的卡片标记为加载完成
        setResults((prev) =>
          prev.map((result) => ({ ...result, isLoading: false })),
        );
      } finally {
        // 只有当前 AbortController 没有被新的请求替换时才设置为 false
        if (abortControllerRef.current === newAbortController) {
          setIsGenerating(false);
          abortControllerRef.current = null;
        }
      }
    },
    [totalCount],
  );

  const handleOpenDetail = useCallback(
    (index: number) => {
      if (results[index] && !results[index].isLoading) {
        // 保存当前状态到 sessionStorage，确保返回时不会丢失
        sessionStorage.setItem('chatPageResults', JSON.stringify(results));
        sessionStorage.setItem('chatPagePrompt', prompt);

        navigate('/detail', {
          state: {
            htmlCode: results[index].htmlCode,
            index: index,
          },
        });
      }
    },
    [results, prompt, navigate],
  );

  const handlePromptChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setPrompt(e.target.value);
    },
    [],
  );

  // 将输入框区域提取为独立的 memoized 组件
  const inputPlaceholder = useMemo(() => t('chatpage.inputPlaceholder'), [t]);

  // 建议选项
  const suggestions = useMemo(
    () => [
      t('homepage.suggestions.hotel'),
      t('homepage.suggestions.museum'),
      t('homepage.suggestions.portfolio'),
      t('homepage.suggestions.cafe'),
      t('homepage.suggestions.saas'),
      t('homepage.suggestions.realEstate'),
      t('homepage.suggestions.corporate'),
      t('homepage.suggestions.gallery'),
    ],
    [t],
  );

  // 建议下拉菜单状态
  const [isSuggestionsOpen, setIsSuggestionsOpen] = useState(false);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // 点击外部关闭下拉框
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node)
      ) {
        setIsSuggestionsOpen(false);
      }
    };

    if (isSuggestionsOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isSuggestionsOpen]);

  // 处理建议点击
  const handleSuggestionClick = useCallback((suggestion: string) => {
    setPrompt(suggestion);
    setIsSuggestionsOpen(false);
  }, []);

  return (
    <div className="flex flex-col h-screen bg-background dark:bg-[#1e1e1e]">
      {/* 顶部：输入区域 */}
      <div className="border-b border-border dark:border-gray-700 bg-white dark:bg-[#252525]">
        <div className="max-w-[1400px] mx-auto p-6">
          <div className="flex items-center gap-4">
            {/* 输入框 */}
            <div className="flex-1">
              <ChatgptPromptInput
                value={prompt}
                onChange={handlePromptChange}
                placeholder={inputPlaceholder}
                onSubmit={handleGenerate}
              />
            </div>

            {/* 建议下拉按钮 */}
            <div ref={suggestionsRef} className="relative flex-shrink-0">
              <button
                onClick={() => setIsSuggestionsOpen(!isSuggestionsOpen)}
                className="flex items-center justify-center h-16 w-16 rounded-full
                           bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600
                           text-white shadow-lg hover:shadow-xl
                           transition-all duration-200 hover:scale-105
                           border-2 border-blue-400 dark:border-blue-400"
                title="显示建议"
              >
                <Sparkles className="h-6 w-6" />
              </button>

              {isSuggestionsOpen && (
                <div
                  className="absolute top-full mt-2 right-0 w-[800px]
                             bg-white dark:bg-[#2d2d2d] 
                             rounded-xl shadow-2xl 
                             border-2 border-gray-200 dark:border-gray-600
                             z-50"
                >
                  <div className="p-8">
                    {suggestions.map((suggestion, index) => (
                      <button
                        key={index}
                        onClick={() => handleSuggestionClick(suggestion)}
                        className="w-full px-10 py-8 text-left text-3xl
                                   rounded-lg mb-4 last:mb-0
                                   bg-white dark:bg-[#2d2d2d]
                                   hover:bg-blue-50 dark:hover:bg-blue-900/30
                                   text-gray-900 dark:text-gray-200
                                   transition-colors duration-150
                                   border border-transparent hover:border-blue-200 dark:hover:border-blue-800
                                   leading-relaxed font-semibold"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 中间：网页预览网格 */}
      <div className="flex-1 overflow-y-auto p-4 bg-gray-50 dark:bg-[#1a1a1a]">
        <div
          className="grid grid-cols-12 gap-4 mx-auto"
          style={{ maxWidth: '10000px' }}
        >
          {results.map((result, index) => (
            <div
              key={result.id}
              className="group flex flex-col rounded-lg overflow-hidden border-2 border-gray-300 dark:border-gray-600 hover:border-blue-400 transition-all hover:shadow-xl cursor-pointer"
              onClick={() => handleOpenDetail(index)}
            >
              {result.isLoading ? (
                <div className="w-full h-[1760px] bg-white dark:bg-[#2d2d2d] flex items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                </div>
              ) : (
                <>
                  {/* 上部分：预览效果 */}
                  <div className="relative h-[1700px] bg-white border-b-2 border-gray-300 dark:border-gray-600 overflow-auto will-change-contents">
                    {iframeRenderQueue.has(index) ? (
                      <iframe
                        key={`iframe-${result.id}`}
                        srcDoc={result.htmlCode || DEFAULT_HTML}
                        className="w-full border-0 bg-white block pointer-events-none"
                        title={`Preview ${index + 1}`}
                        sandbox="allow-scripts"
                        scrolling="no"
                        loading="lazy"
                        style={{
                          height: '200vh',
                          contentVisibility: 'auto',
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gray-50 dark:bg-[#2d2d2d]">
                        <div className="text-center">
                          <Loader2 className="h-8 w-8 animate-spin text-blue-500 mx-auto mb-2" />
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {t('chatpage.preparingRender')}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* 下部分：Markdown 渲染内容 */}
                  <div
                    ref={(el) => {
                      if (el) {
                        markdownContainerRefs.current.set(index, el);
                      }
                    }}
                    className="h-[260px] bg-white dark:bg-[#1e1e1e] relative overflow-auto will-change-scroll"
                    style={{
                      scrollBehavior: 'smooth',
                      isolation: 'isolate',
                    }}
                  >
                    <div className="p-4">
                      <MarkdownRenderer content={result.content} />
                    </div>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
