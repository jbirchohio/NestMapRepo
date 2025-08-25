import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { fileURLToPath } from "url";

// Fix: define __dirname for ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  plugins: [
    react({
      // Ensure React is properly handled
      jsxRuntime: 'automatic'
    })
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "client", "src"),
      "@shared": path.resolve(__dirname, "shared"),
      "@assets": path.resolve(__dirname, "attached_assets"),
    },
  },
  root: path.resolve(__dirname, "client"),
  publicDir: path.resolve(__dirname, "public"),
  build: {
    outDir: path.resolve(__dirname, "dist/public"),
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // Core React libraries - MUST stay together
          if (id.includes('node_modules/react/') || 
              id.includes('node_modules/react-dom/') ||
              id.includes('node_modules/scheduler/')) {
            return 'react-core';
          }
          
          // Mapbox and map-related libraries
          if (id.includes('mapbox-gl') || id.includes('@mapbox')) {
            return 'mapbox';
          }
          
          // UI component libraries
          if (id.includes('@radix-ui/')) {
            return 'radix-ui';
          }
          
          // Form and validation libraries
          if (id.includes('react-hook-form') || id.includes('@hookform') || id.includes('zod')) {
            return 'forms';
          }
          
          // Data fetching and state management
          if (id.includes('@tanstack/react-query') || id.includes('axios')) {
            return 'data-fetching';
          }
          
          // Animation and gesture libraries
          if (id.includes('framer-motion') || id.includes('@hello-pangea/dnd')) {
            return 'animations';
          }
          
          // Chart and visualization libraries
          if (id.includes('recharts') || id.includes('d3')) {
            return 'charts';
          }
          
          // Editor and rich text libraries
          if (id.includes('@tiptap') || id.includes('prosemirror')) {
            return 'editor';
          }
          
          // Date and utility libraries
          if (id.includes('date-fns') || id.includes('clsx') || id.includes('class-variance-authority')) {
            return 'utils';
          }
          
          // Image processing
          if (id.includes('html2canvas')) {
            return 'image-processing';
          }
          
          // Payment processing
          if (id.includes('stripe')) {
            return 'payments';
          }
          
          // Routing
          if (id.includes('wouter')) {
            return 'routing';
          }
          
          // Icons
          if (id.includes('lucide-react')) {
            return 'icons';
          }
          
          // All other vendor libraries
          if (id.includes('node_modules/')) {
            return 'vendor';
          }
        },
        // Additional output options for better chunking
        chunkFileNames: (chunkInfo) => {
          const facadeModuleId = chunkInfo.facadeModuleId ? chunkInfo.facadeModuleId.split('/').pop() : 'chunk';
          return `assets/${chunkInfo.name}-[hash].js`;
        },
        assetFileNames: 'assets/[name]-[hash].[ext]',
        entryFileNames: 'assets/[name]-[hash].js'
      }
    },
    // Performance optimizations
    target: 'es2020',
    chunkSizeWarningLimit: 500, // Reduced to 500KB to encourage smaller chunks
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
    exclude: []
  }
});