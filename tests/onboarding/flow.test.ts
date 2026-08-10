import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  patchProfile: vi.fn(),
  getProfile: vi.fn(),
  setOnboardingStep: vi.fn(),
  completeProfileIfReady: vi.fn(),
}));

vi.mock("@/repositories/profiles", () => ({
  patchProfile: mocks.patchProfile,
  getProfile: mocks.getProfile,
  completeProfileIfReady: mocks.completeProfileIfReady,
}));
vi.mock("@/repositories/members", () => ({
  setOnboardingStep: mocks.setOnboardingStep,
}));

import { handleOnboarding } from "@/services/onboarding";

const member = {
  id: "member-1",
  line_user_id: "U123",
  display_name: "小美",
  status: "active",
  onboarding_step: "health",
};

describe("persistent personalized onboarding flow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.patchProfile.mockResolvedValue(undefined);
    mocks.setOnboardingStep.mockResolvedValue(undefined);
    mocks.completeProfileIfReady.mockResolvedValue({
      done: true,
      summary: "建檔完成",
    });
    mocks.getProfile.mockResolvedValue({
      goal_type: "cut",
      sex: "female",
      age: 30,
      health_context: "none",
      height_cm: null,
      weight_kg: null,
      target_weight_kg: null,
      activity_level: null,
      workout_frequency: null,
      eating_pattern: "mostly_out",
    });
  });

  it("persists the safety answer before advancing", async () => {
    const result = await handleOnboarding(member, "沒有", "health");

    expect(mocks.patchProfile).toHaveBeenCalledWith("member-1", {
      health_context: "none",
    });
    expect(mocks.patchProfile.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.setOnboardingStep.mock.invocationCallOrder[0],
    );
    expect(mocks.setOnboardingStep).toHaveBeenCalledWith("member-1", "height");
    expect(result.reply).toContain("身高");
  });

  it("persists the eating pattern and completes the profile", async () => {
    const result = await handleOnboarding(
      { ...member, onboarding_step: "eating" },
      "大多外食",
      "eating",
    );

    expect(mocks.patchProfile).toHaveBeenCalledWith("member-1", {
      eating_pattern: "mostly_out",
    });
    expect(mocks.completeProfileIfReady).toHaveBeenCalledWith("member-1");
    expect(mocks.setOnboardingStep).toHaveBeenCalledWith("member-1", null);
    expect(result).toEqual({ reply: "建檔完成", stillOnboarding: false });
  });

  it("does not clear memory when target completion reports missing data", async () => {
    mocks.completeProfileIfReady.mockResolvedValueOnce({ done: false });

    const result = await handleOnboarding(
      { ...member, onboarding_step: "eating" },
      "大多外食",
      "eating",
    );

    expect(mocks.setOnboardingStep).not.toHaveBeenCalledWith("member-1", null);
    expect(mocks.setOnboardingStep).toHaveBeenCalledWith("member-1", "height");
    expect(result.stillOnboarding).toBe(true);
    expect(result.reply).toContain("身高");
  });

  it("keeps the same durable cursor when a safety answer is invalid", async () => {
    const result = await handleOnboarding(member, "不知道", "health");

    expect(mocks.patchProfile).not.toHaveBeenCalled();
    expect(mocks.setOnboardingStep).not.toHaveBeenCalled();
    expect(result.stillOnboarding).toBe(true);
    expect(result.reply).toContain("特殊狀況");
  });

  it("keeps the same durable cursor when persistence fails", async () => {
    mocks.patchProfile.mockRejectedValueOnce(new Error("database down"));

    const result = await handleOnboarding(member, "沒有", "health");

    expect(mocks.setOnboardingStep).not.toHaveBeenCalled();
    expect(result.stillOnboarding).toBe(true);
    expect(result.reply).toContain("儲存失敗");
  });

  it("lets consultation choice 6 describe an unlisted goal without advancing", async () => {
    const result = await handleOnboarding(
      { ...member, onboarding_step: "goal" },
      "⑥",
      "goal",
    );

    expect(mocks.patchProfile).not.toHaveBeenCalled();
    expect(mocks.setOnboardingStep).not.toHaveBeenCalled();
    expect(result.reply).toContain("直接告訴卡卡");
  });
});
