# Cross-Platform Deployment Guide

This guide provides instructions for deploying NestMap on any platform consistently.

## Starting the Application

### Development Mode
```bash
# On Unix/Linux/MacOS
NODE_ENV=development npm run dev

# On Windows (Command Prompt)
set NODE_ENV=development
npm run dev

# On Windows (PowerShell)
$env:NODE_ENV="development"
npm run dev
```

### Production Mode
```bash
# On Unix/Linux/MacOS
NODE_ENV=production npm start

# On Windows (Command Prompt)
set NODE_ENV=production
npm start

# On Windows (PowerShell)
$env:NODE_ENV="production"
npm start
```

## Environment Variables

Create a `.env` file in the project root:

```
# Database Connection
DATABASE_URL=postgres://username:password@host:port/database

# OpenAI API
OPENAI_API_KEY=your_openai_api_key

# Mapbox
MAPBOX_TOKEN=your_mapbox_token
VITE_MAPBOX_TOKEN=your_mapbox_token

# Supabase Authentication
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# Session Secret
SESSION_SECRET=your_random_session_secret
```

## Database Migration

```bash
# On Unix/Linux/MacOS
NODE_ENV=development node scripts/migrate-db.js

# On Windows (Command Prompt)
set NODE_ENV=development
node scripts/migrate-db.js

# On Windows (PowerShell)
$env:NODE_ENV="development"
node scripts/migrate-db.js
```

## Building for Production

```bash
npm run build
```

## Windows-Compatible Commands

For Windows users, you'll need to set environment variables differently:

Command Prompt:
```cmd
set NODE_ENV=production
set PORT=5000
npm start
```

PowerShell:
```powershell
$env:NODE_ENV="production"
$env:PORT="5000"
npm start
```

## Platform-Specific Setup

### Linux Setup

1. Install Node.js 16+:
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_16.x | sudo -E bash -
   sudo apt-get install -y nodejs
   ```

2. Install PostgreSQL:
   ```bash
   sudo apt-get install postgresql postgresql-contrib
   ```

3. Create database:
   ```bash
   sudo -u postgres createdb nestmap
   ```

4. Run the application with systemd:
   ```bash
   sudo cp deployment/systemd.service /etc/systemd/system/nestmap.service
   sudo systemctl daemon-reload
   sudo systemctl enable nestmap
   sudo systemctl start nestmap
   ```

### macOS Setup

1. Install dependencies with Homebrew:
   ```bash
   brew install node@16 postgresql
   ```

2. Start PostgreSQL:
   ```bash
   brew services start postgresql
   ```

3. Create database:
   ```bash
   createdb nestmap
   ```

### Windows Setup

1. Install Node.js from the [official website](https://nodejs.org/)
2. Install PostgreSQL from the [official website](https://www.postgresql.org/download/windows/)
3. Create a database using pgAdmin
4. Set up environment variables in System Properties

## Environment Differences Considerations

### File Paths

Use path.join for cross-platform file paths:

```javascript
const path = require('path');
const filePath = path.join('directory', 'file.txt');
```

### Process Management

For production deployments, use appropriate process managers:

- Linux: systemd or PM2
- Windows: Windows Service or PM2
- macOS: launchd or PM2

PM2 works across all platforms:
```bash
npm install -g pm2
pm2 start npm --name "nestmap" -- start
```

### HTTPS Configuration

- Linux/macOS: Use Let's Encrypt with certbot
- Windows: Use Let's Encrypt with Certify The Web
- All platforms: Consider using a reverse proxy like Nginx or Caddy