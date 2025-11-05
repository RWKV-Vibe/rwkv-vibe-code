import i18n, { type Resource } from 'i18next';
import { initReactI18next } from 'react-i18next';
import enCommon from './locales/en/common.json';
import zhCommon from './locales/zh/common.json';
import jaCommon from './locales/ja/common.json';
import hiCommon from './locales/hi/common.json';

export const defaultNS = 'common';

export const resources = {
  en: { common: enCommon },
  zh: { common: zhCommon },
  ja: { common: jaCommon },
  hi: { common: hiCommon },
} as const satisfies Resource;

i18n.use(initReactI18next).init({
  resources,
  lng: 'zh', // 默认语言
  fallbackLng: 'zh',
  ns: [defaultNS],
  defaultNS,
  interpolation: {
    escapeValue: false, // React 已经转义
  },
  returnNull: false,
});

export default i18n;
