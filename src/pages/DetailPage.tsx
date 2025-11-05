import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import { ArrowLeft, Eye, Code2, Copy, Download } from 'lucide-react';
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
  const navigate = useNavigate();
  const { t } = useTranslation();

  // 从路由状态中获取传递的数据
  const initialHtmlCode =
    (location.state as { htmlCode?: string; index?: number })?.htmlCode ||
    DEFAULT_HTML;
  const resultIndex = (location.state as { htmlCode?: string; index?: number })
    ?.index;

  const [htmlCode, setHtmlCode] = useState(initialHtmlCode);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (initialHtmlCode) {
      setHtmlCode(initialHtmlCode);
    }
  }, [initialHtmlCode]);

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
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-3 md:gap-4 px-6 py-3 sm:px-8 sm:py-4 md:px-10 md:py-5 lg:px-12 lg:py-6 xl:px-14 xl:py-7 rounded-2xl text-xl sm:text-2xl md:text-3xl lg:text-4xl xl:text-5xl font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-200 hover:scale-[1.02] shadow-lg"
          >
            <ArrowLeft className="h-6 w-6 sm:h-8 sm:w-8 md:h-10 md:w-10 lg:h-12 lg:w-12 xl:h-14 xl:w-14" />
            <span className="hidden sm:inline">{t('detailpage.back')}</span>
          </button>
          {resultIndex !== undefined && (
            <span className="text-xl sm:text-2xl md:text-3xl lg:text-4xl xl:text-5xl font-bold text-gray-600 dark:text-gray-400">
              {t('detailpage.solution', { number: resultIndex + 1 })}
            </span>
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
                onChange={(value) => setHtmlCode(value || '')}
                theme="vs-dark"
                options={{
                  minimap: { enabled: true },
                  fontSize: 32,
                  lineHeight: 48,
                  fontWeight: '600',
                  lineNumbers: 'on',
                  lineNumbersMinChars: 5,
                  scrollBeyondLastLine: false,
                  automaticLayout: true,
                  tabSize: 2,
                  wordWrap: 'on',
                  formatOnPaste: true,
                  formatOnType: true,
                  padding: { top: 24, bottom: 24 },
                  scrollbar: {
                    verticalScrollbarSize: 20,
                    horizontalScrollbarSize: 20,
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
