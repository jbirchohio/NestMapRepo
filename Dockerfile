# Ultra-optimized Dockerfile for Railway deployment
# No puppeteer, no browser dependencies, minimal size

FROM node:22-alpine AS builder

# Install only essential build dependencies for native modules
RUN apk add --no-cache python3 make g++

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install ALL dependencies for building
RUN npm ci --prefer-offline --no-audit

# Copy source code
COPY . .

# Accept build arguments for Vite environment variables
ARG VITE_STRIPE_PUBLISHABLE_KEY
ARG VITE_MAPBOX_TOKEN

# Set them as environment variables for the build
ENV VITE_STRIPE_PUBLISHABLE_KEY=$VITE_STRIPE_PUBLISHABLE_KEY
ENV VITE_MAPBOX_TOKEN=$VITE_MAPBOX_TOKEN

# Build the application
RUN npm run build

# Production stage
FROM node:22-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install only production dependencies
RUN npm ci --prefer-offline --no-audit --omit=dev --ignore-scripts

# Copy built application from builder stage
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/uploads ./uploads

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

USER nodejs

# Set production environment
ENV NODE_ENV=production

# Railway will provide PORT
EXPOSE 3000

# Start the application
CMD ["node", "dist/index.js"]