import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  countApiUsageSince: vi.fn(),
  getProfile: vi.fn(),
  getTodaySummary: vi.fn(),
  logApiUsage: vi.fn(),
  replyCoachChat: vi.fn(),
  getMemberSalesProfile: vi.fn(),
  mergeSalesSignals: vi.fn(),
  markPlanRecommended: vi.fn(),
}));

vi.mock("@/repositories/logs", () => ({
  countApiUsageSince: mocks.countApiUsageSince,
  logApiUsage: mocks.logApiUsage,
}));
vi.mock("@/repositories/profiles", () => ({ getProfile: mocks.getProfile }));
vi.mock("@/repositories/meals", () => ({
  getTodaySummary: mocks.getTodaySummary,
}));
vi.mock("@/lib/openai/coach", () => ({
  replyCoachChat: mocks.replyCoachChat,
}));
vi.mock("@/repositories/sales-profiles", async () => {
  const actual = await vi.importActual<typeof import("@/repositories/sales-profiles")>(
    "@/repositories/sales-profiles",
  );
  return {
    ...actual,
    getMemberSalesProfile: mocks.getMemberSalesProfile,
    mergeSalesSignals: mocks.mergeSalesSignals,
    markPlanRecommended: mocks.markPlanRecommended,
  };
});

import {
  COACH_CHAT_DAILY_LIMIT,
  handleCoachChat,
} from "@/services/coach-chat";

describe("coach chat", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.countApiUsageSince.mockResolvedValue(0);
    mocks.getProfile.mockResolvedValue({
      goal_type: "cut",
      calorie_target: 1800,
      protein_g_target: 100,
    });
    mocks.getTodaySummary.mockResolvedValue({
      total_kcal: 600,
      protein_g: 40,
      carb_g: 50,
      fat_g: 20,
    });
    mocks.replyCoachChat.mockResolvedValue({
      reply: "宵夜可選希臘優格加莓果",
      usage: { prompt: 10, completion: 20 },
      model: "gpt-4o-mini",
    });
    const salesProfile = {
      member_id: "member-1",
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
    };
    mocks.getMemberSalesProfile.mockResolvedValue(salesProfile);
    mocks.mergeSalesSignals.mockResolvedValue(salesProfile);
  });

  it("answers with GPT using SQL daily context and does not claim meal quota", async () => {
    const result = await handleCoachChat("member-1", "宵夜吃什麼好", "JENNIE");

    expect(result).toEqual({
      ok: true,
      reply: "宵夜可選希臘優格加莓果",
    });
    expect(mocks.replyCoachChat).toHaveBeenCalledWith(
      "宵夜吃什麼好",
      expect.objectContaining({
        todayKcal: 600,
        remainingKcal: 1200,
        proteinLeft: 60,
      }),
    );
    expect(mocks.logApiUsage).toHaveBeenCalledWith(
      expect.objectContaining({
        memberId: "member-1",
        purpose: "coach_chat",
      }),
    );
  });

  it("rate-limits rapid coach chat without calling OpenAI", async () => {
    mocks.countApiUsageSince.mockResolvedValueOnce(1);

    const result = await handleCoachChat("member-1", "還在嗎", "JENNIE");

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("rate_limit");
    expect(mocks.replyCoachChat).not.toHaveBeenCalled();
  });

  it("blocks when the daily coach chat cap is reached", async () => {
    mocks.countApiUsageSince
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(COACH_CHAT_DAILY_LIMIT);

    const result = await handleCoachChat("member-1", "怎麼減脂", "JENNIE");

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("daily_limit");
    expect(mocks.replyCoachChat).not.toHaveBeenCalled();
  });
});
