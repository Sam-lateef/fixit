import type { User } from "@prisma/client";
import { prisma } from "../db/prisma.js";
import { getFirebaseAuthOrThrow } from "./firebase-app.js";

/**
 * Verifies a Firebase Auth ID token and returns or creates the app user row.
 */
export async function signInWithFirebaseIdToken(
  idToken: string,
): Promise<{ user: User; isNewUser: boolean }> {
  const auth = getFirebaseAuthOrThrow();
  const decoded = await auth.verifyIdToken(idToken);
  const uid = decoded.uid;
  const email =
    typeof decoded.email === "string" && decoded.email.length > 0
      ? decoded.email
      : null;

  let user = await prisma.user.findUnique({ where: { firebaseUid: uid } });
  if (user) {
    if (email !== null && user.email !== email) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: { email },
      });
    }
    return { user, isNewUser: false };
  }

  user = await prisma.user.create({
    data: {
      firebaseUid: uid,
      email,
      userType: "OWNER",
    },
  });
  return { user, isNewUser: true };
}
