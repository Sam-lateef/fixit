import { NextResponse } from "next/server";

export async function POST(req: Request): Promise<NextResponse> {
  const response = NextResponse.redirect(new URL("/login", req.url));
  response.cookies.delete("admin_token");
  return response;
}
