import type { FastifyInstance } from "fastify";
import type { Prisma } from "@prisma/client";
import { UserType } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../db/prisma.js";
import { E164_WHATSAPP_OTP, e164WhatsAppOtpHint } from "../lib/phone.js";
import { cascadeDeleteUser } from "../services/delete-user.js";
import {
  refineWorkshopCoordsTogether,
  workshopLatField,
  workshopLngField,
} from "../lib/workshop-coords.js";

const deleteAccountBodySchema = z.object({
  confirm: z.literal("DELETE_MY_FIXIT_ACCOUNT"),
});

const updateMeSchema = z
  .object({
    name: z.string().min(1).max(120).optional(),
    // Phone MUST stay populated for shop owners (customers contact them via
    // user.phone). The regex disallows null/empty already; the handler below
    // adds a belt-and-suspenders check against shop owners clearing it via
    // some future schema relaxation. Update User.phone only — never set to null.
    phone: z.string().regex(E164_WHATSAPP_OTP, e164WhatsAppOtpHint()).optional(),
    city: z.string().min(1).max(80).optional(),
    districtId: z.union([z.string().min(1).max(64), z.null()]).optional(),
    address: z.string().max(500).optional(),
    workshopLat: workshopLatField.optional(),
    workshopLng: workshopLngField.optional(),
    /** Set to null (or omit) to clear; same device token must not stay on other users. */
    fcmToken: z.union([z.string().min(1).max(512), z.null()]).optional(),
    /** Synced from mobile for localized push notifications. */
    preferredLocale: z.enum(["en", "ar-iq"]).optional(),
    userType: z.nativeEnum(UserType).optional(),
  })
  .superRefine(refineWorkshopCoordsTogether);

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
        // Defense-in-depth: the schema regex already rejects empty/null, but
        // if someone ever loosens it, this still blocks shop owners from
        // clearing their phone. Customer-facing requirement: every shop is
        // contactable by phone.
        if (typeof data.phone !== "string" || data.phone.trim().length === 0) {
          const ownsShop = await prisma.shop.findUnique({
            where: { userId: request.userId },
            select: { id: true },
          });
          if (ownsShop) {
            return reply.status(400).send({
              error: "Shops must have a phone number",
              field: "phone",
            });
          }
        }
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
      if (data.workshopLat !== undefined && data.workshopLng !== undefined) {
        if (data.workshopLat === null || data.workshopLng === null) {
          patch.workshopLat = null;
          patch.workshopLng = null;
        } else {
          patch.workshopLat = data.workshopLat;
          patch.workshopLng = data.workshopLng;
        }
      }
      if (data.fcmToken !== undefined) {
        const nextToken =
          data.fcmToken === null || data.fcmToken.length === 0 ? null : data.fcmToken;
        patch.fcmToken = nextToken;
      }
      if (data.userType !== undefined) {
        patch.userType = data.userType;
      }
      if (data.preferredLocale !== undefined) {
        patch.preferredLocale = data.preferredLocale;
      }
      const user = await prisma.$transaction(async (tx) => {
        if (
          data.fcmToken !== undefined &&
          typeof patch.fcmToken === "string" &&
          patch.fcmToken.length > 0
        ) {
          await tx.user.updateMany({
            where: { fcmToken: patch.fcmToken, id: { not: request.userId } },
            data: { fcmToken: null },
          });
        }
        return tx.user.update({
          where: { id: request.userId },
          data: patch,
          include: { district: true },
        });
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
