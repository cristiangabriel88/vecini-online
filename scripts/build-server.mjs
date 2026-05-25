// Bundle the standalone Telegram webhook service (server/telegram-server.ts)
// into a single runnable ESM file for the self-hosted (Raspberry Pi)
// deployment. esbuild ships with Vite, so no extra dependency is needed.
//
// Run via `npm run pi:build` (which also builds the Vite frontend) or directly
// with `node scripts/build-server.mjs`. Output: dist-server/telegram-server.mjs,
// started by `npm run pi:start`.
import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

await build({
  entryPoints: [resolve(root, 'server/telegram-server.ts')],
  outfile: resolve(root, 'dist-server/telegram-server.mjs'),
  bundle: true,
  platform: 'node',
  target: 'node20',
  format: 'esm',
  // Node built-ins (node:http, node:crypto, ...) stay external; everything in
  // src/ is bundled so the Pi only needs the single output file at runtime.
  packages: 'external',
  banner: {
    js: "import { createRequire } from 'node:module'; const require = createRequire(import.meta.url);",
  },
  logLevel: 'info',
});

console.log('Built dist-server/telegram-server.mjs');
