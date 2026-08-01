import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  analyzeMealFromImage: vi.fn(),
  analyzeMealFromText: vi.fn(),
  getLatestPending: vi.fn(),
  getTodaySummary: vi.fn(),
  logApiUsage: vi.fn(),
  replyMessage: vi.fn(),
  refundConsumed: vi.fn(),
  tryConsume: vi.fn(),
  updatePendingAnalysis: vi.fn(),
  understandImage: vi.fn(),
}));

vi.mock("@/lib/line/client", () => ({ replyMessage: mocks.replyMessage }));
vi.mock("@/lib/openai/meal", () => ({
  analyzeMealFromText: mocks.analyzeMealFromText,
  analyzeMealFromImage: mocks.analyzeMealFromImage,
}));
vi.mock("@/lib/openai/image-understanding", () => ({
  understandImage: mocks.understandImage,
  nonFoodReply: vi.fn(() => "不是食物照片"),
}));
vi.mock("@/repositories/logs", () => ({ logApiUsage: mocks.logApiUsage }));
vi.mock("@/repositories/meals", () => ({
  getLatestPending: mocks.getLatestPending,
  getTodaySummary: mocks.getTodaySummary,
  updatePendingAnalysis: mocks.updatePendingAnalysis,
}));
vi.mock("@/repositories/profiles", () => ({
  getProfile: vi.fn().mockResolvedValue(null),
}));
vi.mock("@/repositories/quotas", () => ({
  refundConsumed: mocks.refundConsumed,
  tryConsume: mocks.tryConsume,
}));

import { handleImageMeal, handleTextMeal } from "@/services/meal-flow";

describe("handleTextMeal pending correction", () => {
  it("updates the unconfirmed photo meal with drink corrections without consuming text quota", async () => {
    const originalAnalysis = {
      items: [
        {
          name: "薯條",
          portion_text: "1 份",
          kcal: 320,
          protein_g: 4,
          carb_g: 42,
          fat_g: 15,
        },
        {
          name: "漢堡",
          portion_text: "1 個",
          kcal: 450,
          protein_g: 24,
          carb_g: 40,
          fat_g: 22,
        },
        {
          name: "飲料",
          portion_text: "1 杯",
          kcal: 180,
          protein_g: 0,
          carb_g: 45,
          fat_g: 0,
        },
      ],
      total_kcal: 950,
      protein_g: 28,
      carb_g: 127,
      fat_g: 37,
      confidence: "medium" as const,
    };
    const combinedAnalysis = {
      ...originalAnalysis,
      items: [
        ...originalAnalysis.items.slice(0, 2),
        {
          name: "蜂蜜奶茶與冬瓜檸檬珍珠",
          portion_text: "1 杯",
          kcal: 300,
          protein_g: 1,
          carb_g: 74,
          fat_g: 1,
        },
      ],
      total_kcal: 1070,
      protein_g: 29,
      carb_g: 156,
      fat_g: 38,
    };
    mocks.getLatestPending.mockResolvedValue({
      id: "pending-photo-meal",
      input_text: null,
      result_json: originalAnalysis,
    });
    mocks.analyzeMealFromText.mockResolvedValue({
      analysis: combinedAnalysis,
      usage: { prompt: 10, completion: 10 },
      model: "gpt-test",
    });
    mocks.getTodaySummary.mockResolvedValue({
      total_kcal: 0,
      protein_g: 0,
    });

    await handleTextMeal(
      "reply-token",
      "member-1",
      "我是喝蜂蜜奶茶，還有冬瓜檸檬珍珠／冬瓜茶",
    );

    expect(mocks.tryConsume).not.toHaveBeenCalled();
    expect(mocks.analyzeMealFromText).toHaveBeenCalledWith(
      expect.stringContaining("薯條"),
    );
    expect(mocks.analyzeMealFromText).toHaveBeenCalledWith(
      expect.stringContaining("蜂蜜奶茶"),
    );
    expect(mocks.updatePendingAnalysis).toHaveBeenCalledWith({
      pendingId: "pending-photo-meal",
      memberId: "member-1",
      analysis: combinedAnalysis,
      inputText: "我是喝蜂蜜奶茶，還有冬瓜檸檬珍珠／冬瓜茶",
    });
  });

  it("replaces fried tofu with popcorn chicken for 「是鹹酥雞不是炸豆腐」 without text quota", async () => {
    const originalAnalysis = {
      items: [
        {
          name: "炸豆腐",
          portion_text: "1 份",
          kcal: 280,
          protein_g: 12,
          carb_g: 18,
          fat_g: 16,
        },
      ],
      total_kcal: 280,
      protein_g: 12,
      carb_g: 18,
      fat_g: 16,
      confidence: "medium" as const,
    };
    const corrected = {
      ...originalAnalysis,
      items: [
        {
          name: "鹹酥雞",
          portion_text: "1 份",
          kcal: 420,
          protein_g: 22,
          carb_g: 20,
          fat_g: 28,
        },
      ],
      total_kcal: 420,
      protein_g: 22,
      carb_g: 20,
      fat_g: 28,
    };
    mocks.getLatestPending.mockResolvedValue({
      id: "pending-1",
      result_json: originalAnalysis,
      input_text: "照片辨識",
    });
    mocks.analyzeMealFromText.mockResolvedValue({
      analysis: corrected,
      usage: { prompt: 1, completion: 1 },
      model: "gpt-4o-mini",
    });
    mocks.getTodaySummary.mockResolvedValue({
      total_kcal: 0,
      protein_g: 0,
    });

    await handleTextMeal("reply-token", "member-1", "是鹹酥雞不是炸豆腐");

    expect(mocks.tryConsume).not.toHaveBeenCalled();
    expect(mocks.analyzeMealFromText).toHaveBeenCalledWith(
      expect.stringContaining("是A不是B"),
    );
    expect(mocks.analyzeMealFromText).toHaveBeenCalledWith(
      expect.stringContaining("是鹹酥雞不是炸豆腐"),
    );
    expect(mocks.updatePendingAnalysis).toHaveBeenCalledWith(
      expect.objectContaining({
        pendingId: "pending-1",
        memberId: "member-1",
        analysis: corrected,
      }),
    );
  });

  it("updates pending meal for 「這是素食」 and 「他不是炸豆腐」 without text quota", async () => {
    const originalAnalysis = {
      items: [
        {
          name: "炸豆腐",
          portion_text: "1 份",
          kcal: 280,
          protein_g: 12,
          carb_g: 18,
          fat_g: 16,
        },
      ],
      total_kcal: 280,
      protein_g: 12,
      carb_g: 18,
      fat_g: 16,
      confidence: "medium" as const,
    };
    const corrected = {
      ...originalAnalysis,
      items: [
        {
          name: "素食豆腐",
          portion_text: "1 份",
          kcal: 180,
          protein_g: 14,
          carb_g: 10,
          fat_g: 8,
        },
      ],
      total_kcal: 180,
      protein_g: 14,
      carb_g: 10,
      fat_g: 8,
    };
    mocks.getLatestPending.mockResolvedValue({
      id: "pending-veg",
      result_json: originalAnalysis,
      input_text: "照片辨識",
    });
    mocks.analyzeMealFromText.mockResolvedValue({
      analysis: corrected,
      usage: { prompt: 1, completion: 1 },
      model: "gpt-4o-mini",
    });
    mocks.getTodaySummary.mockResolvedValue({
      total_kcal: 0,
      protein_g: 0,
    });

    await handleTextMeal("reply-token", "member-1", "這是素食");
    expect(mocks.tryConsume).not.toHaveBeenCalled();
    expect(mocks.analyzeMealFromText).toHaveBeenCalledWith(
      expect.stringContaining("這是素食"),
    );
    expect(mocks.updatePendingAnalysis).toHaveBeenCalled();

    mocks.analyzeMealFromText.mockClear();
    mocks.updatePendingAnalysis.mockClear();
    mocks.tryConsume.mockClear();

    await handleTextMeal("reply-token", "member-1", "他不是炸豆腐");
    expect(mocks.tryConsume).not.toHaveBeenCalled();
    expect(mocks.analyzeMealFromText).toHaveBeenCalledWith(
      expect.stringContaining("他不是炸豆腐"),
    );
    expect(mocks.analyzeMealFromText).toHaveBeenCalledWith(
      expect.stringContaining("他不是X"),
    );
  });
});

describe("handleImageMeal analysis failure", () => {
  it("refunds the consumed image quota and gives a safe member reply", async () => {
    mocks.understandImage.mockResolvedValue({
      result: { kind: "food", contains_food: true, description: "餐点" },
      usage: { prompt: 1, completion: 1 },
      model: "gpt-test",
    });
    mocks.tryConsume.mockResolvedValue({
      ok: true,
      used: { image: 1, text: 0, voice: 0 },
      limits: { image: 5, text: 5, voice: 0, mealAnalysis: 5 },
    });
    mocks.analyzeMealFromImage.mockRejectedValue(new Error("OpenAI timeout"));
    mocks.refundConsumed.mockResolvedValue(undefined);

    await handleImageMeal(
      "reply-token",
      "member-1",
      Buffer.from("image"),
      "image/jpeg",
    );

    expect(mocks.refundConsumed).toHaveBeenCalledWith("member-1", "image");
    expect(mocks.replyMessage).toHaveBeenCalledWith(
      "reply-token",
      [expect.objectContaining({ type: "text" })],
    );
  });
});
