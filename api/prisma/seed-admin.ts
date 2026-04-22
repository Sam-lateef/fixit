/**
 * One-shot admin seed. Run with:
 *   ADMIN_EMAIL=you@example.com ADMIN_PASSWORD='...' npx tsx prisma/seed-admin.ts
 *
 * Idempotent: if a user with the given email exists, it is promoted to ADMIN
 * and its password is updated. Otherwise a new admin user is created.
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

async function main(): Promise<void> {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  const name = process.env.ADMIN_NAME ?? "Admin";

  if (!email || !password) {
    throw new Error("ADMIN_EMAIL and ADMIN_PASSWORD env vars are required");
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const prisma = new PrismaClient();

  try {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      await prisma.user.update({
        where: { id: existing.id },
        data: { role: "ADMIN", passwordHash, bannedAt: null },
      });
      console.log(`Updated existing user ${existing.id} → ADMIN`);
    } else {
      const created = await prisma.user.create({
        data: {
          email,
          name,
          userType: "OWNER",
          role: "ADMIN",
          passwordHash,
        },
      });
      console.log(`Created admin user ${created.id}`);
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
