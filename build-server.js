import { build } from 'esbuild';
import fs from 'fs';
import path from 'path';

// Custom plugin to replace vite imports with no-ops in production
const productionViteStubPlugin = {
  name: 'production-vite-stub',
  setup(build) {
    // Intercept imports of vite.ts
    build.onResolve({ filter: /\.\/vite$/ }, args => {
      return { path: args.path, namespace: 'vite-stub' };
    });
    
    // Provide stub implementation
    build.onLoad({ filter: /.*/, namespace: 'vite-stub' }, () => {
      return {
        contents: `
          export function log(message, source = "express") {
            console.log(\`[\${source}] \${message}\`);
          }
          export async function setupVite(app, server) {
            // No-op in production
          }
          export function serveStatic(app) {
            // No-op in production - static files served by express.static
          }
        `,
        loader: 'js',
      };
    });

    // Completely ignore vite package and vite config imports
    build.onResolve({ filter: /^vite$/ }, () => {
      return { path: 'vite', external: true };
    });
    
    build.onResolve({ filter: /\.\.\/vite\.config/ }, () => {
      return { path: 'vite-config', external: true };
    });
    
    build.onResolve({ filter: /^@vitejs\// }, () => {
      return { path: '@vitejs', external: true };
    });
  },
};

// Build the server
await build({
  entryPoints: ['server/index.ts'],
  platform: 'node',
  format: 'esm',
  bundle: true,
  outdir: 'dist',
  packages: 'external',
  plugins: [productionViteStubPlugin],
  banner: {
    js: `
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
`
  }
});

console.log('✅ Server built successfully for production (vite completely removed)');