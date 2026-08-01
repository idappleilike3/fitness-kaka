import { NextResponse } from "next/server";
import { getAppOnlyEnv } from "@/lib/env";
import { verifyAndDecrypt } from "@/lib/newebpay/crypto";
import { findOrderByMerchantNo, insertCallback } from "@/repositories/orders";

export const runtime = "nodejs";

async function handleReturn(req: Request) {
  const env = getAppOnlyEnv();
  const contentType = req.headers.get("content-type") ?? "";
  let tradeInfo = "";
  let tradeSha = "";

  if (req.method === "GET") {
    const url = new URL(req.url);
    tradeInfo = url.searchParams.get("TradeInfo") ?? "";
    tradeSha = url.searchParams.get("TradeSha") ?? "";
  } else if (contentType.includes("application/json")) {
    const json = (await req.json()) as {
      TradeInfo?: string;
      TradeSha?: string;
    };
    tradeInfo = json.TradeInfo ?? "";
    tradeSha = json.TradeSha ?? "";
  } else {
    const form = await req.formData();
    tradeInfo = String(form.get("TradeInfo") ?? "");
    tradeSha = String(form.get("TradeSha") ?? "");
  }

  const verified = verifyAndDecrypt(tradeInfo, tradeSha);
  if (!verified.ok) {
    return NextResponse.redirect(`${env.PUBLIC_BASE_URL}/payment/failed`);
  }

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(verified.plain) as Record<string, unknown>;
  } catch {
    payload = Object.fromEntries(new URLSearchParams(verified.plain));
  }
  const result = (payload.Result ?? payload) as Record<string, unknown>;
  const merchantOrderNo = String(
    result.MerchantOrderNo ?? payload.MerchantOrderNo ?? "",
  );

  const order = await findOrderByMerchantNo(merchantOrderNo);
  await insertCallback({
    paymentOrderId: order?.id,
    merchantOrderNo,
    callbackType: "return",
    verifyOk: true,
    isDuplicate: false,
    payload,
  });

  // Authority is Notify — Return only displays DB status
  if (order?.status === "paid") {
    return NextResponse.redirect(`${env.PUBLIC_BASE_URL}/payment/success`);
  }
  return NextResponse.redirect(`${env.PUBLIC_BASE_URL}/payment/failed`);
}

export async function GET(req: Request) {
  return handleReturn(req);
}

export async function POST(req: Request) {
  return handleReturn(req);
}
