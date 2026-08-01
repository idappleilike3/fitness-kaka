export type Sex = "male" | "female" | "other";
export type ActivityLevel = "sedentary" | "light" | "moderate" | "high";
export type GoalType = "cut" | "bulk" | "maintain";
export type QuotaKind = "image" | "text" | "voice";
export type MealSource = "image" | "text" | "voice";

export type MealItemAnalysis = {
  name: string;
  portion_text: string;
  kcal: number;
  protein_g: number;
  carb_g: number;
  fat_g: number;
};

export type MealAnalysisJson = {
  items: MealItemAnalysis[];
  total_kcal: number;
  protein_g: number;
  carb_g: number;
  fat_g: number;
  confidence: "low" | "medium" | "high";
  notes?: string;
};

export type NutritionTargets = {
  bmi: number;
  bmr: number;
  tdee: number;
  calorieTarget: number;
  proteinG: number;
  carbG: number;
  fatG: number;
};
