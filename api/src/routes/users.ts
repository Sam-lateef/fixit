import type { FastifyInstance } from "fastify";
import type { Prisma } from "@prisma/client";
import { UserType } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../db/prisma.js";
import { E164_WHATSAPP_OTP, e164WhatsAppOtpHint } from "../lib/phone.js";
import { cascadeDeleteUser } from "../services/delete-user.js";

const deleteAccountBodySchema = z.object({
  confirm: z.literal("DELETE_MY_FIXIT_ACCOUNT"),
});

const updateMeSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  phone: z.string().regex(E164_WHATSAPP_OTP, e164WhatsAppOtpHint()).optional(),
  city: z.string().min(1).max(80).optional(),
  districtId: z.string().min(1).max(64).optional(),
  address: z.string().max(500).optional(),
  fcmToken: z.string().max(512).optional(),
  userType: z.nativeEnum(UserType).optional(),
});

export async function registerUserRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.get(
    "/api/v1/users/me",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const user = await prisma.user.findUnique({
        where: { id: request.userId },
        include: { district: true, shop: true },
      });
      if (!user) {
        return reply.status(404).send({ error: "User not found" });
      }
      return { user };
    },
  );

  fastify.put(
    "/api/v1/users/me",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const parsed = updateMeSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({ error: "Invalid body", details: parsed.error.flatten() });
      }
      const data = parsed.data;
      const existing = await prisma.user.findUnique({
        where: { id: request.userId },
        select: { city: true },
      });
      const patch: Prisma.UserUncheckedUpdateInput = {};
      if (data.name !== undefined) {
        patch.name = data.name;
      }
      if (data.phone !== undefined) {
        const taken = await prisma.user.findFirst({
          where: { phone: data.phone, id: { not: request.userId } },
          select: { id: true },
        });
        if (taken) {
          return reply.status(409).send({ error: "Phone number already in use" });
        }
        patch.phone = data.phone;
      }
      if (data.city !== undefined) {
        patch.city = data.city;
        if (existing?.city !== data.city && data.districtId === undefined) {
          patch.districtId = null;
        }
      }
      if (data.districtId !== undefined) {
        patch.districtId = data.districtId;
      }
      if (data.address !== undefined) {
        patch.address = data.address;
      }
      if (data.fcmToken !== undefined) {
        patch.fcmToken = data.fcmToken;
      }
      if (data.userType !== undefined) {
        patch.userType = data.userType;
      }
      const user = await prisma.user.update({
        where: { id: request.userId },
        data: patch,
        include: { district: true },
      });
      return { user };
    },
  );

  fastify.post(
    "/api/v1/users/me/delete-account",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const parsed = deleteAccountBodySchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({ error: "Invalid body", details: parsed.error.flatten() });
      }
      const exists = await prisma.user.findUnique({
        where: { id: request.userId },
        select: { id: true },
      });
      if (!exists) {
        return reply.status(404).send({ error: "User not found" });
      }
      await cascadeDeleteUser(request.userId);
      return { ok: true };
    },
  );
}
