import { AUTH_STORAGE_KEY } from '@/utils/authConfig';
import { MODEL_SETTINGS_STORAGE_KEY } from '@/utils/modelSettings';

export const CHAT_PAGE_RESULTS_KEY = 'chatPageResults';
export const CHAT_PAGE_PROMPT_KEY = 'chatPagePrompt';
export const CHAT_PAGE_PROCESSED_FLAG_KEY = 'hasProcessedInitialMessage';

const CHAT_PAGE_CACHE_KEYS = [
  CHAT_PAGE_RESULTS_KEY,
  CHAT_PAGE_PROMPT_KEY,
  CHAT_PAGE_PROCESSED_FLAG_KEY,
] as const;

interface ClearAppCacheOptions {
  includeAuth?: boolean;
  includeModelSettings?: boolean;
  includeSessionStorage?: boolean;
}

export const clearChatPageCache = (): void => {
  if (typeof localStorage === 'undefined') return;

  for (const key of CHAT_PAGE_CACHE_KEYS) {
    localStorage.removeItem(key);
  }
};

export const clearAppCache = (options: ClearAppCacheOptions = {}): void => {
  const {
    includeAuth = false,
    includeModelSettings = false,
    includeSessionStorage = false,
  } = options;

  clearChatPageCache();

  if (typeof localStorage !== 'undefined') {
    if (includeAuth) {
      localStorage.removeItem(AUTH_STORAGE_KEY);
    }

    if (includeModelSettings) {
      localStorage.removeItem(MODEL_SETTINGS_STORAGE_KEY);
    }
  }

  if (includeSessionStorage && typeof sessionStorage !== 'undefined') {
    sessionStorage.clear();
  }
};
