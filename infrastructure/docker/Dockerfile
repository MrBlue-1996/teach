# TopShelf Service LLC - API Server Dockerfile
# PROPRIETARY AND CONFIDENTIAL
# Copyright (c) 2026 TopShelf Service LLC. All Rights Reserved.

# =============================================================================
# BUILD STAGE
# =============================================================================
FROM node:20-alpine AS builder

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copy package files
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/config/package.json ./packages/config/
COPY packages/database/package.json ./packages/database/
COPY packages/auth/package.json ./packages/auth/
COPY packages/observability/package.json ./packages/observability/
COPY packages/policy-engine/package.json ./packages/policy-engine/
COPY packages/nlp/package.json ./packages/nlp/
COPY packages/mcp-server/package.json ./packages/mcp-server/
COPY packages/api-server/package.json ./packages/api-server/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY tsconfig.base.json tsconfig.json turbo.json ./
COPY packages/ ./packages/

# Build all packages
RUN pnpm build

# Prune dev dependencies
RUN pnpm prune --prod

# =============================================================================
# PRODUCTION STAGE
# =============================================================================
FROM node:20-alpine AS production

# Security: Run as non-root user
RUN addgroup -g 1001 -S topshelf && \
    adduser -S topshelf -u 1001 -G topshelf

WORKDIR /app

# Copy built application
COPY --from=builder --chown=topshelf:topshelf /app/node_modules ./node_modules
COPY --from=builder --chown=topshelf:topshelf /app/packages ./packages
COPY --from=builder --chown=topshelf:topshelf /app/package.json ./

# Create data directories
RUN mkdir -p /app/data /app/logs && \
    chown -R topshelf:topshelf /app/data /app/logs

# Switch to non-root user
USER topshelf

# Environment
ENV NODE_ENV=production
ENV PORT=3000

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

# Start server
CMD ["node", "packages/api-server/dist/index.js"]
