import { getAppOnlyEnv, getNewebpayEnv } from "@/lib/env";
import { encryptTradeInfo, sha256TradeSha } from "@/lib/newebpay/crypto";

export function getGatewayUrl(): string {
  const env = getNewebpayEnv();
  if (env.NEWEBPAY_GATEWAY_URL) return env.NEWEBPAY_GATEWAY_URL;
  return env.NEWEBPAY_MODE === "production"
    ? "https://core.newebpay.com/MPG/mpg_gateway"
    : "https://ccore.newebpay.com/MPG/mpg_gateway";
}

export function buildMpgForm(params: {
  merchantOrderNo: string;
  amountTwd: number;
  itemDesc: string;
  email?: string;
}): {
  gatewayUrl: string;
  MerchantID: string;
  TradeInfo: string;
  TradeSha: string;
  Version: string;
} {
  const pay = getNewebpayEnv();
  const app = getAppOnlyEnv();
  const tradeInfoObj: Record<string, string | number> = {
    MerchantID: pay.NEWEBPAY_MERCHANT_ID,
    RespondType: "JSON",
    TimeStamp: Math.floor(Date.now() / 1000),
    Version: "2.0",
    MerchantOrderNo: params.merchantOrderNo,
    Amt: params.amountTwd,
    ItemDesc: params.itemDesc,
    NotifyURL: `${app.PUBLIC_BASE_URL}/api/newebpay/notify`,
    ReturnURL: `${app.PUBLIC_BASE_URL}/api/newebpay/return`,
  };
  if (params.email) tradeInfoObj.Email = params.email;

  const plain = Object.entries(tradeInfoObj)
    .map(([k, v]) => `${k}=${v}`)
    .join("&");

  const tradeInfo = encryptTradeInfo(plain);
  const tradeSha = sha256TradeSha(tradeInfo);

  return {
    gatewayUrl: getGatewayUrl(),
    MerchantID: pay.NEWEBPAY_MERCHANT_ID,
    TradeInfo: tradeInfo,
    TradeSha: tradeSha,
    Version: "2.0",
  };
}
