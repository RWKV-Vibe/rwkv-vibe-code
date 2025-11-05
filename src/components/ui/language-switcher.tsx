import { useTranslation } from 'react-i18next';
import { Globe, ChevronDown } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

export const LanguageSwitcher = () => {
  const { i18n } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const languages = [
    { code: 'zh', label: '中文' },
    { code: 'en', label: 'English' },
    { code: 'ja', label: 'Nihongo' },
    { code: 'hi', label: 'हिंदी' },
  ];

  const currentLanguage =
    languages.find((lang) => lang.code === i18n.language) || languages[0];

  const handleLanguageChange = (langCode: string) => {
    i18n.changeLanguage(langCode);
    setIsOpen(false);
  };

  // 点击外部关闭下拉框
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={dropdownRef} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-8 px-16 py-8 rounded-3xl text-4xl font-bold
                   bg-white dark:bg-gray-800
                   hover:bg-gray-50 dark:hover:bg-gray-700
                   text-gray-900 dark:text-white 
                   shadow-2xl hover:shadow-3xl
                   transition-all duration-200 hover:scale-105
                   border-4 border-gray-200 dark:border-gray-600
                   hover:border-gray-300 dark:hover:border-gray-500"
      >
        <Globe className="h-14 w-14" />
        <span className="min-w-[200px] text-left">{currentLanguage.label}</span>
        <ChevronDown
          className={`h-10 w-10 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {isOpen && (
        <div
          className="absolute top-full mt-4 right-0 w-full min-w-[400px]
                        bg-white dark:bg-gray-800 
                        rounded-2xl shadow-2xl 
                        border-4 border-gray-200 dark:border-gray-600
                        overflow-hidden z-50"
        >
          {languages.map((lang) => (
            <button
              key={lang.code}
              onClick={() => handleLanguageChange(lang.code)}
              className={`w-full px-16 py-8 text-4xl font-bold text-left
                         transition-colors duration-150
                         ${
                           lang.code === i18n.language
                             ? 'bg-blue-500 text-white'
                             : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700'
                         }`}
            >
              {lang.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
