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
        manualChunks(id) {
          // Split node_modules into vendor chunks
          if (id.includes('node_modules')) {
            // Mapbox is huge, put it in its own chunk
            if (id.includes('mapbox-gl')) {
              return 'mapbox';
            }
            // All Radix UI components in one chunk
            if (id.includes('@radix-ui')) {
              return 'radix-ui';
            }
            // React ecosystem
            if (id.includes('react') || id.includes('react-dom')) {
              return 'react-vendor';
            }
            // Form libraries
            if (id.includes('react-hook-form') || id.includes('@hookform')) {
              return 'forms';
            }
            // Date utilities
            if (id.includes('date-fns')) {
              return 'date-utils';
            }
            // Routing
            if (id.includes('wouter')) {
              return 'routing';
            }
            // Data fetching
            if (id.includes('@tanstack/react-query')) {
              return 'data-fetching';
            }
            // Animation libraries
            if (id.includes('framer-motion')) {
              return 'animation';
            }
            // All other vendor code
            return 'vendor';
          }
        },
        // Use content hash for better caching
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]'
      }
    },
    // Performance optimizations
    target: 'es2020', // Use modern JS features
    chunkSizeWarningLimit: 1000, // 1MB warning threshold
    sourcemap: false, // No sourcemaps in production
    minify: 'esbuild', // Use faster esbuild minifier
    reportCompressedSize: false, // Skip gzip calculation for faster builds
    // CSS optimization
    cssMinify: true,
    cssCodeSplit: true
  },
  // Development optimizations
  server: {
    warmup: {
      // Pre-transform heavy dependencies
      clientFiles: [
        './client/src/App.tsx',
        './client/src/components/**/*.tsx'
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
