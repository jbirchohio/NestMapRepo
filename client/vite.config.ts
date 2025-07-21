import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';
import { loadEnv } from 'vite';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
  const env = loadEnv(mode, process.cwd(), '');
  
  return {
    plugins: [
      react(),
      tsconfigPaths(),
    ],
    server: {
      port: 9000,
      open: true,
      strictPort: true,
      proxy: {
        // Proxy all API requests to the backend server
        '/api': {
          target: env.API_URL || 'http://localhost:5000',
          changeOrigin: true,
          secure: false,
        }
      }
    },
    build: {
      outDir: 'dist',
      sourcemap: true,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules')) {
              if (id.includes('@radix-ui')) {
                return 'radix';
              }
              if (id.includes('react') || id.includes('react-dom') || id.includes('react-router-dom')) {
                return 'react-vendor';
              }
              return 'vendor';
            }
          },
        },
      },
    },
    optimizeDeps: {
      include: [
        'react',
        'react-dom',
        'react-router-dom',
        '@radix-ui/react-accordion',
        '@radix-ui/react-dialog',
        '@radix-ui/react-dropdown-menu',
        '@radix-ui/react-hover-card',
        '@radix-ui/react-navigation-menu',
        '@radix-ui/react-popover',
        '@radix-ui/react-select',
        '@radix-ui/react-slot',
        '@radix-ui/react-tabs',
        '@radix-ui/react-toast',
        '@radix-ui/react-tooltip'
      ],
      esbuildOptions: {
        // Node.js global to browser globalThis
        define: {
          global: 'globalThis',
        },
      },
    },
    define: {
      'process.env': {
        NODE_ENV: mode,
      },
    },
  };
});
