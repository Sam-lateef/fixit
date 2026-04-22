import type { FastifyRequest } from "fastify";

/**
 * Base URL clients can use to fetch `/uploads/...` (local disk uploads).
 * Prefer `API_PUBLIC_URL` when the server binds privately but is reached via a public host.
 * Otherwise derive from the incoming request (Host / X-Forwarded-*), then `API_URL`.
 */
export function publicUploadBaseFromRequest(req: FastifyRequest): string {
  const fromEnv = process.env.API_PUBLIC_URL?.trim().replace(/\/$/, "");
  if (fromEnv && fromEnv.length > 0) {
    return fromEnv;
  }

  const xfHost = req.headers["x-forwarded-host"];
  const host =
    (Array.isArray(xfHost) ? xfHost[0] : xfHost) ||
    (Array.isArray(req.headers.host) ? req.headers.host[0] : req.headers.host);

  if (typeof host === "string" && host.trim().length > 0) {
    const xfProto = req.headers["x-forwarded-proto"];
    const protoHdr = Array.isArray(xfProto) ? xfProto[0] : xfProto;
    const isHttps =
      (typeof protoHdr === "string" && protoHdr.toLowerCase() === "https") ||
      req.protocol === "https";
    return `${isHttps ? "https" : "http"}://${host.trim()}`;
  }

  return process.env.API_URL?.trim().replace(/\/$/, "") ?? "";
}
