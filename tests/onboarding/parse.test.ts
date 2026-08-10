import { describe, expect, it } from "vitest";
import {
  isCompletedOnboardingProfile,
  normalizeNumericInput,
  parseLooseNumber,
  parseOnboardingPostback,
  shouldBypassOnboarding,
  startOnboardingPrompt,
} from "@/services/onboarding";

describe("onboarding numeric parsing", () => {
  it("trims and accepts fullwidth digits", () => {
    expect(normalizeNumericInput("  ２８  ")).toBe("28");
    expect(parseLooseNumber("２８歲")).toBe(28);
    expect(parseLooseNumber("１７０公分")).toBe(170);
    expect(parseLooseNumber("65.5公斤")).toBe(65.5);
  });

  it("parses freq button labels", () => {
    expect(parseLooseNumber("3次")).toBe(3);
  });
});

describe("onboarding postback", () => {
  it("parses onboarding postback data", () => {
    expect(parseOnboardingPostback("onboarding:sex:male")).toEqual({
      step: "sex",
      value: "male",
    });
    expect(parseOnboardingPostback("onboarding:freq:3")).toEqual({
      step: "freq",
      value: "3",
    });
    expect(parseOnboardingPostback("meal:confirm:x")).toBeNull();
  });
});

describe("new member questionnaire", () => {
  it("starts by asking the member's main goal with four tappable answers", () => {
    const result = startOnboardingPrompt();

    expect(result.reply).toContain("你現在最想改善什麼");
    expect(result.quickReply?.items.map((item) => item.action.label)).toEqual([
      "減脂瘦身",
      "控制飲食",
      "增肌塑形",
      "改善健康",
    ]);
    expect(result.quickReply?.items.map((item) => item.action.data)).toEqual([
      "onboarding:goal:cut",
      "onboarding:goal:diet",
      "onboarding:goal:bulk",
      "onboarding:goal:health",
    ]);
  });
});

describe("stale onboarding recovery", () => {
  it("does not restart height or weight questions for a completed profile", () => {
    expect(
      isCompletedOnboardingProfile({
        sex: "female",
        age: 28,
        height_cm: 165,
        weight_kg: 52,
        target_weight_kg: 50,
        activity_level: "light",
        workout_frequency: 3,
        goal_type: "cut",
        health_context: "none",
        eating_pattern: "mixed",
      }),
    ).toBe(true);
  });

  it("keeps onboarding active when a required answer is actually missing", () => {
    expect(
      isCompletedOnboardingProfile({
        sex: "female",
        age: 28,
        height_cm: null,
        weight_kg: 52,
        target_weight_kg: 50,
        activity_level: "light",
        workout_frequency: 3,
        goal_type: "cut",
      }),
    ).toBe(false);
  });
});

describe("onboarding escape hatches", () => {
  it("releases an active paid member even when optional onboarding answers are missing", () => {
    expect(
      shouldBypassOnboarding(
        {
          sex: "female",
          age: 28,
          height_cm: null,
          weight_kg: null,
          target_weight_kg: null,
          activity_level: null,
          workout_frequency: null,
          goal_type: null,
        },
        "plan_799",
      ),
    ).toBe(true);
  });

  it("keeps a free member in onboarding until the complete personal plan is saved", () => {
    expect(
      shouldBypassOnboarding(
        {
          sex: "female",
          age: 28,
          height_cm: 165,
          weight_kg: 52,
          target_weight_kg: null,
          activity_level: "light",
          workout_frequency: null,
          goal_type: null,
          health_context: "none",
          eating_pattern: null,
        },
        "free",
      ),
    ).toBe(false);
  });
});
