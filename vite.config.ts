import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { execSync } from 'node:child_process';
import type { Plugin } from 'vite';
import { buildHeadersFileContent } from './scripts/cspHeaders';

function resolveReleaseId(): string {
  if (process.env.VITE_APP_RELEASE) return process.env.VITE_APP_RELEASE;
  try {
    return execSync('git rev-parse --short HEAD', { encoding: 'utf-8' }).trim();
  } catch {
    return 'dev';
  }
}

function cspHeadersPlugin(): Plugin {
  return {
    name: 'csp-headers',
    apply: 'build',
    closeBundle() {
      const content = buildHeadersFileContent(process.env.VITE_SUPABASE_URL);
      writeFileSync(resolve('dist', '_headers'), content, 'utf-8');
    },
  };
}

export default defineConfig({
  plugins: [react(), cspHeadersPlugin()],
  define: {
    'import.meta.env.VITE_APP_RELEASE': JSON.stringify(resolveReleaseId()),
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    target: 'es2021',
    rollupOptions: {
      // Multi-page build: the resident/admin app (index.html) and the separate
      // superadmin console (platform.html, served on its own subdomain). Keeping
      // them as distinct entries means the superadmin code is never shipped to
      // regular users (T93).
      input: {
        main: fileURLToPath(new URL('./index.html', import.meta.url)),
        platform: fileURLToPath(new URL('./platform.html', import.meta.url)),
      },
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          supabase: ['@supabase/supabase-js'],
          query: ['@tanstack/react-query'],
          i18n: ['i18next', 'react-i18next', 'i18next-browser-languagedetector'],
          xlsx: ['xlsx'],
        },
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/unit/setup.ts'],
    include: ['tests/unit/**/*.{test,spec}.{ts,tsx}'],
    css: false,
  },
});
