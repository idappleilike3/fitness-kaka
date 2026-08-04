import { NextResponse } from "next/server";
import { getTodaySummary } from "@/repositories/meals";
import { getProfile } from "@/repositories/profiles";
import { getAdminDb } from "@/lib/supabase/admin";
import { resolveCurrentPlan } from "@/lib/subscriptions/current-plan";
import { getChallengeStatus } from "@/repositories/challenges";
import { calculateHealthScore } from "@/services/challenge";

export const runtime = "nodejs";

function remainingDays(expiresAt: string | null): number | null {
  if (!expiresAt) return null;
  const end = new Date(expiresAt).getTime();
  if (!Number.isFinite(end)) return null;
  return Math.max(0, Math.ceil((end - Date.now()) / 86_400_000));
}

export async function GET(req: Request) {
  const lineUserId = new URL(req.url).searchParams.get("lineUserId")?.trim();
  if (!lineUserId) {
    return NextResponse.json({ error: "缺少 LINE 使用者資料" }, { status: 400 });
  }

  const db = getAdminDb();
  const { data: member, error: memberError } = await db
    .from("members")
    .select("id")
    .eq("line_user_id", lineUserId)
    .is("deleted_at", null)
    .maybeSingle();
  if (memberError) {
    return NextResponse.json({ error: `會員資料讀取失敗：${memberError.message}` }, { status: 500 });
  }
  if (!member) {
    return NextResponse.json({ error: "尚未建立會員資料，請先完成 LINE 會員登入。" }, { status: 404 });
  }

  const [profile, today, subscriptionResult, recentResult] = await Promise.all([
    getProfile(member.id),
    getTodaySummary(member.id),
    db
      .from("subscriptions")
      .select("plan_id, status, expires_at")
      .eq("member_id", member.id)
      .eq("status", "active"),
    db
      .from("daily_nutrition_summary")
      .select("summary_date,total_kcal,protein_g,carb_g,fat_g")
      .eq("member_id", member.id)
      .order("summary_date", { ascending: false })
      .limit(14),
  ]);

  const calorieTarget = Number(profile?.calorie_target) || 0;
  const proteinTarget = Number(profile?.protein_g_target) || 0;
  const todayKcal = Math.round(Number(today.total_kcal) || 0);
  const todayProtein = Math.round(Number(today.protein_g) || 0);
  const currentPlan = resolveCurrentPlan(subscriptionResult.data ?? []);
  const healthScore = calculateHealthScore({
    totalKcal: todayKcal,
    proteinG: todayProtein,
    calorieTarget,
    proteinTarget,
  });
  const challenge = await getChallengeStatus(member.id).catch(() => ({
    day: 0,
    missionTitle: null,
    missionDescription: null,
    missionCompleted: false,
    streakDays: 0,
  }));

  const recentRecords = (recentResult.data ?? []).map((record) => ({
    date: String(record.summary_date),
    kcal: Math.round(Number(record.total_kcal) || 0),
    proteinG: Math.round(Number(record.protein_g) || 0),
    carbG: Math.round(Number(record.carb_g) || 0),
    fatG: Math.round(Number(record.fat_g) || 0),
  }));

  return NextResponse.json({
    calorieTarget,
    proteinTarget,
    todayKcal,
    todayProtein,
    remainingKcal: Math.max(0, calorieTarget - todayKcal),
    planId: currentPlan.planId,
    expiresAt: currentPlan.expiresAt,
    remainingDays: remainingDays(currentPlan.expiresAt),
    healthScore,
    challenge,
    recentRecords,
  });
}
