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

# Install workspaces needed to build API + Vite web app; pruned after build.
RUN --mount=type=cache,target=/root/.npm \
    npm ci -w api -w app

# Workaround for npm/cli#4828 — when the host that wrote package-lock.json
# was Windows or macOS, the Linux-x64 platform-specific Rollup native
# binary may be missing from the lockfile, breaking `vite build` here.
# This is a no-op when the binary is already installed.
RUN --mount=type=cache,target=/root/.npm \
    npm install --no-save --no-fund --no-audit \
      @rollup/rollup-linux-x64-gnu

COPY api ./api
COPY app ./app

WORKDIR /repo/api
RUN npx prisma generate
RUN npm run build

WORKDIR /repo/app
# Optional bake-time admin link override (see app/.env.example). Prefer runtime
# `ADMIN_LOGIN_URL` on the API container (GET /api/v1/public/config).
ARG VITE_ADMIN_LOGIN_URL=
ENV VITE_ADMIN_LOGIN_URL=$VITE_ADMIN_LOGIN_URL
RUN npm run build

WORKDIR /repo
RUN npm prune --omit=dev

WORKDIR /repo/api
ENV NODE_ENV=production
ENV WEB_DIST_DIR=/repo/app/dist
EXPOSE 3000
CMD ["node", "dist/index.js"]
