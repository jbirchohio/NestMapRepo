# NestMap Railway Deployment Guide

This guide will help you deploy your NestMap project to Railway successfully.

## Quick Setup Steps

### 1. Build the Project
Run this command to build both frontend and backend:
```bash
npm run build
```

### 2. Update Environment Variables
Copy `.env.example` to `.env` and fill in your actual values:
- VITE_SUPABASE_URL=your-supabase-project-url  
- VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
- OPENAI_API_KEY=your-openai-api-key
- MAPBOX_TOKEN=your-mapbox-access-token
- DATABASE_URL=your-database-connection-string

### 3. Railway Configuration
The `railway.json` file is already set up to use:
- Build command: `npm run build`
- Start command: `npm start`
- Node.js runtime

### 4. Deploy to Railway
1. Push your code to GitHub
2. Connect your GitHub repo to Railway
3. Set environment variables in Railway dashboard
4. Deploy!

## Project Structure for Railway

Your current structure is already Railway-compatible:
```
nestmap/
├── client/              # React frontend (built to dist/)
├── server/              # Express backend (TypeScript)
├── dist/                # Built files (frontend + backend)
├── package.json         # Main build scripts
├── railway.json         # Railway configuration
├── .env.example         # Environment template
└── README.md
```

## Environment Variables to Set in Railway

When you deploy to Railway, make sure to set these environment variables in the Railway dashboard:

1. **VITE_SUPABASE_URL** - Your Supabase project URL
2. **VITE_SUPABASE_ANON_KEY** - Your Supabase anonymous key  
3. **OPENAI_API_KEY** - Your OpenAI API key
4. **MAPBOX_TOKEN** - Your Mapbox access token
5. **DATABASE_URL** - Your database connection string (if using external DB)
6. **NODE_ENV** - Set to "production"

## Build Process

The build process does:
1. `vite build` - Builds React frontend to `dist/`
2. `esbuild server/index.ts` - Compiles TypeScript backend to `dist/index.js`
3. Railway runs `npm start` which executes `node dist/index.js`

Your existing server already handles:
- Serving static files from `dist/`
- API routes for trips, users, etc.
- Catch-all route for React Router

## Ready for Deployment!

Your NestMap project is now ready for Railway deployment. The key files are:
- ✅ `railway.json` - Railway configuration
- ✅ `.env.example` - Environment template
- ✅ `package.json` - Build and start scripts
- ✅ Existing server code - Already handles static files and API routes

Just push to GitHub and connect to Railway!