import { calcTargets } from "@/lib/nutrition/calc";
import { getAdminDb } from "@/lib/supabase/admin";
import type { ActivityLevel, GoalType, Sex } from "@/types";

export type ProfileRow = {
  member_id: string;
  sex: string | null;
  age: number | null;
  height_cm: number | null;
  weight_kg: number | null;
  target_weight_kg: number | null;
  activity_level: string | null;
  workout_frequency: number | null;
  goal_type: string | null;
  calorie_target: number | null;
  protein_g_target: number | null;
  carb_g_target: number | null;
  fat_g_target: number | null;
  bmi?: number | null;
  bmr?: number | null;
  tdee?: number | null;
  profile_completed_at: string | null;
};

export async function getProfile(memberId: string): Promise<ProfileRow | null> {
  const db = getAdminDb();
  const { data } = await db
    .from("member_profiles")
    .select("*")
    .eq("member_id", memberId)
    .maybeSingle();
  return (data as ProfileRow) ?? null;
}

export async function patchProfile(
  memberId: string,
  patch: Record<string, unknown>,
): Promise<void> {
  const db = getAdminDb();
  await db.from("member_profiles").update(patch).eq("member_id", memberId);
}

export async function completeProfileIfReady(memberId: string): Promise<{
  done: boolean;
  summary?: string;
}> {
  const profile = await getProfile(memberId);
  if (!profile) return { done: false };
  if (
    !profile.sex ||
    !profile.age ||
    !profile.height_cm ||
    !profile.weight_kg ||
    !profile.target_weight_kg ||
    !profile.activity_level ||
    profile.workout_frequency === null ||
    !profile.goal_type
  ) {
    return { done: false };
  }

  const targets = calcTargets({
    sex: profile.sex as Sex,
    age: profile.age,
    heightCm: Number(profile.height_cm),
    weightKg: Number(profile.weight_kg),
    activityLevel: profile.activity_level as ActivityLevel,
    goalType: profile.goal_type as GoalType,
  });

  await patchProfile(memberId, {
    bmi: targets.bmi,
    bmr: targets.bmr,
    tdee: targets.tdee,
    calorie_target: targets.calorieTarget,
    protein_g_target: targets.proteinG,
    carb_g_target: targets.carbG,
    fat_g_target: targets.fatG,
    profile_completed_at: new Date().toISOString(),
  });

  const summary = [
    "基本分析完成了 🌿",
    "",
    `你的 BMI 約為 ${targets.bmi}，基礎代謝約 ${Math.round(targets.bmr)} 大卡，每日總消耗約 ${Math.round(targets.tdee)} 大卡。`,
    "",
    `以目前目標來看，可以先從每天約 ${targets.calorieTarget} 大卡開始，不需要一下子吃得很少。`,
    `蛋白質先以每天約 ${targets.proteinG} 克為目標；碳水約 ${targets.carbG} 克、脂肪約 ${targets.fatG} 克。`,
    "",
    "這些數字是起點，不是考試成績。之後我會依你的紀錄、飽足感和體重趨勢慢慢調整。",
    "",
    "傳食物照片或打字告訴我吃了什麼吧。",
    "",
    "本服務提供一般健康與熱量估算資訊，不取代醫師或營養師的診斷與治療。",
  ].join("\n");

  return { done: true, summary };
}
