# 🚀 Deploy Remvana RIGHT NOW

## Fastest Option: Railway (10 minutes)

Railway hosts everything - frontend, backend, and database in one place.

### Step 1: Prepare for deployment
```bash
# 1. Commit all changes
git add .
git commit -m "Ready to deploy Remvana"

# 2. Push to GitHub
git push origin main
```

### Step 2: Deploy to Railway
1. Go to [railway.app](https://railway.app)
2. Click "New Project" → "Deploy from GitHub"
3. Select your repo
4. Railway auto-detects Node.js app

### Step 3: Add PostgreSQL
1. In Railway dashboard, click "+ New"
2. Select "Database" → "PostgreSQL"
3. It auto-connects to your app

### Step 4: Set Environment Variables
Click on your app service, go to "Variables" and add:

```env
# Copy from your .env file
DATABASE_URL=${{Postgres.DATABASE_URL}}
JWT_SECRET=your-super-secure-jwt-secret
SESSION_SECRET=your-super-secure-session-secret
OPENAI_API_KEY=your-openai-key
VIATOR_API_KEY=your-viator-key
VIATOR_PARTNER_ID=P00263344
VIATOR_MCID=42383
VITE_MAPBOX_TOKEN=your-mapbox-token
NODE_ENV=production
PORT=3000
```

### Step 5: Deploy!
Railway automatically:
- Builds your app
- Runs migrations
- Starts the server
- Gives you a URL like `remvana.up.railway.app`

## Alternative: Vercel + Supabase (Also fast)

### Frontend (Vercel):
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Follow prompts, it auto-detects Vite
```

### Backend (Supabase):
1. Create project at [supabase.com](https://supabase.com)
2. Use their PostgreSQL database
3. Deploy backend as Edge Functions

### Update your frontend API calls:
```typescript
// In client/src/lib/queryClient.ts
const API_BASE = import.meta.env.PROD 
  ? 'https://your-backend.supabase.co'
  : 'http://localhost:5000';
```

## Quick Fixes for Production

### 1. Update client API endpoint
```typescript
// client/src/lib/queryClient.ts
const API_URL = import.meta.env.VITE_API_URL || window.location.origin;
```

### 2. Add production build script
```json
// package.json
"scripts": {
  "build": "npm run build:client && npm run build:server",
  "build:client": "cd client && vite build",
  "build:server": "tsc -p server/tsconfig.json",
  "start": "node dist/server/index.js"
}
```

### 3. Update Vite config for API proxy
```typescript
// vite.config.ts
export default defineConfig({
  server: {
    proxy: {
      '/api': {
        target: process.env.VITE_API_URL || 'http://localhost:5000',
        changeOrigin: true,
      }
    }
  }
});
```

## Domain Setup (5 minutes)

1. Buy `remvana.com` (or .app, .travel)
2. In Railway/Vercel, add custom domain
3. Point DNS to their servers
4. SSL auto-configured

## Go Live Checklist

- [ ] Change all "Remvana" to "Remvana" in UI
- [ ] Set production environment variables
- [ ] Test Viator integration with live API
- [ ] Enable Stripe production keys
- [ ] Set up error tracking (Sentry)
- [ ] Test booking flow end-to-end

## Total Time: ~30 minutes

Railway is the fastest because:
- No separate backend hosting
- PostgreSQL included
- Auto-SSL
- WebSocket support
- One-click deploys from GitHub

Just push to GitHub and Railway auto-deploys! 🎉