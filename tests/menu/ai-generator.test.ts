import { describe, expect, it } from "vitest";
import { validateAiMenu } from "@/lib/menu/ai-generator";
import type { MenuQuestionnaire } from "@/lib/menu/generator";

const profile = { calorie_target: 1600, protein_g_target: 100 } as never;
const questionnaire: MenuQuestionnaire = { mealContext: "eating_out", mealsPerDay: 3, budgetPerMeal: 150, allergies: ["花生"], dislikedFoods: [], dietStyle: "general", includeDrinks: false, includeLateSnack: false, notes: "" };
const raw = { days: Array.from({ length: 7 }, (_, index) => ({ day: index + 1, title: `Day ${index + 1}`, meals: [
  { name: "蛋豆浆", description: "早餐", kcal: 400, proteinG: 25, alternatives: ["地瓜加蛋"] },
  { name: "鸡肉便当", description: "饭减半", kcal: 600, proteinG: 40, alternatives: ["鱼肉便当"] },
  { name: "豆腐蔬菜锅", description: "晚餐", kcal: 500, proteinG: 35, alternatives: ["蒸鱼青菜"] },
], coachMessage: "今天照自己的节奏就很好，你正在前进。" })) };

describe("AI menu validation", () => {
  it("computes daily totals for seven ordered days", () => {
    const menu = validateAiMenu(raw, profile, questionnaire, new Date("2026-08-02T00:00:00Z"));
    expect(menu.days).toHaveLength(7);
    expect(menu.days[0].totalKcal).toBe(1500);
    expect(menu.days[0].totalProteinG).toBe(100);
    expect(menu.source).toBe("openai");
  });

  it("rejects an allergy even when it appears in an alternative", () => {
    const unsafe = structuredClone(raw);
    unsafe.days[0].meals[0].alternatives = ["花生吐司"];
    expect(() => validateAiMenu(unsafe, profile, questionnaire)).toThrow("花生");
  });
});
