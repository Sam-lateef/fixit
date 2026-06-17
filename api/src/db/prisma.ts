import { PrismaClient } from "@prisma/client";

/**
 * Build the effective DATABASE_URL with sane pool + timeout defaults.
 *
 * Why: on Fly `shared-cpu-1x` the default Prisma pool size is
 *   `num_physical_cpus * 2 + 1 = 3` connections. One stale connection from a
 * flycast hiccup leaves only 2, which is trivial to saturate on the home
 * screen (parallel /users/me + /posts/mine + /threads + /media + /catalog).
 * Once saturated, follow-up requests queue and pile up to 60-90 s — exactly
 * the symptoms in Docs/debugs.md "Prisma connection pool starvation + zombie
 * connections (2026-06-08)".
 *
 * Defaults applied if the env URL didn't already specify them:
 *  - `connection_limit=10` — widen the per-machine pool from 3 → 10.
 *  - `pool_timeout=20`     — wait up to 20 s for a free connection before erroring.
 *  - `socket_timeout=30`   — kill a query stuck on a half-dead TCP socket after
 *                            30 s instead of waiting for the OS TCP keepalive
 *                            (~60-90 s). This is the key zombie-connection guard.
 *  - `connect_timeout=10`  — fail-fast initial connect rather than hanging on boot.
 *
 * Each param is set ONLY if absent, so a deployed environment can override any
 * single value via the `DATABASE_URL` Fly secret without re-deploying code.
 */
function buildDatabaseUrl(): string {
  const raw = process.env.DATABASE_URL;
  if (typeof raw !== "string" || raw.length === 0) {
    throw new Error("DATABASE_URL is required");
  }
  const url = new URL(raw);
  const defaults: Record<string, string> = {
    connection_limit: "10",
    pool_timeout: "20",
    socket_timeout: "30",
    connect_timeout: "10",
  };
  for (const [key, value] of Object.entries(defaults)) {
    if (!url.searchParams.has(key)) {
      url.searchParams.set(key, value);
    }
  }
  return url.toString();
}

/**
 * Thresholds, in ms, for the slowness probes below.
 *
 * SLOW_QUERY_MS — fires when Prisma reports a single SQL statement took longer
 * than this. Useful for "find the missing index" and "this LIKE without a
 * trigram is killing us" cases. 800ms is generous enough that healthy traffic
 * is silent and only real outliers light up the logs.
 *
 * SLOW_OP_MS — fires when the wall-clock around a Prisma operation exceeds
 * this. The gap between SLOW_OP_MS and the underlying query duration is the
 * pool-wait.
 *
 * POOL_WAIT_MS — when wall-clock exceeds (last reported query duration +
 * POOL_WAIT_MS), we conclude the request waited that long for a connection.
 * That is the smoking gun for pool starvation.
 *
 * Override via env without redeploying:
 *   fly secrets set PRISMA_SLOW_QUERY_MS=500 PRISMA_SLOW_OP_MS=2000
 */
const SLOW_QUERY_MS = Number(process.env.PRISMA_SLOW_QUERY_MS ?? 800);
const SLOW_OP_MS = Number(process.env.PRISMA_SLOW_OP_MS ?? 1500);
const POOL_WAIT_MS = Number(process.env.PRISMA_POOL_WAIT_MS ?? 500);

type QueryEvent = {
  timestamp: Date;
  query: string;
  params: string;
  duration: number;
  target: string;
};

const basePrisma = new PrismaClient({
  datasourceUrl: buildDatabaseUrl(),
  log: [
    { emit: "event", level: "query" },
    { emit: "event", level: "warn" },
    { emit: "event", level: "error" },
  ],
});

/**
 * Tracks the most recent Prisma-reported query duration. The `query` event
 * fires AFTER the SQL executes; the `$extends` query wrapper measures JS
 * wall-clock around the whole operation. The gap between them is the
 * pool-wait estimate.
 *
 * This is a single shared cell, not per-operation: Node is single-threaded
 * and the `query` event fires synchronously during the awaited query() call,
 * so by the time the wrapper reads it the value is the right one for the
 * just-finished op. Good enough for triage logging; not load-bearing.
 */
let lastQueryDurationMs = 0;

basePrisma.$on("query", (e: QueryEvent) => {
  lastQueryDurationMs = e.duration;
  if (e.duration >= SLOW_QUERY_MS) {
    const q = e.query.length > 300 ? `${e.query.slice(0, 300)}…` : e.query;
    const params =
      e.params.length > 200 ? `${e.params.slice(0, 200)}…` : e.params;
    console.warn(`[prisma:slow-query] ${e.duration}ms ${q} params=${params}`);
  }
});

basePrisma.$on("warn", (e: { message: string }) => {
  console.warn("[prisma:warn]", e.message);
});

basePrisma.$on("error", (e: { message: string }) => {
  console.error("[prisma:error]", e.message);
});

/**
 * Slow-op + pool-wait probe via `$extends({query})`. Tried `$use` first —
 * removed at runtime in Prisma 6.x even though docs still mention it.
 *
 * What it logs:
 *  - `pool-wait` — op total > SLOW_OP_MS AND (total - SQL duration) > POOL_WAIT_MS.
 *                  Smoking gun for pool starvation: the SQL itself was fast,
 *                  most of the time was spent waiting for a free connection.
 *  - `slow-op`   — op total > SLOW_OP_MS with small pool wait. The SQL itself
 *                  is the bottleneck (missing index, expensive join, etc.).
 *
 * Returns an extended client. Its type loses `$on/$use/$extends` but keeps
 * every model method, so the only callers that need adjustment are the seed
 * helpers — see the casts in catalog.ts and districts.ts.
 */
export const prisma = basePrisma.$extends({
  name: "slow-op-probe",
  query: {
    $allOperations: async ({ model, operation, args, query }) => {
      const start = Date.now();
      try {
        return await query(args);
      } finally {
        const elapsed = Date.now() - start;
        const queryMs = lastQueryDurationMs;
        const poolWaitMs = elapsed - queryMs;
        const op = model ? `${model}.${operation}` : operation;

        if (poolWaitMs >= POOL_WAIT_MS && elapsed >= SLOW_OP_MS) {
          console.warn(
            `[prisma:pool-wait] ${op} elapsed=${elapsed}ms query=${queryMs}ms wait=${poolWaitMs}ms`,
          );
        } else if (elapsed >= SLOW_OP_MS) {
          console.warn(`[prisma:slow-op] ${op} ${elapsed}ms (query=${queryMs}ms)`);
        }
      }
    },
  },
});
