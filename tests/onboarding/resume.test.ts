import { describe, expect, it } from "vitest";
import { firstMissingOnboardingStep } from "@/services/onboarding";

const completeProfile = {
  sex: "female",
  age: 30,
  height_cm: 165,
  weight_kg: 60,
  target_weight_kg: 55,
  activity_level: "light",
  workout_frequency: 3,
  goal_type: "cut",
  health_context: "none",
  eating_pattern: "mixed",
};

describe("persistent onboarding resume cursor", () => {
  it("resumes at the first unanswered field instead of restarting", () => {
    expect(
      firstMissingOnboardingStep({
        ...completeProfile,
        height_cm: null,
        weight_kg: null,
      }),
    ).toBe("height");
  });

  it("does not restart a completed profile", () => {
    expect(firstMissingOnboardingStep(completeProfile)).toBeNull();
  });

  it("requires persisted health context and eating pattern", () => {
    expect(
      firstMissingOnboardingStep({
        ...completeProfile,
        health_context: null,
      }),
    ).toBe("health");
    expect(
      firstMissingOnboardingStep({
        ...completeProfile,
        eating_pattern: null,
      }),
    ).toBe("eating");
  });
});
