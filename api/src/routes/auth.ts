import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../db/prisma.js";
import { E164_WHATSAPP_OTP, e164WhatsAppOtpHint } from "../lib/phone.js";
import { ensureFirebaseAdminInitialized } from "../services/firebase-app.js";
import { signInWithFirebaseIdToken } from "../services/firebase-social-auth.js";
import { sendOTP, verifyOTP } from "../services/otp.js";

const phoneSchema = z.object({
  phone: z.string().regex(E164_WHATSAPP_OTP, e164WhatsAppOtpHint()),
});

const verifySchema = z.object({
  phone: z.string().regex(E164_WHATSAPP_OTP, e164WhatsAppOtpHint()),
  code: z.string().min(4).max(10),
});

const firebaseSchema = z.object({
  idToken: z.string().min(10),
});

export async function registerAuthRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.post(
    "/api/v1/auth/refresh",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const user = await prisma.user.findUnique({
        where: { id: request.userId },
      });
      if (!user) {
        return reply.status(404).send({ error: "User not found" });
      }
      if (user.bannedAt) {
        return reply.status(403).send({ error: "Account disabled" });
      }
      const token = await reply.jwtSign({
        sub: user.id,
        userType: user.userType,
        role: user.role,
      });
      return { token, user };
    },
  );

  fastify.post("/api/v1/auth/firebase", async (request, reply) => {
    if (!ensureFirebaseAdminInitialized()) {
      return reply.status(503).send({
        error:
          "Firebase Auth is not configured on the server (set FIREBASE_SERVICE_ACCOUNT_JSON).",
      });
    }
    const parsed = firebaseSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: "Invalid body", details: parsed.error.flatten() });
    }
    try {
      const { user, isNewUser } = await signInWithFirebaseIdToken(parsed.data.idToken);
      if (user.bannedAt) {
        return reply.status(403).send({ error: "Account disabled" });
      }
      const token = await reply.jwtSign({
        sub: user.id,
        userType: user.userType,
        role: user.role,
      });
      return {
        token,
        isNewUser,
        user,
      };
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Invalid Firebase token";
      return reply.status(401).send({ error: msg });
    }
  });

  fastify.post("/api/v1/auth/send-otp", async (request, reply) => {
    const parsed = phoneSchema.safeParse(request.body);
    if (!parsed.success) {
      const flat = parsed.error.flatten();
      const first = parsed.error.issues[0]?.message;
      return reply.status(400).send({
        error: first ?? "Invalid phone number",
        details: flat,
      });
    }
    try {
      await sendOTP(parsed.data.phone);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "OTP send failed";
      return reply.status(503).send({ error: msg });
    }
    return { success: true };
  });

  fastify.post("/api/v1/auth/verify-otp", async (request, reply) => {
    const parsed = verifySchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: "Invalid body", details: parsed.error.flatten() });
    }
    const { phone, code } = parsed.data;
    let ok: boolean;
    try {
      ok = await verifyOTP(phone, code);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Verify failed";
      return reply.status(503).send({ error: msg });
    }
    if (!ok) {
      return reply.status(400).send({
        error:
          "Incorrect or expired code. Request a new code if it has been more than 10 minutes.",
      });
    }

    let user = await prisma.user.findUnique({ where: { phone } });
    const isNewUser = !user;
    if (!user) {
      user = await prisma.user.create({
        data: { phone, userType: "OWNER" },
      });
    }
    if (user.bannedAt) {
      return reply.status(403).send({ error: "Account disabled" });
    }

    const token = await reply.jwtSign({
      sub: user.id,
      userType: user.userType,
      role: user.role,
    });

    return {
      token,
      isNewUser,
      user,
    };
  });
}
