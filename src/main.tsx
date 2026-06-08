import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.tsx';
import { registerSW } from 'virtual:pwa-register';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// ── PWA Service Worker 注册（由 vite-plugin-pwa 自动管理）────────────
// registerSW 会在新版本可用时自动回调 onNeedRefresh，
// 并在离线就绪后回调 onOfflineReady。
const updateSW = registerSW({
  // 新版本已下载，等待用户确认刷新
  onNeedRefresh() {
    // 发送一个自定义事件，让 App 层弹出更新提示
    window.dispatchEvent(new CustomEvent('pwa-update-available', { detail: { updateSW } }));
  },
  onOfflineReady() {
    console.log('[PWA] 应用已离线就绪，可以在无网络环境下使用 ✅');
  },
});
