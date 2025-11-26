import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Server, Lock, Eye, EyeOff } from 'lucide-react';

export const AuthGuard = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, login } = useAuth();
  const [apiUrl, setApiUrl] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
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

    login(apiUrl.trim(), password.trim(), remember);
  };

  if (isAuthenticated) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
      {/* 背景装饰 */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-to-br from-purple-500/20 to-transparent rounded-full blur-3xl" />
        <div className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-gradient-to-tl from-blue-500/20 to-transparent rounded-full blur-3xl" />
      </div>

      {/* 登录卡片 */}
      <div className="relative w-full max-w-2xl">
        <div className="bg-white/10 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 p-12 md:p-16">
          {/* 标题 */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-br from-purple-500 to-blue-600 rounded-2xl mb-6 shadow-lg">
              <Server className="w-12 h-12 text-white" />
            </div>
            <h1 className="text-5xl md:text-6xl font-bold text-white mb-4">
              连接服务器
            </h1>
            <p className="text-2xl text-gray-300">
              请输入 RWKV API 服务地址和密码
            </p>
          </div>

          {/* 表单 */}
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* API 地址输入 */}
            <div>
              <label className="block text-2xl font-semibold text-gray-200 mb-3">
                API 地址
              </label>
              <div className="relative">
                <Server className="absolute left-6 top-1/2 -translate-y-1/2 w-8 h-8 text-gray-400" />
                <input
                  type="text"
                  value={apiUrl}
                  onChange={(e) => {
                    setApiUrl(e.target.value);
                    setError('');
                  }}
                  placeholder="http://192.168.1.100:8000/v1/chat/completions"
                  className="w-full pl-20 pr-6 py-6 bg-white/10 border-2 border-white/20 rounded-2xl
                             text-2xl text-white placeholder-gray-400
                             focus:border-purple-500 focus:outline-none focus:ring-4 focus:ring-purple-500/20
                             transition-all duration-200"
                />
              </div>
            </div>

            {/* 密码输入 */}
            <div>
              <label className="block text-2xl font-semibold text-gray-200 mb-3">
                密码
              </label>
              <div className="relative">
                <Lock className="absolute left-6 top-1/2 -translate-y-1/2 w-8 h-8 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setError('');
                  }}
                  placeholder="请输入密码"
                  className="w-full pl-20 pr-20 py-6 bg-white/10 border-2 border-white/20 rounded-2xl
                             text-2xl text-white placeholder-gray-400
                             focus:border-purple-500 focus:outline-none focus:ring-4 focus:ring-purple-500/20
                             transition-all duration-200"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-6 top-1/2 -translate-y-1/2 p-2 text-gray-400 hover:text-white transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="w-8 h-8" />
                  ) : (
                    <Eye className="w-8 h-8" />
                  )}
                </button>
              </div>
            </div>

            {/* 记住选项 */}
            <div className="flex items-center gap-4">
              <input
                type="checkbox"
                id="remember"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                className="w-7 h-7 rounded-lg border-2 border-white/30 bg-white/10
                           checked:bg-purple-600 checked:border-purple-600
                           focus:ring-4 focus:ring-purple-500/20 cursor-pointer"
              />
              <label htmlFor="remember" className="text-2xl text-gray-300 cursor-pointer">
                记住配置（下次自动登录）
              </label>
            </div>

            {/* 错误提示 */}
            {error && (
              <div className="p-5 bg-red-500/20 border border-red-500/50 rounded-xl">
                <p className="text-2xl text-red-300">{error}</p>
              </div>
            )}

            {/* 提交按钮 */}
            <button
              type="submit"
              className="w-full py-6 bg-gradient-to-r from-purple-600 to-blue-600 
                         hover:from-purple-500 hover:to-blue-500
                         text-white text-3xl font-bold rounded-2xl
                         shadow-lg hover:shadow-xl hover:shadow-purple-500/25
                         transition-all duration-200 hover:scale-[1.02]"
            >
              连接
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

