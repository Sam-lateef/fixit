import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../db/prisma.js";

const bodySchema = z.object({
  role: z.enum(["OWNER", "SHOP"]),
});

/**
 * Issues a JWT for fixed dev users so mobile can skip OTP.
 * Enable only with DEV_ALLOW_SESSION_LOGIN=true and non-production.
 */
export async function registerDevSessionRoutes(
  fastify: FastifyInstance,
): Promise<void> {
  fastify.post("/api/v1/dev/session", async (request, reply) => {
    const parsed = bodySchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: "Invalid body", details: parsed.error.flatten() });
    }

    const district = await prisma.district.findFirst({
      where: { city: "Baghdad" },
      orderBy: { name: "asc" },
    });
    if (!district) {
      return reply.status(503).send({
        error: "No districts in DB. Run: npm run db:seed -w api",
      });
    }

    if (parsed.data.role === "OWNER") {
      const phone = "+9647000000001";
      let user = await prisma.user.findUnique({ where: { phone } });
      if (!user) {
        user = await prisma.user.create({
          data: {
            phone,
            userType: "OWNER",
            name: "Dev Owner",
            city: "Baghdad",
            districtId: district.id,
          },
        });
      } else {
        user = await prisma.user.update({
          where: { id: user.id },
          data: {
            userType: "OWNER",
            name: user.name ?? "Dev Owner",
            city: user.city ?? "Baghdad",
            districtId: user.districtId ?? district.id,
          },
        });
      }
      const token = await reply.jwtSign({
        sub: user.id,
        userType: user.userType,
      });
      return { token, user };
    }

    const phone = "+9647000000002";
    const devRepairCats = [
      "general", "Engine", "Brakes", "Transmission", "Electrical",
      "Suspension", "AC", "Body", "Tires", "Oil change",
    ];
    const devPartsCats = [
      "filters", "Engine parts", "Brakes", "Transmission",
      "Electrical", "Suspension", "Body parts", "Tires",
    ];

    let user = await prisma.user.findUnique({
      where: { phone },
      include: { shop: true },
    });
    if (!user) {
      user = await prisma.user.create({
        data: {
          phone,
          userType: "SHOP",
          name: "Dev Shop",
          city: "Baghdad",
          districtId: district.id,
          shop: {
            create: {
              name: "Dev Workshop",
              offersRepair: true,
              offersParts: true,
              offersTowing: true,
              repairRadiusKm: 50,
              partsRadiusKm: 50,
              towingRadiusKm: 50,
              carMakes: [],
              repairCategories: devRepairCats,
              partsCategories: devPartsCats,
            },
          },
        },
        include: { shop: true },
      });
    } else if (!user.shop) {
      await prisma.shop.create({
        data: {
          userId: user.id,
          name: "Dev Workshop",
          offersRepair: true,
          offersParts: true,
          offersTowing: true,
          repairRadiusKm: 50,
          partsRadiusKm: 50,
          towingRadiusKm: 50,
          carMakes: [],
          repairCategories: devRepairCats,
          partsCategories: devPartsCats,
        },
      });
      user = await prisma.user.findUniqueOrThrow({
        where: { id: user.id },
        include: { shop: true },
      });
    } else {
      await prisma.shop.update({
        where: { id: user.shop.id },
        data: {
          offersRepair: true,
          offersParts: true,
          offersTowing: true,
          repairRadiusKm: 50,
          partsRadiusKm: 50,
          towingRadiusKm: 50,
          repairCategories: devRepairCats,
          partsCategories: devPartsCats,
        },
      });
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          userType: "SHOP",
          name: user.name ?? "Dev Shop",
          city: user.city ?? "Baghdad",
          districtId: user.districtId ?? district.id,
        },
        include: { shop: true },
      });
    }

    const token = await reply.jwtSign({
      sub: user.id,
      userType: user.userType,
    });
    return { token, user };
  });
}
