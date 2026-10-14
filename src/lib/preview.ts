/** 卡片预览里 iframe 的逻辑视口宽度：按桌面尺寸渲染，再整体缩放到列宽 */
export const PREVIEW_FRAME_WIDTH = 1280;

/**
 * iframe 的逻辑视口高度，固定成一个真实桌面视口。
 * iframe 元素多高，页面里的 100vh / min-h-screen 就等于多少，
 * 所以这里必须是 800 这种正常值 —— 一旦按整页高度（几千 px）去设，
 * 首屏 hero 会被撑成几千 px 高，里面的封面图跟着被裁成一块放大的色块。
 */
export const PREVIEW_VIEWPORT_HEIGHT = 800;

/**
 * 逻辑视口高度的可调区间。
 * 卡片高度按"一屏两行"反推，再除以缩放比换算成这个值，
 * 所以它会随窗口高度浮动；钳在这个区间里是为了让它始终像一个
 * 正常的桌面窗口 —— 太矮首屏被截，太高 100vh 的 hero 会被拉变形。
 */
export const PREVIEW_VIEWPORT_HEIGHT_MIN = 700;
export const PREVIEW_VIEWPORT_HEIGHT_MAX = 1400;

const HEIGHT_MESSAGE_SOURCE = 'rwkv-preview-height';
const SCROLL_MESSAGE_SOURCE = 'rwkv-preview-scroll';

export interface PreviewHeightMessage {
  source: typeof HEIGHT_MESSAGE_SOURCE;
  id: string;
  height: number;
}

export const isPreviewHeightMessage = (
  data: unknown,
  id: string,
): data is PreviewHeightMessage => {
  if (typeof data !== 'object' || data === null) return false;
  const message = data as Partial<PreviewHeightMessage>;
  return (
    message.source === HEIGHT_MESSAGE_SOURCE &&
    message.id === id &&
    typeof message.height === 'number' &&
    Number.isFinite(message.height)
  );
};

/** 让卡片里的 iframe 滚到指定位置（父页面 -> iframe） */
export const postPreviewScroll = (
  frame: HTMLIFrameElement | null,
  id: string,
  top: number,
): void => {
  frame?.contentWindow?.postMessage(
    { source: SCROLL_MESSAGE_SOURCE, id, top },
    '*',
  );
};

/**
 * 预览页用的是 Tailwind Play CDN（cdn.tailwindcss.com），它每次加载都会往控制台
 * 打一条「should not be used in production」的告警。对这些沙箱 iframe 里一次性渲染的
 * 单文件页面来说，CDN 就是正确选择、也谈不上「生产」，所以这条告警纯属噪音。
 * 这段脚本在 Tailwind 脚本之前把 console.warn 里这一条过滤掉，其它告警照常。
 */
const TAILWIND_WARNING_SUPPRESSOR = `<script>
(function () {
  var warn = console.warn;
  console.warn = function () {
    var first = arguments[0];
    if (typeof first === 'string' && first.indexOf('cdn.tailwindcss.com') !== -1) {
      return;
    }
    return warn.apply(console, arguments);
  };
})();
</script>`;

/**
 * 把一段脚本插到文档 <head> 开头（紧跟在 <head> 之后），保证它早于页面里的
 * Tailwind CDN <script> 执行。必须让 <!DOCTYPE> 仍是文档的第一个节点 ——
 * 一旦在它之前插东西就会掉进 quirks 模式、把生成页面的布局搞坏，所以绝不前置。
 */
const injectIntoHead = (html: string, snippet: string): string => {
  const headMatch = html.match(/<head[^>]*>/i);
  if (headMatch?.index !== undefined) {
    const at = headMatch.index + headMatch[0].length;
    return `${html.slice(0, at)}\n${snippet}${html.slice(at)}`;
  }
  const htmlMatch = html.match(/<html[^>]*>/i);
  if (htmlMatch?.index !== undefined) {
    const at = htmlMatch.index + htmlMatch[0].length;
    return `${html.slice(0, at)}\n<head>${snippet}</head>${html.slice(at)}`;
  }
  // 没有 html/head 结构（极少见）：此时本就没有规范文档结构，直接前置即可
  return `${snippet}${html}`;
};

/** 给预览文档静音 Tailwind CDN 的生产告警（在 <head> 开头注入过滤脚本） */
export const suppressTailwindWarning = (html: string): string =>
  injectIntoHead(html, TAILWIND_WARNING_SUPPRESSOR);

/**
 * 在生成的 HTML 末尾追加一小段桥接脚本：
 * 1. 回报整页 scrollHeight，父页面据此判断还能往下滚多少；
 * 2. 接收父页面的滚动指令，在 iframe 内部滚动页面。
 *
 * 同时在 <head> 开头静音 Tailwind CDN 的生产告警。
 */
export const withHeightReporter = (html: string, id: string): string =>
  `${suppressTailwindWarning(html)}
<script>
(function () {
  var id = ${JSON.stringify(id)};
  var last = 0;
  function post() {
    var height = Math.max(
      document.documentElement.scrollHeight,
      document.body ? document.body.scrollHeight : 0
    );
    if (!height || Math.abs(height - last) < 8) return;
    last = height;
    try {
      parent.postMessage(
        { source: ${JSON.stringify(HEIGHT_MESSAGE_SOURCE)}, id: id, height: height },
        '*'
      );
    } catch (error) {}
  }
  post();
  window.addEventListener('load', post);
  if (window.ResizeObserver) {
    new ResizeObserver(post).observe(document.documentElement);
  }
  [200, 600, 1500, 3000].forEach(function (delay) {
    setTimeout(post, delay);
  });

  window.addEventListener('message', function (event) {
    var data = event.data;
    if (
      !data ||
      data.source !== ${JSON.stringify(SCROLL_MESSAGE_SOURCE)} ||
      data.id !== id ||
      typeof data.top !== 'number'
    ) {
      return;
    }
    window.scrollTo(0, data.top);
  });
})();
</script>`;
