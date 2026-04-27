import { NextResponse } from "next/server";

/** Fly `http_service` checks and load balancers (no auth). */
export function GET(): NextResponse {
  return NextResponse.json({ ok: true });
}
