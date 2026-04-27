import { getToken, clearToken } from "./auth-storage.js";

function baseUrl(): string {
  const env = import.meta.env.VITE_API_URL as string | undefined;
  if (env && env.length > 0) return env.replace(/\/$/, "");
  return "";
}

export type ApiError = { error: string; details?: unknown };

export async function apiFetch<T>(
  path: string,
  init: RequestInit & { skipAuth?: boolean } = {},
): Promise<T> {
  const url = `${baseUrl()}${path}`;
  const headers = new Headers(init.headers);
  if (
    !headers.has("Content-Type") &&
    init.body !== undefined &&
    init.body !== null
  ) {
    headers.set("Content-Type", "application/json");
  }
  if (!init.skipAuth) {
    const token = await getToken();
    if (token) headers.set("Authorization", `Bearer ${token}`);
  }
  const res = await fetch(url, { ...init, headers });
  if (res.status === 401) {
    await clearToken();
    window.location.hash = "#/auth/welcome";
  }
  const text = await res.text();
  const data = text ? (JSON.parse(text) as unknown) : null;
  if (!res.ok) {
    const err = data as ApiError;
    throw new Error(err?.error ?? res.statusText);
  }
  return data as T;
}

export async function uploadPhoto(file: Blob): Promise<{ url: string }> {
  const token = await getToken();
  if (!token) throw new Error("Not authenticated");
  const fd = new FormData();
  fd.append("photo", file, "photo.jpg");
  const url = `${baseUrl()}/api/v1/uploads/photo`;
  const res = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: fd,
  });
  if (res.status === 401) {
    await clearToken();
    window.location.hash = "#/auth/welcome";
  }
  const data = (await res.json()) as { url?: string; error?: string };
  if (!res.ok) throw new Error(data.error ?? "Upload failed");
  if (!data.url) throw new Error("Upload failed");
  return { url: data.url };
}
