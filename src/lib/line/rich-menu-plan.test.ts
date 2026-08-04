import { describe, expect, it } from "vitest";

import { resolveRichMenuTier } from "@/lib/line/rich-menu-plan";

describe("resolveRichMenuTier", () => {
  it("maps visitors and unknown plans to the visitor menu", () => {
    expect(resolveRichMenuTier("free")).toBe("free");
    expect(resolveRichMenuTier(null)).toBe("free");
    expect(resolveRichMenuTier("unknown")).toBe("free");
  });

  it("maps the paid 7-day plan to the trial menu", () => {
    expect(resolveRichMenuTier("plan_299")).toBe("plus");
  });

  it("maps all 399 and 799 monthly or yearly plans to the paid member menu", () => {
    expect(resolveRichMenuTier("plan_399")).toBe("pro");
    expect(resolveRichMenuTier("plan_3590")).toBe("pro");
    expect(resolveRichMenuTier("plan_799")).toBe("pro");
    expect(resolveRichMenuTier("plan_7190")).toBe("pro");
  });
});
