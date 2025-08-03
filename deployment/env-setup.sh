#!/bin/bash
# Standard environment setup script for VoyageOps

# Check if .env file exists, create from example if not
if [ ! -f .env ]; then
  echo "Creating .env file from .env.example..."
  cp .env.example .env
  echo "Please edit .env file with your actual configuration values"
fi

# Make directories if they don't exist
mkdir -p logs
mkdir -p data
mkdir -p dist

# Set correct permissions
chmod +x deployment/start.sh

# Install dependencies
echo "Installing dependencies..."
npm install

echo "Environment setup complete!"
echo "Edit your .env file with your actual API keys and configuration"
echo "Then start the application with: npm start"