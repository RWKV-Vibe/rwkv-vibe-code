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

const API_URL = import.meta.env.PUBLIC_RWKV_API_URL;

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

    // 第一次渲染：当有内容且是第一次时（降低阈值到20字符）
    if (oldLength === 0 && newLength > 20) {
      return true;
    }

    // 关键闭合标签列表
    const keyClosingTags = [
      '</header>',
      '</section>',
      '</main>',
      '</article>',
      '</footer>',
      '</nav>',
      '</aside>',
      '</div>', // 添加div标签
      '</body>',
      '</html>',
    ];

    // 检查新增内容中是否包含关键闭合标签
    for (const tag of keyClosingTags) {
      if (addedContent.includes(tag)) {
        return true;
      }
    }

    // 如果内容增长超过200个字符，也触发一次渲染（降低阈值）
    if (newLength - oldLength > 200) {
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

    // 检查并闭合 script 标签
    const scriptOpenCount = (result.match(/<script[^>]*>/g) || []).length;
    const scriptCloseCount = (result.match(/<\/script>/g) || []).length;

    for (let i = 0; i < scriptOpenCount - scriptCloseCount; i++) {
      result += '\n</script>';
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

    return result;
  }

  static async generateMultipleResponses(
    userMessage: string,
    count: number = 24,
    onProgress?: (index: number, content: string, htmlCode: string) => void,
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

    try {
      const response = await fetch(API_URL, {
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
                      `Rendering index ${index}, content length: ${contentBuffers[index].length}, HTML length: ${htmlCode.length}`,
                    );
                    onProgress(index, contentBuffers[index], htmlCode);
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

      // 构建最终结果，并确保最后一次触发渲染
      for (let i = 0; i < count; i++) {
        const content = contentBuffers[i] || '';
        const htmlCode = this.extractHTMLCode(content);
        results.push({ content, htmlCode });

        // 最后一次调用onProgress，确保显示完整内容
        if (onProgress && content.length > 0) {
          const lastLength = lastRenderedLength.get(i) || 0;
          // 如果内容有更新但还没渲染，触发最后一次渲染
          if (content.length > lastLength) {
            onProgress(i, content, htmlCode);
          }
        }
      }

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
1. 明确页面类型和风格（如：现代简约、商务专业、创意艺术等）
2. 详细描述页面布局和结构
3. 指定颜色方案和视觉风格
4. 说明核心功能模块
5. 添加交互细节和用户体验要求
6. 确保描述清晰、具体、可执行

重要：请直接输出优化后的 prompt 纯文本内容，不要使用任何代码块标记（如 \`\`\`），不要有任何多余的解释或说明文字，只输出优化后的 prompt 本身。`;

    const content = `${systemPrompt}\n\nUser: ${userPrompt}\n\nAssistant:`;

    // 构建 contents 数组：将优化请求重复 count 次
    const contents = Array.from({ length: count }, () => content);

    // 存储每个 index 的累积内容
    const contentBuffers: string[] = Array.from({ length: count }, () => '');
    const results: string[] = [];

    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: contents,
          max_tokens: 2048,
          temperature: 0.8,
          top_k: 1,
          top_p: 0.5,
          stream: true,
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
