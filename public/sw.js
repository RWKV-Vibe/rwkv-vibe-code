/*
 * 墓碑 Service Worker —— 唯一的作用是把自己和所有缓存一起删掉。
 *
 * 这个项目本身从来没有注册过 SW，但 localhost:3000 这个 origin 上可能还留着
 * 别的项目装过的旧 SW。SW 的作用域绑在 origin 上而不是项目上，所以它会继续
 * 拦截请求、回放旧的 CacheStorage —— 表现出来就是「代码改了页面不变」。
 *
 * 旧的那一个没法从外面删，只能用同路径的新版本把它顶掉。浏览器下次做更新
 * 检查时会抓到这个文件，装上之后它清空所有 CacheStorage、注销自己、再把
 * 页面刷一遍，于是这个 origin 上就干净了。
 *
 * 注意这里刻意不注册 fetch 监听器：没有 fetch handler 的 SW 不参与任何请求，
 * 浏览器直接走网络。即使注销因为某些原因失败了，它也不会再缓存任何东西。
 */

self.addEventListener('install', () => {
  // 不等旧版本释放控制权，立刻进入 activate
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      try {
        const keys = await caches.keys();
        await Promise.all(keys.map((key) => caches.delete(key)));
      } catch {
        // 无痕模式下 CacheStorage 可能不可用，忽略
      }

      try {
        await self.registration.unregister();
      } catch {
        // 忽略
      }

      // 当前这一版页面很可能还是旧 SW 喂出来的，注销只对下一次导航生效，
      // 所以主动把已打开的窗口重新导航一次。
      const clients = await self.clients.matchAll({ type: 'window' });
      for (const client of clients) {
        client.navigate(client.url).catch(() => {});
      }
    })(),
  );
});
