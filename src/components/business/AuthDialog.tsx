import { useState, useCallback, memo } from 'react';
import { Server, Key, LogIn, Eye, EyeOff } from 'lucide-react';

interface AuthDialogProps {
  onSubmit: (apiUrl: string, password: string) => void;
}

export const AuthDialog = memo(({ onSubmit }: AuthDialogProps) => {
  const [apiUrl, setApiUrl] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      setError('');

      if (!apiUrl.trim()) {
        setError('请输入 API 地址');
        return;
      }

      if (!password.trim()) {
        setError('请输入密码');
        return;
      }

      // 验证 URL 格式
      try {
        new URL(apiUrl);
      } catch {
        setError('请输入有效的 URL 地址');
        return;
      }

      onSubmit(apiUrl.trim(), password.trim());
    },
    [apiUrl, password, onSubmit],
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-8 overflow-hidden">
      {/* 背景装饰 */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-500/30 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-500/30 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-gradient-to-br from-purple-500/10 to-blue-500/10 rounded-full blur-3xl" />
      </div>

      <div className="relative bg-white/10 backdrop-blur-xl rounded-3xl shadow-2xl w-full max-w-[1200px] p-16 md:p-20 border border-white/20">
        {/* Logo/Title */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center justify-center w-32 h-32 bg-gradient-to-br from-purple-500 to-blue-600 rounded-3xl mb-8 shadow-lg">
            <Server className="h-16 w-16 text-white" />
          </div>
          <h1 className="text-7xl md:text-8xl font-bold text-white mb-6">RWKV Vibe Code</h1>
          <p className="text-3xl text-gray-300">请输入服务器配置以继续</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-10">
          {/* API URL 输入 */}
          <div>
            <label className="block text-3xl font-semibold text-white mb-4">
              API 地址
            </label>
            <div className="relative">
              <Server className="absolute left-8 top-1/2 -translate-y-1/2 h-10 w-10 text-gray-400" />
              <input
                type="text"
                value={apiUrl}
                onChange={(e) => {
                  setApiUrl(e.target.value);
                  setError('');
                }}
                placeholder="http://192.168.1.100:8000/v1/chat/completions"
                className="w-full pl-24 pr-8 py-8 bg-white/10 border-2 border-white/30 rounded-2xl
                           text-white text-3xl placeholder:text-gray-500
                           focus:border-purple-400 focus:outline-none focus:ring-4 focus:ring-purple-500/30
                           transition-all hover:bg-white/15"
              />
            </div>
          </div>

          {/* Password 输入 */}
          <div>
            <label className="block text-3xl font-semibold text-white mb-4">
              密码
            </label>
            <div className="relative">
              <Key className="absolute left-8 top-1/2 -translate-y-1/2 h-10 w-10 text-gray-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError('');
                }}
                placeholder="请输入密码"
                className="w-full pl-24 pr-24 py-8 bg-white/10 border-2 border-white/30 rounded-2xl
                           text-white text-3xl placeholder:text-gray-500
                           focus:border-purple-400 focus:outline-none focus:ring-4 focus:ring-purple-500/30
                           transition-all hover:bg-white/15"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-8 top-1/2 -translate-y-1/2 p-2 text-gray-400 hover:text-white transition-colors"
              >
                {showPassword ? (
                  <EyeOff className="h-10 w-10" />
                ) : (
                  <Eye className="h-10 w-10" />
                )}
              </button>
            </div>
          </div>

          {/* 错误提示 */}
          {error && (
            <div className="p-6 bg-red-500/20 border-2 border-red-500/50 rounded-2xl">
              <p className="text-3xl text-red-200 font-semibold">{error}</p>
            </div>
          )}

          {/* 提交按钮 */}
          <button
            type="submit"
            className="w-full flex items-center justify-center gap-4 py-8 
                       bg-gradient-to-r from-purple-600 to-blue-600 
                       hover:from-purple-500 hover:to-blue-500
                       text-white text-4xl font-bold rounded-2xl
                       shadow-lg hover:shadow-2xl hover:shadow-purple-500/50
                       transition-all duration-200 hover:scale-[1.02]
                       border-2 border-white/20"
          >
            <LogIn className="h-10 w-10" />
            🚀 连接服务器
          </button>
        </form>

        {/* 提示信息 */}
        <p className="mt-8 text-center text-xl text-gray-400">
          配置将永久保存在本地浏览器，请确保使用安全的网络环境
        </p>
      </div>
    </div>
  );
});

AuthDialog.displayName = 'AuthDialog';
