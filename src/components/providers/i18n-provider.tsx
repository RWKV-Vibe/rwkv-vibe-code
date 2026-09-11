'use client';

import { useEffect, type ReactNode } from 'react';
import { I18nextProvider } from 'react-i18next';
import i18n from '@/i18n';
import { I18N_STORAGE_KEY } from '@/lib/constants';

export const I18nProvider = ({ children }: { children: ReactNode }) => {
  useEffect(() => {
    const saved = localStorage.getItem(I18N_STORAGE_KEY);
    if (saved && saved !== i18n.language) {
      void i18n.changeLanguage(saved);
    }

    const persist = (lng: string) => {
      localStorage.setItem(I18N_STORAGE_KEY, lng);
    };
    i18n.on('languageChanged', persist);
    return () => {
      i18n.off('languageChanged', persist);
    };
  }, []);

  return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>;
};
