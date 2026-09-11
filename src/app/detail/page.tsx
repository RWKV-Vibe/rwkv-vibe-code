import { Suspense } from 'react';
import { DetailPage } from '@/components/detail/detail-page';

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen w-full bg-background dark:bg-[#1e1e1e]" />
      }
    >
      <DetailPage />
    </Suspense>
  );
}
