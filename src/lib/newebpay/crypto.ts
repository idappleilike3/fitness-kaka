import crypto from "node:crypto";
import { getNewebpayEnv } from "@/lib/env";

function padKey(key: string): Buffer {
  // NewebPay AES-256 key/iv are provided as strings matching Key/IV length.
  return Buffer.from(key, "utf8");
}

export function encryptTradeInfo(plain: string): string {
  const env = getNewebpayEnv();
  const cipher = crypto.createCipheriv(
    "aes-256-cbc",
    padKey(env.NEWEBPAY_HASH_KEY),
    padKey(env.NEWEBPAY_HASH_IV),
  );
  const encrypted = Buffer.concat([
    cipher.update(plain, "utf8"),
    cipher.final(),
  ]);
  return encrypted.toString("hex");
}

export function decryptTradeInfo(tradeInfoHex: string): string {
  const env = getNewebpayEnv();
  const decipher = crypto.createDecipheriv(
    "aes-256-cbc",
    padKey(env.NEWEBPAY_HASH_KEY),
    padKey(env.NEWEBPAY_HASH_IV),
  );
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(tradeInfoHex, "hex")),
    decipher.final(),
  ]);
  return decrypted.toString("utf8");
}

export function sha256TradeSha(tradeInfo: string): string {
  const env = getNewebpayEnv();
  const raw = `HashKey=${env.NEWEBPAY_HASH_KEY}&${tradeInfo}&HashIV=${env.NEWEBPAY_HASH_IV}`;
  return crypto.createHash("sha256").update(raw).digest("hex").toUpperCase();
}

export function verifyAndDecrypt(
  tradeInfo: string,
  tradeSha: string,
): { ok: true; plain: string } | { ok: false } {
  const expected = sha256TradeSha(tradeInfo);
  if (expected !== tradeSha.toUpperCase()) return { ok: false };
  try {
    return { ok: true, plain: decryptTradeInfo(tradeInfo) };
  } catch {
    return { ok: false };
  }
}
