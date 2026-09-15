'use client';

import type { ReactNode } from 'react';
import { AuthProvider, useAuth } from '@/components/providers/auth-provider';
import { I18nProvider } from '@/components/providers/i18n-provider';
import { AuthDialog } from '@/components/business/AuthDialog';
import { TooltipProvider } from '@/components/ui/tooltip';

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
        {/* delayDuration 调到 200ms：工具栏图标没有文字标签，默认 700ms 太迟钝 */}
        <TooltipProvider delayDuration={200} skipDelayDuration={300}>
          <AuthGate>{children}</AuthGate>
        </TooltipProvider>
      </AuthProvider>
    </I18nProvider>
  );
};
