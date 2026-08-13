# syntax=docker/dockerfile:1

# ---- deps: install dependencies (postinstall runs `prisma generate`) ----
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app
# Prisma schema/config must be present so the postinstall `prisma generate` succeeds.
COPY package.json package-lock.json prisma.config.ts ./
COPY prisma ./prisma
RUN npm ci

# ---- builder: produce the Next.js standalone output ----
FROM node:20-alpine AS builder
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
# Build is environment-agnostic (Prisma client is lazy) — no DATABASE_URL needed here.
RUN npm run build

# ---- runner: minimal production image ----
FROM node:20-alpine AS runner
RUN apk add --no-cache openssl
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0
# Run as an unprivileged user.
RUN addgroup --system --gid 1001 nodejs \
 && adduser --system --uid 1001 nextjs
# Standalone bundle already contains a minimal node_modules; add static assets and public files.
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
USER nextjs
EXPOSE 3000
# Runtime config (DATABASE_URL, AUTH_SECRET, etc.) is validated at startup — pass it via `-e`/env.
CMD ["node", "server.js"]
