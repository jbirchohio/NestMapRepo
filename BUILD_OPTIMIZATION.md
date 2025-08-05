# Build Performance Optimization Guide

## Current Performance
- Build time: ~30 seconds (down from 5+ minutes)
- Main bundle: 281KB (down from 2.2MB)

## Further Optimizations

### 1. Lazy Load Mapbox (Biggest Win)
The Mapbox bundle is 1.6MB. Load it only when needed:

```typescript
// In useMapbox.ts
const loadMapbox = async () => {
  const mapboxgl = await import('mapbox-gl');
  // Use mapboxgl.default here
};
```

### 2. Add More Dynamic Imports
Convert heavy components to dynamic imports:

```typescript
// For pages that aren't immediately needed
const AITripGenerator = lazy(() => import('./pages/AITripGenerator'));
const AnalyticsDashboard = lazy(() => import('./components/AnalyticsDashboard'));
const PdfExport = lazy(() => import('./components/PdfExport'));
```

### 3. Remove Unused Dependencies
Check and remove unused packages:
```bash
npx depcheck
```

### 4. Enable SWC for React (Faster builds)
```bash
npm install -D @vitejs/plugin-react-swc
```

Then update vite.config.ts:
```typescript
import react from '@vitejs/plugin-react-swc'
```

### 5. Use Vite's Built-in CSS Optimization
Already enabled in the config with:
- `cssMinify: true`
- `cssCodeSplit: true`

### 6. Consider Using a CDN for Large Libraries
For production, you could load React and Mapbox from CDN:
```html
<!-- In index.html -->
<script crossorigin src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
<script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
```

Then configure Vite to treat them as external.

## Monitoring Build Performance
Add this to package.json to analyze bundle:
```json
"scripts": {
  "analyze": "vite build --mode analyze"
}
```

## Production Deployment Tips
1. Enable HTTP/2 on your server
2. Use Brotli compression instead of gzip
3. Set proper cache headers for assets
4. Consider using a CDN for static assets