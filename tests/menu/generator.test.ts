import { describe, expect, it } from "vitest";
import { generateSevenDayMenu, parseMenuQuestionnaire } from "@/lib/menu/generator";

const profile = {
  member_id: "m1", sex: "female", age: 35, height_cm: 160, weight_kg: 60,
  target_weight_kg: 55, activity_level: "light", workout_frequency: 2, goal_type: "cut",
  calorie_target: 1600, protein_g_target: 100, carb_g_target: 180, fat_g_target: 53,
  profile_completed_at: "2026-08-01T00:00:00.000Z",
};

describe("7 day menu generator", () => {
  it("creates seven days around member targets", () => {
    const questionnaire = parseMenuQuestionnaire({ mealContext: "mixed", mealsPerDay: 3, budgetPerMeal: 150, allergies: [], dislikedFoods: [], dietStyle: "general" });
    expect(questionnaire).not.toBeNull();
    const menu = generateSevenDayMenu(profile, questionnaire!);
    expect(menu.days).toHaveLength(7);
    expect(menu.calorieTarget).toBe(1600);
    expect(menu.proteinTarget).toBe(100);
    expect(menu.days[0].coachMessage).toContain("慢慢來");
  });

  it("rejects incomplete questionnaires", () => {
    expect(parseMenuQuestionnaire({ mealContext: "unknown" })).toBeNull();
  });
});
