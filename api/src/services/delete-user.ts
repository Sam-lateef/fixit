import { prisma } from "../db/prisma.js";
import { ensureFirebaseAdminInitialized, getFirebaseAuthOrThrow } from "./firebase-app.js";

/**
 * Cascade-delete a user: their bids, chats, shop, posts, OTPs, and the user row.
 * Also best-effort clears the Firebase auth user.
 *
 * Used by:
 *   - User self-delete (`/api/v1/users/me/delete-account`)
 *   - Admin delete (`/api/v1/admin/users/:id`)
 */
export async function cascadeDeleteUser(userId: string): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { shop: true },
  });
  if (!user) {
    return;
  }
  const firebaseUid = user.firebaseUid;

  await prisma.$transaction(async (tx) => {
    const bidsAsShop = await tx.bid.findMany({
      where: { shop: { userId } },
      select: { id: true },
    });
    const bidsOnPosts = await tx.bid.findMany({
      where: { post: { userId } },
      select: { id: true },
    });
    const bidIds = [...new Set([...bidsAsShop, ...bidsOnPosts].map((b) => b.id))];

    if (bidIds.length > 0) {
      await tx.message.deleteMany({ where: { thread: { bidId: { in: bidIds } } } });
      await tx.chatThread.deleteMany({ where: { bidId: { in: bidIds } } });
      await tx.bid.deleteMany({ where: { id: { in: bidIds } } });
    }

    if (user.shop) {
      await tx.shopNotifyBatch.deleteMany({ where: { shopId: user.shop.id } });
      await tx.shop.delete({ where: { id: user.shop.id } });
    }

    await tx.post.deleteMany({ where: { userId } });

    if (user.phone) {
      await tx.pendingOtp.deleteMany({ where: { phone: user.phone } });
    }

    await tx.user.delete({ where: { id: userId } });
  });

  if (
    typeof firebaseUid === "string" &&
    firebaseUid.length > 0 &&
    ensureFirebaseAdminInitialized()
  ) {
    try {
      await getFirebaseAuthOrThrow().deleteUser(firebaseUid);
    } catch {
      /* DB is authoritative; Firebase user may already be gone */
    }
  }
}
