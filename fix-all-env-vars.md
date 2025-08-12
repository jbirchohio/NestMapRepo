# Environment Variables Complete Fix

## VITE Variables Used in Code (Build-Time):
1. `VITE_MAPBOX_TOKEN` - Used for map functionality
2. `VITE_STRIPE_PUBLISHABLE_KEY` - Used for Stripe payments
3. `VITE_SUPABASE_URL` - Used for Supabase (if enabled)
4. `VITE_SUPABASE_ANON_KEY` - Used for Supabase (if enabled)
5. `VITE_BASE_URL` - Used for SEO/meta tags

## Backend Variables (Runtime):
- `DATABASE_URL` - PostgreSQL connection
- `JWT_SECRET` - JWT token signing
- `SESSION_SECRET` - Session encryption
- `CORS_ORIGIN` - CORS configuration
- `NODE_ENV` - Environment mode
- `PORT` - Server port
- `STRIPE_SECRET_KEY` - Stripe backend key
- `STRIPE_WEBHOOK_SECRET` - Stripe webhook verification
- `OPENAI_API_KEY` - OpenAI API
- `VIATOR_API_KEY` - Viator API
- Other API keys...

## Current Issues:
1. Vite variables not available during Docker build
2. Some variable names inconsistent between code and types
3. No validation of required variables
4. Railway not passing build args to Docker

## Solution:
1. Fix all variable names to be consistent
2. Update Dockerfile to accept ALL Vite variables as build args
3. Create validation script
4. Add railway.toml for proper configuration