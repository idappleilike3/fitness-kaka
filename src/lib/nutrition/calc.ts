import type {
  ActivityLevel,
  GoalType,
  NutritionTargets,
  Sex,
} from "@/types";

export type BmrInput = {
  sex: Sex;
  weightKg: number;
  heightCm: number;
  age: number;
};

export type TargetInput = BmrInput & {
  activityLevel: ActivityLevel;
  goalType: GoalType;
};

/** Mifflin-St Jeor. `other` uses female formula (safer default). */
export function calcBmr(input: BmrInput): number {
  const base = 10 * input.weightKg + 6.25 * input.heightCm - 5 * input.age;
  if (input.sex === "male") return base + 5;
  return base - 161;
}

export function activityFactor(level: ActivityLevel): number {
  switch (level) {
    case "sedentary":
      return 1.2;
    case "light":
      return 1.375;
    case "moderate":
      return 1.55;
    case "high":
      return 1.725;
    default: {
      const _exhaustive: never = level;
      return _exhaustive;
    }
  }
}

export function calcTargets(input: TargetInput): NutritionTargets {
  const bmr = calcBmr(input);
  const tdee = bmr * activityFactor(input.activityLevel);
  const heightM = input.heightCm / 100;
  const bmi = input.weightKg / (heightM * heightM);

  let calorieTarget: number;
  if (input.goalType === "cut") calorieTarget = Math.round(tdee * 0.8);
  else if (input.goalType === "bulk") calorieTarget = Math.round(tdee * 1.1);
  else calorieTarget = Math.round(tdee);

  const proteinPerKg = input.goalType === "maintain" ? 1.4 : 1.8;
  const proteinG = Math.round(input.weightKg * proteinPerKg);
  const fatG = Math.round((calorieTarget * 0.25) / 9);
  const carbG = Math.max(
    0,
    Math.round((calorieTarget - proteinG * 4 - fatG * 9) / 4),
  );

  return {
    bmi: Math.round(bmi * 100) / 100,
    bmr: Math.round(bmr * 100) / 100,
    tdee: Math.round(tdee * 100) / 100,
    calorieTarget,
    proteinG,
    carbG,
    fatG,
  };
}
