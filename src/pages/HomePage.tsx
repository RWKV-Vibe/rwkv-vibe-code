import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChatgptPromptInput } from '@/components/business/chatgpt-prompt-input';
import { useTranslation } from 'react-i18next';
import { LanguageSwitcher } from '@/components/ui/language-switcher';

export const HomePage = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [inputValue, setInputValue] = useState('');

  const suggestions = [
    t('homepage.suggestions.hotel'),
    t('homepage.suggestions.museum'),
    t('homepage.suggestions.portfolio'),
    t('homepage.suggestions.cafe'),
    t('homepage.suggestions.saas'),
    t('homepage.suggestions.realEstate'),
    t('homepage.suggestions.corporate'),
    t('homepage.suggestions.gallery'),
  ];

  const handleSuggestionClick = (suggestion: string) => {
    setInputValue(suggestion);
    // 也可以直接提交：handleSubmit(suggestion)
  };

  const handleSubmit = (content: string) => {
    if (content.trim()) {
      sessionStorage.removeItem('chatPageResults');
      sessionStorage.removeItem('chatPagePrompt');
      sessionStorage.removeItem('hasProcessedInitialMessage');

      navigate('/chat', { state: { initialMessage: content } });
      setInputValue('');
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-gradient-to-b from-background to-muted/20 dark:from-[#212121] dark:to-[#212121] px-8 md:px-16 lg:px-24 xl:px-32 py-16">
      {/* Language Switcher - 右上角 */}
      <div className="fixed top-6 right-6 z-50">
        <LanguageSwitcher />
      </div>

      {/* 版心更宽 - 使用更大的最大宽度 */}
      <div className="w-full max-w-[2000px] mx-auto flex flex-col items-center gap-16">
        {/* Title - 更大更清晰的标题 */}
        <h1 className="text-8xl md:text-9xl xl:text-[13rem] font-extrabold tracking-tight text-foreground dark:text-white text-center leading-[0.9]">
          {t('homepage.title')}
        </h1>

        {/* Input - 加宽输入框 */}
        <div className="w-full max-w-[1400px]">
          <ChatgptPromptInput
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onSubmit={handleSubmit}
            placeholder={t('homepage.inputPlaceholder')}
          />
        </div>

        {/* Suggestions - 固定两列布局，更大的字体和间距 */}
        <div className="w-full grid grid-cols-2 gap-8 xl:gap-10">
          {suggestions.map((suggestion) => (
            <button
              key={suggestion}
              onClick={() => handleSuggestionClick(suggestion)}
              className="w-full px-10 py-8 rounded-2xl text-3xl xl:text-4xl font-semibold leading-relaxed
                         bg-secondary hover:bg-secondary/85 dark:bg-[#2d3135] dark:hover:bg-[#3b4045]
                         text-secondary-foreground dark:text-white transition-all duration-200 text-left
                         border border-transparent hover:border-primary/20 dark:hover:border-white/10 shadow-lg
                         hover:shadow-xl hover:scale-[1.02] transform"
            >
              {suggestion}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
