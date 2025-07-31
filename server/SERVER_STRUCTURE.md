# Server Structure

This document outlines the cleaned up server structure for the NestMap application.

## Entry Points

The server uses a single, clean entry point. The bootstrap previously located in `index-new.ts` has been moved here:

### Main Entry Point
- **`src/main.ts`** - Primary and only application entry point
  - Handles environment variable loading
  - Initializes database connection
  - Express app setup and middleware (Helmet, CORS)
  - Route setup and health check endpoint
  - Starts the Express server
  - Handles graceful shutdown

## Removed Files

The following redundant server entry points were removed during cleanup:

- ~~`server/index.ts`~~ - Legacy server entry point with complex env loading
- ~~`server/src/index.ts`~~ - Duplicate server entry point 
- ~~`server/src/app.ts`~~ - Duplicate Express app configuration
- ~~`server/start.js`~~ - JavaScript fallback server
- ~~`server/index-new.ts`~~ - Transitional entry point used during refactor
- ~~`server/index-minimal.ts`~~ - Experimental minimal server
- ~~`server/simple-index.ts`~~ - Simplified entry used for testing
- ~~`server/minimal-server.js`~~ - Old JavaScript demo server
- ~~`src/server.ts`~~ - Deprecated server configuration file

## Build Configuration

- **Entry**: `src/main.ts`  
- **Output**: `dist/main.mjs`
- **Build tool**: tsup with ES modules
- **Target**: es2022

## Scripts

```json
{
  "build": "tsup",
  "dev": "dotenv -e ../.env npx tsx src/main.ts", 
  "start": "dotenv -e ../.env node dist/main.mjs",
  "dev:watch": "dotenv -e ../.env tsup --watch & nodemon --watch dist --exec npm start"
}
```

## Environment Loading

The server tries to load `.env` files from multiple locations:
1. `../../../.env` (monorepo root from dist)
2. `../../.env` (monorepo root from src)  
3. `../.env` (parent directory)

## Key Features

- ✅ Single entry point for clarity
- ✅ Proper error handling and logging
- ✅ Graceful shutdown support  
- ✅ Database connection with fallback
- ✅ Environment variable validation
- ✅ Development and production modes
- ✅ Health check endpoint

## Starting the Server

### Development
```bash
pnpm dev
```

### Production  
```bash
pnpm build
pnpm start
```

### From monorepo root
```bash
pnpm dev
# or
pnpm start
```
