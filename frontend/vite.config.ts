import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
// Use absolute paths for web/Docker, relative paths for Electron
// VITE_BASE_PATH can be set to './' for Electron builds, '/' for web builds
// Check if we're building for Electron by checking if VITE_ELECTRON_BUILD is set
const basePath = process.env.VITE_BASE_PATH || (process.env.VITE_ELECTRON_BUILD === 'true' ? './' : '/');

export default defineConfig({
  base: basePath,
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  // Content Security Policy for bpmn-js/dmn-js inline styles
  server: {
    port: 5173,
    headers: {
      'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:;",
    },
    proxy: {
      '/api': {
        target: 'http://localhost:8081',
        changeOrigin: true,
      },
      '/auth': {
        target: 'http://localhost:8081',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    // Ensure WASM files are copied to dist
    copyPublicDir: true,
    rollupOptions: {
      output: {
        // Preserve WASM files in the build at the root wasm/ directory
        // This ensures they're accessible via ./wasm/ from dist/index.html
        assetFileNames: (assetInfo) => {
          // Keep WASM files and their JS loaders in wasm/ directory (no hash for easier path resolution)
          if (assetInfo.name && (assetInfo.name.endsWith('.wasm') || assetInfo.name.includes('data_modelling_sdk'))) {
            return 'wasm/[name][extname]';
          }
          return 'assets/[name]-[hash][extname]';
        },
      },
    },
  },
  // Optimize WASM handling
  optimizeDeps: {
    exclude: ['data-modelling-sdk'],
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './tests/setup.ts',
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      '**/e2e/**', // Exclude E2E tests (Playwright)
      '**/*.e2e.test.ts',
      '**/*.e2e.test.tsx',
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'tests/',
        '**/*.test.ts',
        '**/*.test.tsx',
        '**/*.config.ts',
        '**/*.config.js',
        '**/e2e/**', // Exclude E2E tests from coverage
      ],
      thresholds: {
        lines: 95,
        branches: 95,
        functions: 95,
        statements: 95,
      },
    },
  },
});

