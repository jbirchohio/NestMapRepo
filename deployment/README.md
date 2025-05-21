# Deployment Guide

This document provides platform-agnostic deployment instructions for NestMap.

## Environment Variables

Set these environment variables in your hosting environment:

```
# Database Connection
DATABASE_URL=postgres://username:password@host:port/database

# OpenAI API
OPENAI_API_KEY=your_openai_api_key

# Mapbox
MAPBOX_TOKEN=your_mapbox_token
VITE_MAPBOX_TOKEN=your_mapbox_token  # Used by frontend

# Supabase Authentication
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# Session (generate a random string)
SESSION_SECRET=your_random_session_secret

# Port (optional, defaults to 5000)
PORT=5000
```

## Standard Deployment Steps

1. Install dependencies:
   ```
   npm install
   ```

2. Build the application:
   ```
   npm run build
   ```

3. Start the production server:
   ```
   npm start
   ```

## Process Management

For production environments, use a process manager like PM2:

```
# Install PM2
npm install -g pm2

# Start the application
pm2 start npm --name "nestmap" -- start

# Ensure it starts on boot
pm2 startup
pm2 save
```

## HTTPS Configuration

For production environments, configure HTTPS using:

1. A reverse proxy (Nginx, Apache)
2. Let's Encrypt for free SSL certificates
3. Cloud provider's built-in SSL management

## Scaling Considerations

1. Use connection pooling for database
2. Set up a load balancer for horizontal scaling
3. Implement a CDN for static assets
4. Consider containerization with Docker for consistent deployment