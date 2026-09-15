'use client';

import { useEffect } from 'react';

/** 只允许自动刷新一次，避免「清理 -> 刷新 -> 又清理」转不出来 */
const RELOAD_GUARD_KEY = 'rwkv_sw_cleanup_done';

/**
 * 开机自检：把这个 origin 上所有 Service Worker 和 CacheStorage 全部清掉。
 *
 * 光靠 public/sw.js 那个墓碑还不够 —— 浏览器要在导航时做过更新检查、
 * 抓到新脚本，墓碑才会生效，时机不可控。这里在页面一挂载就主动调
 * getRegistrations().unregister()，不管旧 SW 是哪个项目留下的都能拔干净。
 *
 * 本项目不注册任何 SW，所以正常情况下这段跑完什么都没找到，零成本。
 */
export const ServiceWorkerCleanup = () => {
  useEffect(() => {
    let cancelled = false;

    void (async () => {
      let removedSomething = false;

      if ('serviceWorker' in navigator) {
        try {
          const registrations =
            await navigator.serviceWorker.getRegistrations();
          for (const registration of registrations) {
            const ok = await registration.unregister();
            removedSomething = removedSomething || ok;
          }
        } catch {
          // 无痕模式 / 权限受限时会抛，忽略
        }
      }

      if ('caches' in window) {
        try {
          const keys = await caches.keys();
          if (keys.length > 0) removedSomething = true;
          await Promise.all(keys.map((key) => caches.delete(key)));
        } catch {
          // 忽略
        }
      }

      if (cancelled || !removedSomething) return;

      // 注销只对下一次导航生效，当前这份文档可能还是旧 SW 喂出来的，刷一次。
      try {
        if (sessionStorage.getItem(RELOAD_GUARD_KEY) === '1') return;
        sessionStorage.setItem(RELOAD_GUARD_KEY, '1');
      } catch {
        return;
      }
      window.location.reload();
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return null;
};
