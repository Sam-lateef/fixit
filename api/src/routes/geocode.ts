import type { FastifyInstance } from "fastify";
import { z } from "zod";

const lastByKey = new Map<string, number>();
const MIN_GAP_MS = 2000;

export async function registerGeocodeRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.get(
    "/api/v1/geocode/reverse",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const parsed = z
        .object({
          lat: z.coerce.number().min(-90).max(90),
          lng: z.coerce.number().min(-180).max(180),
        })
        .safeParse(request.query);
      if (!parsed.success) {
        return reply.status(400).send({ error: "Invalid lat/lng" });
      }
      const key = request.userId;
      const now = Date.now();
      const prev = lastByKey.get(key) ?? 0;
      if (now - prev < MIN_GAP_MS) {
        return reply.status(429).send({ error: "Too many geocode requests" });
      }
      lastByKey.set(key, now);
      const lat = parsed.data.lat;
      const lng = parsed.data.lng;
      const url =
        "https://nominatim.openstreetmap.org/reverse?lat=" +
        lat +
        "&lon=" +
        lng +
        "&format=json";
      const res = await fetch(url, {
        headers: {
          "Accept-Language": "ar,en",
          "User-Agent": "FixIt/1.0 (bid marketplace)",
        },
      });
      if (!res.ok) {
        return reply.status(502).send({ error: "Geocoder error" });
      }
      const data = (await res.json()) as { display_name?: string };
      return { address: data.display_name ?? "" };
    },
  );
}
