import { NextResponse } from "next/server";

const base = process.env.API_BASE ?? "http://localhost:3000";

export async function POST(req: Request): Promise<NextResponse> {
  const body = await req.json().catch(() => null);
  if (!body || typeof body.email !== "string" || typeof body.password !== "string") {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const res = await fetch(`${base}/api/v1/admin/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    return NextResponse.json(
      { error: data.error ?? "Login failed" },
      { status: res.status },
    );
  }

  const data = (await res.json()) as { token: string };
  const response = NextResponse.json({ ok: true });
  response.cookies.set("admin_token", data.token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return response;
}
