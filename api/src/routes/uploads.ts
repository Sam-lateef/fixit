import type { FastifyInstance } from "fastify";
import { uploadPhoto } from "../services/r2.js";
import { publicUploadBaseFromRequest } from "../util/public-url.js";

const MAX_BYTES = 2 * 1024 * 1024;
const ALLOWED = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
]);

export async function registerUploadRoutes(
  fastify: FastifyInstance,
): Promise<void> {
  fastify.post(
    "/api/v1/uploads/photo",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const file = await request.file();
      if (!file) {
        return reply.status(400).send({ error: "Missing file field photo" });
      }
      if (file.fieldname !== "photo") {
        return reply.status(400).send({ error: 'Expected field name "photo"' });
      }
      const buf = await file.toBuffer();
      if (buf.length > MAX_BYTES) {
        return reply.status(400).send({ error: "File too large (max 2MB)" });
      }
      const mime = file.mimetype;
      if (!ALLOWED.has(mime)) {
        return reply.status(400).send({ error: "Invalid image type" });
      }
      try {
        const url = await uploadPhoto(buf, mime, {
          publicBaseUrl: publicUploadBaseFromRequest(request),
        });
        return { url };
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Upload failed";
        return reply.status(503).send({ error: msg });
      }
    },
  );
}
