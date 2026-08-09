import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("Apple Pay domain verification", () => {
  it("publishes the exact NewebPay verification file at the well-known path", () => {
    const verificationFile = readFileSync(
      resolve(
        process.cwd(),
        "public/.well-known/apple-developer-merchantid-domain-association",
      ),
    );

    expect(verificationFile.byteLength).toBe(9092);
    expect(createHash("sha256").update(verificationFile).digest("hex")).toBe(
      "1c399c9540d9c8345fd1427dc188f7567049d5906e856a41b2abb982e241eaa5",
    );
  });
});
