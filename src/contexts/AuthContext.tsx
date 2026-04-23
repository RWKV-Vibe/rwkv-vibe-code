import { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';
import {
  AUTH_STORAGE_KEY,
  resolveAuthConfig,
  type AuthConfig,
} from '@/utils/authConfig';

interface AuthContextType {
  isAuthenticated: boolean;
  apiUrl: string;
  password: string;
  login: (apiUrl: string, password: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [authConfig, setAuthConfig] = useState<AuthConfig | null>(() =>
    resolveAuthConfig(),
  );

  const login = (apiUrl: string, password: string) => {
    const config = { apiUrl, password };
    setAuthConfig(config);
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(config));
  };

  const logout = () => {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    // 退出后重新解析：开发环境仍会回落到 .env，避免循环登录
    setAuthConfig(resolveAuthConfig());
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated: !!authConfig,
        apiUrl: authConfig?.apiUrl || '',
        password: authConfig?.password || '',
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
