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
    "建檔完成！你的每日目標",
    `BMI ${targets.bmi}｜BMR ${Math.round(targets.bmr)}｜TDEE ${Math.round(targets.tdee)}`,
    `熱量 ${targets.calorieTarget} kcal`,
    `蛋白質 ${targets.proteinG}g｜碳水 ${targets.carbG}g｜脂肪 ${targets.fatG}g`,
    "",
    "傳食物照片或打字告訴我吃了什麼吧",
  ].join("\n");

  return { done: true, summary };
}
