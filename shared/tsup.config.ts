import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  sourcemap: true,
  clean: true,
  outDir: 'dist',
  target: 'es2022',
  tsconfig: 'tsconfig.json',
  external: ['drizzle-orm'],
  noExternal: [],
  minify: false,
  splitting: false,
  skipNodeModulesBundle: true,
  watch: process.env.NODE_ENV === 'development',
  bundle: true,
  outExtension({ format }) {
    return {
      js: format === 'esm' ? '.mjs' : '.cjs',
    };
  },
});
