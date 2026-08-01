import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/supabase/admin";
import { pushText } from "@/lib/line/client";
import { decideEngagement, type EngagementPlan } from "@/services/engagement-policy";
import { decideSalesFunnel } from "@/services/sales-funnel";
import { markPlanRecommended, type MemberSalesProfile } from "@/repositories/sales-profiles";
import { detectCareSignals } from "@/services/care-monitor";
import { notifyAdmins } from "@/lib/line/admin-notifier";

function authorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return request.headers.get("authorization") === `Bearer ${secret}`;
}
function taipeiHour(now = new Date()): number {
  return Number(new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Taipei", hour: "2-digit", hour12: false }).format(now));
}
function taipeiDate(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Taipei", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}
function diffDays(from: string | null | undefined, to = new Date()): number | null {
  if (!from) return null;
  return Math.max(0, Math.floor((to.getTime() - new Date(from).getTime()) / 86_400_000));
}

export async function GET(request: Request) {
  if (!authorized(request)) return NextResponse.json({ error: "未授权" }, { status: 401 });
  const db = getAdminDb();
  const today = taipeiDate();
  const hour = taipeiHour();
  const { data: members, error } = await db.from("members").select("id,line_user_id,display_name,created_at,status").eq("status", "active").is("deleted_at", null).limit(1000);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  let sent = 0, skipped = 0, failed = 0;
  for (const member of members ?? []) {
    try {
      const [{ data: profile }, { data: subscriptions }, { data: lastMeal }, { count: mealsToday }, { count: mealsLast7Days }, { data: salesProfile }, { data: recentSummaries }] = await Promise.all([
        db.from("member_profiles").select("profile_completed_at,calorie_target").eq("member_id", member.id).maybeSingle(),
        db.from("subscriptions").select("plan_id,starts_at").eq("member_id", member.id).eq("status", "active").order("starts_at", { ascending: false }).limit(5),
        db.from("meal_records").select("created_at").eq("member_id", member.id).order("created_at", { ascending: false }).limit(1).maybeSingle(),
        db.from("meal_records").select("id", { count: "exact", head: true }).eq("member_id", member.id).eq("recorded_on", today),
        db.from("meal_records").select("id", { count: "exact", head: true }).eq("member_id", member.id).gte("created_at", new Date(Date.now() - 7 * 86_400_000).toISOString()),
        db.from("member_sales_profiles").select("*").eq("member_id", member.id).maybeSingle(),
        db.from("daily_nutrition_summary").select("summary_date,total_kcal").eq("member_id", member.id).order("summary_date", { ascending: false }).limit(3),
      ]);
      const plan = ((subscriptions ?? []).find((s) => s.plan_id !== "free")?.plan_id ?? "free") as EngagementPlan;
      const calorieTarget = Number(profile?.calorie_target ?? 0);
      const intakeRatios = calorieTarget > 0
        ? (recentSummaries ?? []).map((item) => Number(item.total_kcal ?? 0) / calorieTarget)
        : [];
      const lowIntakeConsecutiveDays = intakeRatios.findIndex((ratio) => ratio >= 0.6) === -1
        ? intakeRatios.length
        : intakeRatios.findIndex((ratio) => ratio >= 0.6);
      const averageIntakeRatio = intakeRatios.length
        ? intakeRatios.reduce((sum, ratio) => sum + ratio, 0) / intakeRatios.length
        : null;
      const careSignals = detectCareSignals({
        memberName: member.display_name,
        daysSinceLastMeal: diffDays(lastMeal?.created_at),
        lowIntakeConsecutiveDays,
        averageIntakeRatio,
      });
      let highRiskCareMessage: string | null = null;
      for (const signal of careSignals) {
        const { data: existingAlert } = await db
          .from("care_alerts")
          .select("id")
          .eq("member_id", member.id)
          .eq("alert_type", signal.type)
          .eq("dedupe_key", signal.dedupeKey)
          .in("status", ["pending", "in_progress"])
          .maybeSingle();
        if (!existingAlert) {
          const { error: alertError } = await db.from("care_alerts").insert({
            member_id: member.id,
            alert_type: signal.type,
            severity: signal.severity,
            reason: signal.reason,
            evidence: signal.evidence,
            member_reply: signal.memberReply,
            admin_recommendation: signal.adminRecommendation,
            dedupe_key: signal.dedupeKey,
          });
          if (!alertError) {
            await notifyAdmins(`【健身卡卡关怀提醒】\n会员：${member.display_name || member.line_user_id}\n原因：${signal.reason}\n建议：${signal.adminRecommendation}\n\n请先关心，不要在这次讯息中硬推方案。`);
          }
        }
        if (signal.severity === "high") highRiskCareMessage = signal.memberReply;
      }
      const engagement = decideEngagement({ planId: plan, profileCompleted: Boolean(profile?.profile_completed_at), daysSinceJoined: diffDays(member.created_at) ?? 0, daysSinceLastMeal: diffDays(lastMeal?.created_at), mealsToday: mealsToday ?? 0, localHour: hour, displayName: member.display_name });
      let decision = highRiskCareMessage
        ? { key: "care_low_intake", message: highRiskCareMessage }
        : engagement;
      let salesDecision: ReturnType<typeof decideSalesFunnel> | null = null;

      // Sales nurture only runs in the evening window and never overrides care/onboarding.
      if (!highRiskCareMessage && (!engagement || engagement.key === "free_value_tip") && hour >= 19 && hour <= 22 && salesProfile) {
        salesDecision = decideSalesFunnel({
          profile: salesProfile as MemberSalesProfile,
          profileCompleted: Boolean(profile?.profile_completed_at),
          mealsLast7Days: mealsLast7Days ?? 0,
          daysSinceLastMeal: diffDays(lastMeal?.created_at),
          currentPlanId: plan,
        });
        if (salesDecision.shouldSend && salesDecision.message) {
          decision = { key: salesDecision.key, message: salesDecision.message };
        }
        await db.from("member_followups").upsert({
          member_id: member.id,
          opportunity_stage: salesDecision.stage,
          recommended_next_step: salesDecision.reason,
          due_at: salesDecision.nextFollowupAt,
          status: salesDecision.stage === "paused" ? "snoozed" : "open",
          updated_at: new Date().toISOString(),
        }, { onConflict: "member_id" });
      }

      if (!decision) { skipped++; continue; }
      const eventKey = `${today}:${decision.key}`;
      const { data: existing } = await db.from("member_automation_events").select("id").eq("member_id", member.id).eq("event_key", eventKey).maybeSingle();
      if (existing) { skipped++; continue; }
      await pushText(member.line_user_id, decision.message);
      await db.from("member_automation_events").insert({ member_id: member.id, event_key: eventKey, event_type: decision.key, status: "sent", payload: { plan, hour, sales: salesDecision } });
      if (salesDecision?.recommendedPlan) await markPlanRecommended(member.id, salesDecision.recommendedPlan);
      sent++;
    } catch (err) {
      failed++;
      await db.from("system_error_events").insert({ source: "member_engagement_cron", severity: "medium", error_message: err instanceof Error ? err.message : String(err), metadata: { member_id: member.id } });
    }
  }
  return NextResponse.json({ ok: true, sent, skipped, failed, processed: members?.length ?? 0 });
}
