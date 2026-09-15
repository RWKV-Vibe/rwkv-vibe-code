import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { AppProviders } from '@/components/providers/app-providers';
import { ServiceWorkerCleanup } from '@/components/providers/service-worker-cleanup';
import './globals.css';

export const metadata: Metadata = {
  title: 'RWKV Vibe Code',
  description: 'RWKV 大屏网页生成',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="zh" suppressHydrationWarning>
      <body>
        {/* 放在 Provider 外面：它不渲染任何东西，也不该被鉴权门挡住 */}
        <ServiceWorkerCleanup />
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
