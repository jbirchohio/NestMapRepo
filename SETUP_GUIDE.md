# NestMap Setup Guide

This guide provides detailed instructions for setting up NestMap on your own environment or for development.

## Prerequisites

Before starting, you'll need:

1. Node.js 16+ installed on your system
2. A PostgreSQL database (either self-hosted or Supabase)
3. API keys for the external services:
   - OpenAI API key
   - Mapbox API token
   - Supabase project (if using Supabase Auth)

## Step 1: Database Setup

### Option A: Using Supabase (Recommended)

1. Create a new project at [Supabase](https://supabase.com)
2. Once your project is created, go to Project Settings > Database to get your connection string
3. In the SQL Editor, run the schema script from `schema/schema.sql` to create all required tables

### Option B: Using a different PostgreSQL database

1. Create a new PostgreSQL database
2. Connect to your database and run the schema script from `schema/schema.sql`
3. Note your connection string: `postgres://username:password@hostname:port/database_name`

## Step 2: External Service Setup

### OpenAI API

1. Sign up or log in at [OpenAI Platform](https://platform.openai.com/)
2. Navigate to API Keys and create a new secret key
3. Copy the key and keep it secure - you'll need it for your `.env` file

### Mapbox API

1. Sign up or log in at [Mapbox](https://mapbox.com/)
2. Navigate to Account > Access tokens
3. Create a new token with the following scopes:
   - styles:read
   - fonts:read
   - datasets:read
   - vision:read
4. Copy the token for your `.env` file

### Supabase Authentication (Optional)

If using Supabase for authentication:

1. In your Supabase project, go to Authentication > Settings
2. Enable Email/Password sign-ups
3. Go to Project Settings > API to find your project URL and anon key

## Step 3: Environment Setup

1. Copy `.env.example` to `.env`:
   ```
   cp .env.example .env
   ```

2. Open `.env` and fill in your credentials:
   ```
   # Database
   DATABASE_URL=postgres://username:password@hostname:port/database_name

   # Supabase Authentication
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

   # OpenAI
   OPENAI_API_KEY=your_openai_api_key

   # Mapbox
   MAPBOX_TOKEN=your_mapbox_token
   VITE_MAPBOX_TOKEN=your_mapbox_token
   ```

## Step 4: Installation and Running

1. Install dependencies:
   ```
   npm install
   ```

2. Run database migrations (if not already done):
   ```
   node migrate-db.mjs
   ```

3. Start development server:
   ```
   npm run dev
   ```

4. Access the application at http://localhost:5000

## Troubleshooting

### Database Connection Issues

- Check that your database credentials are correct
- Ensure your database server is running and accessible
- For Supabase, make sure you've enabled direct database connections

### Authentication Problems

- Verify the Supabase URL and anon key are correct
- Check that email auth is enabled in your Supabase project

### AI Features Not Working

- Verify your OpenAI API key
- Check that you have sufficient credits in your OpenAI account
- Make sure you have the appropriate model access (GPT-4)

### Map Not Displaying

- Verify your Mapbox token
- Check that your token has the right scopes enabled
- Make sure the token is accessible in the frontend via the VITE_MAPBOX_TOKEN variable

## Deployment

### Replit Deployment

1. Create the following secrets in your Replit environment:
   - DATABASE_URL
   - VITE_SUPABASE_URL
   - VITE_SUPABASE_ANON_KEY
   - OPENAI_API_KEY
   - MAPBOX_TOKEN
   - VITE_MAPBOX_TOKEN

2. Deploy using the deploy button in Replit

### Other Hosting

1. Build the production version:
   ```
   npm run build
   ```

2. Ensure your hosting environment has all environment variables set
3. Use the built files in the `dist` directory for deployment