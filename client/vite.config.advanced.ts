// Phase 3: Advanced Performance Bundle Optimizer
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { visualizer } from 'rollup-plugin-visualizer';
import compression from 'vite-plugin-compression';

/**
 * Advanced Vite configuration for production-ready performance optimization
 * Implements code splitting, tree shaking, compression, and intelligent chunking
 */
export default defineConfig(({ command, mode }) => {
  const isDev = command === 'serve';
  const isProd = mode === 'production';

  return {
    plugins: [
      react({
        // Optimize React in production
        babel: isProd ? {
          plugins: [
            // Remove console.log in production
            ['transform-remove-console', { exclude: ['error', 'warn'] }],
            // Optimize React components
            ['babel-plugin-transform-react-remove-prop-types', { mode: 'remove' }]
          ]
        } : undefined
      }),

      // Bundle analyzer for optimization insights
      isProd && visualizer({
        filename: 'dist/bundle-analysis.html',
        open: false,
        gzipSize: true,
        brotliSize: true,
        template: 'treemap'
      }),

      // Gzip compression
      isProd && compression({
        algorithm: 'gzip',
        ext: '.gz',
        threshold: 1024,
        deleteOriginFile: false
      }),

      // Brotli compression (better than gzip)
      isProd && compression({
        algorithm: 'brotliCompress',
        ext: '.br',
        threshold: 1024,
        deleteOriginFile: false
      })
    ].filter(Boolean),

    // Resolve configuration
    resolve: {
      alias: {
        '@': resolve(__dirname, './src'),
        '@components': resolve(__dirname, './src/components'),
        '@utils': resolve(__dirname, './src/utils'),
        '@hooks': resolve(__dirname, './src/hooks'),
        '@pages': resolve(__dirname, './src/pages'),
        '@styles': resolve(__dirname, './src/styles')
      }
    },

    // Development server optimization
    server: {
      port: 5173,
      host: true,
      hmr: {
        overlay: false // Reduce visual noise in development
      }
    },

    // Build optimization
    build: {
      // Target modern browsers for better optimization
      target: 'es2020',
      
      // Source maps for debugging (disable in production for security)
      sourcemap: isDev ? 'inline' : false,
      
      // Minification
      minify: isProd ? 'terser' : false,
      
      // Terser options for better compression
      terserOptions: isProd ? {
        compress: {
          drop_console: true,
          drop_debugger: true,
          pure_funcs: ['console.log', 'console.info'],
          passes: 2
        },
        mangle: {
          safari10: true
        },
        format: {
          comments: false,
          safari10: true
        }
      } : undefined,

      // Advanced chunking strategy
      rollupOptions: {
        output: {
          // Intelligent chunk splitting
          manualChunks: (id) => {
            // Vendor chunk for stable dependencies
            if (id.includes('node_modules')) {
              // React ecosystem
              if (id.includes('react') || id.includes('@tanstack')) {
                return 'react-vendor';
              }
              
              // UI libraries
              if (id.includes('lucide') || id.includes('radix-ui') || id.includes('@headlessui')) {
                return 'ui-vendor';
              }
              
              // Utility libraries
              if (id.includes('lodash') || id.includes('date-fns') || id.includes('uuid')) {
                return 'utils-vendor';
              }
              
              // Large libraries get their own chunks
              if (id.includes('mapbox') || id.includes('leaflet')) {
                return 'maps-vendor';
              }
              
              // Everything else goes to vendor
              return 'vendor';
            }

            // App chunks
            if (id.includes('/pages/')) {
              return 'pages';
            }
            
            if (id.includes('/components/optimizer/')) {
              return 'optimizer';
            }
            
            if (id.includes('/components/auth/')) {
              return 'auth';
            }
            
            if (id.includes('/components/superadmin/')) {
              return 'admin';
            }
            
            if (id.includes('/utils/') || id.includes('/hooks/')) {
              return 'utils';
            }
          },

          // Optimal chunk naming for caching
          chunkFileNames: isProd ? 'assets/[name]-[hash].js' : 'assets/[name].js',
          entryFileNames: isProd ? 'assets/[name]-[hash].js' : 'assets/[name].js',
          assetFileNames: (assetInfo) => {
            const info = assetInfo.name?.split('.') || [];
            const ext = info[info.length - 1];
            
            if (/\.(png|jpe?g|gif|svg|webp|avif)$/i.test(assetInfo.name || '')) {
              return `assets/images/[name]-[hash].${ext}`;
            }
            
            if (/\.(css)$/i.test(assetInfo.name || '')) {
              return `assets/styles/[name]-[hash].${ext}`;
            }
            
            if (/\.(woff2?|eot|ttf|otf)$/i.test(assetInfo.name || '')) {
              return `assets/fonts/[name]-[hash].${ext}`;
            }
            
            return `assets/[name]-[hash].${ext}`;
          }
        },

        // External dependencies (if using CDN)
        external: isProd ? [] : [],

        // Tree shaking optimization
        treeshake: {
          moduleSideEffects: false,
          propertyReadSideEffects: false,
          unknownGlobalSideEffects: false
        }
      },

      // CSS code splitting
      cssCodeSplit: true,

      // Asset optimization
      assetsInlineLimit: 4096, // Inline small assets as base64
    },

    // Dependency optimization
    optimizeDeps: {
      // Pre-bundle dependencies for faster dev startup
      include: [
        'react',
        'react-dom',
        '@tanstack/react-query',
        'lucide-react',
        'react-router-dom'
      ],
      
      // Exclude problematic dependencies
      exclude: [
        'fsevents'
      ],

      // ESBuild options for dependency optimization
      esbuildOptions: {
        // Target modern browsers
        target: 'es2020',
        
        // Tree shaking
        treeShaking: true,
        
        // Minification
        minify: isProd
      }
    },

    // CSS optimization
    css: {
      // PostCSS configuration
      postcss: {
        plugins: isProd ? [
          require('autoprefixer'),
          require('cssnano')({
            preset: ['default', {
              discardComments: { removeAll: true },
              reduceIdents: false
            }]
          })
        ] : []
      },
      
      // CSS modules
      modules: {
        localsConvention: 'camelCase',
        generateScopedName: isProd ? '[hash:base64:5]' : '[name]__[local]__[hash:base64:5]'
      }
    },

    // Preview configuration for production testing
    preview: {
      port: 4173,
      host: true
    },

    // Environment variables
    define: {
      __APP_VERSION__: JSON.stringify(process.env.npm_package_version || '1.0.0'),
      __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
      __PERFORMANCE_MODE__: JSON.stringify(isProd ? 'production' : 'development')
    },

    // Experimental features
    experimental: {
      // Render built-in components in production
      renderBuiltUrl(filename, { hostType }) {
        if (hostType === 'js') {
          return { js: `/assets/${filename}` };
        }
        return { relative: true };
      }
    }
  };
});

/**
 * Performance monitoring script to be injected in development
 */
export const performanceScript = `
  // Performance monitoring for development
  if (typeof window !== 'undefined' && import.meta.env.DEV) {
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach((entry) => {
        if (entry.entryType === 'navigation') {
          console.log('🚀 Page Load Performance:', {
            'DOM Content Loaded': entry.domContentLoadedEventEnd - entry.domContentLoadedEventStart,
            'Load Complete': entry.loadEventEnd - entry.loadEventStart,
            'First Paint': entry.responseEnd - entry.requestStart,
            'Total Time': entry.loadEventEnd - entry.navigationStart
          });
        }
        
        if (entry.entryType === 'largest-contentful-paint') {
          console.log('🎨 Largest Contentful Paint:', entry.startTime);
        }
        
        if (entry.entryType === 'first-input') {
          console.log('👆 First Input Delay:', entry.processingStart - entry.startTime);
        }
      });
    });
    
    observer.observe({ entryTypes: ['navigation', 'largest-contentful-paint', 'first-input'] });
    
    // Monitor bundle loading
    const chunkLoadTimes = new Map();
    const originalImport = window.__vitePreload;
    
    if (originalImport) {
      window.__vitePreload = function(baseModule, deps) {
        const start = performance.now();
        return originalImport.call(this, baseModule, deps).then((result) => {
          const loadTime = performance.now() - start;
          console.log(\`📦 Chunk loaded in \${loadTime.toFixed(2)}ms:\`, baseModule);
          return result;
        });
      };
    }
  }
`;

/**
 * Build analysis utilities
 */
export const buildAnalysis = {
  // Analyze bundle size after build
  analyzeBundleSize: () => {
    console.log('📊 Bundle analysis will be available at dist/bundle-analysis.html');
  },
  
  // Performance recommendations
  getRecommendations: (stats: any) => {
    const recommendations: string[] = [];
    
    if (stats.chunks?.some((chunk: any) => chunk.size > 500000)) {
      recommendations.push('Consider splitting large chunks further');
    }
    
    if (stats.assets?.filter((asset: any) => asset.name.endsWith('.js')).length > 20) {
      recommendations.push('Consider combining some smaller chunks');
    }
    
    return recommendations;
  }
};
