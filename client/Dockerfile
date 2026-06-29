# Dockerfile for client (production static serving with Nginx)

# Stage 1: Build stage
FROM node:20-alpine AS builder
WORKDIR /app

# Accept VITE_API_URL as build argument (embedded during Vite compilation)
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL

# Copy package manifests and install dependencies
COPY client/package*.json ./
RUN npm ci

# Copy shared and client sources
COPY shared ../shared
COPY client/ ./

# Run static asset build compilation
RUN npm run build

# Stage 2: Production serving stage
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy custom nginx configuration for SPA routing fallback
COPY client/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
