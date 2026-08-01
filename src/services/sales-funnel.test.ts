import { describe, expect, it } from "vitest";
import { decideSalesFunnel } from "@/services/sales-funnel";
import type { MemberSalesProfile } from "@/repositories/sales-profiles";

const profile = (patch: Partial<MemberSalesProfile> = {}): MemberSalesProfile => ({
  member_id: "m1",
  menu_need_score: 0,
  accountability_need_score: 0,
  challenge_need_score: 0,
  purchase_intent_score: 0,
  price_sensitive: false,
  sales_paused_until: null,
  tags: [],
  last_recommended_plan: null,
  last_recommended_at: null,
  updated_at: "2026-08-02T00:00:00.000Z",
  ...patch,
});

const base = {
  profileCompleted: true,
  mealsLast7Days: 4,
  daysSinceLastMeal: 0,
  currentPlanId: "free",
  now: new Date("2026-08-02T00:00:00.000Z"),
};

describe("decideSalesFunnel", () => {
  it("does not sell when member asked to pause", () => {
    const result = decideSalesFunnel({ ...base, profile: profile({ sales_paused_until: "2026-08-05T00:00:00.000Z", menu_need_score: 10, purchase_intent_score: 10 }) });
    expect(result.shouldSend).toBe(false);
    expect(result.key).toBe("sales_paused");
  });

  it("prioritizes care over sales after inactivity", () => {
    const result = decideSalesFunnel({ ...base, daysSinceLastMeal: 4, profile: profile({ accountability_need_score: 12, purchase_intent_score: 8 }) });
    expect(result.shouldSend).toBe(false);
    expect(result.key).toBe("care_before_sales");
  });

  it("recommends the strongest matching plan only after value was experienced", () => {
    const result = decideSalesFunnel({ ...base, profile: profile({ menu_need_score: 12, purchase_intent_score: 10 }) });
    expect(result.shouldSend).toBe(true);
    expect(result.recommendedPlan).toBe("plan_299");
    expect(result.message).toContain("7 天个人化菜单");
  });

  it("prevents repeated recommendations during cooldown", () => {
    const result = decideSalesFunnel({ ...base, profile: profile({ challenge_need_score: 12, purchase_intent_score: 10, last_recommended_plan: "plan_799", last_recommended_at: "2026-08-01T00:00:00.000Z" }) });
    expect(result.shouldSend).toBe(false);
    expect(result.key).toBe("recommendation_cooldown");
  });
});
