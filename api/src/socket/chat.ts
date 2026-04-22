import type { Server as IOServer } from "socket.io";
import jwt from "jsonwebtoken";
import type { UserType } from "@prisma/client";
import { prisma } from "../db/prisma.js";
import { sendPush } from "../services/fcm.js";

type JwtPayload = { sub: string; userType: UserType };

export type ChatIoBridge = {
  emitNewMessage: (threadId: string, message: unknown) => void;
};

export function initSocket(io: IOServer): ChatIoBridge {
  io.use((socket, next) => {
    const token = socket.handshake.auth.token as string | undefined;
    const secret = process.env.JWT_SECRET;
    if (!token || !secret) {
      next(new Error("Unauthorized"));
      return;
    }
    try {
      const payload = jwt.verify(token, secret) as JwtPayload;
      socket.data.userId = payload.sub;
      next();
    } catch {
      next(new Error("Unauthorized"));
    }
  });

  io.on("connection", (socket) => {
    const userId: string = socket.data.userId;

    socket.on("join-thread", (threadId: string) => {
      void socket.join(threadId);
    });

    socket.on(
      "send-message",
      async (payload: { threadId: string; content: string }, cb) => {
        const { threadId, content } = payload;
        if (!threadId || !content || content.length > 4000) {
          cb?.({ error: "Invalid payload" });
          return;
        }
        const thread = await prisma.chatThread.findFirst({
          where: {
            id: threadId,
            bid: {
              OR: [
                { post: { userId } },
                { shop: { userId } },
              ],
            },
          },
          include: {
            bid: {
              include: {
                post: true,
                shop: { include: { user: true } },
              },
            },
          },
        });
        if (!thread) {
          cb?.({ error: "Forbidden" });
          return;
        }
        const message = await prisma.message.create({
          data: { threadId, senderId: userId, content },
        });
        io.to(threadId).emit("new-message", message);

        const ownerId = thread.bid.post.userId;
        const shopUserId = thread.bid.shop.userId;
        const recipientId = userId === ownerId ? shopUserId : ownerId;
        const recipient = await prisma.user.findUnique({
          where: { id: recipientId },
        });
        if (recipient?.fcmToken) {
          try {
            await sendPush(
              recipient.fcmToken,
              "New message",
              content.slice(0, 80),
              { threadId, type: "CHAT" },
              false,
            );
          } catch {
            /* ignore */
          }
        }
        cb?.({ ok: true, message });
      },
    );

    socket.on("mark-read", async (payload: { threadId: string }) => {
      const threadId = payload?.threadId;
      if (!threadId) return;
      const allowed = await prisma.chatThread.findFirst({
        where: {
          id: threadId,
          bid: {
            OR: [
              { post: { userId } },
              { shop: { userId } },
            ],
          },
        },
      });
      if (!allowed) return;
      await prisma.message.updateMany({
        where: {
          threadId,
          senderId: { not: userId },
          readAt: null,
        },
        data: { readAt: new Date() },
      });
      socket.to(threadId).emit("messages-read", { threadId });
    });
  });

  return {
    emitNewMessage(threadId: string, message: unknown): void {
      io.to(threadId).emit("new-message", message);
    },
  };
}
