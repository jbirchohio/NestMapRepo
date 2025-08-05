# Railway Deployment Guide

## Environment Variables Required on Railway

Make sure these are set in your Railway project settings:

### Critical Variables (REQUIRED)
```
DATABASE_URL=your_postgres_connection_string
JWT_SECRET=your_jwt_secret_minimum_32_chars
SESSION_SECRET=your_session_secret_minimum_32_chars
CORS_ORIGIN=https://your-app.up.railway.app
PORT=${{PORT}}  # Railway provides this
```

### Optional Variables
```
# OpenAI for AI features
OPENAI_API_KEY=your_openai_key

# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id

# Mapbox for maps
VITE_MAPBOX_TOKEN=your_mapbox_token

# Sentry for error tracking (optional)
SENTRY_DSN=your_sentry_dsn
```

## Common Issues

### 502 Bad Gateway
1. Check Railway logs: `railway logs`
2. Ensure all required env vars are set
3. Make sure PORT is set to `${{PORT}}` (Railway's dynamic port)

### GOOGLE_CLIENT_ID Error
If you see "invalid key-value pair '= GOOGLE_CLIENT_ID'":
1. Check for extra spaces or = signs in the Railway UI
2. Re-enter the value without quotes
3. Make sure there's no trailing whitespace

### Blank Page / React useState Error
If you see "Cannot read properties of undefined (reading 'useState')":
1. This is a React bundling issue - already fixed in vite.config.ts
2. Make sure to rebuild with `npm run build`
3. React is now bundled in the vendor chunk to load first

### Build Issues
Railway uses Nixpacks by default. The app should build automatically with:
```
npm install
npm run build
npm start
```

## Debugging

1. Check logs:
```bash
railway logs
```

2. SSH into the container:
```bash
railway run bash
```

3. Test locally with production build:
```bash
# Set env vars first
export DATABASE_URL=...
export JWT_SECRET=...
export SESSION_SECRET=...
export CORS_ORIGIN=http://localhost:5000

npm run build
npm start
```