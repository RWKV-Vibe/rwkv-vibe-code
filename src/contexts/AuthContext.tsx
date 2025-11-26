import { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';

interface AuthConfig {
  apiUrl: string;
  password: string;
}

interface AuthContextType {
  isAuthenticated: boolean;
  apiUrl: string;
  password: string;
  login: (apiUrl: string, password: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

const STORAGE_KEY = 'rwkv_auth_config';

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [authConfig, setAuthConfig] = useState<AuthConfig | null>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return null;
      }
    }
    return null;
  });

  const login = (apiUrl: string, password: string) => {
    const config = { apiUrl, password };
    setAuthConfig(config);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  };

  const logout = () => {
    setAuthConfig(null);
    localStorage.removeItem(STORAGE_KEY);
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
