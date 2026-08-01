import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  ensureEventOnce: vi.fn(),
  getLineProfile: vi.fn(),
  getAdminDb: vi.fn(),
  getProfile: vi.fn(),
  handleOnboarding: vi.fn(),
  replyText: vi.fn(),
  resolveCurrentPlan: vi.fn(),
  setOnboardingStep: vi.fn(),
  upsertMemberByLineUserId: vi.fn(),
  answerDailyStatus: vi.fn(),
  getChallengeStatus: vi.fn(),
  startChallenge: vi.fn(),
  handleTextMeal: vi.fn(),
  handleCoachChat: vi.fn(),
  getLatestPending: vi.fn(),
}));

vi.mock("@/lib/line/client", () => ({
  downloadContent: vi.fn(),
  getLineProfile: mocks.getLineProfile,
  replyMessage: vi.fn(),
  replyText: mocks.replyText,
}));
vi.mock("@/lib/line/messages", () => ({
  audioTooLongMessage: vi.fn(),
  goalsSummaryMessage: vi.fn(),
  helpMessage: vi.fn(() => "help"),
  mealLogTipMessage: vi.fn(),
  upgradePlansMessage: vi.fn(() => "upgrade"),
  videoNotSupportedMessage: vi.fn(),
  welcomeMessage: vi.fn(() => "welcome"),
}));
vi.mock("@/lib/audio/duration", () => ({
  isAudioTooLong: vi.fn(),
  MAX_AUDIO_SECONDS: 60,
}));
vi.mock("@/lib/admin-status", () => ({
  buildAdminStatusReply: vi.fn(),
  isAdminStatusCommand: vi.fn().mockReturnValue(false),
}));
vi.mock("@/lib/env", () => ({ getAppOnlyEnv: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({ getAdminDb: mocks.getAdminDb }));
vi.mock("@/lib/subscriptions/current-plan", () => ({
  resolveCurrentPlan: mocks.resolveCurrentPlan,
}));
vi.mock("@/lib/service-unavailable", () => ({
  adminHintCodeFor: vi.fn(),
  classifyUnavailable: vi.fn(),
  featureUnavailableUserMessage: vi.fn(),
}));
vi.mock("@/repositories/logs", () => ({
  ensureEventOnce: mocks.ensureEventOnce,
  logSystem: vi.fn(),
}));
vi.mock("@/repositories/members", () => ({
  setOnboardingStep: mocks.setOnboardingStep,
  upsertMemberByLineUserId: mocks.upsertMemberByLineUserId,
}));
vi.mock("@/repositories/profiles", () => ({ getProfile: mocks.getProfile }));
vi.mock("@/repositories/meals", () => ({
  getLatestPending: mocks.getLatestPending,
}));
vi.mock("@/repositories/challenges", () => ({
  getChallengeStatus: mocks.getChallengeStatus,
  startChallenge: mocks.startChallenge,
}));
vi.mock("@/services/daily-status", () => ({
  answerDailyStatus: mocks.answerDailyStatus,
}));
vi.mock("@/services/coach-chat", () => ({
  handleCoachChat: mocks.handleCoachChat,
}));
vi.mock("@/services/meal-flow", () => ({
  handleImageMeal: vi.fn(),
  handleMealPostback: vi.fn(),
  handleTextMeal: mocks.handleTextMeal,
  handleVoiceMeal: vi.fn(),
}));
vi.mock("@/services/onboarding", async () => {
  const actual = await vi.importActual<typeof import("@/services/onboarding")>(
    "@/services/onboarding",
  );
  return {
    ...actual,
    handleOnboarding: mocks.handleOnboarding,
  };
});

import { clearReplyMemory } from "@/lib/line/reply-memory";
import { routeEvent } from "@/services/line-router";

describe("LINE onboarding recovery", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearReplyMemory();
    mocks.ensureEventOnce.mockResolvedValue(true);
    mocks.getLineProfile.mockResolvedValue(null);
    mocks.resolveCurrentPlan.mockReturnValue({ planId: "free", expiresAt: null });
    mocks.startChallenge.mockResolvedValue({
      day: 1,
      missionTitle: "確認一餐",
      missionDescription: "確認今天的一筆飲食紀錄",
      missionCompleted: false,
      streakDays: 0,
    });
    mocks.getAdminDb.mockReturnValue({
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn().mockResolvedValue({ data: [], error: null }),
        })),
      })),
    });
    mocks.upsertMemberByLineUserId.mockResolvedValue({
      id: "member-1",
      line_user_id: "U123",
      display_name: "JENNIE",
      status: "active",
      onboarding_step: "height",
    });
    mocks.getLatestPending.mockResolvedValue(null);
    mocks.handleCoachChat.mockResolvedValue({
      ok: true,
      reply: "教練回覆",
    });
  });

  it("does not ask height or weight again when a completed profile has a stale onboarding step", async () => {
    mocks.getProfile.mockResolvedValue({
      sex: "female",
      age: 28,
      height_cm: 165,
      weight_kg: 52,
      target_weight_kg: 50,
      activity_level: "light",
      workout_frequency: 3,
      goal_type: "cut",
    });

    await routeEvent({
      type: "message",
      replyToken: "reply",
      webhookEventId: "event-1",
      source: { userId: "U123" },
      message: { type: "text", text: "嗨" },
    });

    expect(mocks.setOnboardingStep).toHaveBeenCalledWith("member-1", null);
    expect(mocks.handleOnboarding).not.toHaveBeenCalled();
    expect(mocks.replyText).toHaveBeenCalledWith(
      "reply",
      expect.not.stringMatching(/身高|體重/),
    );
  });

  it("answers a greeting naturally during incomplete onboarding without restarting the prompt", async () => {
    mocks.getProfile.mockResolvedValue({
      sex: "female",
      age: 28,
      height_cm: null,
      weight_kg: null,
      target_weight_kg: null,
      activity_level: null,
      workout_frequency: null,
      goal_type: null,
    });

    await routeEvent({
      type: "message",
      replyToken: "reply",
      webhookEventId: "event-2",
      source: { userId: "U123" },
      message: { type: "text", text: "你好" },
    });

    expect(mocks.handleOnboarding).not.toHaveBeenCalled();
    expect(mocks.replyText).toHaveBeenCalledWith(
      "reply",
      expect.stringContaining("跳過"),
    );
    expect(mocks.replyText).not.toHaveBeenCalledWith(
      "reply",
      expect.stringMatching(/身高|體重/),
    );
  });

  it("clears stale onboarding for an active paid member before routing their message", async () => {
    mocks.getProfile.mockResolvedValue({
      sex: null,
      age: null,
      height_cm: null,
      weight_kg: null,
      target_weight_kg: null,
      activity_level: null,
      workout_frequency: null,
      goal_type: null,
    });
    mocks.getAdminDb.mockReturnValue({
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn().mockResolvedValue({
            data: [
              {
                plan_id: "plan_799",
                status: "active",
                expires_at: "2026-11-20T14:07:52.587+00:00",
              },
            ],
            error: null,
          }),
        })),
      })),
    });
    mocks.resolveCurrentPlan.mockReturnValue({
      planId: "plan_799",
      expiresAt: "2026-11-20T14:07:52.587+00:00",
    });

    await routeEvent({
      type: "message",
      replyToken: "reply",
      webhookEventId: "event-3",
      source: { userId: "U123" },
      message: { type: "text", text: "早餐吃雞胸肉" },
    });

    expect(mocks.setOnboardingStep).toHaveBeenCalledWith("member-1", null);
    expect(mocks.handleOnboarding).not.toHaveBeenCalled();
    expect(mocks.handleTextMeal).toHaveBeenCalledWith(
      "reply",
      "member-1",
      "早餐吃雞胸肉",
    );
  });

  it("does not restart onboarding on follow when already unlocked", async () => {
    mocks.upsertMemberByLineUserId.mockResolvedValue({
      id: "member-1",
      line_user_id: "U123",
      display_name: "JENNIE",
      status: "active",
      onboarding_step: null,
    });

    await routeEvent({
      type: "follow",
      replyToken: "reply",
      webhookEventId: "event-follow",
      source: { userId: "U123" },
    });

    expect(mocks.handleOnboarding).not.toHaveBeenCalled();
    expect(mocks.replyText).toHaveBeenCalledWith(
      "reply",
      expect.stringContaining("welcome"),
    );
    expect(mocks.replyText).toHaveBeenCalledWith(
      "reply",
      expect.not.stringMatching(/請點選性別|請輸入身高/),
    );
  });

  it("routes 「我今天吃了多少」 to the SQL daily summary instead of meal analysis", async () => {
    mocks.upsertMemberByLineUserId.mockResolvedValue({
      id: "member-1",
      line_user_id: "U123",
      display_name: "JENNIE",
      status: "active",
      onboarding_step: null,
    });
    mocks.answerDailyStatus.mockResolvedValue("今天還沒有已確認的飲食紀錄");

    await routeEvent({
      type: "message",
      replyToken: "reply",
      webhookEventId: "event-daily-summary",
      source: { userId: "U123" },
      message: { type: "text", text: "我今天吃了多少" },
    });

    expect(mocks.answerDailyStatus).toHaveBeenCalledWith(
      "member-1",
      "我今天吃了多少",
    );
    expect(mocks.handleTextMeal).not.toHaveBeenCalled();
    expect(mocks.replyText).toHaveBeenCalledWith(
      "reply",
      "今天還沒有已確認的飲食紀錄",
    );
  });

  it("routes 「今天還能吃多少」 to the daily summary instead of meal analysis", async () => {
    mocks.upsertMemberByLineUserId.mockResolvedValue({
      id: "member-1",
      line_user_id: "U123",
      display_name: "JENNIE",
      status: "active",
      onboarding_step: null,
    });
    mocks.answerDailyStatus.mockResolvedValue(
      "今天已攝取 1250 kcal，還能吃約 550 kcal",
    );

    await routeEvent({
      type: "message",
      replyToken: "reply",
      webhookEventId: "event-daily-remaining",
      source: { userId: "U123" },
      message: { type: "text", text: "今天還能吃多少" },
    });

    expect(mocks.answerDailyStatus).toHaveBeenCalledWith(
      "member-1",
      "今天還能吃多少",
    );
    expect(mocks.handleTextMeal).not.toHaveBeenCalled();
    expect(mocks.replyText).toHaveBeenCalledWith(
      "reply",
      "今天已攝取 1250 kcal，還能吃約 550 kcal",
    );
  });

  it("starts the 30-day challenge from the LINE command", async () => {
    mocks.upsertMemberByLineUserId.mockResolvedValue({
      id: "member-1",
      line_user_id: "U123",
      display_name: "JENNIE",
      status: "active",
      onboarding_step: null,
    });
    mocks.getChallengeStatus.mockResolvedValue({
      day: 0,
      missionTitle: null,
      missionDescription: null,
      missionCompleted: false,
      streakDays: 0,
    });

    await routeEvent({
      type: "message",
      replyToken: "reply",
      webhookEventId: "event-challenge-start",
      source: { userId: "U123" },
      message: { type: "text", text: "開始挑戰" },
    });

    expect(mocks.startChallenge).toHaveBeenCalledWith("member-1");
    expect(mocks.handleTextMeal).not.toHaveBeenCalled();
    expect(mocks.handleCoachChat).not.toHaveBeenCalled();
    expect(mocks.replyText).toHaveBeenCalledWith(
      "reply",
      expect.stringContaining("已幫你加入 30 天健身減脂挑戰"),
    );
  });

  it("starts challenge from 「我要參加三十天健身減脂計劃」 not coach chat", async () => {
    mocks.upsertMemberByLineUserId.mockResolvedValue({
      id: "member-1",
      line_user_id: "U123",
      display_name: "JENNIE",
      status: "active",
      onboarding_step: null,
    });
    mocks.getChallengeStatus.mockResolvedValue({
      day: 0,
      missionTitle: null,
      missionDescription: null,
      missionCompleted: false,
      streakDays: 0,
    });

    await routeEvent({
      type: "message",
      replyToken: "reply",
      webhookEventId: "event-challenge-join-natural",
      source: { userId: "U123" },
      message: { type: "text", text: "我要參加三十天健身減脂計劃" },
    });

    expect(mocks.startChallenge).toHaveBeenCalledWith("member-1");
    expect(mocks.handleCoachChat).not.toHaveBeenCalled();
    expect(mocks.replyText).toHaveBeenCalledWith(
      "reply",
      expect.stringContaining("Day 1"),
    );
  });

  it("routes health chitchat to coach GPT without meal quota", async () => {
    mocks.upsertMemberByLineUserId.mockResolvedValue({
      id: "member-1",
      line_user_id: "U123",
      display_name: "JENNIE",
      status: "active",
      onboarding_step: null,
    });

    await routeEvent({
      type: "message",
      replyToken: "reply",
      webhookEventId: "event-coach",
      source: { userId: "U123" },
      message: { type: "text", text: "減脂期宵夜可以吃什麼" },
    });

    expect(mocks.handleTextMeal).not.toHaveBeenCalled();
    expect(mocks.handleCoachChat).toHaveBeenCalledWith(
      "member-1",
      "減脂期宵夜可以吃什麼",
      "JENNIE",
    );
    expect(mocks.replyText).toHaveBeenCalledWith("reply", "教練回覆");
  });

  it("routes pending correction text to meal flow when a pending meal exists", async () => {
    mocks.upsertMemberByLineUserId.mockResolvedValue({
      id: "member-1",
      line_user_id: "U123",
      display_name: "JENNIE",
      status: "active",
      onboarding_step: null,
    });
    mocks.getLatestPending.mockResolvedValue({ id: "pending-1" });

    await routeEvent({
      type: "message",
      replyToken: "reply",
      webhookEventId: "event-pending-fix",
      source: { userId: "U123" },
      message: { type: "text", text: "不是薯條" },
    });

    expect(mocks.handleTextMeal).toHaveBeenCalledWith(
      "reply",
      "member-1",
      "不是薯條",
    );
    expect(mocks.handleCoachChat).not.toHaveBeenCalled();
  });

  it("routes 「是鹹酥雞不是炸豆腐」 to meal correction when pending exists", async () => {
    mocks.upsertMemberByLineUserId.mockResolvedValue({
      id: "member-1",
      line_user_id: "U123",
      display_name: "JENNIE",
      status: "active",
      onboarding_step: null,
    });
    mocks.getLatestPending.mockResolvedValue({ id: "pending-tofu" });

    await routeEvent({
      type: "message",
      replyToken: "reply",
      webhookEventId: "event-swap-correction",
      source: { userId: "U123" },
      message: { type: "text", text: "是鹹酥雞不是炸豆腐" },
    });

    expect(mocks.getLatestPending).toHaveBeenCalledWith("member-1");
    expect(mocks.handleTextMeal).toHaveBeenCalledWith(
      "reply",
      "member-1",
      "是鹹酥雞不是炸豆腐",
    );
    expect(mocks.handleCoachChat).not.toHaveBeenCalled();
    expect(mocks.replyText).not.toHaveBeenCalledWith(
      "reply",
      expect.stringContaining("加上"),
    );
  });

  it("routes 「這是素食」 and 「他不是炸豆腐」 to meal correction when pending exists", async () => {
    mocks.upsertMemberByLineUserId.mockResolvedValue({
      id: "member-1",
      line_user_id: "U123",
      display_name: "JENNIE",
      status: "active",
      onboarding_step: null,
    });
    mocks.getLatestPending.mockResolvedValue({ id: "pending-veg" });

    await routeEvent({
      type: "message",
      replyToken: "reply-veg",
      webhookEventId: "event-veg-correction",
      source: { userId: "U123" },
      message: { type: "text", text: "這是素食" },
    });
    expect(mocks.handleTextMeal).toHaveBeenCalledWith(
      "reply-veg",
      "member-1",
      "這是素食",
    );
    expect(mocks.handleCoachChat).not.toHaveBeenCalled();

    mocks.handleTextMeal.mockClear();
    mocks.handleCoachChat.mockClear();
    mocks.getLatestPending.mockResolvedValue({ id: "pending-veg" });

    await routeEvent({
      type: "message",
      replyToken: "reply-not-tofu",
      webhookEventId: "event-not-tofu-correction",
      source: { userId: "U123" },
      message: { type: "text", text: "他不是炸豆腐" },
    });
    expect(mocks.handleTextMeal).toHaveBeenCalledWith(
      "reply-not-tofu",
      "member-1",
      "他不是炸豆腐",
    );
    expect(mocks.handleCoachChat).not.toHaveBeenCalled();
  });

  it("gives a soft ack for emoji and does not repeat the same canned help", async () => {
    mocks.upsertMemberByLineUserId.mockResolvedValue({
      id: "member-1",
      line_user_id: "U123",
      display_name: "JENNIE",
      status: "active",
      onboarding_step: null,
    });

    await routeEvent({
      type: "message",
      replyToken: "reply-1",
      webhookEventId: "event-emoji-1",
      source: { userId: "U123" },
      message: { type: "text", text: "😂" },
    });
    await routeEvent({
      type: "message",
      replyToken: "reply-2",
      webhookEventId: "event-emoji-2",
      source: { userId: "U123" },
      message: { type: "text", text: "😂" },
    });

    expect(mocks.handleTextMeal).not.toHaveBeenCalled();
    expect(mocks.handleCoachChat).not.toHaveBeenCalled();
    const replies = mocks.replyText.mock.calls.map((c: unknown[]) => c[1]);
    expect(replies.length).toBeGreaterThanOrEqual(1);
    expect(replies.every((r: string) => !String(r).includes("加上…"))).toBe(
      true,
    );
    // Second emoji should not reuse the exact first canned string
    if (replies.length >= 2) {
      expect(replies[1]).not.toBe(replies[0]);
    }
  });
});
