import crypto from "node:crypto";

export function verifyLineSignature(
  body: string,
  signature: string,
  secret: string,
): boolean {
  if (!signature || !secret) return false;
  const digest = crypto
    .createHmac("sha256", secret)
    .update(body)
    .digest("base64");
  const a = Buffer.from(digest);
  const b = Buffer.from(signature);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}
