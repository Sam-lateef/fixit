import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import type { Role, UserType } from "@prisma/client";

type JwtPayload = {
  sub: string;
  userType: UserType;
  role?: Role;
};

export function registerAuth(fastify: FastifyInstance): void {
  fastify.decorate(
    "authenticate",
    async function authenticate(
      request: FastifyRequest,
      reply: FastifyReply,
    ): Promise<void> {
      try {
        const payload = (await request.jwtVerify()) as JwtPayload;
        request.userId = payload.sub;
        request.userType = payload.userType;
        request.role = payload.role;
      } catch {
        reply.status(401).send({ error: "Unauthorized" });
      }
    },
  );

  fastify.decorate(
    "requireAdmin",
    async function requireAdmin(
      request: FastifyRequest,
      reply: FastifyReply,
    ): Promise<void> {
      try {
        const payload = (await request.jwtVerify()) as JwtPayload;
        if (payload.role !== "ADMIN") {
          reply.status(403).send({ error: "Forbidden" });
          return;
        }
        request.userId = payload.sub;
        request.userType = payload.userType;
        request.role = payload.role;
      } catch {
        reply.status(401).send({ error: "Unauthorized" });
      }
    },
  );
}
