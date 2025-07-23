import { defineConfig } from 'tsup';

export default defineConfig({
  // Single entry point for Express server
  entry: ['src/main.ts'],
  format: ['esm'],
  dts: false,
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
    'node:http',
    'node:crypto',
    'node:util',
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
    'express-async-handler',
    'handlebars',
    'nodemailer',
    'puppeteer',
    'uuid',
    'csv-stringify',
    'dotenv',
    'axios',
    'multer',
    'slugify',
    'injection-js'
  ],
  noExternal: [],
  minify: false,
  splitting: false,
  skipNodeModulesBundle: true,
  watch: process.env.NODE_ENV === 'development',
  bundle: true,
  esbuildOptions(options) {
    // Ensure proper path resolution for Express server
    options.resolveExtensions = ['.ts', '.js', '.json'];
    options.mainFields = ['module', 'main'];
    options.platform = 'node';
    return options;
  },
  outExtension() {
    return {
      js: '.mjs'
    };
  }
});
