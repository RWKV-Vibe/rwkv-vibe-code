import i18n from '@/i18n';
import { resolveAuthConfig } from '@/lib/auth-config';
import { CHAT_API_PATH } from '@/lib/constants';
import { loadModelSettings, type ModelSettings } from '@/lib/model-settings';
import { consumeSseJsonStream } from '@/lib/sse';
import { extractHTMLCode, shouldTriggerRender } from '@/lib/html';

const PROMPT_OPTIMIZE_SYSTEM = `你是一个专业的网页设计 prompt 优化专家。用户会给你一个网页生成的需求描述，你需要将其优化成更详细、更专业的 prompt，帮助 AI 生成更好的网页。

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

interface ChatStreamOptions {
  contents: string[];
  signal: AbortSignal;
  extra?: Record<string, unknown>;
}

const buildPayload = (
  contents: string[],
  settings: ModelSettings,
  extra?: Record<string, unknown>,
) => ({
  contents,
  max_tokens: settings.max_tokens,
  temperature: settings.temperature,
  top_k: settings.top_k,
  top_p: settings.top_p,
  alpha_presence: settings.alpha_presence,
  alpha_frequency: settings.alpha_frequency,
  alpha_decay: settings.alpha_decay,
  chunk_size: settings.chunk_size,
  stream: true,
  enable_think: false,
  ...extra,
});

async function openChatStream({
  contents,
  signal,
  extra,
}: ChatStreamOptions): Promise<ReadableStream<Uint8Array>> {
  const authConfig = resolveAuthConfig();
  if (!authConfig?.apiUrl) {
    throw new Error(i18n.t('aiService.generationFailed'));
  }

  const settings = loadModelSettings();
  const response = await fetch(CHAT_API_PATH, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...buildPayload(contents, settings, extra),
      apiUrl: authConfig.apiUrl,
      password: authConfig.password,
    }),
    signal,
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

  return response.body;
}

export type GenerationProgress = (
  index: number,
  content: string,
  htmlCode: string,
  isComplete?: boolean,
  tokenRate?: number,
  totalTokens?: number,
) => void;

export class AIService {
  static async generateMultipleResponses(
    userMessage: string,
    count: number = 24,
    onProgress?: GenerationProgress,
    abortController?: AbortController,
  ): Promise<Array<{ content: string; htmlCode: string }>> {
    const controller = abortController ?? new AbortController();
    const contents = Array.from(
      { length: count },
      () =>
        `User: ${i18n.t('aiService.promptPrefix')} ${userMessage}\n\nAssistant: <think></think`,
    );

    const contentBuffers = Array.from({ length: count }, () => '');
    const lastRenderedLength = new Map<number, number>();
    const results: Array<{ content: string; htmlCode: string }> = [];

    let totalTokenCount = 0;
    const startTime = Date.now();

    const body = await openChatStream({
      contents,
      signal: controller.signal,
      extra: { pad_zero: true },
    });

    await consumeSseJsonStream(body, (json) => {
      if (!json.choices?.length) return;

      for (const choice of json.choices) {
        const index = choice.index;
        const delta = choice.delta?.content ?? '';
        if (!delta || index < 0 || index >= count) continue;

        contentBuffers[index] += delta;
        totalTokenCount += delta.length;

        const elapsedSeconds = (Date.now() - startTime) / 1000;
        const tokenRate =
          elapsedSeconds > 0
            ? Math.round(totalTokenCount / elapsedSeconds)
            : 0;

        const lastLength = lastRenderedLength.get(index) || 0;
        if (!shouldTriggerRender(contentBuffers[index], lastLength)) continue;

        onProgress?.(
          index,
          contentBuffers[index],
          extractHTMLCode(contentBuffers[index]),
          false,
          tokenRate,
          totalTokenCount,
        );
        lastRenderedLength.set(index, contentBuffers[index].length);
      }
    });

    const elapsedSeconds = (Date.now() - startTime) / 1000;
    const finalTokenRate =
      elapsedSeconds > 0 ? Math.round(totalTokenCount / elapsedSeconds) : 0;

    for (let i = 0; i < count; i++) {
      const content = contentBuffers[i] || '';
      const htmlCode = extractHTMLCode(content);
      results.push({ content, htmlCode });
      if (content.length > 0) {
        onProgress?.(
          i,
          content,
          htmlCode,
          true,
          finalTokenRate,
          totalTokenCount,
        );
      }
    }

    return results;
  }

  static async optimizePrompt(
    userPrompt: string,
    count: number = 5,
    onProgress?: (index: number, content: string) => void,
    abortController?: AbortController,
  ): Promise<string[]> {
    const controller = abortController ?? new AbortController();
    const content = `${PROMPT_OPTIMIZE_SYSTEM}\n\nUser: ${userPrompt}\n\nAssistant:<think>\n</think>`;
    const contents = Array.from({ length: count }, () => content);
    const contentBuffers = Array.from({ length: count }, () => '');

    const body = await openChatStream({
      contents,
      signal: controller.signal,
    });

    await consumeSseJsonStream(body, (json) => {
      if (!json.choices?.length) return;
      for (const choice of json.choices) {
        const index = choice.index;
        const delta = choice.delta?.content ?? '';
        if (!delta || index < 0 || index >= count) continue;
        contentBuffers[index] += delta;
        onProgress?.(index, contentBuffers[index]);
      }
    });

    return contentBuffers.map((item) => item.trim());
  }
}
