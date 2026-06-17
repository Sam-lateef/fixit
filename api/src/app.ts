import Fastify from "fastify";
import cors from "@fastify/cors";
import jwt from "@fastify/jwt";
import multipart from "@fastify/multipart";
import fastifyStatic from "@fastify/static";
import { Server as IOServer } from "socket.io";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { prisma } from "./db/prisma.js";
import { registerAuth } from "./middleware/auth.js";
import { registerAuthRoutes } from "./routes/auth.js";
import { registerUserRoutes } from "./routes/users.js";
import { registerShopRoutes } from "./routes/shops.js";
import { registerPostRoutes } from "./routes/posts.js";
import { registerFeedRoutes } from "./routes/feed.js";
import { registerBidRoutes } from "./routes/bids.js";
import { registerChatRoutes } from "./routes/chat.js";
import { registerMediaRoutes } from "./routes/media.js";
import { registerUploadRoutes } from "./routes/uploads.js";
import {
  bootstrapCatalogIfEmpty,
  registerCatalogRoutes,
} from "./routes/catalog.js";
import {
  bootstrapDistrictsIfEmpty,
  registerDistrictRoutes,
} from "./routes/districts.js";
import { registerDiagnosticsRoutes } from "./routes/diagnostics.js";
import { registerGeocodeRoutes } from "./routes/geocode.js";
import { registerPublicConfigRoutes } from "./routes/public-config.js";
import { registerDevSessionRoutes } from "./routes/dev-session.js";
import { registerAdminAuthRoutes } from "./routes/admin/auth.js";
import { registerAdminUserRoutes } from "./routes/admin/users.js";
import { registerAdminPostRoutes } from "./routes/admin/posts.js";
import { registerReportRoutes } from "./routes/reports.js";
import { registerAdminReportRoutes } from "./routes/admin/reports.js";
import { registerAdminChatRoutes } from "./routes/admin/chat.js";
import { registerAdminMediaRoutes } from "./routes/admin/media.js";
import { registerAdminAuditRoutes } from "./routes/admin/audit.js";
import { initSocket } from "./socket/chat.js";
import { startPostExpiryJob } from "./cron/expiry.js";
import { registerWebDist } from "./register-web-dist.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

export type AppWithIo = {
  fastify: ReturnType<typeof Fastify>;
  io: IOServer;
};

export async function buildApp(): Promise<AppWithIo> {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET is required");
  }

  const fastify = Fastify({
    logger: true,
    // So `request.protocol` / forwarded headers match the client-visible URL (Fly, reverse proxies).
    trustProxy: true,
  });

  await fastify.register(cors, { origin: true, credentials: true });

  fastify.get("/health", async () => ({ ok: true }));

  // Readiness probe — point external uptime monitors at this, NOT /health.
  // /health only proves the Node process is alive; this proves the API can
  // actually serve requests by round-tripping a query through the Prisma
  // pool. If the pool wedges (Docs/debugs.md "Prisma pool starvation +
  // zombie connections 2026-06-08") /health/deep returns 503 while /health
  // still returns 200 — which is exactly what we want so Fly's own
  // liveness check doesn't kill the machine mid-recovery.
  fastify.get("/health/deep", async (_request, reply) => {
    const start = Date.now();
    const PROBE_TIMEOUT_MS = 5_000;
    try {
      await Promise.race([
        prisma.$queryRaw`SELECT 1`,
        new Promise((_, rej) =>
          setTimeout(() => rej(new Error("db probe timeout")), PROBE_TIMEOUT_MS),
        ),
      ]);
      return { ok: true, dbMs: Date.now() - start };
    } catch (e) {
      const dbMs = Date.now() - start;
      const error = e instanceof Error ? e.message : "db unreachable";
      return reply.status(503).send({ ok: false, dbMs, error });
    }
  });

  // Live state of the DB pool — pg_stat_activity snapshot. Token-protected
  // because the query text we surface can include user data (phones in WHERE
  // clauses, etc.). Set DIAGNOSTICS_TOKEN as a Fly secret, then during a
  // freeze: curl 'https://.../health/db-state?token=…'.
  //
  // Returns total connection count, breakdown by state, and any active
  // queries running > 1s. Truncates query text to 200 chars per row to keep
  // the payload small and limit accidental data exposure.
  //
  // Timeout is short (4s) on purpose: during a real pool exhaustion this
  // endpoint itself might queue. If we don't get an answer fast, returning
  // "probe timed out" IS the diagnostic — it confirms the pool is fully
  // saturated, no connection free to even run pg_stat_activity.
  type ActivityRow = {
    pid: number;
    state: string | null;
    duration_ms: number;
    wait_event_type: string | null;
    wait_event: string | null;
    query: string;
  };

  fastify.get<{ Querystring: { token?: string } }>(
    "/health/db-state",
    async (request, reply) => {
      const expected = process.env.DIAGNOSTICS_TOKEN;
      if (!expected || expected.length === 0) {
        return reply.status(503).send({
          ok: false,
          error: "DIAGNOSTICS_TOKEN not set on server",
        });
      }
      if (request.query.token !== expected) {
        return reply.status(401).send({ ok: false, error: "Unauthorized" });
      }

      const PROBE_TIMEOUT_MS = 4_000;
      const start = Date.now();
      try {
        const rows = await Promise.race([
          prisma.$queryRaw<ActivityRow[]>`
            SELECT
              pid,
              state,
              COALESCE(EXTRACT(EPOCH FROM (NOW() - query_start)) * 1000, 0)::int AS duration_ms,
              wait_event_type,
              wait_event,
              LEFT(query, 200) AS query
            FROM pg_stat_activity
            WHERE datname = current_database()
              AND pid <> pg_backend_pid()
            ORDER BY query_start NULLS LAST
          `,
          new Promise<ActivityRow[]>((_, rej) =>
            setTimeout(
              () => rej(new Error("db-state probe timeout")),
              PROBE_TIMEOUT_MS,
            ),
          ),
        ]);

        const byState: Record<string, number> = {};
        for (const r of rows) {
          const k = r.state ?? "unknown";
          byState[k] = (byState[k] ?? 0) + 1;
        }
        const longRunning = rows
          .filter((r) => r.state === "active" && r.duration_ms > 1_000)
          .slice(0, 20)
          .map((r) => ({
            pid: r.pid,
            durationMs: r.duration_ms,
            waitEvent: r.wait_event
              ? `${r.wait_event_type ?? ""}/${r.wait_event}`
              : null,
            query: r.query,
          }));

        return {
          ok: true,
          probeMs: Date.now() - start,
          totalConnections: rows.length,
          byState,
          longRunningCount: longRunning.length,
          longRunning,
        };
      } catch (e) {
        const probeMs = Date.now() - start;
        const error = e instanceof Error ? e.message : "probe failed";
        return reply.status(503).send({
          ok: false,
          probeMs,
          error,
          hint:
            probeMs >= PROBE_TIMEOUT_MS
              ? "Pool likely fully saturated — even this probe couldn't get a connection"
              : undefined,
        });
      }
    },
  );

  await registerPublicConfigRoutes(fastify);

  await fastify.register(jwt, {
    secret,
    sign: { expiresIn: process.env.JWT_EXPIRES_IN ?? "30d" },
  });
  // Per-file cap for any multipart upload. Keep aligned with the per-route check
  // in `routes/uploads.ts` (`MAX_BYTES`). The multipart parser enforces this at
  // the stream level so the route never sees an over-cap buffer.
  await fastify.register(multipart, { limits: { fileSize: 15 * 1024 * 1024 } });

  const localUpload = process.env.LOCAL_UPLOAD_DIR;
  if (localUpload) {
    await fastify.register(fastifyStatic, {
      root: join(process.cwd(), localUpload),
      prefix: "/uploads/",
      decorateReply: false,
    });
  }

  registerAuth(fastify);

  await registerAuthRoutes(fastify);
  if (
    process.env.NODE_ENV !== "production" &&
    process.env.DEV_ALLOW_SESSION_LOGIN === "true"
  ) {
    await registerDevSessionRoutes(fastify);
  }
  await registerUserRoutes(fastify);
  await registerShopRoutes(fastify);
  await registerPostRoutes(fastify);
  await registerFeedRoutes(fastify);
  await registerBidRoutes(fastify);
  await registerDistrictRoutes(fastify);
  await registerCatalogRoutes(fastify);
  await registerGeocodeRoutes(fastify);
  await registerDiagnosticsRoutes(fastify);
  await registerUploadRoutes(fastify);
  await registerMediaRoutes(fastify);
  await registerReportRoutes(fastify);

  await registerAdminAuthRoutes(fastify);
  await registerAdminUserRoutes(fastify);
  await registerAdminPostRoutes(fastify);
  await registerAdminReportRoutes(fastify);
  await registerAdminChatRoutes(fastify);
  await registerAdminMediaRoutes(fastify);
  await registerAdminAuditRoutes(fastify);

  const io = new IOServer(fastify.server, {
    cors: { origin: true, credentials: true },
  });
  const bridge = initSocket(io);
  registerChatRoutes(fastify, () => bridge);

  startPostExpiryJob();

  await registerWebDist(fastify);

  // Bootstrap districts + IQ catalog ONCE at startup if either table is empty.
  // Previously this lived in the request path (count() on every /districts or
  // /catalog/* call), which added a DB round-trip per request and compounded
  // a tiny Prisma pool on Fly shared-cpu-1x. Moved out of the hot path —
  // see Docs/debugs.md "Prisma pool starvation 2026-06-08".
  // Run in parallel; both are fast no-ops once the tables are populated.
  await Promise.all([
    bootstrapDistrictsIfEmpty(),
    bootstrapCatalogIfEmpty(),
  ]);

  return { fastify, io };
}
