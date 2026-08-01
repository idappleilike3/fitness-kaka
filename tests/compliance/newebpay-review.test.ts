import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const appRoot = resolve(process.cwd(), "src/app");
const readPage = (path: string) => readFileSync(resolve(appRoot, path), "utf8");

describe("NewebPay review disclosures", () => {
  it("publishes the searchable LINE Official Account ID and a working add-friend URL", () => {
    const content = [readPage("page.tsx"), readPage("faq/page.tsx"), readPage("refund/page.tsx")].join("\n");

    expect(content).toContain("LINE 官方帳號 ID：@146iqokj");
    expect(content).toContain("https://line.me/R/ti/p/@146iqokj");
  });

  it("does not deduct payment processing fees from refunds", () => {
    const refund = readPage("refund/page.tsx");

    expect(refund).not.toContain("金流手續費若");
    expect(refund).toContain("不會以金流處理費為由扣款");
    expect(refund).toContain("行政處理費");
  });

  it("publishes a dedicated AI integration disclosure and links to it", () => {
    const aiPagePath = resolve(appRoot, "ai-platform/page.tsx");
    expect(existsSync(aiPagePath)).toBe(true);

    const aiPage = readFileSync(aiPagePath, "utf8");
    expect(aiPage).toContain("OpenAI API");
    expect(aiPage).toContain("餐點照片");
    expect(aiPage).toContain("使用者確認");
    expect(aiPage).toContain("非醫療診斷");
    expect(readPage("page.tsx")).toContain('href="/ai-platform"');
    expect(readPage("privacy/page.tsx")).toContain('href="/ai-platform"');
  });
});
