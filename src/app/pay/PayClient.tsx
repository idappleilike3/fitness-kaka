"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";

export default function PayClient() {
  const sp = useSearchParams();

  useEffect(() => {
    const gateway = sp.get("gateway");
    const MerchantID = sp.get("MerchantID");
    const TradeInfo = sp.get("TradeInfo");
    const TradeSha = sp.get("TradeSha");
    const Version = sp.get("Version") ?? "2.0";
    if (!gateway || !MerchantID || !TradeInfo || !TradeSha) return;

    const form = document.createElement("form");
    form.method = "POST";
    form.action = gateway;
    const fields: Record<string, string> = {
      MerchantID,
      TradeInfo,
      TradeSha,
      Version,
    };
    for (const [k, v] of Object.entries(fields)) {
      const input = document.createElement("input");
      input.type = "hidden";
      input.name = k;
      input.value = v;
      form.appendChild(input);
    }
    document.body.appendChild(form);
    form.submit();
  }, [sp]);

  return (
    <main style={{ padding: "2rem", textAlign: "center" }}>
      <h1>健身卡卡教練</h1>
      <p>正在前往藍新付款頁…</p>
    </main>
  );
}
