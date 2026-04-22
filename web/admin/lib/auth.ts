import { cookies } from "next/headers";

const COOKIE_NAME = "admin_token";

export function getToken(): string | null {
  return cookies().get(COOKIE_NAME)?.value ?? null;
}

export function requireToken(): string {
  const t = getToken();
  if (!t) {
    throw new Error("Not authenticated");
  }
  return t;
}
