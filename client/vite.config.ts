import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';
import { loadEnv } from 'vite';
import fs from 'fs';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
  const env = loadEnv(mode, process.cwd(), '');
  
  return {
    plugins: [
      react(),
      tsconfigPaths(),
      // Custom plugin to handle NextAuth API routes
      {
        name: 'nextauth-handler',
        configureServer(server) {
          server.middlewares.use(async (req, res, next) => {
            // Handle NextAuth API routes
            if (req.url?.startsWith('/api/auth/')) {
              try {
                // For session endpoint
                if (req.url === '/api/auth/session') {
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({ user: null }));
                  return;
                }
                
                // For _log endpoint (just return success)
                if (req.url === '/api/auth/_log') {
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({ success: true }));
                  return;
                }
                
                // For other auth endpoints, proxy to backend
                next();
              } catch (error) {
                console.error('NextAuth API error:', error);
                res.statusCode = 500;
                res.end(JSON.stringify({ error: 'Internal Server Error' }));
              }
            } else {
              next();
            }
          });
        },
      },
    ],
    server: {
      port: 3000,
      open: true,
      strictPort: true,
      proxy: {
        // Proxy all API requests to the backend server
        '^/api/(?!auth)': {
          target: env.API_URL || 'http://localhost:5000',
          changeOrigin: true,
          secure: false,
          rewrite: (path) => path.replace(/^\/api/, '') // Remove /api prefix when forwarding
        },
        // Keep the auth proxy for NextAuth
        '/api/auth': {
          target: env.API_URL || 'http://localhost:5000',
          changeOrigin: true,
          secure: false
        }
      }
    },
    build: {
      outDir: 'dist',
      sourcemap: true,
      rollupOptions: {
        output: {
          manualChunks: {
            react: ['react', 'react-dom', 'react-router-dom'],
            ui: ['@radix-ui/react-*'],
            vendor: ['date-fns', 'zod', 'react-hook-form'],
          },
        },
      },
    },
    optimizeDeps: {
      include: ['react', 'react-dom', 'react-router-dom'],
    },
    define: {
      // NextAuth requires these environment variables
      'process.env': {
        NEXTAUTH_URL: env.NEXTAUTH_URL || 'http://localhost:3000',
        NEXTAUTH_SECRET: env.NEXTAUTH_SECRET,
        NODE_ENV: mode,
      },
    },
  };
});
