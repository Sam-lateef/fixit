import { prisma } from "../db/prisma.js";

export function extractR2KeyFromUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    const key = parsed.pathname.replace(/^\/+/, "");
    if (key.length === 0 || !key.startsWith("posts/")) {
      return null;
    }
    return key;
  } catch {
    return null;
  }
}

export async function syncPostMediaAssets(
  postId: string,
  ownerUserId: string,
  photoUrls: string[],
): Promise<void> {
  const nextKeys = new Set<string>();
  for (const url of photoUrls) {
    const key = extractR2KeyFromUrl(url);
    if (!key) continue;
    nextKeys.add(key);
    await prisma.mediaAsset.upsert({
      where: { key },
      create: {
        key,
        ownerUserId,
        postId,
        url,
      },
      update: {
        ownerUserId,
        postId,
        url,
        status: "ACTIVE",
        removedAt: null,
        removedById: null,
        reason: null,
        notes: null,
      },
    });
  }

  await prisma.mediaAsset.updateMany({
    where: {
      postId,
      ...(nextKeys.size > 0 ? { key: { notIn: Array.from(nextKeys) } } : {}),
    },
    data: {
      postId: null,
    },
  });
}
