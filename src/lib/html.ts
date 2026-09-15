export const DEFAULT_HTML = `<!DOCTYPE html>
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

export const DEFAULT_DETAIL_HTML = `<!DOCTYPE html>
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

const IMPORTANT_CLOSING_TAGS = [
  '</header>',
  '</nav>',
  '</section>',
  '</main>',
  '</article>',
  '</footer>',
  '</aside>',
  '</body>',
  '</html>',
] as const;

const MAIN_CONTAINER_HINTS = [
  '<div class="container',
  '<div class="wrapper',
  '<div class="main',
  '<div id="app',
  '<div id="root',
];

export const isPlaceholderHtml = (html?: string): boolean =>
  !html || html === DEFAULT_HTML || html === DEFAULT_DETAIL_HTML;

export const extractHTMLCode = (content: string): string => {
  const codeBlockMatch = content.match(/```html\s*([\s\S]*?)```/);
  if (codeBlockMatch?.[1]) {
    return codeBlockMatch[1].trim();
  }

  const incompleteMatch = content.match(/```html\s*([\s\S]*?)$/);
  if (incompleteMatch?.[1]?.trim()) {
    return autoCompleteHTML(incompleteMatch[1].trim());
  }

  const startingMatch = content.match(/```html(.*)$/);
  if (startingMatch?.[1]?.trim()) {
    return autoCompleteHTML(startingMatch[1].trim());
  }

  const trimmed = content.trim();
  if (trimmed.startsWith('<!DOCTYPE') || trimmed.startsWith('<html')) {
    return autoCompleteHTML(trimmed);
  }

  return '';
};

/*
 * 增量小于这个值就直接跳过后面的扫描。
 * 这个函数是按 token 调的（24 路流 x 每个 delta 一次），而下面每一条判断
 * 都要 substring 出增量再做若干次 includes —— 逐 token 全量扫描纯属浪费。
 * 攒到接近一行 HTML 的量再看，不会丢事件：oldLength 只在返回 true 时前进，
 * 所以这一轮跳过的内容下一轮仍然在 addedContent 里。
 */
const MIN_DELTA_TO_INSPECT = 96;

export const shouldTriggerRender = (
  newContent: string,
  oldLength: number,
): boolean => {
  const newLength = newContent.length;
  if (newLength - oldLength < MIN_DELTA_TO_INSPECT) return false;

  const addedContent = newContent.substring(oldLength);

  if (oldLength === 0 && newLength > 500) {
    return true;
  }

  if (oldLength > 0 && oldLength < 1000) {
    if (addedContent.includes('<body>') || addedContent.includes('<body ')) {
      return true;
    }
    if (MAIN_CONTAINER_HINTS.some((hint) => addedContent.includes(hint))) {
      return true;
    }
  }

  if (IMPORTANT_CLOSING_TAGS.some((tag) => addedContent.includes(tag))) {
    return true;
  }

  if (newLength - oldLength > 500 && addedContent.includes('</div>')) {
    return true;
  }

  return newLength - oldLength > 1000;
};

export const autoCompleteHTML = (html: string): string => {
  if (html.includes('</html>')) {
    return html;
  }

  let result = html;
  const lastOpenBracket = html.lastIndexOf('<');
  const lastCloseBracket = html.lastIndexOf('>');

  if (lastOpenBracket > lastCloseBracket) {
    result = html.substring(0, lastOpenBracket);
  }

  const styleOpenCount = (result.match(/<style[^>]*>/g) || []).length;
  const styleCloseCount = (result.match(/<\/style>/g) || []).length;
  for (let i = 0; i < styleOpenCount - styleCloseCount; i++) {
    result += '\n</style>';
  }

  const scriptOpenCount = (result.match(/<script[^>]*>/g) || []).length;
  const scriptCloseCount = (result.match(/<\/script>/g) || []).length;
  for (let i = 0; i < scriptOpenCount - scriptCloseCount; i++) {
    result += '\n</script>';
  }

  const hasHeadOpen = /<head[^>]*>/i.test(result);
  const hasHeadClose = /<\/head>/i.test(result);
  if (hasHeadOpen && !hasHeadClose) {
    result += '\n</head>';
  }

  const hasBodyOpen = /<body[^>]*>/i.test(result);
  const hasBodyClose = /<\/body>/i.test(result);
  if (hasBodyOpen && !hasBodyClose) {
    result += '\n</body>';
  }

  const hasHtmlOpen = /<html[^>]*>/i.test(result);
  const hasHtmlClose = /<\/html>/i.test(result);
  if (hasHtmlOpen && !hasHtmlClose) {
    result += '\n</html>';
  }

  if (result.includes('<!DOCTYPE') && !hasHtmlOpen) {
    result += '\n<html>\n<body>\n</body>\n</html>';
  }

  return result;
};

export const isHtmlReadyToRender = (
  content: string,
  htmlCode: string,
): boolean => {
  const aiGeneratedClosingTag =
    content.includes('</html>') || content.includes('</body>');
  const importantBlockCompleted =
    content.includes('</header>') ||
    content.includes('</nav>') ||
    content.includes('</section>') ||
    content.includes('</main>') ||
    content.includes('</article>') ||
    content.includes('</footer>') ||
    content.includes('</aside>');
  const hasBasicStructure = htmlCode.includes('<body') && htmlCode.length > 500;
  const hasEnoughContent = htmlCode.length > 1000;

  return (
    aiGeneratedClosingTag ||
    importantBlockCompleted ||
    hasBasicStructure ||
    hasEnoughContent
  );
};

export const isAiGenerationComplete = (content: string): boolean =>
  content.includes('</html>') || content.includes('</body>');
