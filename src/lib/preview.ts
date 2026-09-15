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
 * 在生成的 HTML 末尾追加一小段桥接脚本：
 * 1. 回报整页 scrollHeight，父页面据此判断还能往下滚多少；
 * 2. 接收父页面的滚动指令，在 iframe 内部滚动页面。
 */
export const withHeightReporter = (html: string, id: string): string =>
  `${html}
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
