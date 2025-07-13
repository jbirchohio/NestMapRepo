import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
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
    '@nestjs/common',
    '@nestjs/core',
    '@nestjs/config',
    '@nestjs/jwt',
    'express',
    'handlebars',
    'nodemailer',
    'puppeteer',
    'reflect-metadata',
    'rxjs'
  ],
  noExternal: [],
  minify: false,
  splitting: false,
  skipNodeModulesBundle: true,
  watch: process.env.NODE_ENV === 'development',
  bundle: true,
  outExtension() {
    return {
      js: '.mjs',
    };
  },
});
