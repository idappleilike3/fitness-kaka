import { createHmac, timingSafeEqual } from "node:crypto";
import { NextRequest } from "next/server";

export const ADMIN_SESSION_COOKIE = "fitness_kaka_admin";
const SESSION_SECONDS = 60 * 60 * 8;

function safeEqual(left: string, right: string): boolean {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}

function signature(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

export function verifyAdminPassphrase(input: unknown): boolean {
  const expected = process.env.ADMIN_PASSPHRASE;
  return (
    typeof input === "string" &&
    typeof expected === "string" &&
    expected.length >= 12 &&
    safeEqual(input, expected)
  );
}

export function createAdminSessionToken(
  passphrase: string,
  nowSeconds = Math.floor(Date.now() / 1000),
): string {
  const payload = String(nowSeconds + SESSION_SECONDS);
  return `${payload}.${signature(payload, passphrase)}`;
}

export function hasAdminSession(
  req: NextRequest,
  nowSeconds = Math.floor(Date.now() / 1000),
): boolean {
  const secret = process.env.ADMIN_PASSPHRASE;
  const token = req.cookies.get(ADMIN_SESSION_COOKIE)?.value;
  if (!secret || secret.length < 12 || !token) return false;
  const [expiresRaw, suppliedSignature, extra] = token.split(".");
  const expires = Number(expiresRaw);
  if (
    extra !== undefined ||
    !expiresRaw ||
    !suppliedSignature ||
    !Number.isSafeInteger(expires) ||
    expires <= nowSeconds
  ) {
    return false;
  }
  return safeEqual(suppliedSignature, signature(expiresRaw, secret));
}

export function adminSessionCookie(token: string) {
  return {
    name: ADMIN_SESSION_COOKIE,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict" as const,
    path: "/",
    maxAge: SESSION_SECONDS,
  };
}

/** Same-site cookie alone covers browsers; check Origin for state-changing calls. */
export function hasTrustedOrigin(req: NextRequest): boolean {
  const origin = req.headers.get("origin");
  return origin === null || origin === req.nextUrl.origin;
}
