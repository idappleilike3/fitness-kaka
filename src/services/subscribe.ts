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

  let expires: Date | null = null;
  if (order.plan_id === "plan_299") {
    const { data: existingMenu } = await db
      .from("menu_orders")
      .select("id")
      .eq("payment_order_id", order.id)
      .maybeSingle();
    if (!existingMenu) {
      const { error: menuError } = await db.from("menu_orders").insert({
        member_id: order.member_id,
        payment_order_id: order.id,
        status: "awaiting_profile",
      });
      if (menuError) throw new Error(`建立 299 菜单订单失败: ${menuError.message}`);
    }
  } else {
    expires = await extendSubscriptionAfterPayment({
      memberId: order.member_id,
      planId: order.plan_id,
      orderId: order.id,
      durationDays: plan?.duration_days ?? 30,
    });
  }

  const { data: member } = await db
    .from("members")
    .select("line_user_id")
    .eq("id", order.member_id)
    .single();

  if (member?.line_user_id) {
    try {
      if (order.plan_id === "plan_299") {
        const baseUrl = process.env.PUBLIC_BASE_URL?.replace(/\/$/, "") ?? "";
        const menuUrl = `${baseUrl}/menu-plan?lineUserId=${encodeURIComponent(member.line_user_id)}`;
        await pushText(
          member.line_user_id,
          `付款成功 🌿 你的 7 天个人化菜单已经开放。先花一点时间填写饮食问卷，我会依你的热量、蛋白质和生活方式帮你安排。\n\n${menuUrl}\n\n不用追求每餐完美，我们会从你做得到的方式开始。❤️`,
        );
      } else if (expires) {
        const dateStr = expires.toLocaleDateString("zh-TW", { timeZone: "Asia/Taipei" });
        await pushText(
          member.line_user_id,
          `付款成功！会员效期至 ${dateStr}。不用一下做到完美，我们每天慢慢调整就好。❤️`,
        );
      }
    } catch {
      /* ignore push errors */
    }
  }

  return { ok: true };
}
