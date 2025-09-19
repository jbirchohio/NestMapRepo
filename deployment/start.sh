#!/bin/bash
# Standard startup script for Remvana that works on any hosting platform

# Log startup information
echo "Starting Remvana application..."
echo "Node version: $(node -v)"
echo "NPM version: $(npm -v)"
echo "Environment: $NODE_ENV"

# Run database migrations if needed
if [ "$RUN_MIGRATIONS" = "true" ]; then
  echo "Running database migrations..."
  npm run db:push
fi

# Start the application based on environment
if [ "$NODE_ENV" = "production" ]; then
  echo "Starting in production mode..."
  npm start
else
  echo "Starting in development mode..."
  npm run dev
fi
