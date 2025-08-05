import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { fileURLToPath } from "url";

// Fix: define __dirname for ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  plugins: [
    react(),
    ...(process.env.NODE_ENV !== "production" &&
    process.env.REPL_ID !== undefined
      ? [
          await import("@replit/vite-plugin-cartographer").then((m) =>
            m.cartographer(),
          ),
        ]
      : []),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "client", "src"),
      "@shared": path.resolve(__dirname, "shared"),
      "@assets": path.resolve(__dirname, "attached_assets"),
    },
  },
  root: path.resolve(__dirname, "client"),
  build: {
    outDir: path.resolve(__dirname, "dist/public"),
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // Keep React in the main vendor chunk to ensure it loads first
          if (id.includes('node_modules/react/') || id.includes('node_modules/react-dom/')) {
            return 'vendor';
          }
          // Split other large dependencies
          if (id.includes('@radix-ui/')) {
            return 'radix-ui';
          }
          if (id.includes('mapbox-gl')) {
            return 'mapbox';
          }
          if (id.includes('date-fns') || id.includes('clsx') || id.includes('class-variance-authority')) {
            return 'utils';
          }
        }
      }
    },
    // Performance optimizations
    target: 'es2020',
    chunkSizeWarningLimit: 1500,
    sourcemap: false,
    minify: 'esbuild',
    reportCompressedSize: false,
    cssMinify: true,
    cssCodeSplit: true
  },
  // Development optimizations
  server: {
    warmup: {
      clientFiles: [
        './client/src/App.tsx',
        './client/src/main.tsx'
      ]
    }
  },
  // Optimize dependency pre-bundling
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'mapbox-gl',
      '@tanstack/react-query',
      'wouter',
      'date-fns'
    ],
    exclude: ['@replit/vite-plugin-cartographer']
  }
});