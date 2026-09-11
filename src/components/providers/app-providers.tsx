'use client';

import type { ReactNode } from 'react';
import { AuthProvider, useAuth } from '@/components/providers/auth-provider';
import { I18nProvider } from '@/components/providers/i18n-provider';
import { AuthDialog } from '@/components/business/AuthDialog';

const AuthGate = ({ children }: { children: ReactNode }) => {
  const { hydrated, isAuthenticated, login } = useAuth();

  if (!hydrated) {
    return <div className="min-h-screen w-full bg-background" />;
  }

  if (!isAuthenticated) {
    return <AuthDialog onSubmit={login} />;
  }

  return <>{children}</>;
};

export const AppProviders = ({ children }: { children: ReactNode }) => {
  return (
    <I18nProvider>
      <AuthProvider>
        <AuthGate>{children}</AuthGate>
      </AuthProvider>
    </I18nProvider>
  );
};
