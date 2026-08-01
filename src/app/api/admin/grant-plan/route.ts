import { NextRequest, NextResponse } from "next/server";

import { hasAdminSession, hasTrustedOrigin } from "@/lib/admin/auth";
import {
  addDaysFromLatestExpiry,
  maskLineUserId,
  validateGrantPlanId,
} from "@/lib/admin/grant-plan";
import { getAdminDb } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  if (!hasAdminSession(req)) {
    return NextResponse.json({ error: "請先解鎖管理員功能" }, { status: 401 });
  }
  if (!hasTrustedOrigin(req)) {
    return NextResponse.json({ error: "不允許此來源的請求" }, { status: 403 });
  }

  const body = (await req.json().catch(() => null)) as {
    memberId?: unknown;
    planId?: unknown;
  } | null;
  const memberId =
    typeof body?.memberId === "string" ? body.memberId.trim() : "";
  const planId = validateGrantPlanId(body?.planId);
  if (!memberId || !planId) {
    return NextResponse.json({ error: "會員或方案無效" }, { status: 400 });
  }

  const db = getAdminDb();
  const [{ data: member, error: memberError }, { data: plan, error: planError }] =
    await Promise.all([
      db
        .from("members")
        .select("id, display_name, line_user_id")
        .eq("id", memberId)
        .is("deleted_at", null)
        .maybeSingle(),
      db
        .from("plans")
        .select("id, duration_days, is_active")
        .eq("id", planId)
        .maybeSingle(),
    ]);
  if (memberError || !member) {
    return NextResponse.json({ error: "找不到會員" }, { status: 404 });
  }
  if (planError || !plan || !plan.is_active || plan.duration_days <= 0) {
    return NextResponse.json({ error: "方案目前不可開通" }, { status: 400 });
  }

  const { data: existing, error: existingError } = await db
    .from("subscriptions")
    .select("id, expires_at")
    .eq("member_id", member.id)
    .eq("plan_id", planId)
    .eq("status", "active")
    .order("expires_at", { ascending: false, nullsFirst: false })
    .limit(1)
    .maybeSingle();
  if (existingError) {
    return NextResponse.json({ error: "讀取既有方案失敗" }, { status: 500 });
  }

  const grantedAt = new Date();
  const expiresAt = addDaysFromLatestExpiry(
    grantedAt,
    existing?.expires_at,
    plan.duration_days,
  ).toISOString();
  const { error: writeError } = await db.from("subscriptions").insert({
    member_id: member.id,
    plan_id: planId,
    status: "active",
    starts_at: grantedAt.toISOString(),
    expires_at: expiresAt,
  });
  if (writeError) {
    return NextResponse.json({ error: "開通方案失敗" }, { status: 500 });
  }
  await db.from("admin_operation_logs").insert({
    member_id: member.id,
    operation: "grant_plan",
    plan_id: planId,
    metadata: { grantedAt: grantedAt.toISOString(), expiresAt },
  });
  if (existing) {
    const { error: supersedeError } = await db
      .from("subscriptions")
      .update({ status: "superseded" })
      .eq("id", existing.id);
    if (supersedeError) {
      return NextResponse.json({ error: "更新舊方案紀錄失敗" }, { status: 500 });
    }
  }

  return NextResponse.json({
    member: {
      displayName: member.display_name ?? "未設定名稱",
      lineUserIdMasked: maskLineUserId(member.line_user_id),
    },
    planId,
    grantedAt: grantedAt.toISOString(),
    expiresAt,
  });
}
