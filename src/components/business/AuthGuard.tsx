import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Server, Lock, Eye, EyeOff } from 'lucide-react';

export const AuthGuard = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, login } = useAuth();
  const [apiUrl, setApiUrl] = useState('');
  const [password, setPassword] = useState('');
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

    // 如果没有协议前缀，自动添加 http://
    let finalUrl = apiUrl.trim();
    if (!finalUrl.startsWith('http://') && !finalUrl.startsWith('https://')) {
      finalUrl = 'http://' + finalUrl;
    }

    login(finalUrl, password.trim());
  };

  if (isAuthenticated) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-8 relative overflow-hidden">
      {/* 背景装饰 */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-500/30 rounded-full blur-3xl animate-pulse" />
        <div
          className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-500/30 rounded-full blur-3xl animate-pulse"
          style={{ animationDelay: '1s' }}
        />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-gradient-to-br from-purple-500/10 to-blue-500/10 rounded-full blur-3xl" />
      </div>

      {/* 登录卡片 */}
      <div className="relative w-full max-w-[1200px]">
        <div className="bg-white/10 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 p-16 md:p-20">
          {/* 标题 */}
          <div className="text-center mb-16">
            <div className="inline-flex items-center justify-center w-32 h-32 bg-gradient-to-br from-purple-500 to-blue-600 rounded-3xl mb-8 shadow-lg">
              <Server className="w-16 h-16 text-white" />
            </div>
            <h1 className="text-7xl md:text-8xl font-bold text-white mb-6">
              RWKV Vibe Code
            </h1>
            <p className="text-3xl text-gray-300">
              请输入 RWKV API 服务地址和密码
            </p>
          </div>

          {/* 表单 */}
          <form onSubmit={handleSubmit} className="space-y-10">
            {/* API 地址输入 */}
            <div>
              <label className="block text-3xl font-semibold text-white mb-4">
                API 地址
              </label>
              <div className="relative">
                <Server className="absolute left-8 top-1/2 -translate-y-1/2 w-10 h-10 text-gray-400" />
                <input
                  type="text"
                  value={apiUrl}
                  onChange={(e) => {
                    setApiUrl(e.target.value);
                    setError('');
                  }}
                  placeholder="192.168.0.82:8001/v1/chat/completions"
                  className="w-full pl-24 pr-8 py-8 bg-white/10 border-2 border-white/30 rounded-2xl
                             text-3xl text-white placeholder-gray-500
                             focus:border-purple-400 focus:outline-none focus:ring-4 focus:ring-purple-500/30
                             transition-all duration-200 hover:bg-white/15"
                />
              </div>
              <p className="mt-3 text-lg text-gray-400">
                💡 无需输入 http://，系统会自动添加
              </p>
            </div>

            {/* 密码输入 */}
            <div>
              <label className="block text-3xl font-semibold text-white mb-4">
                密码
              </label>
              <div className="relative">
                <Lock className="absolute left-8 top-1/2 -translate-y-1/2 w-10 h-10 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setError('');
                  }}
                  placeholder="请输入密码"
                  className="w-full pl-24 pr-24 py-8 bg-white/10 border-2 border-white/30 rounded-2xl
                             text-3xl text-white placeholder-gray-500
                             focus:border-purple-400 focus:outline-none focus:ring-4 focus:ring-purple-500/30
                             transition-all duration-200 hover:bg-white/15"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-8 top-1/2 -translate-y-1/2 p-2 text-gray-400 hover:text-white transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="w-10 h-10" />
                  ) : (
                    <Eye className="w-10 h-10" />
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
              className="w-full py-8 bg-gradient-to-r from-purple-600 to-blue-600 
                         hover:from-purple-500 hover:to-blue-500
                         text-white text-4xl font-bold rounded-2xl
                         shadow-lg hover:shadow-2xl hover:shadow-purple-500/50
                         transition-all duration-200 hover:scale-[1.02]
                         border-2 border-white/20"
            >
              🚀 连接服务器
            </button>
          </form>

          {/* 底部提示 */}
          <p className="mt-8 text-center text-xl text-gray-400">
            配置将永久保存在本地浏览器，请确保使用安全的网络环境
          </p>
        </div>
      </div>
    </div>
  );
};
