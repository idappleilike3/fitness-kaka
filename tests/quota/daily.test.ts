import { describe, it, expect } from "vitest";
import { canUse, getTaipeiDate, increment } from "@/lib/quota/daily";

describe("quota counters", () => {
  const freeLimits = { image: 5, text: 5, voice: 0, mealAnalysis: 5 };
  const plan399 = { image: 10, text: 30, voice: 5 };
  const plan799 = { image: 25, text: 60, voice: 15 };

  it("allows a free meal analysis until the shared daily limit", () => {
    expect(
      canUse({ image: 0, text: 0, voice: 0 }, freeLimits, "image"),
    ).toBe(true);
    expect(
      canUse({ image: 2, text: 2, voice: 0 }, freeLimits, "image"),
    ).toBe(true);
    expect(
      canUse({ image: 2, text: 3, voice: 0 }, freeLimits, "image"),
    ).toBe(false);
  });

  it("shares the free daily limit between image and text analyses", () => {
    const used = { image: 3, text: 2, voice: 0 };
    expect(canUse(used, freeLimits, "image")).toBe(false);
    expect(canUse(used, freeLimits, "text")).toBe(false);
  });

  it("keeps paid image and text quotas separate", () => {
    expect(
      canUse({ image: 10, text: 0, voice: 0 }, plan399, "text"),
    ).toBe(true);
    expect(
      canUse({ image: 9, text: 30, voice: 0 }, plan399, "text"),
    ).toBe(false);
  });

  it("blocks voice on free (limit 0)", () => {
    expect(
      canUse({ image: 0, text: 0, voice: 0 }, freeLimits, "voice"),
    ).toBe(false);
  });

  it("allows voice on plan_399 up to 5/day", () => {
    expect(
      canUse({ image: 0, text: 0, voice: 0 }, plan399, "voice"),
    ).toBe(true);
    expect(
      canUse({ image: 0, text: 0, voice: 4 }, plan399, "voice"),
    ).toBe(true);
    expect(
      canUse({ image: 0, text: 0, voice: 5 }, plan399, "voice"),
    ).toBe(false);
  });

  it("allows voice on plan_799 up to 15/day", () => {
    expect(
      canUse({ image: 0, text: 0, voice: 0 }, plan799, "voice"),
    ).toBe(true);
    expect(
      canUse({ image: 0, text: 0, voice: 14 }, plan799, "voice"),
    ).toBe(true);
    expect(
      canUse({ image: 0, text: 0, voice: 15 }, plan799, "voice"),
    ).toBe(false);
  });

  it("voice does not consume text quota counter", () => {
    const afterVoice = increment(
      { image: 0, text: 0, voice: 0 },
      "voice",
    );
    expect(afterVoice).toEqual({ image: 0, text: 0, voice: 1 });
    expect(canUse(afterVoice, plan399, "text")).toBe(true);
  });

  it("increments only one kind", () => {
    const next = increment({ image: 1, text: 2, voice: 0 }, "text");
    expect(next).toEqual({ image: 1, text: 3, voice: 0 });
  });
});

describe("getTaipeiDate", () => {
  it("formats YYYY-MM-DD", () => {
    const d = getTaipeiDate(new Date("2026-07-22T16:30:00.000Z"));
    expect(d).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    // 2026-07-22 16:30 UTC = 2026-07-23 00:30 Taipei
    expect(d).toBe("2026-07-23");
  });
});
