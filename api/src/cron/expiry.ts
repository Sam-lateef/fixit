import cron from "node-cron";
import { prisma } from "../db/prisma.js";

export function startPostExpiryJob(): void {
  cron.schedule("*/5 * * * *", async () => {
    const now = new Date();
    await prisma.post.updateMany({
      where: {
        status: "ACTIVE",
        expiresAt: { lt: now },
      },
      data: { status: "EXPIRED" },
    });
  });
}
