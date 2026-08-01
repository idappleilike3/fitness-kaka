import { NextResponse } from "next/server";
import { verifyAndDecrypt } from "@/lib/newebpay/crypto";
import { applyNotifyPayment } from "@/services/subscribe";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(req: Request) {
  const contentType = req.headers.get("content-type") ?? "";
  let tradeInfo = "";
  let tradeSha = "";

  if (contentType.includes("application/json")) {
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
    return new NextResponse("0|ERROR", { status: 400 });
  }

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(verified.plain) as Record<string, unknown>;
  } catch {
    // sometimes plain is querystring
    payload = Object.fromEntries(new URLSearchParams(verified.plain));
  }

  const result = (payload.Result ?? payload) as Record<string, unknown>;
  const merchantOrderNo = String(
    result.MerchantOrderNo ?? payload.MerchantOrderNo ?? "",
  );
  const tradeNo = result.TradeNo ? String(result.TradeNo) : undefined;
  const status = String(result.Status ?? payload.Status ?? "");

  if (status && status !== "SUCCESS" && status !== "1") {
    return new NextResponse("1|OK");
  }

  await applyNotifyPayment({
    merchantOrderNo,
    tradeNo,
    payload,
  });

  return new NextResponse("1|OK");
}
