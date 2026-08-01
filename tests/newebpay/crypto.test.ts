import { clearEnvCache } from "@/lib/env";
import {
  encryptTradeInfo,
  decryptTradeInfo,
  sha256TradeSha,
  verifyAndDecrypt,
} from "@/lib/newebpay/crypto";
import { describe, it, expect, beforeEach, afterEach } from "vitest";

const ENV = {
  NEWEBPAY_HASH_KEY: "12345678901234567890123456789012",
  NEWEBPAY_HASH_IV: "1234567890123456",
  NEWEBPAY_MERCHANT_ID: "test",
  NEWEBPAY_MODE: "sandbox",
  PUBLIC_BASE_URL: "https://example.com",
  LINE_CHANNEL_SECRET: "x",
  LINE_CHANNEL_ACCESS_TOKEN: "x",
  OPENAI_API_KEY: "x",
  SUPABASE_URL: "https://example.supabase.co",
  SUPABASE_SERVICE_ROLE_KEY: "x",
};

describe("newebpay crypto", () => {
  const prev = { ...process.env };
  beforeEach(() => {
    Object.assign(process.env, ENV);
    clearEnvCache();
  });
  afterEach(() => {
    process.env = { ...prev };
    clearEnvCache();
  });

  it("roundtrips encrypt/decrypt", () => {
    const plain = "MerchantID=test&Amt=399";
    const enc = encryptTradeInfo(plain);
    expect(enc).toMatch(/^[0-9a-f]+$/i);
    expect(decryptTradeInfo(enc)).toBe(plain);
  });

  it("verifies trade sha", () => {
    const plain = "MerchantID=test&Amt=399";
    const enc = encryptTradeInfo(plain);
    const sha = sha256TradeSha(enc);
    const v = verifyAndDecrypt(enc, sha);
    expect(v.ok).toBe(true);
    if (v.ok) expect(v.plain).toBe(plain);
  });
});
