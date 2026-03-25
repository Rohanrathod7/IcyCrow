import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';
import { crx } from '@crxjs/vite-plugin';
import manifest from './manifest.json';

import path from 'path';

export default defineConfig({
  plugins: [
    preact(),
    crx({ manifest }),
  ],
  resolve: {
    alias: {
      '@lib': path.resolve(__dirname, 'src/lib'),
      '@bg': path.resolve(__dirname, 'src/background'),
      '@ui': path.resolve(__dirname, 'src/side-panel'),
      '@workers': path.resolve(__dirname, 'src/workers')
    }
  },
  build: {
    target: 'esnext',
    rollupOptions: {
      input: {
        workspace: 'src/workspace/index.html'
      }
    }
  }
});