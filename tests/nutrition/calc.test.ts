import { describe, it, expect } from "vitest";
import { calcBmr, calcTargets } from "@/lib/nutrition/calc";

describe("calcBmr", () => {
  it("male mifflin", () => {
    expect(
      calcBmr({ sex: "male", weightKg: 70, heightCm: 175, age: 30 }),
    ).toBeCloseTo(1648.75, 1);
  });

  it("female mifflin", () => {
    // 10*60 + 6.25*160 - 5*28 - 161 = 1299
    expect(
      calcBmr({ sex: "female", weightKg: 60, heightCm: 160, age: 28 }),
    ).toBeCloseTo(1299.0, 1);
  });
});

describe("calcTargets cut", () => {
  it("uses 0.8 tdee and 1.8 protein", () => {
    const t = calcTargets({
      sex: "male",
      weightKg: 70,
      heightCm: 175,
      age: 30,
      activityLevel: "sedentary",
      goalType: "cut",
    });
    expect(t.calorieTarget).toBe(Math.round(t.tdee * 0.8));
    expect(t.proteinG).toBe(Math.round(70 * 1.8));
    expect(t.fatG).toBe(Math.round((t.calorieTarget * 0.25) / 9));
  });
});

describe("calcTargets maintain", () => {
  it("uses 1.4 protein", () => {
    const t = calcTargets({
      sex: "female",
      weightKg: 55,
      heightCm: 160,
      age: 25,
      activityLevel: "light",
      goalType: "maintain",
    });
    expect(t.proteinG).toBe(Math.round(55 * 1.4));
    expect(t.calorieTarget).toBe(Math.round(t.tdee));
  });
});
