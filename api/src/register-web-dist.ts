import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import fastifyStatic from "@fastify/static";
import type { FastifyInstance } from "fastify";

/**
 * Files Vite copies from `app/public/` to `dist/` root (not under `/assets/`).
 * Fastify only mounts `dist/assets` for hashed bundles, so each root file needs an explicit route.
 */
const WEB_DIST_ROOT_STATIC = ["brand-wrench.png"] as const;

function contentTypeForRootFile(name: string): string {
  if (name.endsWith(".png")) {
    return "image/png";
  }
  if (name.endsWith(".ico")) {
    return "image/x-icon";
  }
  if (name.endsWith(".svg")) {
    return "image/svg+xml";
  }
  return "application/octet-stream";
}

/**
 * Serves the Vite web app from `app/dist` when WEB_DIST_DIR is set (e.g. Fly).
 * - `GET /` → `index.html` (hash-router SPA)
 * - `/assets/*` → files from `dist/assets` (Vite build output)
 * - selected files from `dist/` root (same as Vite `public/`)
 * Does not register a catch-all, so `/socket.io` and `/api` keep normal behaviour.
 */
export async function registerWebDist(fastify: FastifyInstance): Promise<void> {
  const root = process.env.WEB_DIST_DIR?.trim();
  if (!root) {
    return;
  }

  const indexHtml = readFileSync(join(root, "index.html"), "utf8");

  fastify.get("/", async (_request, reply) => {
    return reply.type("text/html").send(indexHtml);
  });

  for (const name of WEB_DIST_ROOT_STATIC) {
    fastify.get(`/${name}`, async (_request, reply) => {
      const filePath = join(root, name);
      if (!existsSync(filePath)) {
        return reply.status(404).send();
      }
      const body = readFileSync(filePath);
      return reply.type(contentTypeForRootFile(name)).send(body);
    });
  }

  await fastify.register(fastifyStatic, {
    root: join(root, "assets"),
    prefix: "/assets/",
    decorateReply: false,
  });
}
