import { NextRequest, NextResponse } from "next/server";

import {
  ADMIN_SESSION_COOKIE,
  adminSessionCookie,
  createAdminSessionToken,
  hasAdminSession,
  hasTrustedOrigin,
  verifyAdminPassphrase,
} from "@/lib/admin/auth";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  return NextResponse.json({ authenticated: hasAdminSession(req) });
}

export async function POST(req: NextRequest) {
  if (!hasTrustedOrigin(req)) {
    return NextResponse.json({ error: "不允許此來源的請求" }, { status: 403 });
  }
  const body = (await req.json().catch(() => null)) as {
    passphrase?: unknown;
  } | null;
  if (!verifyAdminPassphrase(body?.passphrase)) {
    return NextResponse.json({ error: "管理密碼不正確" }, { status: 401 });
  }
  const passphrase = body?.passphrase as string;
  const response = NextResponse.json({ authenticated: true });
  response.cookies.set(adminSessionCookie(createAdminSessionToken(passphrase)));
  return response;
}

export async function DELETE(req: NextRequest) {
  if (!hasTrustedOrigin(req)) {
    return NextResponse.json({ error: "不允許此來源的請求" }, { status: 403 });
  }
  const response = NextResponse.json({ authenticated: false });
  response.cookies.set({
    name: ADMIN_SESSION_COOKIE,
    value: "",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 0,
  });
  return response;
}
