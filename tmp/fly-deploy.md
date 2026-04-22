# Fix It — Fly.io API + phone testing

## 1. Prerequisites

- [Fly CLI](https://fly.io/docs/hands-on/install-flyctl/) installed and logged in: `fly auth login`
- Docker builds locally (optional sanity check): `docker build -t fixit-api -f Dockerfile .` from repo root

## 2. Create the Fly app (once)

From the **repo root** (`FixIt/`):

```bash
fly apps create fixit-api
```

If the name is taken, pick another name and edit `fly.toml` → `app = "your-name"`.

## 3. Postgres database

Pick a **cluster app name** that is not already taken on your Fly org (e.g. `fixit-db` or `fixit-pg-db`).

```bash
fly postgres create -n fixit-pg-db --region iad --initial-cluster-size 1 --vm-size shared-cpu-1x --volume-size 3
fly postgres attach --app fixit-api fixit-pg-db
```

`attach` injects `DATABASE_URL` into the `fixit-api` app (check: `fly secrets list -a fixit-api`).

## 4. Secrets (required before first deploy)

Replace `https://fixit-api.fly.dev` with your real app hostname (`fly status -a fixit-api` → Hostname).

PowerShell (one line):

```powershell
fly secrets set -a fixit-api JWT_SECRET="paste-a-long-random-string" API_URL="https://fixit-api.fly.dev" APP_URL="https://fixit-api.fly.dev"
```

Bash:

```bash
fly secrets set -a fixit-api \
  JWT_SECRET="paste-a-long-random-string" \
  API_URL="https://fixit-api.fly.dev" \
  APP_URL="https://fixit-api.fly.dev"
```

Optional (when you have them): Infobip / OTPIQ / R2 / Firebase — same keys as `api/.env.example`.

**Uploads in production:** configure **Cloudflare R2** (`R2_*` vars) or uploads return 503. Local `LOCAL_UPLOAD_DIR` is not suitable for Fly Machines without a volume.

## 5. Deploy

```bash
npm run deploy:fly
```

Or: `fly deploy`

First deploy runs `npx prisma migrate deploy` via `release_command` in `fly.toml` (with one automatic retry after 20s if the first attempt fails).

### Deploy failed: `P1017: Server has closed the connection` (release_command)

Usually **Postgres was not ready** or the **connection dropped** during `prisma migrate deploy`.

1. **Ensure Postgres is running** (replace with your DB app name if different, e.g. `fixit-pg-db`):

   ```bash
   fly status -a fixit-pg-db
   fly machine list -a fixit-pg-db
   ```

   If machines are stopped, start them (`fly machine start <id> -a fixit-pg-db`) or scale up (`fly scale count 1 -a fixit-pg-db`).

2. **Redeploy** — often succeeds on the second try: `fly deploy` from repo root.

3. **Longer DB timeouts** — update `DATABASE_URL` (Fly secret) with query params, e.g. append  
   `?connect_timeout=120`  
   (keep existing query string with `&` if the URL already has `?sslmode=...`).

4. **Run migrations manually** (if release_command keeps failing): deploy with `release_command` temporarily commented out in `fly.toml`, then:

   ```bash
   fly ssh console -a fixit-api -C "bash -lc 'cd /repo/api && npx prisma migrate deploy'"
   ```

### Deploy: release_command OK, then `timeout waiting for health checks` / `api.machines.dev ... request canceled`

- **Meaning:** The new image is fine (migrations ran), but Fly did not see **`GET /health`** succeed in time on the new machine(s), or **flyctl** lost the wait to Fly’s API (the `request canceled` line is often a **client/network timeout**, not always your app).
- **In repo:** `fly.toml` uses a **120s** `grace_period` and **15s** check `timeout` so slow cold starts can still pass.
- **Try:** Run **`fly deploy`** again from a stable network; if it always dies at the same step, run **`fly wireguard reset`** then redeploy ([Fly SSH / WireGuard](https://fly.io/docs/flyctl/wireguard-reset/)).
- **Fewer moving parts:** If you run **2 machines** and rolling deploy is flaky on a small plan, temporarily **`fly scale count 1 -a fixit-api`**, deploy, then scale back up if needed.
- **Logs:** `fly logs -a fixit-api` during deploy — look for crash loops vs. slow bind to `:3000`.

**Seed districts (optional, once):** `-C` runs a single program, not a shell — use `bash -lc` so `cd` works.

Bash / Git Bash:

```bash
fly ssh console -a fixit-api -C "bash -lc 'cd /repo/api && npx prisma db seed'"
```

PowerShell:

```powershell
fly ssh console -a fixit-api -C 'bash -lc "cd /repo/api && npx prisma db seed"'
```

If SSH sits on “Connecting to fdaa:…” on Windows, try an **interactive** session (`fly ssh console -a fixit-api`) and run the same `cd` + `npx prisma db seed` inside the machine, or check [Fly SSH troubleshooting](https://fly.io/docs/flyctl/ssh-console/) (WireGuard / IPv6).

## 6. Point the mobile app at Fly

In **`mobile/.env`** set (no trailing slash):

```env
EXPO_PUBLIC_API_URL=https://fixit-api.fly.dev
```

Restart Metro with a clean cache:

```bash
cd mobile
npm run start:clear
```

## 7. Install / run on your Android phone

**Option A — Expo Go (fastest for JS testing)**

1. Install **Expo Go** from Play Store.
2. Same Wi‑Fi as your PC (or tunnel): run `npx expo start` in `mobile/`, scan the QR code.

**Option B — Native debug build (USB)**

1. Enable **USB debugging** on the phone.
2. From `mobile/`: `npm run android:build` (needs Android SDK / Studio). Installs a dev build with the current `EXPO_PUBLIC_*` values baked in.

After changing **`EXPO_PUBLIC_API_URL`**, restart Metro; for a **release/dev build**, rebuild so the new URL is embedded.

## 8. Verify API

```bash
curl https://fixit-api.fly.dev/health
```

Expect: `{"ok":true}`
