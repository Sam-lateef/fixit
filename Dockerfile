# Fix It API — monorepo workspace build (npm workspaces)
FROM node:22-bookworm-slim AS runner
RUN apt-get update -y \
  && apt-get install -y openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /repo

COPY package.json package-lock.json ./
COPY api/package.json ./api/
COPY app/package.json ./app/
COPY mobile/package.json ./mobile/

# DevDependencies needed for `tsc`; pruned after build. Cache speeds repeat Fly deploys.
RUN --mount=type=cache,target=/root/.npm \
    npm ci -w api

COPY api ./api

WORKDIR /repo/api
RUN npx prisma generate
RUN npm run build

WORKDIR /repo
RUN npm prune --omit=dev

WORKDIR /repo/api
ENV NODE_ENV=production
EXPOSE 3000
CMD ["node", "dist/index.js"]
