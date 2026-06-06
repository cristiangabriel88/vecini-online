import { defineConfig } from 'vitest/config';
import { loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { visualizer } from 'rollup-plugin-visualizer';
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

export default defineConfig(({ mode }) => {
  // Load mode-specific env so VITE_APP_STAGE from .env.demo/.env.pi is available
  // at config-evaluation time (not just in import.meta.env in the browser bundle).
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [
      react(),
      cspHeadersPlugin(),
      // Emit dist/stats.html treemap on every build; uploaded as a CI artifact (T260).
      visualizer({ filename: 'dist/stats.html', gzipSize: true, open: false }) as Plugin,
    ],
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
      // Emit hidden source maps for PROD and DEV builds; they are blocked from
      // public CDN access via the [[redirects]] 404 rule in netlify.toml and
      // uploaded to the private Supabase Storage bucket by
      // scripts/upload-sourcemaps.mjs so the platform console can symbolicate
      // minified stack traces (T258b). DEMO has no functions so maps are skipped.
      sourcemap: env.VITE_APP_STAGE !== 'demo' ? 'hidden' : false,
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
      coverage: {
        provider: 'v8',
        reporter: ['text-summary', 'html', 'json-summary'],
        include: ['src/**/*.{ts,tsx}'],
        exclude: [
          'src/shared/demo/**',
          'src/**/*.d.ts',
          'src/vite-env.d.ts',
          'src/main.tsx',
          'src/platform/main.tsx',
          'src/i18n.ts',
        ],
        // Baseline thresholds from 2026-06-06 (T259). Only ratchet upward.
        thresholds: {
          lines: 30,
          branches: 80,
          functions: 68,
          statements: 30,
        },
      },
    },
  };
});
