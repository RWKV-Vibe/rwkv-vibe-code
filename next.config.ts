import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  poweredByHeader: false,
  experimental: {
    optimizePackageImports: ['lucide-react'],
  },
  /*
   * public/sw.js 是个「装上就自杀」的墓碑脚本，用来清掉这个 origin 上
   * 遗留的旧 Service Worker。它必须每次都回源校验，否则浏览器缓存住旧的
   * SW 脚本，墓碑永远没机会生效。
   */
  async headers() {
    return [
      {
        source: '/sw.js',
        headers: [
          { key: 'Cache-Control', value: 'no-store, must-revalidate' },
          { key: 'Service-Worker-Allowed', value: '/' },
        ],
      },
    ];
  },
};

export default nextConfig;
