import { defineConfig } from 'tsup';

export default defineConfig({
  // Include all TypeScript files in the src directory and the root index.ts
  entry: [
    'index.ts',
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/*.test.ts',
    '!src/**/*.spec.ts'
  ],
  format: ['esm'],
  dts: false, // Disable dts for now to isolate the issue
  sourcemap: true,
  clean: true,
  outDir: 'dist',
  target: 'es2022',
  tsconfig: 'tsconfig.json',
  external: [
    // Node built-ins
    'node:module',
    'node:path',
    'node:fs',
    'node:fs/promises',
    'node:url',
    // External dependencies
    '@shared/schema',
    'drizzle-orm',
    'drizzle-zod',
    'express',
    'bcrypt',
    'cors',
    'helmet',
    'jsonwebtoken',
    'morgan',
    'winston',
    'zod',
    'postgres',
    'express-rate-limit',
    'handlebars',
    'nodemailer',
    'puppeteer',
    'uuid',
    'csv-stringify',
    'dotenv'
  ],
  noExternal: [],
  minify: false,
  splitting: false,
  skipNodeModulesBundle: true,
  watch: process.env.NODE_ENV === 'development',
  bundle: true,
  esbuildOptions(options, { format }) {
    // Ensure proper path resolution
    options.resolveExtensions = ['.ts', '.js', '.json'];
    options.mainFields = ['module', 'main'];
    return options;
  },
  outExtension() {
    return {
      js: '.mjs'
    };
  }
});
