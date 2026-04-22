import "dotenv/config";
import { buildApp } from "./app.js";

const port = Number(process.env.PORT ?? 3000);
const host = "0.0.0.0";

const { fastify } = await buildApp();

try {
  await fastify.listen({ port, host });
  fastify.log.info(`API listening on http://${host}:${port}`);
} catch (err) {
  fastify.log.error(err);
  process.exit(1);
}
