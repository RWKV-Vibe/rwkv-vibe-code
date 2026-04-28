const API_URL_EXAMPLE = 'http://192.168.0.12:8000/v1/chat/completions';

interface ApiUrlValidationSuccess {
  ok: true;
  normalizedUrl: string;
}

interface ApiUrlValidationFailure {
  ok: false;
  error: string;
}

export type ApiUrlValidationResult =
  | ApiUrlValidationSuccess
  | ApiUrlValidationFailure;

interface AuthInputValidationSuccess {
  ok: true;
  normalizedUrl: string;
  password: string;
}

interface AuthInputValidationFailure {
  ok: false;
  error: string;
}

export type AuthInputValidationResult =
  | AuthInputValidationSuccess
  | AuthInputValidationFailure;

const hasSupportedProtocol = (protocol: string): boolean =>
  protocol === 'http:' || protocol === 'https:';

export const validateApiUrlWithPort = (
  rawApiUrl: string,
): ApiUrlValidationResult => {
  const input = rawApiUrl.trim();

  if (!input) {
    return { ok: false, error: '请输入 API 地址' };
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(input);
  } catch {
    return {
      ok: false,
      error: `请输入完整 API URL（含协议和端口），例如：${API_URL_EXAMPLE}`,
    };
  }

  if (!hasSupportedProtocol(parsedUrl.protocol)) {
    return { ok: false, error: 'API 地址仅支持 http:// 或 https://' };
  }

  if (!parsedUrl.hostname) {
    return { ok: false, error: 'API 地址缺少主机名（IP 或域名）' };
  }

  if (!parsedUrl.port) {
    return { ok: false, error: 'API 地址必须包含端口号，例如 :8000' };
  }

  const port = Number(parsedUrl.port);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    return { ok: false, error: 'API 端口号必须在 1-65535 之间' };
  }

  if (!parsedUrl.pathname || parsedUrl.pathname === '/') {
    return {
      ok: false,
      error: 'API 地址必须包含完整接口路径，例如 /v1/chat/completions',
    };
  }

  parsedUrl.hash = '';

  return {
    ok: true,
    normalizedUrl: parsedUrl.toString(),
  };
};

export const normalizeApiUrlWithPort = (rawApiUrl: string): string | null => {
  const result = validateApiUrlWithPort(rawApiUrl);
  return result.ok ? result.normalizedUrl : null;
};

export const validateAuthInput = (
  rawApiUrl: string,
  rawPassword: string,
): AuthInputValidationResult => {
  const urlResult = validateApiUrlWithPort(rawApiUrl);
  if (!urlResult.ok) {
    return urlResult;
  }

  const password = rawPassword.trim();
  if (!password) {
    return { ok: false, error: '请输入密码' };
  }

  return {
    ok: true,
    normalizedUrl: urlResult.normalizedUrl,
    password,
  };
};
