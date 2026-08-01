import { describe, it, expect } from "vitest";
import crypto from "node:crypto";
import { verifyLineSignature } from "@/lib/line/signature";

describe("verifyLineSignature", () => {
  it("accepts valid hmac", () => {
    const secret = "test_secret";
    const body = '{"events":[]}';
    const signature = crypto
      .createHmac("sha256", secret)
      .update(body)
      .digest("base64");
    expect(verifyLineSignature(body, signature, secret)).toBe(true);
  });

  it("rejects invalid signature", () => {
    expect(verifyLineSignature("{}", "bad", "test_secret")).toBe(false);
  });
});
