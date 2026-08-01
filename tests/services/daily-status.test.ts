import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getProfile: vi.fn(),
  getTodaySummary: vi.fn(),
}));

vi.mock("@/repositories/profiles", () => ({
  getProfile: mocks.getProfile,
}));
vi.mock("@/repositories/meals", () => ({
  getTodaySummary: mocks.getTodaySummary,
}));

import { answerDailyStatus } from "@/services/daily-status";

describe("daily status", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getProfile.mockResolvedValue({
      calorie_target: 1800,
      protein_g_target: 100,
    });
  });

  it("returns the friendly empty state when no meals are confirmed today", async () => {
    mocks.getTodaySummary.mockResolvedValue({
      total_kcal: 0,
      protein_g: 0,
      carb_g: 0,
      fat_g: 0,
    });

    await expect(answerDailyStatus("member-1", "我今天吃了多少")).resolves.toBe(
      "今天還沒有已確認的飲食紀錄",
    );
  });

  it("calculates the intake and remaining targets from confirmed daily totals", async () => {
    mocks.getTodaySummary.mockResolvedValue({
      total_kcal: 1250,
      protein_g: 72,
      carb_g: 140,
      fat_g: 38,
    });

    await expect(answerDailyStatus("member-1", "我今天吃了多少")).resolves.toContain(
      "今天已攝取 1250 kcal，還能吃約 550 kcal；蛋白質還差約 28g",
    );
  });
});
