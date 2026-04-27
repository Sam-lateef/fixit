# Project overview — FixIt (صلّح)

**FixIt** is a mobile marketplace connecting car owners in Iraq with repair workshops, parts shops, and towing. Owners post jobs; shops bid; owner accepts; in-app chat coordinates. **No in-app payments** (connection-only).

- **Primary doc:** `docs/fixit_implementation_guide (1).md` (full product + technical spec).
- **Mobile:** `mobile/` — Expo (SDK 54), Expo Router, Firebase, native Google on dev builds.
- **Agent orientation:** `AGENTS.md` at repo root.

**Markets / languages:** Iraq-first; English + Iraqi Arabic (RTL).

**Admin Next on Fly:** Source in `web/admin/`. Fly app `fixit-admin` → `https://fixit-admin.fly.dev` (`web/admin/fly.toml` + `Dockerfile`). One-time: `fly apps create fixit-admin`. Deploy from repo root: `npm run deploy:fly:admin`, or `cd web/admin && fly deploy`. `API_BASE` defaults to `https://fixit-api.fly.dev` in `fly.toml` so the admin UI calls the main API.

**Fly.io (API + legacy web shell):** From repo root, `fly auth login` then `npm run deploy:fly` (or `fly deploy`). App name is in `fly.toml` (`app = "fixit-api"` → URL `https://fixit-api.fly.dev`). The Docker image builds the Vite app in `app/` and sets `WEB_DIST_DIR` so Fastify serves `GET /` and `/assets/*`; API remains at `/api/v1/...`, Socket.io at `/socket.io`. Web routes use hash URLs, e.g. `https://<app>.fly.dev/#/coming-soon`, `#/auth/welcome` (car owners — Google / Apple via Firebase), `#/auth/shop` (shop owners — web sign-in coming soon; `#/auth/number` redirects here), `#/privacy`, `#/terms`. Car-owner web sign-in needs the same `VITE_FIREBASE_*` client config as mobile (`EXPO_PUBLIC_FIREBASE_*`) in `app/.env` before `npm run build -w app`. For the **Admin login** link: set Fly secret `ADMIN_LOGIN_URL` to your Next admin (`web/admin`) login URL (e.g. `https://fixit-admin.fly.dev/login`), or optional bake-time `VITE_ADMIN_LOGIN_URL`. On `*-api.fly.dev` with no secret, the SPA guesses `https://*-admin.fly.dev/login`. Local Vite uses `http://<LAN-host>:3001/login` when Next runs beside the dev server.
