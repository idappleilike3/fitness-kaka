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
  health_context: string | null;
  eating_pattern: string | null;
  onboarding_skipped_at: string | null;
  calorie_target: number | null;
  protein_g_target: number | null;
  carb_g_target: number | null;
  fat_g_target: number | null;
  profile_completed_at: string | null;
};

const PREFERENCES_TITLE = "nutrition_onboarding_preferences";
const PREFERENCE_KEYS = new Set([
  "health_context",
  "eating_pattern",
  "onboarding_skipped_at",
]);

type PreferenceRow = {
  id: string;
  plan_json: Record<string, unknown> | null;
};

export async function getProfile(memberId: string): Promise<ProfileRow | null> {
  const db = getAdminDb();
  const { data, error } = await db
    .from("member_profiles")
    .select("*")
    .eq("member_id", memberId)
    .maybeSingle();
  if (error) {
    throw new Error(`Supabase profile read failed: ${error.message}`);
  }
  if (!data) return null;

  const { data: preference, error: preferenceError } = await db
    .from("workout_plans")
    .select("plan_json")
    .eq("member_id", memberId)
    .eq("title", PREFERENCES_TITLE)
    .maybeSingle();
  if (preferenceError) {
    throw new Error(`Supabase onboarding preference read failed: ${preferenceError.message}`);
  }

  return {
    ...(data as ProfileRow),
    health_context: (preference?.plan_json?.health_context as string | null) ?? null,
    eating_pattern: (preference?.plan_json?.eating_pattern as string | null) ?? null,
    onboarding_skipped_at:
      (preference?.plan_json?.onboarding_skipped_at as string | null) ?? null,
  };
}

export async function patchProfile(
  memberId: string,
  patch: Record<string, unknown>,
): Promise<void> {
  const db = getAdminDb();
  const profilePatch = Object.fromEntries(
    Object.entries(patch).filter(([key]) => !PREFERENCE_KEYS.has(key)),
  );
  const preferencePatch = Object.fromEntries(
    Object.entries(patch).filter(([key]) => PREFERENCE_KEYS.has(key)),
  );

  if (Object.keys(profilePatch).length > 0) {
    const { error } = await db
      .from("member_profiles")
      .update(profilePatch)
      .eq("member_id", memberId);
    if (error) {
      throw new Error(`Supabase profile update failed: ${error.message}`);
    }
  }

  if (Object.keys(preferencePatch).length > 0) {
    const { data: existing, error: readError } = await db
      .from("workout_plans")
      .select("id, plan_json")
      .eq("member_id", memberId)
      .eq("title", PREFERENCES_TITLE)
      .maybeSingle();
    if (readError) {
      throw new Error(`Supabase onboarding preference read failed: ${readError.message}`);
    }

    const planJson = {
      ...((existing as PreferenceRow | null)?.plan_json ?? {}),
      ...preferencePatch,
    };
    const result = existing
      ? await db.from("workout_plans").update({ plan_json: planJson }).eq("id", existing.id)
      : await db.from("workout_plans").insert({
          member_id: memberId,
          title: PREFERENCES_TITLE,
          plan_json: planJson,
        });
    if (result.error) {
      throw new Error(`Supabase onboarding preference update failed: ${result.error.message}`);
    }
  }
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
    || !profile.health_context
    || !profile.eating_pattern
  ) {
    return { done: false };
  }

  const targets = calcTargets({
    sex: profile.sex as Sex,
    age: profile.age,
    heightCm: Number(profile.height_cm),
    weightKg: Number(profile.weight_kg),
    activityLevel: profile.activity_level as ActivityLevel,
    goalType:
      profile.age < 18 || profile.health_context !== "none"
        ? "maintain"
        : (profile.goal_type as GoalType),
  });

  const needsSafetyBoundary =
    profile.age < 18 || profile.health_context !== "none";

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
    ...(needsSafetyBoundary
      ? [
          "你目前的狀況不套用一般減脂熱量，先以維持需求作為安全參考",
          "飲食與體重調整請先和醫師、營養師或合適的專業人員確認",
          "",
        ]
      : []),
    "接下來可以直接選一個開始：",
    "・拍照分析：傳一張餐點照片",
    "・今天還能吃多少：直接輸入這句查詢",
    "・記錄飲食：告訴我吃了什麼，確認後才會保存",
  ].join("\n");

  return { done: true, summary };
}
