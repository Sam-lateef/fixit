import { apiFetch } from "./api";
import { getToken } from "./auth-storage";
import { isDevNavHubEnabled } from "./dev-nav-hub";
import { registerPushToken } from "./push-notifications";
import { syncStoredLocaleToServer } from "./sync-preferred-locale";

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

/** Thrown when /users/me fails for a non-auth reason (network, 5xx, timeout). The
 *  caller should render a retry screen rather than dumping the user to /auth —
 *  apiFetch already redirects to /auth on 401, so by the time we get here for
 *  any *other* error the token is still valid. */
export class BootstrapTransientError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BootstrapTransientError";
  }
}

/**
 * Decide where to send the user after splash / cold start.
 *
 * Throws BootstrapTransientError when /users/me fails for a non-401 reason so
 * index.tsx can render a retry UI without clearing the user's session.
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
    void registerPushToken();
    void syncStoredLocaleToServer();
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
  } catch (e) {
    // apiFetch already handled 401 by clearing the token and redirecting to /auth.
    // If the token is still present, this was a transient failure — surface it
    // so index.tsx renders "can't reach server, retry" instead of bouncing the
    // authenticated user back to the login screen on every flaky network.
    const stillAuthenticated = (await getToken()) !== null;
    if (stillAuthenticated) {
      throw new BootstrapTransientError(
        e instanceof Error ? e.message : "Could not reach the server",
      );
    }
    return { path: "/auth" };
  }
}
