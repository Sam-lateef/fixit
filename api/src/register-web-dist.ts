import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

import fastifyStatic from "@fastify/static";
import type { FastifyInstance } from "fastify";

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
  if (name.endsWith(".webmanifest") || name.endsWith(".manifest")) {
    return "application/manifest+json";
  }
  return "application/octet-stream";
}

function listWebDistRootStaticFiles(root: string): string[] {
  return readdirSync(root).filter((name) => {
    if (name === "index.html") {
      return false;
    }
    const filePath = join(root, name);
    try {
      return statSync(filePath).isFile();
    } catch {
      return false;
    }
  });
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

  for (const name of listWebDistRootStaticFiles(root)) {
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
