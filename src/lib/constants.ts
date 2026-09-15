export const GENERATION_COUNT = 24;
/** 桌面端最大列数：24 条结果 = 4 x 6 */
export const GRID_COLUMNS = 4;
/** 一屏正好露出几行卡片（卡片高度按可视区反推，而不是写死宽高比） */
export const GRID_ROWS_PER_SCREEN = 2;
export const OPTIMIZE_COUNT = 5;
export const DETAIL_CHANNEL_NAME = 'rwkv-detail-channel';
export const IFRAME_BATCH_SIZE = 4;
export const IFRAME_BATCH_DELAY_MS = 600;
/** React 状态合并刷新的节流窗口：一个窗口内所有卡片的增量攒成一次 setState */
export const UI_FLUSH_THROTTLE_MS = 120;
/**
 * 结果落盘的节流窗口。
 * 落盘 = JSON.stringify 24 份完整 HTML（几百 KB）+ 同步写 localStorage，
 * 是主线程上最贵的一步，绝不能跟着 UI 刷新的节奏走。
 */
export const PERSIST_THROTTLE_MS = 1500;
/**
 * 单张卡片在流式过程中最快多久重刷一次 iframe。
 * 换 srcDoc 等于整份文档重新解析 + 里面的 Tailwind CDN 重新跑一遍 JIT，
 * 是卡顿的大头；首帧和收尾不受这个限制，中间的增量才排队。
 */
export const PREVIEW_REFRESH_INTERVAL_MS = 900;
export const I18N_STORAGE_KEY = 'rwkv_i18n_lang';

export const CHAT_INITIAL_MESSAGE_KEY = 'chatInitialMessage';
export const CHAT_SHOULD_GENERATE_KEY = 'chatShouldGenerate';
export const CHAT_API_PATH = '/api/chat';
