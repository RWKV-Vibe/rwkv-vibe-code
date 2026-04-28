import { normalizeApiUrlWithPort } from '@/utils/authValidation';

export interface AuthConfig {
  apiUrl: string;
  password: string;
}

export const AUTH_STORAGE_KEY = 'rwkv_auth_config';

const getEnvConfig = (): AuthConfig | null => {
  const rawApiUrl = import.meta.env.PUBLIC_RWKV_API_URL?.trim() || '';
  const apiUrl = normalizeApiUrlWithPort(rawApiUrl);
  if (!apiUrl) return null;
  return {
    apiUrl,
    password: import.meta.env.PUBLIC_RWKV_API_PASSWORD?.trim() || '',
  };
};

const getStorageConfig = (): AuthConfig | null => {
  if (typeof localStorage === 'undefined') return null;
  const saved = localStorage.getItem(AUTH_STORAGE_KEY);
  if (!saved) return null;
  try {
    const parsed = JSON.parse(saved) as Partial<AuthConfig> | null;
    if (!parsed || typeof parsed.apiUrl !== 'string') return null;

    const normalizedApiUrl = normalizeApiUrlWithPort(parsed.apiUrl);
    if (!normalizedApiUrl) {
      localStorage.removeItem(AUTH_STORAGE_KEY);
      return null;
    }

    return {
      apiUrl: normalizedApiUrl,
      password: typeof parsed.password === 'string' ? parsed.password.trim() : '',
    };
  } catch {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    return null;
  }
};

/**
 * 解析认证配置：
 * - 开发环境：优先使用 .env（localStorage 作为回退）
 * - 生产环境：优先使用 localStorage（.env 作为回退）
 */
export const resolveAuthConfig = (): AuthConfig | null => {
  const envConfig = getEnvConfig();
  const storageConfig = getStorageConfig();

  if (import.meta.env.DEV) {
    return envConfig || storageConfig;
  }
  return storageConfig || envConfig;
};
