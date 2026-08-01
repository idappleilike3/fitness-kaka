import { NextRequest, NextResponse } from "next/server";

import { hasAdminSession } from "@/lib/admin/auth";
import { normalizeMemberSearch } from "@/lib/admin/grant-plan";
import { toAdminMember } from "@/lib/admin/member-presentation";
import { getAdminDb } from "@/lib/supabase/admin";
import { resolveCurrentPlan } from "@/lib/subscriptions/current-plan";

export const runtime = "nodejs";

type SubscriptionRow = {
  member_id: string;
  plan_id: string;
  expires_at: string | null;
  status: string;
  starts_at: string;
  source_order_id: string | null;
};

export async function GET(req: NextRequest) {
  if (!hasAdminSession(req)) {
    return NextResponse.json({ error: "請先解鎖管理員功能" }, { status: 401 });
  }

  const query = normalizeMemberSearch(req.nextUrl.searchParams.get("q"));
  const db = getAdminDb();
  const membershipSearch = query
    ? await Promise.all([
        db
          .from("members")
          .select("id, display_name, line_user_id")
          .is("deleted_at", null)
          .ilike("display_name", `%${query}%`)
          .limit(20),
        db
          .from("members")
          .select("id, display_name, line_user_id")
          .is("deleted_at", null)
          .ilike("line_user_id", `%${query}%`)
          .limit(20),
      ])
    : null;
  if (membershipSearch?.some((result) => result.error)) {
    return NextResponse.json({ error: "搜尋會員失敗" }, { status: 500 });
  }

  const allMembers = query
    ? null
    : await db
        .from("members")
        .select("id, display_name, line_user_id")
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .limit(100);
  if (allMembers?.error) {
    return NextResponse.json({ error: "讀取會員資料失敗" }, { status: 500 });
  }
  const memberRows = query
    ? [
        ...(membershipSearch?.[0].data ?? []),
        ...(membershipSearch?.[1].data ?? []),
      ]
    : (allMembers?.data ?? []);
  const members = (memberRows ?? []).filter(
    (member, index, all) =>
      all.findIndex((candidate) => candidate.id === member.id) === index,
  );
  if (members.length === 0) return NextResponse.json({ members: [] });

  const subscriptionsResult = await db
    .from("subscriptions")
    .select("member_id, plan_id, expires_at, status, starts_at, source_order_id")
    .in("member_id", members.map((member) => member.id));
  const { data: subscriptions, error: subscriptionsError } = subscriptionsResult;
  if (subscriptionsError) {
    return NextResponse.json({ error: "讀取會員方案失敗" }, { status: 500 });
  }
  const memberIds = members.map((member) => member.id);
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Taipei",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  const [paymentsResult, challengesResult, mealsResult, quotasResult, operationsResult] =
    await Promise.all([
      db
        .from("payment_orders")
        .select("member_id, plan_id, amount_twd, status, paid_at, created_at")
        .in("member_id", memberIds)
        .order("created_at", { ascending: false }),
      db
        .from("member_challenges")
        .select("member_id, status, started_on, ends_on")
        .in("member_id", memberIds)
        .order("created_at", { ascending: false }),
      db
        .from("meal_records")
        .select("member_id")
        .in("member_id", memberIds)
        .eq("recorded_on", today),
      db
        .from("usage_quotas")
        .select("member_id, image_used, text_used, voice_used")
        .in("member_id", memberIds)
        .eq("quota_date", today),
      db
        .from("admin_operation_logs")
        .select("member_id, operation, plan_id, amount_twd, note, created_at")
        .in("member_id", memberIds)
        .order("created_at", { ascending: false }),
    ]);

  return NextResponse.json({
    members: members.map((member) => {
      const memberSubscriptions = ((subscriptions ?? []) as SubscriptionRow[]).filter(
        (subscription) => subscription.member_id === member.id,
      );
      const currentPlan = resolveCurrentPlan(memberSubscriptions);
      const current =
        currentPlan.planId === "free"
          ? null
          : {
              plan_id: currentPlan.planId,
              expires_at: currentPlan.expiresAt,
              status: "active",
            };
      const grantHistory = memberSubscriptions
        .filter((subscription) => subscription.plan_id !== "free")
        .sort(
          (a, b) =>
            new Date(b.starts_at).getTime() - new Date(a.starts_at).getTime(),
        )
        .map((subscription) => ({
          planId: subscription.plan_id,
          grantedAt: subscription.starts_at,
          expiresAt: subscription.expires_at,
          grantedBy: subscription.source_order_id ? "付款系統" : "管理員",
        }));
      const challenge = (challengesResult.data ?? []).find(
        (row) => row.member_id === member.id && row.status === "active",
      );
      const quota = (quotasResult.data ?? []).find(
        (row) => row.member_id === member.id,
      );
      return toAdminMember(member, current, grantHistory, {
        challenge: challenge
          ? {
              status: challenge.status,
              startedOn: challenge.started_on,
              endsOn: challenge.ends_on,
            }
          : null,
        todayMeals: (mealsResult.data ?? []).filter(
          (row) => row.member_id === member.id,
        ).length,
        todayQuota: quota
          ? {
              imageUsed: quota.image_used,
              textUsed: quota.text_used,
              voiceUsed: quota.voice_used,
            }
          : undefined,
        paymentHistory: (paymentsResult.data ?? [])
          .filter((row) => row.member_id === member.id)
          .slice(0, 10)
          .map((row) => ({
            planId: row.plan_id,
            amountTwd: row.amount_twd,
            status: row.status,
            paidAt: row.paid_at ?? row.created_at,
          })),
        operationHistory: (operationsResult.data ?? [])
          .filter((row) => row.member_id === member.id)
          .slice(0, 10)
          .map((row) => ({
            action: row.operation,
            planId: row.plan_id,
            amountTwd: row.amount_twd,
            note: row.note,
            createdAt: row.created_at,
          })),
      });
    }),
  });
}
