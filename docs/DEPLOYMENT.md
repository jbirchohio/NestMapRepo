# NestMap Deployment Guide

This guide covers various deployment options for the NestMap application.

## Deployment Options

### 1. Replit Deployment (Recommended)

Replit provides the simplest deployment method for NestMap:

1. In your Replit project, click the "Deploy" button in the top-right corner
2. Ensure all environment variables are set in Replit Secrets
3. Follow the prompts to complete deployment
4. Once deployed, your app will be available at `https://your-project-name.username.repl.co`

Environment variables required:
- `DATABASE_URL`
- `OPENAI_API_KEY`
- `MAPBOX_TOKEN`
- `VITE_MAPBOX_TOKEN`
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

### 2. Vercel Deployment

NestMap can be deployed to Vercel with the included `vercel.json` configuration file:

1. Install the Vercel CLI: `npm install -g vercel`
2. Run `vercel login` and follow the prompts
3. From the project directory, run `vercel`
4. Set all required environment variables in the Vercel dashboard
5. Complete the deployment process as prompted

### 3. Manual VPS Deployment

For more control, NestMap can be deployed to a VPS:

1. Set up a VPS with Node.js 16+ and PostgreSQL
2. Clone the repository to your server
3. Install dependencies: `npm install`
4. Build the application: `npm run build`
5. Set up environment variables
6. Start the server: `npm start`
7. Consider using PM2 for process management: 
   ```
   npm install -g pm2
   pm2 start npm --name "nestmap" -- start
   ```

### 4. Docker Deployment

For containerized deployment:

1. Create a `Dockerfile` in the project root:
   ```dockerfile
   FROM node:16-alpine
   WORKDIR /app
   COPY package*.json ./
   RUN npm install
   COPY . .
   RUN npm run build
   EXPOSE 5000
   CMD ["npm", "start"]
   ```

2. Build the Docker image:
   ```
   docker build -t nestmap .
   ```

3. Run the container:
   ```
   docker run -p 5000:5000 --env-file .env nestmap
   ```

## Environment Variables

All deployment methods require these environment variables:

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `OPENAI_API_KEY` | API key for OpenAI services |
| `MAPBOX_TOKEN` | Mapbox API token for server use |
| `VITE_MAPBOX_TOKEN` | Mapbox API token for client use |
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anonymous key |
| `SESSION_SECRET` | Random string for session encryption |

## Database Migration

After deployment, ensure database tables are created:

```
NODE_ENV=production node scripts/migrate-db.js
```

## HTTPS Configuration

For production use, configure HTTPS either:

1. Through your hosting provider (Vercel, Replit handle this automatically)
2. Using a reverse proxy like Nginx with Let's Encrypt
3. For manual setups, using Node.js HTTPS module with certificates

## Monitoring

Consider setting up monitoring with:

1. Simple monitoring: PM2 built-in monitoring
2. Advanced monitoring: Datadog, New Relic, or Sentry
3. Log management: Logtail, Papertrail, or self-hosted ELK stack

## Backup Strategy

Implement regular database backups:

1. Automated PostgreSQL dumps
2. Cloud storage backup (AWS S3, Google Cloud Storage)
3. Retention policy for backups (daily, weekly, monthly)

## Scaling Considerations

As usage grows, consider:

1. Database connection pooling
2. Horizontal scaling with load balancing
3. CDN integration for static assets
4. Redis caching layer for frequent queries
5. Separate API and frontend services