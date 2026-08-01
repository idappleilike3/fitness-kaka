import { z } from "zod";
import { getOpenAI } from "@/lib/openai/client";
import { getOpenAIEnv } from "@/lib/env";
import { generateSevenDayMenu, type GeneratedMenu, type MenuQuestionnaire } from "@/lib/menu/generator";
import type { ProfileRow } from "@/repositories/profiles";

const mealSchema = z.object({
  name: z.string().min(1).max(80),
  description: z.string().min(1).max(240),
  kcal: z.number().int().min(80).max(1800),
  proteinG: z.number().int().min(0).max(200),
  alternatives: z.array(z.string().min(1).max(80)).min(1).max(4),
});
const menuSchema = z.object({
  days: z.array(z.object({
    day: z.number().int().min(1).max(7),
    title: z.string().min(1).max(80),
    meals: z.array(mealSchema).min(2).max(4),
    coachMessage: z.string().min(1).max(240),
  })).length(7),
});

function target(profile: ProfileRow, key: "calorie_target" | "protein_g_target", fallback: number) {
  const value = Number(profile[key]);
  return Number.isFinite(value) && value > 0 ? Math.round(value) : fallback;
}

export function validateAiMenu(raw: unknown, profile: ProfileRow, questionnaire: MenuQuestionnaire, now = new Date()): GeneratedMenu {
  const parsed = menuSchema.parse(raw);
  const excluded = [...questionnaire.allergies, ...questionnaire.dislikedFoods]
    .map((item) => item.trim().toLowerCase()).filter(Boolean);
  const days = parsed.days.map((day, index) => {
    if (day.day !== index + 1) throw new Error("AI 菜单天数顺序不正确");
    const text = JSON.stringify(day).toLowerCase();
    const unsafe = excluded.find((food) => text.includes(food));
    if (unsafe) throw new Error(`AI 菜单含有需避开的食物：${unsafe}`);
    const totalKcal = day.meals.reduce((sum, meal) => sum + meal.kcal, 0);
    const totalProteinG = day.meals.reduce((sum, meal) => sum + meal.proteinG, 0);
    return { ...day, totalKcal, totalProteinG };
  });
  return {
    calorieTarget: target(profile, "calorie_target", 1600),
    proteinTarget: target(profile, "protein_g_target", 100),
    context: questionnaire.mealContext,
    days,
    generatedAt: now.toISOString(),
    disclaimer: "本菜单为一般健康饮食建议，不取代医师或合格营养师针对疾病、孕期或特殊需求的评估。",
    source: "openai",
  };
}

export async function generatePersonalizedMenu(profile: ProfileRow, questionnaire: MenuQuestionnaire): Promise<{ menu: GeneratedMenu; warning: string | null }> {
  try {
    const env = getOpenAIEnv();
    const response = await getOpenAI().chat.completions.create({
      model: env.OPENAI_MODEL,
      temperature: 0.35,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: "你是温暖姐姐型减脂教练。只输出 JSON。不可责备、羞辱、评论身材、猜体重或鼓励极端节食。菜单必须是台湾可购买的实际餐点，严格避开过敏与不吃食物，每天最后一句鼓励。" },
        { role: "user", content: JSON.stringify({
          task: "生成 Day1 到 Day7 个人化菜单",
          output: { days: [{ day: 1, title: "", meals: [{ name: "", description: "", kcal: 0, proteinG: 0, alternatives: [""] }], coachMessage: "" }] },
          body: { bmi: profile.bmi, bmr: profile.bmr, tdee: profile.tdee, calorieTarget: target(profile, "calorie_target", 1600), proteinTarget: target(profile, "protein_g_target", 100), activityLevel: profile.activity_level, workoutFrequency: profile.workout_frequency },
          preferences: questionnaire,
          rules: ["恰好7天", `每天${questionnaire.mealsPerDay}餐`, "每日热量尽量在目标正负15%", "每餐费用不超过预算，若预算过低则用最接近的可行选择", "替换选项也必须避开禁忌"],
        }) },
      ],
    });
    const raw = JSON.parse(response.choices[0]?.message?.content ?? "{}");
    return { menu: validateAiMenu(raw, profile, questionnaire), warning: null };
  } catch (error) {
    const fallback = generateSevenDayMenu(profile, questionnaire);
    return { menu: { ...fallback, source: "safe_fallback" }, warning: error instanceof Error ? error.message : String(error) };
  }
}
