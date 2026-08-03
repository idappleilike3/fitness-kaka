import { describe, expect, it } from "vitest";
import { MEAL_SCENARIOS, getMealScenario } from "@/app/MealScenarioSwitcher";

describe("meal scenario switcher data", () => {
  it("provides three distinct selectable real-life meal scenarios", () => {
    expect(MEAL_SCENARIOS.map((item) => item.id)).toEqual(["dining", "convenience", "home"]);
    expect(new Set(MEAL_SCENARIOS.map((item) => item.image)).size).toBe(3);
  });

  it.each([
    ["dining", "外食版", "舒肥雞胸便當", "620 kcal", "42g"],
    ["convenience", "超商版", "雞胸地瓜沙拉組", "510 kcal", "39g"],
    ["home", "居家版", "鮭魚豆腐蔬菜鍋", "560 kcal", "45g"],
  ] as const)("returns complete nutrition guidance for %s", (id, label, meal, calories, protein) => {
    const scenario = getMealScenario(id);
    expect(scenario.label).toBe(label);
    expect(scenario.meal).toBe(meal);
    expect(scenario.calories).toBe(calories);
    expect(scenario.protein).toBe(protein);
    expect(scenario.guidance.length).toBeGreaterThan(15);
    expect(scenario.imageAlt).toContain(label);
  });
});
