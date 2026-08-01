import { NextResponse } from "next/server";
import { getTodaySummary } from "@/repositories/meals";
import { getProfile } from "@/repositories/profiles";
import { getAdminDb } from "@/lib/supabase/admin";
import { resolveCurrentPlan } from "@/lib/subscriptions/current-plan";
import { getChallengeStatus } from "@/repositories/challenges";
import { calculateHealthScore } from "@/services/challenge";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const lineUserId = new URL(req.url).searchParams.get("lineUserId");
  if (!lineUserId) {
    return NextResponse.json({ error: "lineUserId required" }, { status: 400 });
  }

  const db = getAdminDb();
  const { data: member } = await db
    .from("members")
    .select("id")
    .eq("line_user_id", lineUserId)
    .maybeSingle();
  if (!member) {
    return NextResponse.json({ error: "member not found" }, { status: 404 });
  }

  const profile = await getProfile(member.id);
  const today = await getTodaySummary(member.id);
  const calorieTarget = profile?.calorie_target ?? 0;
  const proteinTarget = profile?.protein_g_target ?? 0;
  const todayKcal = Number(today.total_kcal) || 0;
  const todayProtein = Math.round(Number(today.protein_g) || 0);

  const { data: subs } = await db
    .from("subscriptions")
    .select("plan_id, status, expires_at")
    .eq("member_id", member.id)
    .eq("status", "active");

  const currentPlan = resolveCurrentPlan(subs ?? []);
  const { data: menuOrder } = await db
    .from("menu_orders")
    .select("id, status, revision_count")
    .eq("member_id", member.id)
    .not("status", "in", "(refunded)")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
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

  return NextResponse.json({
    calorieTarget,
    proteinTarget,
    todayKcal,
    todayProtein,
    remainingKcal: Math.max(0, calorieTarget - todayKcal),
    planId: currentPlan.planId,
    expiresAt: currentPlan.expiresAt,
    menuOrder: menuOrder ?? null,
    healthScore,
    challenge,
  });
}
