# syntax=docker/dockerfile:1

# ─────────────────────────────────────────────────────────────────────────────
# AIVeda web — Next.js 16 standalone
#
# NEXT_PUBLIC_* are read by the browser bundle, so they are baked in at BUILD
# time, not at run time. Changing NEXT_PUBLIC_API_URL means rebuilding this
# image; setting it in compose's `environment:` alone does nothing.
# ─────────────────────────────────────────────────────────────────────────────

FROM node:22-bookworm-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci


FROM node:22-bookworm-slim AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# The one build argument that matters. It is the public origin of the whole
# app — the API lives under /api/v1 on the same host — so no CORS, and the
# refresh cookie is first-party.
ARG NEXT_PUBLIC_API_URL=http://localhost:8000
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}

# `sitemap.ts` and `robots.ts` read this, and both are generated at build time.
# Left unset they fall back to http://localhost:3000, and the deployed site
# serves a sitemap and a robots.txt advertising localhost to every crawler.
# Defaults to the API origin because on this deployment they are the same host.
ARG NEXT_PUBLIC_SITE_URL=""
ENV NEXT_PUBLIC_SITE_URL=${NEXT_PUBLIC_SITE_URL:-$NEXT_PUBLIC_API_URL}

ENV NEXT_TELEMETRY_DISABLED=1

RUN npm run build


FROM node:22-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN groupadd --system --gid 1001 nodejs \
 && useradd  --system --uid 1001 --gid nodejs nextjs

# `standalone` carries its own minimal node_modules and server.js. `static`
# and `public` are not included in it and must be copied alongside, or every
# stylesheet and image 404s while the pages themselves render fine.
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
