import { NextRequest, NextResponse } from "next/server";

import { hasAdminSession, hasTrustedOrigin } from "@/lib/admin/auth";
import { addDaysFromLatestExpiry } from "@/lib/admin/grant-plan";
import { parseMemberOperation } from "@/lib/admin/member-operations";
import { getAdminDb } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  if (!hasAdminSession(req)) {
    return NextResponse.json({ error: "請先登入管理後台" }, { status: 401 });
  }
  if (!hasTrustedOrigin(req)) {
    return NextResponse.json({ error: "不允許此來源的請求" }, { status: 403 });
  }
  const operation = parseMemberOperation(await req.json().catch(() => null));
  if (!operation) {
    return NextResponse.json({ error: "操作資料無效" }, { status: 400 });
  }

  const db = getAdminDb();
  const { data: member, error: memberError } = await db
    .from("members")
    .select("id")
    .eq("id", operation.memberId)
    .is("deleted_at", null)
    .maybeSingle();
  if (memberError || !member) {
    return NextResponse.json({ error: "找不到會員" }, { status: 404 });
  }

  if (operation.action === "record_payment") {
    const { data: plan, error: planError } = await db
      .from("plans")
      .select("duration_days, is_active")
      .eq("id", operation.planId)
      .maybeSingle();
    if (planError || !plan?.is_active || plan.duration_days <= 0) {
      return NextResponse.json({ error: "方案目前不可開通" }, { status: 400 });
    }
    const now = new Date();
    const { data: active } = await db
      .from("subscriptions")
      .select("expires_at")
      .eq("member_id", member.id)
      .eq("status", "active")
      .order("expires_at", { ascending: false, nullsFirst: false })
      .limit(1)
      .maybeSingle();
    const expiresAt = addDaysFromLatestExpiry(
      now,
      active?.expires_at,
      plan.duration_days,
    ).toISOString();
    const orderNumber = `MANUAL-${Date.now()}-${member.id.slice(0, 8)}`;
    const { data: order, error: orderError } = await db
      .from("payment_orders")
      .insert({
        merchant_order_no: orderNumber,
        member_id: member.id,
        plan_id: operation.planId,
        amount_twd: operation.amountTwd,
        status: "paid",
        paid_at: now.toISOString(),
      })
      .select("id")
      .single();
    if (orderError || !order) {
      return NextResponse.json({ error: "付款紀錄建立失敗" }, { status: 500 });
    }
    const { error: subscriptionError } = await db.from("subscriptions").insert({
      member_id: member.id,
      plan_id: operation.planId,
      status: "active",
      starts_at: now.toISOString(),
      expires_at: expiresAt,
      source_order_id: order.id,
    });
    if (subscriptionError) {
      return NextResponse.json({ error: "方案開通失敗" }, { status: 500 });
    }
    await db.from("admin_operation_logs").insert({
      member_id: member.id,
      operation: operation.action,
      plan_id: operation.planId,
      amount_twd: operation.amountTwd,
      note: operation.note,
      metadata: { orderId: order.id, expiresAt },
    });
    return NextResponse.json({ ok: true, expiresAt });
  }

  const { data: subscription, error: subscriptionError } = await db
    .from("subscriptions")
    .select("id, plan_id, status, expires_at")
    .eq("member_id", member.id)
    .in("status", ["active", "paused"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (subscriptionError || !subscription) {
    return NextResponse.json({ error: "找不到可操作的付費方案" }, { status: 404 });
  }

  let update: { status: string } | { expires_at: string };
  if (operation.action === "pause") {
    update = { status: "paused" };
  } else if (operation.action === "resume") {
    update = { status: "active" };
  } else {
    update = {
      expires_at: addDaysFromLatestExpiry(
        new Date(),
        subscription.expires_at,
        operation.days,
      ).toISOString(),
    };
  }
  const { error: updateError } = await db
    .from("subscriptions")
    .update(update)
    .eq("id", subscription.id);
  if (updateError) {
    return NextResponse.json({ error: "更新方案失敗" }, { status: 500 });
  }
  await db.from("admin_operation_logs").insert({
    member_id: member.id,
    operation: operation.action,
    plan_id: subscription.plan_id,
    note: operation.note,
    metadata: update,
  });
  return NextResponse.json({ ok: true, ...update });
}
