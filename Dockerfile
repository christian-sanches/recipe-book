# Stage 1: Dependencies
FROM node:22-alpine AS deps
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

COPY package.json package-lock.json* ./
COPY prisma ./prisma
RUN npm ci && npm cache clean --force

# Fix next/server ESM resolution (next-auth needs this at runtime)
RUN node -e 'var p=require("/app/node_modules/next/package.json");delete p.exports;var fs=require("fs");fs.writeFileSync("/app/node_modules/next/package.json",JSON.stringify(p,null,2));fs.mkdirSync("/app/node_modules/next/server",{recursive:true});fs.writeFileSync("/app/node_modules/next/server/index.js","module.exports = require(\"../server.js\");\n");fs.writeFileSync("/app/node_modules/next/server/package.json",JSON.stringify({type:"commonjs"})+"\n");fs.mkdirSync("/app/node_modules/next/headers",{recursive:true});fs.writeFileSync("/app/node_modules/next/headers/index.js","module.exports = require(\"../headers.js\");\n");fs.writeFileSync("/app/node_modules/next/headers/package.json",JSON.stringify({type:"commonjs"})+"\n");console.log("ESM fix applied at deps stage");'

# Stage 2: Build
FROM node:22-alpine AS builder
WORKDIR /app

RUN apk add --no-cache openssl

COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV SKIP_ENV_VALIDATION=true
ENV NEXT_TELEMETRY_DISABLED=1

RUN npx prisma generate
RUN npm run build

# Stage 3: Runner
FROM node:22-alpine AS runner
WORKDIR /app

RUN apk add --no-cache openssl

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma

RUN mkdir -p .next
RUN chown nextjs:nodejs .next

# Standalone output + fixed next/ from deps (not builder, to keep the fix)
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

COPY --from=builder --chown=nextjs:nodejs /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/.prisma ./node_modules/.prisma
# next-auth needs next/ at runtime — copy from deps stage (already has ESM fix)
COPY --from=deps --chown=nextjs:nodejs /app/node_modules/next ./node_modules/next

# Simple entrypoint — just prisma + server
COPY --chown=nextjs:nodejs docker-entrypoint.sh /app/docker-entrypoint.sh
RUN chmod +x /app/docker-entrypoint.sh

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["/app/docker-entrypoint.sh"]
