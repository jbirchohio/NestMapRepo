# Platform-Specific Notes

This document provides guidance on running NestMap on different hosting platforms while maintaining a platform-agnostic codebase.

## General Approach

NestMap is designed to work on any hosting platform with minimal configuration changes. The core application uses:

- Standard environment variables for configuration
- Platform-agnostic database connections
- Health checks compatible with all major hosting providers
- Standard Docker and deployment configurations

## Platform-Specific Considerations

### Replit

When deploying on Replit:

1. The `.replit` file is automatically used by the Replit platform
2. Workflows are configured automatically
3. Environment secrets should be set in the Replit Secrets panel
4. Database connection uses the built-in PostgreSQL service

### Standard VPS

When deploying on a standard VPS:

1. Use the `deployment/systemd.service` file for service management
2. Configure Nginx with `deployment/nginx.conf`
3. Use Let's Encrypt for SSL certificates
4. Set environment variables in `.env` file

### Docker Environments

When using Docker:

1. Use the provided `deployment/Dockerfile` and `deployment/docker-compose.yml`
2. Build with: `docker-compose -f deployment/docker-compose.yml build`
3. Run with: `docker-compose -f deployment/docker-compose.yml up -d`
4. Environment variables can be set in a `.env` file or passed to the container

### Heroku and Similar PaaS

When deploying to Heroku or similar platforms:

1. Use the provided `Procfile`
2. Set environment variables in the platform's dashboard
3. The `PORT` environment variable will be set automatically
4. Database connection string should be set as `DATABASE_URL`

### AWS, GCP, Azure

When deploying to major cloud providers:

1. Follow cloud-specific best practices for Node.js applications
2. Use managed database services when possible
3. Set up proper IAM roles and security groups
4. Consider using container services (ECS, Cloud Run, ACI)

## Environment Variables

The following environment variables are used across all platforms:

| Variable | Description | Required |
|----------|-------------|----------|
| DATABASE_URL | PostgreSQL connection string | Yes |
| OPENAI_API_KEY | OpenAI API key | Yes |
| MAPBOX_TOKEN | Mapbox API token | Yes |
| VITE_MAPBOX_TOKEN | Mapbox API token for frontend | Yes |
| VITE_SUPABASE_URL | Supabase project URL | Yes |
| VITE_SUPABASE_ANON_KEY | Supabase anonymous key | Yes |
| SESSION_SECRET | Secret for session encryption | Yes |
| PORT | Server port (default: 5000) | No |
| NODE_ENV | Environment (development/production) | No |

## Handling Platform-Specific Files

Some files in the project are specific to certain platforms:

- `.replit`: Used only by Replit
- `vercel.json`: Used only by Vercel
- `render.yaml`: Used only by Render
- `Procfile`: Used by Heroku and similar platforms

These files don't interfere with each other and allow the application to be deployed to multiple platforms without changes to the core codebase.