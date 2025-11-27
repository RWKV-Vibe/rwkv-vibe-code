import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import { Eye, Code2, Copy, Download } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const DEFAULT_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Preview</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-gradient-to-br from-blue-50 to-indigo-100 min-h-screen flex items-center justify-center p-4">
  <div class="text-center">
    <h1 class="text-4xl font-bold text-gray-800 mb-4">Welcome!</h1>
    <p class="text-gray-600">Start editing to see your changes</p>
  </div>
</body>
</html>`;

export const DetailPage = () => {
  const location = useLocation();
  const { t } = useTranslation();

  // 从 URL 查询参数获取 index 和 uniqueKey
  const searchParams = new URLSearchParams(location.search);
  const resultIndex = searchParams.get('index')
    ? parseInt(searchParams.get('index')!)
    : undefined;
  const uniqueKey = searchParams.get('key') || `detail-${resultIndex}`;

  // 从 sessionStorage 获取初始数据
  const [initialHtmlCode] = useState(() => {
    if (resultIndex !== undefined) {
      // 优先使用 uniqueKey
      let saved = sessionStorage.getItem(uniqueKey);

      // 如果没有，尝试使用旧的 key 格式
      if (!saved) {
        saved = sessionStorage.getItem(`detail-${resultIndex}`);
      }

      if (saved) {
        try {
          const data = JSON.parse(saved);
          return data.htmlCode || DEFAULT_HTML;
        } catch (error) {
          console.error('解析 sessionStorage 数据失败:', error);
        }
      } else {
        console.warn(
          `DetailPage #${resultIndex} 没有找到初始数据，key: ${uniqueKey}`,
        );
      }

      // 尝试从全局状态获取
      const globalState = (window as any).__chatPageGlobalState;
      if (globalState && globalState.updateBuffer) {
        const latestUpdate = globalState.updateBuffer.get(resultIndex);
        if (latestUpdate && latestUpdate.htmlCode) {
          return latestUpdate.htmlCode;
        }
      }
    }
    return (location.state as { htmlCode?: string })?.htmlCode || DEFAULT_HTML;
  });

  const [htmlCode, setHtmlCode] = useState(initialHtmlCode);
  const [copied, setCopied] = useState(false);
  const [hasUserEdited, setHasUserEdited] = useState(false);
  const [isLiveUpdating, setIsLiveUpdating] = useState(false);

  // 监听 BroadcastChannel 接收实时更新
  useEffect(() => {
    if (resultIndex === undefined) {
      console.warn('DetailPage: resultIndex 未定义');
      return;
    }

    const channel = new BroadcastChannel('rwkv-detail-channel');

    // 检查是否正在生成
    const globalState = (window as any).__chatPageGlobalState;
    if (globalState && globalState.isGenerating) {
      setIsLiveUpdating(true);

      // 从 updateBuffer 获取最新内容
      const updateBuffer = globalState.updateBuffer;
      if (updateBuffer && updateBuffer.has(resultIndex)) {
        const latestUpdate = updateBuffer.get(resultIndex);
        if (latestUpdate && latestUpdate.htmlCode && !hasUserEdited) {
          setHtmlCode(latestUpdate.htmlCode);
        }
      }
    }

    channel.onmessage = (event) => {
      const { type, index, htmlCode: newHtmlCode } = event.data;

      // 处理初始化消息（INIT_DETAIL）- 作为备用初始化方式
      if (type === 'INIT_DETAIL' && index === resultIndex) {
        if (!hasUserEdited && newHtmlCode && newHtmlCode !== DEFAULT_HTML) {
          setHtmlCode(newHtmlCode);
          setIsLiveUpdating(globalState?.isGenerating || false);
        }
        return;
      }

      // 只处理与当前 index 匹配的 UPDATE_CONTENT 消息
      if (index !== resultIndex) return;

      if (type === 'UPDATE_CONTENT' && newHtmlCode && !hasUserEdited) {
        setHtmlCode(newHtmlCode);
        setIsLiveUpdating(true);
      } else if (
        type === 'GENERATION_COMPLETE' ||
        type === 'GENERATION_ERROR'
      ) {
        setIsLiveUpdating(false);
      }
    };

    // 发送就绪信号
    channel.postMessage({
      type: 'DETAIL_READY',
      index: resultIndex,
    });

    return () => {
      channel.close();
    };
  }, [resultIndex, hasUserEdited]);

  // 监听用户编辑
  const handleEditorChange = (value: string | undefined) => {
    setHtmlCode(value || '');
    setHasUserEdited(true); // 标记用户已编辑
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(htmlCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error(t('detailpage.copyFailed'), error);
    }
  };

  const handleDownload = () => {
    const blob = new Blob([htmlCode], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `design-${resultIndex !== undefined ? resultIndex + 1 : 'export'}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col h-screen bg-background dark:bg-[#1e1e1e]">
      {/* 顶部工具栏 - 超大响应式设计 */}
      <div className="h-20 sm:h-24 md:h-28 lg:h-32 xl:h-36 border-b-2 border-border dark:border-gray-700 bg-white dark:bg-[#252525] flex items-center justify-between px-6 sm:px-8 md:px-12 lg:px-16 xl:px-20">
        <div className="flex items-center gap-4 sm:gap-6 md:gap-8 lg:gap-12">
          {resultIndex !== undefined && (
            <div className="flex items-center gap-4">
              <span className="text-xl sm:text-2xl md:text-3xl lg:text-4xl xl:text-5xl font-bold text-gray-600 dark:text-gray-400">
                {t('detailpage.solution', { number: resultIndex + 1 })}
              </span>
              {isLiveUpdating && !hasUserEdited && (
                <span className="flex items-center gap-2 px-4 py-2 bg-blue-100 dark:bg-blue-900 rounded-full text-sm font-semibold text-blue-600 dark:text-blue-300 animate-pulse">
                  <span className="w-2 h-2 bg-blue-600 dark:bg-blue-300 rounded-full"></span>
                  <span>{t('detailpage.liveUpdating') || '实时更新中'}</span>
                </span>
              )}
              {hasUserEdited && (
                <span className="flex items-center gap-2 px-4 py-2 bg-orange-100 dark:bg-orange-900 rounded-full text-sm font-semibold text-orange-600 dark:text-orange-300">
                  <span>{t('detailpage.editMode') || '编辑模式'}</span>
                </span>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-3 sm:gap-4 md:gap-6 lg:gap-8">
          {/* 操作按钮 - 超大响应式 */}
          <button
            onClick={handleCopy}
            className="flex items-center gap-3 md:gap-4 px-6 py-3 sm:px-8 sm:py-4 md:px-10 md:py-5 lg:px-12 lg:py-6 xl:px-14 xl:py-7 rounded-2xl text-xl sm:text-2xl md:text-3xl lg:text-4xl xl:text-5xl font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-200 hover:scale-[1.02] shadow-lg"
          >
            <Copy className="h-6 w-6 sm:h-8 sm:w-8 md:h-10 md:w-10 lg:h-12 lg:w-12 xl:h-14 xl:w-14" />
            <span className="hidden md:inline">
              {copied ? t('detailpage.copied') : t('detailpage.copyCode')}
            </span>
          </button>
          <button
            onClick={handleDownload}
            className="flex items-center gap-3 md:gap-4 px-6 py-3 sm:px-8 sm:py-4 md:px-10 md:py-5 lg:px-12 lg:py-6 xl:px-14 xl:py-7 rounded-2xl text-xl sm:text-2xl md:text-3xl lg:text-4xl xl:text-5xl font-bold bg-blue-600 text-white hover:bg-blue-700 transition-all duration-200 hover:scale-[1.02] shadow-xl hover:shadow-2xl"
          >
            <Download className="h-6 w-6 sm:h-8 sm:w-8 md:h-10 md:w-10 lg:h-12 lg:w-12 xl:h-14 xl:w-14" />
            <span className="hidden md:inline">{t('detailpage.download')}</span>
          </button>
        </div>
      </div>

      {/* 主内容区域：响应式布局 - 小屏幕上下，大屏幕左右 */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* 左侧/上侧：代码编辑器 */}
        <div className="w-full lg:w-1/2 h-1/2 lg:h-full border-b-2 lg:border-b-0 lg:border-r-2 border-border dark:border-gray-700 bg-[#1e1e1e]">
          <div className="h-full flex flex-col">
            <div className="px-6 sm:px-8 md:px-12 lg:px-16 xl:px-20 py-4 sm:py-5 md:py-6 lg:py-8 xl:py-10 bg-[#252525] border-b-2 border-gray-700">
              <span className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl text-gray-300 font-bold flex items-center gap-3 md:gap-4 lg:gap-6">
                <Code2 className="h-8 w-8 sm:h-10 sm:w-10 md:h-12 md:w-12 lg:h-16 lg:w-16 xl:h-20 xl:w-20" />
                {t('detailpage.codeEditor')}
              </span>
            </div>
            <div className="flex-1">
              <Editor
                height="100%"
                defaultLanguage="html"
                value={htmlCode}
                onChange={handleEditorChange}
                theme="vs-dark"
                options={{
                  minimap: { enabled: false },
                  fontSize: 14,
                  lineHeight: 20,
                  fontWeight: '400',
                  lineNumbers: 'on',
                  lineNumbersMinChars: 3,
                  scrollBeyondLastLine: false,
                  automaticLayout: true,
                  tabSize: 2,
                  wordWrap: 'on',
                  formatOnPaste: false,
                  formatOnType: false,
                  padding: { top: 16, bottom: 16 },
                  scrollbar: {
                    verticalScrollbarSize: 12,
                    horizontalScrollbarSize: 12,
                  },
                }}
              />
            </div>
          </div>
        </div>

        {/* 右侧/下侧：预览效果 */}
        <div className="w-full lg:w-1/2 h-1/2 lg:h-full bg-white">
          <div className="h-full flex flex-col">
            <div className="px-6 sm:px-8 md:px-12 lg:px-16 xl:px-20 py-4 sm:py-5 md:py-6 lg:py-8 xl:py-10 bg-gray-50 dark:bg-[#252525] border-b-2 border-border dark:border-gray-700">
              <div className="flex items-center justify-between">
                <span className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl text-gray-700 dark:text-gray-300 font-bold flex items-center gap-3 md:gap-4 lg:gap-6">
                  <Eye className="h-8 w-8 sm:h-10 sm:w-10 md:h-12 md:w-12 lg:h-16 lg:w-16 xl:h-20 xl:w-20" />
                  {t('detailpage.preview')}
                </span>
                <span className="hidden lg:inline text-xl md:text-2xl lg:text-3xl xl:text-4xl text-gray-500 dark:text-gray-400 font-semibold">
                  {t('detailpage.updateRealtime')}
                </span>
              </div>
            </div>
            <div className="flex-1 overflow-auto">
              <iframe
                srcDoc={htmlCode}
                className="w-full h-full border-0 bg-white"
                title="Preview"
                sandbox="allow-scripts allow-forms allow-modals allow-same-origin"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
