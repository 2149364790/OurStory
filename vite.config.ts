import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      // injectManifest 模式：使用我们自定义的 src/sw.ts，
      // 插件会将 __WB_MANIFEST 替换为打包后所有静态资源的哈希清单。
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',

      // 在开发模式下也启用 SW（方便调试，可按需改为 false）
      devOptions: {
        enabled: false,
        type: 'module',
      },

      // 构建时的 SW 行为
      injectManifest: {
        // 只预缓存这些类型的文件（JS/CSS/HTML/图片等静态资源）
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
      },

      // ── Web App Manifest ──────────────────────────────────────────────
      // 插件会自动生成 manifest.json 并注入到 index.html，
      // 无需再手动维护 public/manifest.json。
      manifest: {
        name: 'CoupleSpace 两人的私密空间',
        short_name: 'CoupleSpace',
        description:
          '只为我们两个人设计的私密专属手账，记录我们的日常、悄悄话与每月约定。',
        start_url: '/',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#fff0f3',
        theme_color: '#fff0f3',
        icons: [
          {
            src: '/favicon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any',
          },
          {
            src: '/couplespace_app_icon.png',
            sizes: '1024x1024',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
      },
    }),
  ],
});
