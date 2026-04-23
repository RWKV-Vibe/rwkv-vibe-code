export interface AuthConfig {
  apiUrl: string;
  password: string;
}

export const AUTH_STORAGE_KEY = 'rwkv_auth_config';

const getEnvConfig = (): AuthConfig | null => {
  const apiUrl = import.meta.env.PUBLIC_RWKV_API_URL?.trim() || '';
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
    const parsed = JSON.parse(saved) as AuthConfig;
    if (!parsed?.apiUrl) return null;
    return parsed;
  } catch {
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
