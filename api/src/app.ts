import Fastify from "fastify";
import cors from "@fastify/cors";
import jwt from "@fastify/jwt";
import multipart from "@fastify/multipart";
import fastifyStatic from "@fastify/static";
import { Server as IOServer } from "socket.io";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
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
import { registerCatalogRoutes } from "./routes/catalog.js";
import { registerDistrictRoutes } from "./routes/districts.js";
import { registerGeocodeRoutes } from "./routes/geocode.js";
import { registerDevSessionRoutes } from "./routes/dev-session.js";
import { registerAdminAuthRoutes } from "./routes/admin/auth.js";
import { registerAdminUserRoutes } from "./routes/admin/users.js";
import { registerAdminPostRoutes } from "./routes/admin/posts.js";
import { initSocket } from "./socket/chat.js";
import { startPostExpiryJob } from "./cron/expiry.js";

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

  await fastify.register(jwt, {
    secret,
    sign: { expiresIn: process.env.JWT_EXPIRES_IN ?? "30d" },
  });
  await fastify.register(multipart, { limits: { fileSize: 3 * 1024 * 1024 } });

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
  await registerUploadRoutes(fastify);
  await registerMediaRoutes(fastify);

  await registerAdminAuthRoutes(fastify);
  await registerAdminUserRoutes(fastify);
  await registerAdminPostRoutes(fastify);

  const io = new IOServer(fastify.server, {
    cors: { origin: true, credentials: true },
  });
  const bridge = initSocket(io);
  registerChatRoutes(fastify, () => bridge);

  startPostExpiryJob();

  return { fastify, io };
}
