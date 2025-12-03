import i18n from '../i18n';

interface StreamChunk {
  object: string;
  choices: {
    index: number;
    delta: {
      content?: string;
    };
  }[];
}

interface AuthConfig {
  apiUrl: string;
  password: string;
}

const STORAGE_KEY = 'rwkv_auth_config';

// 获取认证配置
const getAuthConfig = (): AuthConfig => {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch {
      // ignore
    }
  }
  // 回退到环境变量
  return {
    apiUrl: import.meta.env.PUBLIC_RWKV_API_URL || '',
    password: '',
  };
};

export class AIService {
  // 提取HTML代码并自动闭合标签
  private static extractHTMLCode(content: string): string {
    // 方式1: 匹配完整的 ```html 代码块
    const codeBlockMatch = content.match(/```html\s*([\s\S]*?)```/);
    if (codeBlockMatch && codeBlockMatch[1]) {
      const result = codeBlockMatch[1].trim();
      console.log('[提取] 方式1-完整代码块:', result.substring(0, 100));
      return result;
    }

    // 方式2: 匹配未完成的代码块（用于流式渲染）
    const incompleteMatch = content.match(/```html\s*([\s\S]*?)$/);
    if (incompleteMatch && incompleteMatch[1]) {
      const code = incompleteMatch[1].trim();
      if (code.length > 0) {
        console.log('[提取] 方式2-未完成代码块:', code.substring(0, 100));
        // 自动补全闭合标签，实现实时渲染
        return this.autoCompleteHTML(code);
      }
    }

    // 方式3: 匹配未完成的 ```html（还没有换行）
    const startingMatch = content.match(/```html(.*)$/);
    if (startingMatch) {
      const code = startingMatch[1].trim();
      if (code.length > 0) {
        console.log('[提取] 方式3-未换行:', code.substring(0, 100));
        return this.autoCompleteHTML(code);
      }
    }

    // 方式4: 如果内容直接以 <!DOCTYPE 或 <html 开头（无代码块标记）
    const trimmed = content.trim();
    if (trimmed.startsWith('<!DOCTYPE') || trimmed.startsWith('<html')) {
      console.log('[提取] 方式4-直接HTML:', trimmed.substring(0, 100));
      return this.autoCompleteHTML(trimmed);
    }

    // 如果没有找到HTML代码，返回空字符串（避免显示说明文字）
    console.log('[提取] 未找到HTML，原始内容:', content.substring(0, 200));
    return '';
  }

  // 检测是否应该触发渲染（关键区块完成时）
  private static shouldTriggerRender(
    newContent: string,
    oldLength: number,
  ): boolean {
    const newLength = newContent.length;
    const addedContent = newContent.substring(oldLength);

    // 第一次渲染：当检测到 <body> 标签且有足够内容时
    // 提高阈值到 500，避免过早渲染不完整的内容
    if (oldLength === 0 && newLength > 500) {
      console.log(`[触发渲染] 首次渲染，内容长度: ${newLength}`);
      return true;
    }

    // 关键开始标签：检测到 body 开始或第一个 div 容器时触发
    if (oldLength > 0 && oldLength < 1000) {
      // 检测 body 标签
      const bodyStartTags = ['<body>', '<body '];
      for (const tag of bodyStartTags) {
        if (addedContent.includes(tag)) {
          console.log(`[触发渲染] 检测到 body 开始标签`);
          return true;
        }
      }

      // 检测第一个主容器 div（通常是 class="container" 或类似的）
      // 这通常是 body 下的第一个重要元素
      if (
        addedContent.includes('<div class="container') ||
        addedContent.includes('<div class="wrapper') ||
        addedContent.includes('<div class="main') ||
        addedContent.includes('<div id="app') ||
        addedContent.includes('<div id="root')
      ) {
        console.log(`[触发渲染] 检测到主容器 div`);
        return true;
      }
    }

    // ⭐ 重要区块的闭合标签（只在这些标签时才触发，避免频繁更新）
    const importantClosingTags = [
      '</header>', // 头部区块完成
      '</nav>', // 导航区块完成
      '</section>', // 内容区块完成
      '</main>', // 主内容区块完成
      '</article>', // 文章区块完成
      '</footer>', // 底部区块完成
      '</aside>', // 侧边栏区块完成
      '</body>', // body 完成
      '</html>', // 整个文档完成
    ];

    // 检查新增内容中是否包含重要区块的闭合标签
    for (const tag of importantClosingTags) {
      if (addedContent.includes(tag)) {
        console.log(`[触发渲染] 重要区块完成: ${tag}`);
        return true;
      }
    }

    // 特殊处理 </div>：如果内容增长超过 500 字符且遇到 </div>，则触发
    // 这样可以捕获像 container 这样的外层 div 闭合，以及较大的内容区块
    if (newLength - oldLength > 500 && addedContent.includes('</div>')) {
      console.log(
        `[触发渲染] 内容增长 ${newLength - oldLength} 字符，且检测到 </div>`,
      );
      return true;
    }

    // 如果内容增长超过 1000 个字符，也触发一次渲染
    // 确保即使没有闭合标签，大量内容也能及时显示
    if (newLength - oldLength > 1000) {
      console.log(`[触发渲染] 内容增长超过1000字符: ${newLength - oldLength}`);
      return true;
    }

    return false;
  }

  // 自动补全关键HTML标签（html、body、script），使未完成的HTML可以实时渲染
  private static autoCompleteHTML(html: string): string {
    // 如果已经有闭合的 </html>，直接返回
    if (html.includes('</html>')) {
      return html;
    }

    let result = html;

    // 移除最后可能不完整的标签（如 "<div cla" 这种）
    const lastOpenBracket = html.lastIndexOf('<');
    const lastCloseBracket = html.lastIndexOf('>');

    if (lastOpenBracket > lastCloseBracket) {
      result = html.substring(0, lastOpenBracket);
    }

    // 检查并闭合 style 标签
    const styleOpenCount = (result.match(/<style[^>]*>/g) || []).length;
    const styleCloseCount = (result.match(/<\/style>/g) || []).length;

    for (let i = 0; i < styleOpenCount - styleCloseCount; i++) {
      result += '\n</style>';
    }

    // 检查并闭合 script 标签
    const scriptOpenCount = (result.match(/<script[^>]*>/g) || []).length;
    const scriptCloseCount = (result.match(/<\/script>/g) || []).length;

    for (let i = 0; i < scriptOpenCount - scriptCloseCount; i++) {
      result += '\n</script>';
    }

    // 检查并闭合 head 标签
    const hasHeadOpen = /<head[^>]*>/i.test(result);
    const hasHeadClose = /<\/head>/i.test(result);

    if (hasHeadOpen && !hasHeadClose) {
      result += '\n</head>';
    }

    // 检查并闭合 body 标签
    const hasBodyOpen = /<body[^>]*>/i.test(result);
    const hasBodyClose = /<\/body>/i.test(result);

    if (hasBodyOpen && !hasBodyClose) {
      result += '\n</body>';
    }

    // 检查并闭合 html 标签
    const hasHtmlOpen = /<html[^>]*>/i.test(result);
    const hasHtmlClose = /<\/html>/i.test(result);

    if (hasHtmlOpen && !hasHtmlClose) {
      result += '\n</html>';
    }

    // 如果没有任何HTML结构，但有DOCTYPE，至少补全基本结构
    if (result.includes('<!DOCTYPE') && !hasHtmlOpen) {
      result += '\n<html>\n<body>\n</body>\n</html>';
    }

    return result;
  }

  static async generateMultipleResponses(
    userMessage: string,
    count: number = 24,
    onProgress?: (
      index: number,
      content: string,
      htmlCode: string,
      isComplete?: boolean,
      tokenRate?: number,
      totalTokens?: number,
    ) => void,
    abortController?: AbortController,
  ): Promise<Array<{ content: string; htmlCode: string }>> {
    const controller = abortController || new AbortController();

    // 构建 contents 数组：将用户问题重复 count 次
    const contents = Array.from(
      { length: count },
      () =>
        `User: ${i18n.t('aiService.promptPrefix')} ${userMessage}\n\nAssistant: <think`, // 这个 <think 是我们使用的特定LLM的必要的模板标志
    );

    // 存储每个 index 的累积内容
    const contentBuffers: string[] = Array.from({ length: count }, () => '');
    // 存储每个 index 上次渲染的HTML长度，用于判断是否需要更新
    const lastRenderedLength: Map<number, number> = new Map();
    const results: Array<{ content: string; htmlCode: string }> = [];

    // Token 速率计算
    let totalTokenCount = 0;
    const startTime = Date.now();

    try {
      const authConfig = getAuthConfig();
      const response = await fetch(authConfig.apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: contents,
          max_tokens: 8192,
          temperature: 1.0,
          top_k: 1,
          top_p: 0.3,
          pad_zero: true,
          alpha_presence: 0.5,
          alpha_frequency: 0.5,
          alpha_decay: 0.996,
          chunk_size: 128,
          stream: true,
          password: authConfig.password,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const text = await response.text().catch(() => '');
        throw new Error(
          i18n.t('aiService.httpError', {
            status: response.status,
            statusText: response.statusText,
            text,
          }),
        );
      }

      if (!response.body) {
        throw new Error(i18n.t('aiService.streamNotAvailable'));
      }

      const reader: ReadableStreamDefaultReader<Uint8Array> =
        response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let partial = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        partial += chunk;

        // 逐行解析 SSE
        const lines = partial.split('\n');
        partial = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;

          const data = line.slice(6).trim();
          if (data === '[DONE]') continue;

          try {
            const json: StreamChunk = JSON.parse(data);
            if (json.choices && json.choices.length > 0) {
              for (const choice of json.choices) {
                const index = choice.index;
                const delta = choice.delta?.content ?? '';

                if (delta && index >= 0 && index < count) {
                  contentBuffers[index] += delta;

                  // 累计 token 数（delta 的字符数作为 token 的估算）
                  totalTokenCount += delta.length;

                  // 计算当前 token 速率
                  const elapsedSeconds = (Date.now() - startTime) / 1000;
                  const tokenRate =
                    elapsedSeconds > 0
                      ? Math.round(totalTokenCount / elapsedSeconds)
                      : 0;

                  // 检查是否应该触发渲染
                  const lastLength = lastRenderedLength.get(index) || 0;
                  const shouldRender = this.shouldTriggerRender(
                    contentBuffers[index],
                    lastLength,
                  );

                  if (shouldRender && onProgress) {
                    const htmlCode = this.extractHTMLCode(
                      contentBuffers[index],
                    );
                    console.log(
                      `Rendering index ${index}, content length: ${contentBuffers[index].length}, HTML length: ${htmlCode.length}, Token rate: ${tokenRate} tok/s`,
                    );
                    onProgress(
                      index,
                      contentBuffers[index],
                      htmlCode,
                      false,
                      tokenRate,
                      totalTokenCount,
                    );
                    // 更新上次渲染的长度
                    lastRenderedLength.set(index, contentBuffers[index].length);
                  }
                }
              }
            }
          } catch (err) {
            console.warn('Failed to parse JSON:', err);
          }
        }
      }

      // 构建最终结果，并确保最后一次触发渲染（标记为完成）
      const elapsedSeconds = (Date.now() - startTime) / 1000;
      const finalTokenRate =
        elapsedSeconds > 0 ? Math.round(totalTokenCount / elapsedSeconds) : 0;

      for (let i = 0; i < count; i++) {
        const content = contentBuffers[i] || '';
        const htmlCode = this.extractHTMLCode(content);
        results.push({ content, htmlCode });

        // 最后一次调用onProgress，标记该 index 已完成
        if (onProgress && content.length > 0) {
          onProgress(
            i,
            content,
            htmlCode,
            true,
            finalTokenRate,
            totalTokenCount,
          ); // isComplete = true
        }
      }

      console.log(
        `✅ 生成完成！总计: ${totalTokenCount} tokens, 平均速率: ${finalTokenRate} tok/s, 用时: ${elapsedSeconds.toFixed(2)}s`,
      );

      return results;
    } catch (err: unknown) {
      console.error(i18n.t('aiService.generationFailed'), err);
      throw err;
    }
  }

  // 优化 Prompt（用于网页生成）- 并行生成多个优化版本
  static async optimizePrompt(
    userPrompt: string,
    count: number = 5,
    onProgress?: (index: number, content: string) => void,
    abortController?: AbortController,
  ): Promise<string[]> {
    const controller = abortController || new AbortController();

    // 构建优化 prompt 的系统提示
    const systemPrompt = `你是一个专业的网页设计 prompt 优化专家。用户会给你一个网页生成的需求描述，你需要将其优化成更详细、更专业的 prompt，帮助 AI 生成更好的网页。

优化要点：
1. **具体的配色方案**：不要只说"现代配色"或"暖色调"，要指定具体颜色，如"浅米色(#F5F5DC)、奶油白(#FFFDD0)、木质棕(#8B7355)"、"霓虹粉(#FF10F0)、青色(#00FFFF)、炭黑(#1A1A1A)"等
2. **精确的数量和布局**：明确元素数量，如"六个商品卡片"、"三栏布局"、"4x3网格"等
3. **详细的排版细节**：指定字体类型（衬线/无衬线）、字号、间距、行高等，如"使用衬线字体，适度的间距"
4. **功能和视觉分离**：将需求分为"功能"和"视觉"两部分描述，如"功能：默认25分钟倒计时，有开始、暂停、重置按钮。视觉：居中显示巨大的数字，渐变背景（从粉色到紫色）"
5. **具体的模块列表**：明确列出页面包含的功能模块，如"品牌介绍、菜单展示、活动信息、联系方式"
6. **氛围和体验描述**：用形容词描述整体感觉，如"营造怀旧、赛博朋克的视觉体验"、"突出咖啡馆的温馨氛围"
7. **交互细节**：说明具体的交互行为，如"倒计时结束时弹出浏览器原生 Alert"、"卡片悬停时显示详情"

参考示例风格：
- "创建一个温馨的本地咖啡馆官网，采用暖色调配色方案，包括浅米色、奶油白和柔和的木质色系，搭配优雅的排版风格，使用衬线字体和适度的间距。首页包含品牌介绍、菜单展示、活动信息和联系方式等模块"
- "创建一个90年代复古风格的商店网页，采用赛博朋克配色方案，包括饱和度极高的霓虹粉、青色和炭黑背景，有六个复古商品的卡片，底部有六个新闻项，营造怀旧、赛博朋克的视觉体验"

重要：请直接输出优化后的 prompt 纯文本内容，不要使用任何代码块标记（如 \`\`\`），不要有任何多余的解释或说明文字，只输出优化后的 prompt 本身。`;

    const content = `${systemPrompt}\n\nUser: ${userPrompt}\n\nAssistant:<think>\n</think>`;

    // 构建 contents 数组：将优化请求重复 count 次
    const contents = Array.from({ length: count }, () => content);

    // 存储每个 index 的累积内容
    const contentBuffers: string[] = Array.from({ length: count }, () => '');
    const results: string[] = [];

    try {
      const authConfig = getAuthConfig();
      const response = await fetch(authConfig.apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: contents,
          max_tokens: 2048,
          temperature: 0.8,
          top_k: 1,
          top_p: 0.5,
          stream: true,
          enable_think: false,
          password: authConfig.password,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const text = await response.text().catch(() => '');
        throw new Error(
          i18n.t('aiService.httpError', {
            status: response.status,
            statusText: response.statusText,
            text,
          }),
        );
      }

      if (!response.body) {
        throw new Error(i18n.t('aiService.streamNotAvailable'));
      }

      const reader: ReadableStreamDefaultReader<Uint8Array> =
        response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let partial = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        partial += chunk;

        const lines = partial.split('\n');
        partial = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;

          const data = line.slice(6).trim();
          if (data === '[DONE]') continue;

          try {
            const json: StreamChunk = JSON.parse(data);
            if (json.choices && json.choices.length > 0) {
              for (const choice of json.choices) {
                const index = choice.index;
                const delta = choice.delta?.content ?? '';

                if (delta && index >= 0 && index < count) {
                  contentBuffers[index] += delta;
                  if (onProgress) {
                    onProgress(index, contentBuffers[index]);
                  }
                }
              }
            }
          } catch (err) {
            console.warn('Failed to parse JSON:', err);
          }
        }
      }

      // 构建最终结果
      for (let i = 0; i < count; i++) {
        results.push(contentBuffers[i].trim());
      }

      return results;
    } catch (err: unknown) {
      console.error('Prompt optimization failed:', err);
      throw err;
    }
  }
}
