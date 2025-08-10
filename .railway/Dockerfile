# Custom lightweight Dockerfile for Railway
# This overrides Nixpacks auto-detection

FROM node:22-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies (skip scripts to avoid puppeteer)
RUN npm ci --prefer-offline --no-audit --ignore-scripts --omit=dev

# Copy application files
COPY . .

# Build the application
RUN npm run build

# Expose port (Railway will override this)
EXPOSE 3000

# Start the application
CMD ["node", "dist/index.js"]