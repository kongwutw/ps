import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

import nestPlugin from 'postcss-nested';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue({
    script: {
      refTransform: true,
    },
  })],
  resolve: {
    alias: {
      "@": "/src"
    }
  },
  css: {
    postcss: {
      plugins: [nestPlugin]
    }
  }
});
