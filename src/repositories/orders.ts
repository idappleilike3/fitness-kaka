import { getAdminDb } from "@/lib/supabase/admin";

export async function getPlanPrice(planId: string): Promise<{
  price_twd: number;
  name: string;
  duration_days: number;
} | null> {
  const db = getAdminDb();
  const { data } = await db
    .from("plans")
    .select("price_twd, name, duration_days")
    .eq("id", planId)
    .maybeSingle();
  return data;
}

export function newMerchantOrderNo(): string {
  const d = new Date();
  const stamp = `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, "0")}${String(d.getUTCDate()).padStart(2, "0")}`;
  const rand = Math.random().toString(36).slice(2, 10).toUpperCase();
  return `KK${stamp}${rand}`;
}

export async function createPaymentOrder(params: {
  memberId: string;
  planId: string;
}): Promise<{
  id: string;
  merchant_order_no: string;
  amount_twd: number;
  itemDesc: string;
}> {
  const plan = await getPlanPrice(params.planId);
  if (!plan || plan.price_twd <= 0) throw new Error("invalid plan");

  const merchantOrderNo = newMerchantOrderNo();
  const db = getAdminDb();
  const { data, error } = await db
    .from("payment_orders")
    .insert({
      merchant_order_no: merchantOrderNo,
      member_id: params.memberId,
      plan_id: params.planId,
      amount_twd: plan.price_twd,
      status: "pending",
    })
    .select("id, merchant_order_no, amount_twd")
    .single();
  if (error || !data) throw new Error(error?.message ?? "order create failed");

  return {
    id: data.id,
    merchant_order_no: data.merchant_order_no,
    amount_twd: data.amount_twd,
    itemDesc: plan.name,
  };
}

export async function findOrderByMerchantNo(merchantOrderNo: string) {
  const db = getAdminDb();
  const { data } = await db
    .from("payment_orders")
    .select("*")
    .eq("merchant_order_no", merchantOrderNo)
    .maybeSingle();
  return data;
}

export async function markOrderPaid(params: {
  orderId: string;
  tradeNo?: string;
  payload?: unknown;
}): Promise<"applied" | "duplicate"> {
  const db = getAdminDb();
  const { data: order } = await db
    .from("payment_orders")
    .select("*")
    .eq("id", params.orderId)
    .single();
  if (!order) throw new Error("order missing");
  if (order.status === "paid") return "duplicate";

  await db
    .from("payment_orders")
    .update({
      status: "paid",
      paid_at: new Date().toISOString(),
      newebpay_trade_no: params.tradeNo ?? null,
      raw_return_payload: params.payload ?? null,
    })
    .eq("id", params.orderId);

  return "applied";
}

export async function insertCallback(params: {
  paymentOrderId?: string;
  merchantOrderNo: string;
  callbackType: "notify" | "return";
  verifyOk: boolean;
  isDuplicate: boolean;
  payload: unknown;
}): Promise<void> {
  const db = getAdminDb();
  await db.from("payment_callbacks").insert({
    payment_order_id: params.paymentOrderId ?? null,
    merchant_order_no: params.merchantOrderNo,
    callback_type: params.callbackType,
    verify_ok: params.verifyOk,
    is_duplicate: params.isDuplicate,
    payload: params.payload,
  });
}
