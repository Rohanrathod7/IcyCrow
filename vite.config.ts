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
      'react': 'preact/compat',
      'react-dom': 'preact/compat',
      'react-dom/test-utils': 'preact/test-utils',
      'react/jsx-runtime': 'preact/jsx-runtime',
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
  },
  test: {
    globals: true,
    environment: 'jsdom',
    alias: [
      { find: /^react$/, replacement: 'preact/compat' },
      { find: /^react-dom$/, replacement: 'preact/compat' },
      { find: /^react-dom\/test-utils$/, replacement: 'preact/test-utils' },
      { find: /^react\/jsx-runtime$/, replacement: 'preact/jsx-runtime' }
    ],
    server: {
      deps: {
        inline: [/@dnd-kit/, /@preact\/signals/]
      }
    }
  }
} as any);