'use client';

import { useState, useCallback, memo } from 'react';
import { Server, Key, LogIn, Eye, EyeOff } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { validateAuthInput } from '@/lib/auth-validation';

interface AuthDialogProps {
  onSubmit: (apiUrl: string, password: string) => void;
}

export const AuthDialog = memo(({ onSubmit }: AuthDialogProps) => {
  const { t } = useTranslation();
  const [apiUrl, setApiUrl] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      setError('');

      const validation = validateAuthInput(apiUrl, password);
      if (!validation.ok) {
        setError(validation.error);
        return;
      }

      onSubmit(validation.normalizedUrl, validation.password);
    },
    [apiUrl, password, onSubmit],
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-6 overflow-hidden">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-0 left-1/4 w-72 h-72 bg-purple-500/30 rounded-full blur-3xl animate-pulse" />
        <div
          className="absolute bottom-0 right-1/4 w-72 h-72 bg-blue-500/30 rounded-full blur-3xl animate-pulse"
          style={{ animationDelay: '1s' }}
        />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-gradient-to-br from-purple-500/10 to-blue-500/10 rounded-full blur-3xl" />
      </div>

      <div className="relative bg-white/10 backdrop-blur-xl rounded-2xl shadow-2xl w-full max-w-md p-8 border border-white/20">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-gradient-to-br from-purple-500 to-blue-600 rounded-2xl mb-4 shadow-lg">
            <Server className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">
            {t('auth.title')}
          </h1>
          <p className="text-sm text-gray-300">{t('auth.subtitle')}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-white mb-2">
              {t('auth.apiLabel')}
            </label>
            <div className="relative">
              <Server className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={apiUrl}
                onChange={(e) => {
                  setApiUrl(e.target.value);
                  setError('');
                }}
                placeholder={t('auth.apiPlaceholder')}
                className="w-full h-11 pl-9 pr-3 bg-white/10 border border-white/30 rounded-xl
                           text-white text-sm placeholder:text-gray-500
                           focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-500/30
                           transition-colors hover:bg-white/15"
              />
            </div>
            <p className="mt-2 text-xs text-gray-400">{t('auth.apiHint')}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-white mb-2">
              {t('auth.passwordLabel')}
            </label>
            <div className="relative">
              <Key className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError('');
                }}
                placeholder={t('auth.passwordPlaceholder')}
                className="w-full h-11 pl-9 pr-10 bg-white/10 border border-white/30 rounded-xl
                           text-white text-sm placeholder:text-gray-500
                           focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-500/30
                           transition-colors hover:bg-white/15"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          {error && (
            <div className="rounded-xl border border-red-500/50 bg-red-500/20 p-3">
              <p className="text-sm text-red-200">{error}</p>
            </div>
          )}

          <button
            type="submit"
            className="flex h-11 w-full items-center justify-center gap-2
                       bg-gradient-to-r from-purple-600 to-blue-600
                       hover:from-purple-500 hover:to-blue-500
                       text-white text-sm font-semibold rounded-xl
                       shadow-lg transition-colors
                       border border-white/20"
          >
            <LogIn className="h-4 w-4" />
            {t('auth.submit')}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-gray-400">
          {t('auth.persistHint')}
        </p>
      </div>
    </div>
  );
});

AuthDialog.displayName = 'AuthDialog';
