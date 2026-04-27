# Todo list — FixIt

Prioritized. Update on **`/end`** or **`/checkpoint`**.

## High priority

- [ ] Apple Sign-In (iOS) — Firebase + API exchange (see implementation guide § auth).
- [ ] Facebook auth + email/password — product decision + provider setup.
- [ ] Confirm Google on **dev build** only for release checklist (EAS / Play signing SHA-1 in Firebase).

## Medium

- [ ] RevenueCat / shop paywall flows in dev vs prod keys.
- [ ] Any open items from `docs/debugs.md`.

## Low / backlog

- [ ] **Migrate prod DB from Fly Postgres → Supabase** (after Supabase paid plan).
      Current: unmanaged Fly Postgres app `fixit-pg-db` (no automatic backups,
      single-node SPOF). Steps:
        1. Create Supabase project in a region close to Fly `iad` (US East).
        2. Update `prisma/schema.prisma` datasource to add
           `directUrl = env("DIRECT_URL")` (pooler vs direct split).
        3. `prisma migrate deploy` against the empty Supabase DB.
        4. `pg_dump --data-only --no-owner --no-acl` from current Fly DB →
           `psql` into Supabase.
        5. `fly secrets set DATABASE_URL=<pooler> DIRECT_URL=<direct>` →
           Fly redeploys → app talks to Supabase.
        6. Verify, then `fly postgres destroy fixit-pg-db`.
      Plan a 5-min downtime window for the secret flip.
- [ ] Until the migration: take periodic manual `pg_dump` snapshots before
      destructive migrations (no automatic backups on unmanaged Fly Postgres).
