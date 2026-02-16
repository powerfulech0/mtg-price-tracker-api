# Multi-stage Dockerfile for Tasks API
# Optimized for production with minimal image size

# Stage 1: Base image with Node.js and dumb-init
FROM node:25.1.0-alpine AS base

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Stage 2: Production dependencies
FROM base AS dependencies

# Install production dependencies only
RUN npm ci --only=production && npm cache clean --force

# Stage 3: Development image
FROM base AS development

# Install all dependencies (including devDependencies)
RUN npm ci && npm cache clean --force

# Copy application source
COPY . .

# Expose port
EXPOSE 3000

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start development server with nodemon
CMD ["npm", "run", "dev"]

# Stage 4: Production image (optimized)
FROM base AS production

# Set NODE_ENV to production
ENV NODE_ENV=production

# Copy production dependencies from dependencies stage
COPY --from=dependencies /app/node_modules ./node_modules

# Copy application source
COPY . .

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 && \
    chown -R nodejs:nodejs /app

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start production server
CMD ["node", "src/server.js"]
