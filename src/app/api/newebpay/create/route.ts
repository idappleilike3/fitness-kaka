import { NextResponse } from "next/server";
import { buildMpgForm } from "@/lib/newebpay/mpg";
import { getAdminDb } from "@/lib/supabase/admin";
import { createPaymentOrder } from "@/repositories/orders";

export const runtime = "nodejs";

const SELLABLE_PLANS = new Set([
  "plan_299",
  "plan_399",
  "plan_799",
  "plan_3590",
  "plan_7190",
]);

/**
 * Body: { lineUserId: string, planId?: "plan_299" | "plan_399" | "plan_799" | "plan_3590" | "plan_7190" }
 * Amount always from DB plans.price_twd
 */
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      lineUserId?: string;
      planId?: string;
    };
    if (!body.lineUserId) {
      return NextResponse.json({ error: "lineUserId required" }, { status: 400 });
    }
    const planId = body.planId ?? "plan_399";
    if (!SELLABLE_PLANS.has(planId)) {
      return NextResponse.json(
        {
          error:
            "unsupported planId; sellable: plan_299, plan_399, plan_799, plan_3590, plan_7190",
        },
        { status: 400 },
      );
    }

    const db = getAdminDb();
    const { data: member } = await db
      .from("members")
      .select("id")
      .eq("line_user_id", body.lineUserId)
      .maybeSingle();
    if (!member) {
      return NextResponse.json({ error: "member not found" }, { status: 404 });
    }

    const { data: planRow } = await db
      .from("plans")
      .select("id, is_active, price_twd")
      .eq("id", planId)
      .maybeSingle();
    if (!planRow?.is_active || !planRow.price_twd || planRow.price_twd <= 0) {
      return NextResponse.json({ error: "plan not sellable" }, { status: 400 });
    }

    const order = await createPaymentOrder({
      memberId: member.id,
      planId,
    });
    const form = buildMpgForm({
      merchantOrderNo: order.merchant_order_no,
      amountTwd: order.amount_twd,
      itemDesc: order.itemDesc,
    });

    return NextResponse.json({
      payUrl: `/pay?MerchantID=${encodeURIComponent(form.MerchantID)}&TradeInfo=${encodeURIComponent(form.TradeInfo)}&TradeSha=${encodeURIComponent(form.TradeSha)}&Version=${encodeURIComponent(form.Version)}&gateway=${encodeURIComponent(form.gatewayUrl)}`,
      merchantOrderNo: order.merchant_order_no,
      amountTwd: order.amount_twd,
      form,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "create failed" },
      { status: 500 },
    );
  }
}
