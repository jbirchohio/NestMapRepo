// Phase 3: Production Bundle Optimization Scripts
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { resolve, join, dirname } from 'path';
import { gzipSync, brotliCompressSync } from 'zlib';
import { execSync } from 'child_process';

interface BundleAnalysis {
  totalSize: number;
  gzipSize: number;
  brotliSize: number;
  chunkCount: number;
  assetCount: number;
  largestChunks: Array<{ name: string; size: number; type: string }>;
  duplicateModules: string[];
  unusedExports: string[];
  compressionRatio: number;
  performanceScore: number;
}

interface OptimizationConfig {
  targetSize: number; // Target bundle size in KB
  compressionTarget: number; // Target compression ratio
  chunkSizeLimit: number; // Max chunk size in KB
  enableTreeShaking: boolean;
  enableMinification: boolean;
  enableCompression: boolean;
  outputPath: string;
}

/**
 * Production bundle optimizer for acquisition-ready performance
 */
class BundleOptimizer {
  private config: OptimizationConfig;
  private analysis: BundleAnalysis | null = null;

  constructor(config: Partial<OptimizationConfig> = {}) {
    this.config = {
      targetSize: 500, // 500KB target
      compressionTarget: 0.3, // 30% of original size
      chunkSizeLimit: 250, // 250KB max chunk
      enableTreeShaking: true,
      enableMinification: true,
      enableCompression: true,
      outputPath: './dist',
      ...config
    };
  }

  /**
   * Analyze current bundle performance
   */
  async analyzeBundles(distPath: string = this.config.outputPath): Promise<BundleAnalysis> {
    console.log('🔍 Analyzing bundle performance...');
    
    if (!existsSync(distPath)) {
      throw new Error(`Distribution directory not found: ${distPath}`);
    }

    let totalSize = 0;
    let gzipSize = 0;
    let brotliSize = 0;
    let chunkCount = 0;
    let assetCount = 0;
    const largestChunks: Array<{ name: string; size: number; type: string }> = [];

    // Analyze JavaScript files
    const jsFiles = this.getFilesByExtension(distPath, '.js');
    for (const file of jsFiles) {
      const content = readFileSync(file);
      const size = content.length;
      const gzip = gzipSync(content).length;
      const brotli = brotliCompressSync(content).length;

      totalSize += size;
      gzipSize += gzip;
      brotliSize += brotli;
      chunkCount++;

      largestChunks.push({
        name: file.replace(distPath, ''),
        size,
        type: 'javascript'
      });
    }

    // Analyze CSS files
    const cssFiles = this.getFilesByExtension(distPath, '.css');
    for (const file of cssFiles) {
      const content = readFileSync(file);
      const size = content.length;
      totalSize += size;
      gzipSize += gzipSync(content).length;
      brotliSize += brotliCompressSync(content).length;
      assetCount++;

      largestChunks.push({
        name: file.replace(distPath, ''),
        size,
        type: 'stylesheet'
      });
    }

    // Sort chunks by size
    largestChunks.sort((a, b) => b.size - a.size);

    // Calculate metrics
    const compressionRatio = brotliSize / totalSize;
    const performanceScore = this.calculatePerformanceScore(totalSize, compressionRatio, chunkCount);

    this.analysis = {
      totalSize,
      gzipSize,
      brotliSize,
      chunkCount,
      assetCount,
      largestChunks: largestChunks.slice(0, 10), // Top 10 largest
      duplicateModules: [], // Would need more sophisticated analysis
      unusedExports: [], // Would need webpack bundle analyzer
      compressionRatio,
      performanceScore
    };

    return this.analysis;
  }

  /**
   * Generate optimization recommendations
   */
  generateRecommendations(): string[] {
    if (!this.analysis) {
      throw new Error('Run analyzeBundles() first');
    }

    const recommendations: string[] = [];
    const { totalSize, compressionRatio, chunkCount, largestChunks } = this.analysis;

    // Size recommendations
    if (totalSize > this.config.targetSize * 1024) {
      recommendations.push(
        `Bundle size (${Math.round(totalSize / 1024)}KB) exceeds target (${this.config.targetSize}KB)`
      );
      recommendations.push('Consider code splitting and lazy loading');
    }

    // Compression recommendations
    if (compressionRatio > this.config.compressionTarget) {
      recommendations.push(
        `Compression ratio (${Math.round(compressionRatio * 100)}%) could be improved`
      );
      recommendations.push('Enable better minification and tree shaking');
    }

    // Chunk recommendations
    const largeChunks = largestChunks.filter(chunk => chunk.size > this.config.chunkSizeLimit * 1024);
    if (largeChunks.length > 0) {
      recommendations.push(`${largeChunks.length} chunks exceed size limit`);
      recommendations.push('Split large chunks into smaller modules');
    }

    // Too many chunks
    if (chunkCount > 15) {
      recommendations.push('Too many chunks may hurt HTTP/2 performance');
      recommendations.push('Consider combining some smaller chunks');
    }

    // Performance recommendations
    if (this.analysis.performanceScore < 80) {
      recommendations.push('Overall performance score needs improvement');
      recommendations.push('Focus on critical path optimization');
    }

    return recommendations;
  }

  /**
   * Generate production-ready optimization report
   */
  generateOptimizationReport(): string {
    if (!this.analysis) {
      throw new Error('Run analyzeBundles() first');
    }

    const recommendations = this.generateRecommendations();
    
    return `
# Bundle Optimization Report
Generated: ${new Date().toISOString()}

## Performance Metrics
- **Total Bundle Size**: ${Math.round(this.analysis.totalSize / 1024)}KB
- **Gzipped Size**: ${Math.round(this.analysis.gzipSize / 1024)}KB
- **Brotli Size**: ${Math.round(this.analysis.brotliSize / 1024)}KB
- **Compression Ratio**: ${Math.round(this.analysis.compressionRatio * 100)}%
- **Performance Score**: ${this.analysis.performanceScore}/100

## Bundle Composition
- **JavaScript Chunks**: ${this.analysis.chunkCount}
- **CSS Assets**: ${this.analysis.assetCount}
- **Largest Chunks**:
${this.analysis.largestChunks.slice(0, 5).map(chunk => 
  `  - ${chunk.name}: ${Math.round(chunk.size / 1024)}KB (${chunk.type})`
).join('\n')}

## Optimization Targets
- **Target Bundle Size**: ${this.config.targetSize}KB
- **Target Compression**: ${Math.round(this.config.compressionTarget * 100)}%
- **Chunk Size Limit**: ${this.config.chunkSizeLimit}KB

## Recommendations
${recommendations.map(rec => `- ${rec}`).join('\n')}

## Production Readiness
${this.analysis.performanceScore >= 90 ? '✅ Ready for production' : 
  this.analysis.performanceScore >= 80 ? '⚠️ Needs minor optimization' : 
  '❌ Requires significant optimization'}

## Next Steps
1. Implement code splitting for large chunks
2. Enable advanced compression (Brotli)
3. Optimize critical rendering path
4. Consider service worker caching strategy
5. Implement performance monitoring

---
Generated by NestleIn Bundle Optimizer
    `.trim();
  }

  /**
   * Apply automatic optimizations
   */
  async applyOptimizations(distPath: string = this.config.outputPath): Promise<void> {
    console.log('🚀 Applying bundle optimizations...');

    // Create compressed versions
    if (this.config.enableCompression) {
      await this.createCompressedAssets(distPath);
    }

    // Generate service worker for caching
    await this.generateServiceWorker(distPath);

    // Create performance metrics file
    await this.createPerformanceMetrics(distPath);

    console.log('✅ Optimizations applied successfully');
  }

  /**
   * Create compressed asset versions
   */
  private async createCompressedAssets(distPath: string): Promise<void> {
    const files = [
      ...this.getFilesByExtension(distPath, '.js'),
      ...this.getFilesByExtension(distPath, '.css'),
      ...this.getFilesByExtension(distPath, '.html')
    ];

    for (const file of files) {
      const content = readFileSync(file);
      
      // Create gzipped version
      const gzipped = gzipSync(content, { level: 9 });
      writeFileSync(`${file}.gz`, gzipped);
      
      // Create brotli version
      const brotli = brotliCompressSync(content);
      writeFileSync(`${file}.br`, brotli);
    }

    console.log(`📦 Created compressed versions for ${files.length} files`);
  }

  /**
   * Generate service worker for optimal caching
   */
  private async generateServiceWorker(distPath: string): Promise<void> {
    const swContent = `
// Auto-generated Service Worker for optimal caching
const CACHE_NAME = 'nestlein-v${Date.now()}';
const STATIC_CACHE = 'nestlein-static-v${Date.now()}';
const DYNAMIC_CACHE = 'nestlein-dynamic-v${Date.now()}';

// Critical resources to cache immediately
const CRITICAL_RESOURCES = [
  '/',
  '/index.html',
  // Add critical CSS and JS files here
];

// Cache strategies by resource type
const CACHE_STRATEGIES = {
  documents: 'networkFirst',
  scripts: 'cacheFirst',
  styles: 'cacheFirst',
  images: 'cacheFirst',
  fonts: 'cacheFirst',
  api: 'networkFirst'
};

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then(cache => cache.addAll(CRITICAL_RESOURCES))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.filter(key => key.startsWith('nestlein-'))
            .filter(key => ![CACHE_NAME, STATIC_CACHE, DYNAMIC_CACHE].includes(key))
            .map(key => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip non-GET requests
  if (request.method !== 'GET') return;
  
  // Handle different resource types
  if (url.pathname.match(/\\.(js|css)$/)) {
    event.respondWith(cacheFirstStrategy(request, STATIC_CACHE));
  } else if (url.pathname.match(/\\.(png|jpg|jpeg|gif|svg|webp)$/)) {
    event.respondWith(cacheFirstStrategy(request, STATIC_CACHE));
  } else if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirstStrategy(request, DYNAMIC_CACHE));
  } else {
    event.respondWith(networkFirstStrategy(request, DYNAMIC_CACHE));
  }
});

async function cacheFirstStrategy(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;
  
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    return new Response('Offline content not available', { status: 503 });
  }
}

async function networkFirstStrategy(request, cacheName) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    const cached = await caches.match(request);
    return cached || new Response('Offline content not available', { status: 503 });
  }
}
    `.trim();

    writeFileSync(join(distPath, 'sw.js'), swContent);
    console.log('🔧 Generated optimized service worker');
  }

  /**
   * Create performance metrics file
   */
  private async createPerformanceMetrics(distPath: string): Promise<void> {
    if (!this.analysis) return;

    const metrics = {
      generatedAt: new Date().toISOString(),
      bundleSize: {
        total: this.analysis.totalSize,
        gzip: this.analysis.gzipSize,
        brotli: this.analysis.brotliSize
      },
      performance: {
        score: this.analysis.performanceScore,
        compressionRatio: this.analysis.compressionRatio,
        chunkCount: this.analysis.chunkCount
      },
      recommendations: this.generateRecommendations(),
      acquisitionReady: this.analysis.performanceScore >= 85
    };

    writeFileSync(
      join(distPath, 'performance-metrics.json'),
      JSON.stringify(metrics, null, 2)
    );

    console.log('📊 Created performance metrics file');
  }

  /**
   * Calculate performance score
   */
  private calculatePerformanceScore(
    totalSize: number,
    compressionRatio: number,
    chunkCount: number
  ): number {
    let score = 100;

    // Size penalty
    const sizeMB = totalSize / (1024 * 1024);
    if (sizeMB > 1) score -= (sizeMB - 1) * 20;

    // Compression penalty
    if (compressionRatio > 0.4) score -= (compressionRatio - 0.4) * 100;

    // Chunk count penalty
    if (chunkCount > 10) score -= (chunkCount - 10) * 2;

    return Math.max(0, Math.round(score));
  }

  /**
   * Get files by extension
   */
  private getFilesByExtension(dir: string, ext: string): string[] {
    const files: string[] = [];
    const fs = require('fs');
    
    function scan(directory: string) {
      const entries = fs.readdirSync(directory, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = join(directory, entry.name);
        
        if (entry.isDirectory()) {
          scan(fullPath);
        } else if (entry.name.endsWith(ext)) {
          files.push(fullPath);
        }
      }
    }
    
    scan(dir);
    return files;
  }
}

// CLI interface for production use
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  const distPath = args[1] || './dist';

  const optimizer = new BundleOptimizer({
    targetSize: 400, // 400KB for acquisition readiness
    compressionTarget: 0.25, // 25% compression target
    chunkSizeLimit: 200 // 200KB max chunks
  });

  try {
    switch (command) {
      case 'analyze':
        console.log('🔍 Analyzing bundles...');
        await optimizer.analyzeBundles(distPath);
        console.log(optimizer.generateOptimizationReport());
        break;

      case 'optimize':
        console.log('🚀 Optimizing bundles...');
        await optimizer.analyzeBundles(distPath);
        await optimizer.applyOptimizations(distPath);
        console.log(optimizer.generateOptimizationReport());
        break;

      case 'report':
        await optimizer.analyzeBundles(distPath);
        const report = optimizer.generateOptimizationReport();
        writeFileSync(join(distPath, 'optimization-report.md'), report);
        console.log('📋 Report saved to optimization-report.md');
        break;

      default:
        console.log(`
Usage: node bundle-optimizer.js <command> [dist-path]

Commands:
  analyze   - Analyze current bundle performance
  optimize  - Apply automatic optimizations
  report    - Generate detailed optimization report

Examples:
  node bundle-optimizer.js analyze ./dist
  node bundle-optimizer.js optimize ./build
  node bundle-optimizer.js report ./dist
        `);
    }
  } catch (error) {
    console.error('❌ Optimization failed:', error);
    process.exit(1);
  }
}

// Export for programmatic use
export { BundleOptimizer, type BundleAnalysis, type OptimizationConfig };

// Run CLI if called directly
if (require.main === module) {
  main();
}
