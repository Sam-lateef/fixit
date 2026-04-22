import type { FastifyInstance } from "fastify";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../../db/prisma.js";

const loginSchema = z.object({
  email: z.string().email().transform((v) => v.trim().toLowerCase()),
  password: z.string().min(1),
});

export async function registerAdminAuthRoutes(
  fastify: FastifyInstance,
): Promise<void> {
  fastify.post("/api/v1/admin/auth/login", async (request, reply) => {
    const parsed = loginSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: "Invalid body" });
    }
    const { email, password } = parsed.data;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.passwordHash || user.role !== "ADMIN") {
      return reply.status(401).send({ error: "Invalid credentials" });
    }
    if (user.bannedAt) {
      return reply.status(403).send({ error: "Account disabled" });
    }
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      return reply.status(401).send({ error: "Invalid credentials" });
    }
    const token = await reply.jwtSign({
      sub: user.id,
      userType: user.userType,
      role: user.role,
    });
    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    };
  });

  fastify.get(
    "/api/v1/admin/auth/me",
    { preHandler: [fastify.requireAdmin] },
    async (request, reply) => {
      const user = await prisma.user.findUnique({
        where: { id: request.userId },
        select: { id: true, email: true, name: true, role: true },
      });
      if (!user) {
        return reply.status(404).send({ error: "Not found" });
      }
      return { user };
    },
  );
}
