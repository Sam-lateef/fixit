import { NextResponse } from "next/server";
import { getToken } from "@/lib/auth";

const base = process.env.API_BASE ?? "http://localhost:3000";

export async function GET(
  _req: Request,
  context: { params: { key: string[] } },
): Promise<NextResponse> {
  const token = getToken();
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const key = context.params.key.join("/");
  if (!key.startsWith("posts/") || key.includes("..")) {
    return NextResponse.json({ error: "Invalid key" }, { status: 400 });
  }
  const res = await fetch(`${base}/api/v1/media/${encodeURIComponent(key)}`, {
    headers: { authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!res.ok) {
    return NextResponse.json({ error: "Not found" }, { status: res.status });
  }
  const bytes = await res.arrayBuffer();
  const out = new NextResponse(bytes, { status: 200 });
  const contentType = res.headers.get("content-type");
  if (contentType) out.headers.set("content-type", contentType);
  out.headers.set("cache-control", "private, max-age=300");
  return out;
}
