import { pushText } from "@/lib/line/client";
import { getAdminDb } from "@/lib/supabase/admin";
import {
  findOrderByMerchantNo,
  insertCallback,
  markOrderPaid,
} from "@/repositories/orders";

export async function extendSubscriptionAfterPayment(params: {
  memberId: string;
  planId: string;
  orderId: string;
  durationDays: number;
}): Promise<Date> {
  const db = getAdminDb();
  const now = new Date();
  const { data: existing } = await db
    .from("subscriptions")
    .select("*")
    .eq("member_id", params.memberId)
    .eq("plan_id", params.planId)
    .eq("status", "active")
    .maybeSingle();

  let expires: Date;
  if (existing?.expires_at && new Date(existing.expires_at) > now) {
    expires = new Date(existing.expires_at);
    expires.setUTCDate(expires.getUTCDate() + params.durationDays);
    await db
      .from("subscriptions")
      .update({
        expires_at: expires.toISOString(),
        source_order_id: params.orderId,
      })
      .eq("id", existing.id);
  } else {
    expires = new Date(now);
    expires.setUTCDate(expires.getUTCDate() + params.durationDays);
    await db.from("subscriptions").insert({
      member_id: params.memberId,
      plan_id: params.planId,
      status: "active",
      starts_at: now.toISOString(),
      expires_at: expires.toISOString(),
      source_order_id: params.orderId,
    });
  }
  return expires;
}

export async function applyNotifyPayment(params: {
  merchantOrderNo: string;
  tradeNo?: string;
  payload: unknown;
  lineUserId?: string;
}): Promise<{ ok: boolean; duplicate?: boolean }> {
  const order = await findOrderByMerchantNo(params.merchantOrderNo);
  if (!order) {
    await insertCallback({
      merchantOrderNo: params.merchantOrderNo,
      callbackType: "notify",
      verifyOk: true,
      isDuplicate: false,
      payload: params.payload,
    });
    return { ok: false };
  }

  const result = await markOrderPaid({
    orderId: order.id,
    tradeNo: params.tradeNo,
    payload: params.payload,
  });

  await insertCallback({
    paymentOrderId: order.id,
    merchantOrderNo: params.merchantOrderNo,
    callbackType: "notify",
    verifyOk: true,
    isDuplicate: result === "duplicate",
    payload: params.payload,
  });

  if (result === "duplicate") return { ok: true, duplicate: true };

  const db = getAdminDb();
  const { data: plan } = await db
    .from("plans")
    .select("duration_days")
    .eq("id", order.plan_id)
    .single();

  const expires = await extendSubscriptionAfterPayment({
    memberId: order.member_id,
    planId: order.plan_id,
    orderId: order.id,
    durationDays: plan?.duration_days ?? 30,
  });

  const { data: member } = await db
    .from("members")
    .select("line_user_id")
    .eq("id", order.member_id)
    .single();

  if (member?.line_user_id) {
    const dateStr = expires.toLocaleDateString("zh-TW", {
      timeZone: "Asia/Taipei",
    });
    try {
      await pushText(
        member.line_user_id,
        `付款成功！會員效期至 ${dateStr}，開始好好紀錄飲食吧`,
      );
    } catch {
      /* ignore push errors */
    }
  }

  return { ok: true };
}
