import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  analyzeMealFromImage: vi.fn(),
  analyzeMealFromText: vi.fn(),
  understandImage: vi.fn(),
  createPending: vi.fn(),
  getLatestPending: vi.fn(),
  getTodaySummary: vi.fn(),
  logApiUsage: vi.fn(),
  replyMessage: vi.fn(),
  startLoadingAnimation: vi.fn(),
  refundConsumed: vi.fn(),
  tryConsume: vi.fn(),
  updatePendingAnalysis: vi.fn(),
}));

vi.mock("@/lib/line/client", () => ({ replyMessage: mocks.replyMessage, startLoadingAnimation: mocks.startLoadingAnimation }));
vi.mock("@/lib/openai/meal", () => ({
  analyzeMealFromText: mocks.analyzeMealFromText,
  analyzeMealFromImage: mocks.analyzeMealFromImage,
}));
vi.mock("@/lib/openai/image-understanding", () => ({
  understandImage: mocks.understandImage,
}));
vi.mock("@/repositories/logs", () => ({ logApiUsage: mocks.logApiUsage }));
vi.mock("@/repositories/meals", () => ({
  createPending: mocks.createPending,
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

import {
  calculateProjectedRemaining,
  handleImageMeal,
  handleTextMeal,
} from "@/services/meal-flow";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.startLoadingAnimation.mockResolvedValue(undefined);
  mocks.logApiUsage.mockResolvedValue(undefined);
});


describe("calculateProjectedRemaining", () => {
  it("subtracts the current unconfirmed photo meal from projected calorie and protein remaining", () => {
    expect(
      calculateProjectedRemaining({
        calorieTarget: 1800,
        proteinTarget: 100,
        confirmedKcal: 600,
        confirmedProteinG: 21,
        currentMealKcal: 520,
        currentMealProteinG: 32,
      }),
    ).toEqual({
      projectedKcal: 1120,
      projectedProteinG: 53,
      remainingKcal: 680,
      proteinLeft: 47,
    });
  });
});

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

describe("handleImageMeal analysis progress", () => {
  it("replies naturally to a pet photo without consuming meal quota", async () => {
    mocks.understandImage.mockResolvedValue({
      kind: "pet",
      reply: "也太可愛了吧，牠這個表情很有戲 😄 這是你家的毛孩嗎？",
      usage: { prompt: 12, completion: 8 },
      model: "gpt-test",
    });

    await handleImageMeal(
      "reply-token",
      "member-1",
      Buffer.from("pet-image"),
      "image/jpeg",
      "U123",
    );

    expect(mocks.replyMessage).toHaveBeenCalledWith("reply-token", [
      {
        type: "text",
        text: "也太可愛了吧，牠這個表情很有戲 😄 這是你家的毛孩嗎？",
      },
    ]);
    expect(mocks.tryConsume).not.toHaveBeenCalled();
    expect(mocks.createPending).not.toHaveBeenCalled();
  });

  it("returns a food photo nutrition preview without conversational preface", async () => {
    mocks.understandImage.mockResolvedValue({
      kind: "food",
      reply: "看起來是很豐富的雞胸餐盒，蔬菜和主食都有照顧到，我先幫你估算看看。",
      meal: {
        items: [{ name: "雞胸餐", portion_text: "1 份", kcal: 450, protein_g: 35, carb_g: 40, fat_g: 12 }],
        total_kcal: 450, protein_g: 35, carb_g: 40, fat_g: 12, confidence: "high",
      },
      usage: { prompt: 10, completion: 10 },
      model: "gpt-test",
    });
    mocks.tryConsume.mockResolvedValue({
      ok: true,
      used: { image: 1, text: 0, voice: 0 },
      limits: { image: 5, text: 5, voice: 0, mealAnalysis: 5 },
    });
    mocks.createPending.mockResolvedValue("pending-1");
    mocks.getTodaySummary.mockResolvedValue({ total_kcal: 0, protein_g: 0 });

    await handleImageMeal(
      "reply-token",
      "member-1",
      Buffer.from("food-image"),
      "image/jpeg",
      "U123",
    );

    expect(mocks.tryConsume).toHaveBeenCalledWith("member-1", "image");
    expect(mocks.createPending).toHaveBeenCalledTimes(1);
    expect(mocks.replyMessage).toHaveBeenCalledTimes(1);
    expect(mocks.replyMessage.mock.calls[0][1][0].text).toContain("雞胸餐");
    expect(mocks.replyMessage.mock.calls[0][1][0].text).not.toContain(
      "我先幫你估算",
    );
  });

  it("starts the LINE loading animation while analyzing a photo", async () => {
    mocks.tryConsume.mockResolvedValue({
      ok: true,
      used: { image: 1, text: 0, voice: 0 },
      limits: { image: 5, text: 5, voice: 0, mealAnalysis: 5 },
    });
    mocks.understandImage.mockResolvedValue({
      kind: "food",
      reply: "這份餐看起來很有飽足感，我來幫你估算。",
      meal: {
        items: [{ name: "鸡胸餐", portion_text: "1 份", kcal: 450, protein_g: 35, carb_g: 40, fat_g: 12 }],
        total_kcal: 450, protein_g: 35, carb_g: 40, fat_g: 12, confidence: "high",
      },
      usage: { prompt: 10, completion: 10 },
      model: "gpt-test",
    });
    mocks.createPending.mockResolvedValue("pending-1");
    mocks.getTodaySummary.mockResolvedValue({ total_kcal: 0, protein_g: 0 });

    await handleImageMeal(
      "reply-token",
      "member-1",
      Buffer.from("image"),
      "image/jpeg",
      "U123",
    );

    expect(mocks.startLoadingAnimation).toHaveBeenCalledWith("U123", 20);
  });

});

describe("handleImageMeal analysis failure", () => {
  it("does not consume image quota when visual understanding fails", async () => {
    mocks.tryConsume.mockResolvedValue({
      ok: true,
      used: { image: 1, text: 0, voice: 0 },
      limits: { image: 5, text: 5, voice: 0, mealAnalysis: 5 },
    });
    mocks.understandImage.mockRejectedValue(new Error("OpenAI timeout"));
    mocks.refundConsumed.mockResolvedValue(undefined);

    await expect(
      handleImageMeal(
        "reply-token",
        "member-1",
        Buffer.from("image"),
        "image/jpeg",
      ),
    ).resolves.toBeUndefined();

    expect(mocks.refundConsumed).not.toHaveBeenCalled();
    expect(mocks.tryConsume).not.toHaveBeenCalled();
    expect(mocks.replyMessage).toHaveBeenCalledWith("reply-token", [
      {
        type: "text",
        text: "我目前無法確認圖片內容。\n請重新拍攝，或直接描述餐點。",
      },
    ]);
  });
});
