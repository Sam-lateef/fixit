import { apiFetch } from "./api";
import { getToken } from "./auth-storage";
import { isDevNavHubEnabled } from "./dev-nav-hub";
import { registerPushToken } from "./push-notifications";

type MeUser = {
  id: string;
  userType: "OWNER" | "SHOP";
  name: string | null;
  city: string | null;
  districtId: string | null;
  phone: string | null;
  shop: { id: string } | null;
};

export type BootstrapTarget =
  | { path: "/dev" }
  | { path: "/auth" }
  | { path: "/signup/owner-details" }
  | { path: "/signup/owner-location"; params: { city: string } }
  | { path: "/signup/shop" }
  | { path: "/owner" }
  | { path: "/shop" };

/**
 * Decide where to send the user after splash / cold start.
 */
export async function resolveInitialRoute(): Promise<BootstrapTarget> {
  if (isDevNavHubEnabled()) {
    return { path: "/dev" };
  }
  const token = await getToken();
  if (!token) {
    return { path: "/auth" };
  }
  try {
    const { user } = await apiFetch<{ user: MeUser }>("/api/v1/users/me");
    // Refresh FCM token on every authenticated launch (handles token rotation).
    void registerPushToken();
    if (user.userType === "SHOP") {
      if (!user.shop) {
        return { path: "/signup/shop" };
      }
      return { path: "/shop" };
    }
    if (!user.name) {
      return { path: "/signup/owner-details" };
    }
    if (!user.districtId) {
      const city = user.city?.trim() || "Baghdad";
      return { path: "/signup/owner-location", params: { city } };
    }
    return { path: "/owner" };
  } catch {
    return { path: "/auth" };
  }
}
