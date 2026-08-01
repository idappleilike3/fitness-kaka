import { describe, expect, it } from "vitest";
import {
  isCompletedOnboardingProfile,
  normalizeNumericInput,
  parseLooseNumber,
  parseOnboardingPostback,
  shouldBypassOnboarding,
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

  it("releases a member with the inputs required to calculate TDEE", () => {
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
        },
        "free",
      ),
    ).toBe(true);
  });
});
