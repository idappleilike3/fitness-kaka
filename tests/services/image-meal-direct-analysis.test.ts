import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  understandImage: vi.fn(),
  createPending: vi.fn(),
  getTodaySummary: vi.fn(),
  getProfile: vi.fn(),
  logApiUsage: vi.fn(),
  replyMessage: vi.fn(),
  startLoadingAnimation: vi.fn(),
  tryConsume: vi.fn(),
}));

vi.mock("@/lib/line/client", () => ({
  replyMessage: mocks.replyMessage,
  startLoadingAnimation: mocks.startLoadingAnimation,
}));
vi.mock("@/lib/openai/image-understanding", () => ({ understandImage: mocks.understandImage }));
vi.mock("@/repositories/logs", () => ({ logApiUsage: mocks.logApiUsage }));
vi.mock("@/repositories/meals", () => ({
  createPending: mocks.createPending,
  getTodaySummary: mocks.getTodaySummary,
}));
vi.mock("@/repositories/profiles", () => ({ getProfile: mocks.getProfile }));
vi.mock("@/repositories/quotas", () => ({
  tryConsume: mocks.tryConsume,
  refundConsumed: vi.fn(),
}));
vi.mock("@/repositories/challenges", () => ({}));

import { handleImageMeal } from "@/services/meal-flow";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.startLoadingAnimation.mockResolvedValue(undefined);
  mocks.logApiUsage.mockResolvedValue(undefined);
  mocks.getProfile.mockResolvedValue({ calorie_target: 1800, protein_g_target: 100 });
  mocks.getTodaySummary.mockResolvedValue({ total_kcal: 500, protein_g: 25 });
});

describe("food photo replies", () => {
  it("returns the nutrition preview directly without a conversational preface", async () => {
    mocks.understandImage.mockResolvedValue({
      kind: "food",
      reply: "看起來很好吃，我先幫你看看。",
      meal: {
        items: [{ name: "雞胸便當", portion_text: "1 份", kcal: 520, protein_g: 38, carb_g: 55, fat_g: 14 }],
        total_kcal: 520,
        protein_g: 38,
        carb_g: 55,
        fat_g: 14,
        confidence: "high",
      },
      usage: { prompt: 10, completion: 10 },
      model: "gpt-test",
    });
    mocks.tryConsume.mockResolvedValue({
      ok: true,
      used: { image: 1, text: 0, voice: 0 },
      limits: { image: 5, text: 5, voice: 0, mealAnalysis: 5 },
      planId: "plan_399",
    });
    mocks.createPending.mockResolvedValue("pending-1");

    await handleImageMeal("reply-token", "member-1", Buffer.from("food"), "image/jpeg", "U123");

    expect(mocks.replyMessage).toHaveBeenCalledTimes(1);
    expect(mocks.replyMessage.mock.calls[0][1][0].text).toContain("雞胸便當");
    expect(mocks.replyMessage.mock.calls[0][1][0].text).not.toContain("看起來很好吃");
  });

  it("keeps a contextual response for a non-food photo", async () => {
    mocks.understandImage.mockResolvedValue({
      kind: "pet",
      reply: "牠的表情好可愛，這是你家的毛孩嗎？",
      usage: { prompt: 10, completion: 8 },
      model: "gpt-test",
    });

    await handleImageMeal("reply-token", "member-1", Buffer.from("pet"), "image/jpeg", "U123");

    expect(mocks.replyMessage).toHaveBeenCalledWith("reply-token", [{
      type: "text",
      text: "牠的表情好可愛，這是你家的毛孩嗎？",
    }]);
    expect(mocks.tryConsume).not.toHaveBeenCalled();
  });

  it("asks the member to retry instead of guessing when image understanding fails", async () => {
    mocks.understandImage.mockRejectedValue(new Error("OpenAI unavailable"));

    await expect(
      handleImageMeal(
        "reply-token",
        "member-1",
        Buffer.from("unreadable"),
        "image/jpeg",
        "U123",
      ),
    ).resolves.toBeUndefined();

    expect(mocks.replyMessage).toHaveBeenCalledWith("reply-token", [
      {
        type: "text",
        text: "我目前無法確認圖片內容。\n請重新拍攝，或直接描述餐點。",
      },
    ]);
    expect(mocks.createPending).not.toHaveBeenCalled();
    expect(mocks.tryConsume).not.toHaveBeenCalled();
  });
});
