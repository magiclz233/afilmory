# Dockerfile for NAS deployment
FROM node:20-alpine AS base
WORKDIR /app
RUN corepack enable

# Install build dependencies
FROM base AS builder
RUN apk update && apk add --no-cache git perl
COPY . .
RUN sh ./scripts/preinstall.sh
RUN pnpm install --frozen-lockfile

# Build the app
RUN pnpm --filter=@afilmory/ssr build

# Runner stage
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
RUN apk add --no-cache curl wget

# Create a non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy built app
COPY --from=builder --chown=nextjs:nodejs /app/apps/ssr/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/ssr/.next/static /app/apps/ssr/.next/static
COPY --from=builder --chown=nextjs:nodejs /app/apps/ssr/public /app/apps/ssr/public

# Create directory for config
RUN mkdir -p /config
RUN chown -R nextjs:nodejs /config

# 设置卷挂载点：配置文件和照片文件夹
VOLUME /config
VOLUME /photos

# 端口暴露
EXPOSE 3000

# 设置用户
USER nextjs

# 启动命令
CMD ["node", "apps/ssr/server.js"] 