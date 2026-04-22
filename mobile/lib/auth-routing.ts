import { router } from "expo-router";

export type PostLoginPayload = {
  isNewUser: boolean;
  user: { userType: "OWNER" | "SHOP" };
};

/**
 * Same navigation as after OTP verify — social login reuses this.
 */
export function navigateAfterLogin(payload: PostLoginPayload): void {
  if (payload.isNewUser) {
    router.replace("/auth/account-type");
    return;
  }
  if (payload.user.userType === "SHOP") {
    router.replace("/shop");
    return;
  }
  router.replace("/owner");
}
