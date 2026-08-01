import { describe, expect, it } from "vitest";

import { calculateHealthScore } from "@/services/challenge";

describe("calculateHealthScore", () => {
  it("returns incomplete when daily targets have not been configured", () => {
    expect(
      calculateHealthScore({
        totalKcal: 1200,
        proteinG: 80,
        calorieTarget: 0,
        proteinTarget: 0,
      }),
    ).toEqual({ status: "incomplete", score: null });
  });

  it("rewards a confirmed day that is close to calorie and protein targets", () => {
    expect(
      calculateHealthScore({
        totalKcal: 1750,
        proteinG: 95,
        calorieTarget: 1800,
        proteinTarget: 100,
      }),
    ).toEqual({ status: "ready", score: 95 });
  });

  it("caps the score at zero when intake is far from both targets", () => {
    expect(
      calculateHealthScore({
        totalKcal: 3600,
        proteinG: 0,
        calorieTarget: 1800,
        proteinTarget: 100,
      }),
    ).toEqual({ status: "ready", score: 0 });
  });
});

describe("challenge milestones", () => {
  it("returns milestone badges only on day 7, 14, 21 and 30", async () => {
    const { getChallengeMilestone } = await import("@/services/challenge");
    expect(getChallengeMilestone(6)).toBeNull();
    expect(getChallengeMilestone(7)?.title).toBe("开始养成");
    expect(getChallengeMilestone(14)?.icon).toBe("🥈");
    expect(getChallengeMilestone(21)?.title).toBe("建立习惯");
    expect(getChallengeMilestone(30)?.icon).toBe("👑");
  });
});
