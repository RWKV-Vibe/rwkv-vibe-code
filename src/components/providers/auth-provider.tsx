'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import {
  AUTH_STORAGE_KEY,
  resolveAuthConfig,
  type AuthConfig,
} from '@/lib/auth-config';
import { normalizeApiUrlWithPort } from '@/lib/auth-validation';

interface AuthContextType {
  isAuthenticated: boolean;
  hydrated: boolean;
  apiUrl: string;
  password: string;
  login: (apiUrl: string, password: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [hydrated, setHydrated] = useState(false);
  const [authConfig, setAuthConfig] = useState<AuthConfig | null>(null);

  useEffect(() => {
    setAuthConfig(resolveAuthConfig());
    setHydrated(true);
  }, []);

  const login = (apiUrl: string, password: string) => {
    const normalizedApiUrl = normalizeApiUrlWithPort(apiUrl);
    if (!normalizedApiUrl) return;

    const config = { apiUrl: normalizedApiUrl, password: password.trim() };
    setAuthConfig(config);
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(config));
  };

  const logout = () => {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    setAuthConfig(resolveAuthConfig());
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated: !!authConfig,
        hydrated,
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
