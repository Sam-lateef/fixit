import type { FastifyInstance } from "fastify";
import { z } from "zod";

/**
 * Mobile signup telemetry sink. The mobile app posts one breadcrumb per
 * meaningful step in the signup flow (mount, before-fetch, after-fetch,
 * navigate, RC sync, push registration, …). Tester sessions show up in
 * Fly logs grouped by `sessionId`, so we can answer "where did this
 * tester freeze?" without device access.
 *
 * Endpoint is unauthenticated on purpose — testers fire the first events
 * before they have a JWT (phone entry / OTP verify). The schema caps each
 * field length so a crashed client can't flood the logs.
 *
 * Nothing is persisted to the DB. Fly's stdout retention is enough for the
 * debugging window we care about.
 */
const breadcrumbSchema = z.object({
  sessionId: z.string().min(1).max(64),
  event: z.string().min(1).max(120),
  ts: z.number().int(),
  durationMs: z.number().int().optional(),
  error: z.string().max(2000).optional(),
  data: z.record(z.unknown()).optional(),
  platform: z.string().max(40).optional(),
  appVersion: z.string().max(40).optional(),
});

export async function registerDiagnosticsRoutes(
  fastify: FastifyInstance,
): Promise<void> {
  fastify.post(
    "/api/v1/diagnostics/signup-breadcrumb",
    async (request, reply) => {
      const parsed = breadcrumbSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({ error: "Invalid breadcrumb" });
      }
      const b = parsed.data;
      const summary =
        b.durationMs !== undefined
          ? `${b.event} (${b.durationMs}ms)`
          : b.event;
      const msg = b.error ? `${summary}: ${b.error}` : summary;
      request.log.info(
        {
          tag: "signup_breadcrumb",
          sessionId: b.sessionId,
          event: b.event,
          durationMs: b.durationMs,
          error: b.error,
          data: b.data,
          platform: b.platform,
          appVersion: b.appVersion,
          clientTs: b.ts,
          ip: request.ip,
        },
        `signup ${b.sessionId} ${msg}`,
      );
      return reply.status(204).send();
    },
  );
}
