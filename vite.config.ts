import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

const PAPER = '#F1F3EF';

export default defineConfig({
  // Relative base so the build works from any folder (e.g. GitHub Pages /zanachka/).
  base: './',
  server: { host: true },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        id: './',
        name: 'Заначка',
        short_name: 'Заначка',
        description: 'Учёт доходов и расходов, чтобы откладывать больше',
        lang: 'ru',
        dir: 'ltr',
        start_url: './',
        scope: './',
        display: 'standalone',
        orientation: 'portrait',
        background_color: PAPER,
        theme_color: PAPER,
        categories: ['finance'],
        icons: [
          { src: 'pwa-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
        shortcuts: [
          {
            name: 'Добавить расход',
            short_name: 'Расход',
            url: './#/add?type=expense',
            icons: [{ src: 'shortcut-expense.png', sizes: '96x96', type: 'image/png' }],
          },
          {
            name: 'Добавить доход',
            short_name: 'Доход',
            url: './#/add?type=income',
            icons: [{ src: 'shortcut-income.png', sizes: '96x96', type: 'image/png' }],
          },
        ],
      },
      workbox: {
        // Precache only the Cyrillic + Latin font subsets; others load on demand if ever needed.
        globPatterns: ['**/*.{js,css,html,svg,png,ico}', '**/*-{cyrillic,latin}-wght-normal-*.woff2'],
      },
    }),
  ],
});
