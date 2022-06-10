import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

import nestPlugin from 'postcss-nested';
import { processExpression } from '.pnpm/@vue+compiler-core@3.2.37/node_modules/@vue/compiler-core';

// https://vitejs.dev/config/

export default defineConfig({
  base: process.env.NODE_ENV === 'production' ? 'ps' : '',
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
