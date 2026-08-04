import { describe, expect, it } from "vitest";

import { resolveRichMenuTier } from "@/lib/line/rich-menu-plan";

describe("resolveRichMenuTier", () => {
  it("maps free and unknown plans to the free menu", () => {
    expect(resolveRichMenuTier("free")).toBe("free");
    expect(resolveRichMenuTier(null)).toBe("free");
    expect(resolveRichMenuTier("unknown")).toBe("free");
  });

  it("maps Plus plans to the plus menu", () => {
    expect(resolveRichMenuTier("plan_399")).toBe("plus");
    expect(resolveRichMenuTier("plan_3590")).toBe("plus");
  });

  it("maps Pro plans to the pro menu", () => {
    expect(resolveRichMenuTier("plan_799")).toBe("pro");
    expect(resolveRichMenuTier("plan_7190")).toBe("pro");
  });
});
