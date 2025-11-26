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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4">
      {/* 背景装饰 */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500/20 rounded-full blur-3xl" />
      </div>

      <div className="relative bg-white/10 backdrop-blur-xl rounded-3xl shadow-2xl w-full max-w-2xl p-12 border border-white/20">
        {/* Logo/Title */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-br from-purple-500 to-blue-600 rounded-2xl mb-6 shadow-lg">
            <Server className="h-12 w-12 text-white" />
          </div>
          <h1 className="text-5xl font-bold text-white mb-3">RWKV Vibe Code</h1>
          <p className="text-2xl text-gray-300">请输入服务器配置以继续</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* API URL 输入 */}
          <div>
            <label className="block text-2xl font-semibold text-gray-200 mb-3">
              API 地址
            </label>
            <div className="relative">
              <Server className="absolute left-6 top-1/2 -translate-y-1/2 h-8 w-8 text-gray-400" />
              <input
                type="text"
                value={apiUrl}
                onChange={(e) => setApiUrl(e.target.value)}
                placeholder="http://192.168.1.100:8080/v1/chat"
                className="w-full pl-20 pr-6 py-6 bg-white/10 border-2 border-white/20 rounded-2xl
                           text-white text-3xl placeholder:text-gray-500
                           focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50
                           transition-all"
              />
            </div>
          </div>

          {/* Password 输入 */}
          <div>
            <label className="block text-2xl font-semibold text-gray-200 mb-3">
              密码
            </label>
            <div className="relative">
              <Key className="absolute left-6 top-1/2 -translate-y-1/2 h-8 w-8 text-gray-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="请输入密码"
                className="w-full pl-20 pr-20 py-6 bg-white/10 border-2 border-white/20 rounded-2xl
                           text-white text-3xl placeholder:text-gray-500
                           focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50
                           transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-6 top-1/2 -translate-y-1/2 p-2 text-gray-400 hover:text-white transition-colors"
              >
                {showPassword ? (
                  <EyeOff className="h-8 w-8" />
                ) : (
                  <Eye className="h-8 w-8" />
                )}
              </button>
            </div>
          </div>

          {/* 错误提示 */}
          {error && (
            <div className="p-4 bg-red-500/20 border border-red-500/50 rounded-xl">
              <p className="text-2xl text-red-300">{error}</p>
            </div>
          )}

          {/* 提交按钮 */}
          <button
            type="submit"
            className="w-full flex items-center justify-center gap-4 py-6 
                       bg-gradient-to-r from-purple-600 to-blue-600 
                       hover:from-purple-700 hover:to-blue-700
                       text-white text-3xl font-bold rounded-2xl
                       shadow-lg hover:shadow-xl
                       transition-all duration-200 hover:scale-[1.02]"
          >
            <LogIn className="h-8 w-8" />
            连接服务器
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
