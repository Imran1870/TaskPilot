# Multi-stage Dockerfile for server (production-ready)

# Stage 1: Build stage
FROM node:20-alpine AS builder
WORKDIR /app
COPY server/package*.json ./
RUN npm ci

# Stage 2: Production stage
FROM node:20-alpine AS runner
ENV NODE_ENV=production
WORKDIR /app

# Copy production dependencies only
COPY server/package*.json ./
RUN npm ci --only=production

# Copy server sources
COPY server/src ./src
COPY server/config ./config

# Copy shared to /app/shared and symlink it to /shared so relative imports can resolve dependencies
COPY shared ./shared
RUN ln -s /app/shared /shared

# Run as non-root user 'node'
RUN chown -R node:node /app /shared
USER node

EXPOSE 8080

# Configure healthcheck to check `/health` endpoint
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD node -e "fetch('http://localhost:8080/health').then(r => r.ok ? process.exit(0) : process.exit(1)).catch(() => process.exit(1))"

CMD ["node", "src/server.js"]
