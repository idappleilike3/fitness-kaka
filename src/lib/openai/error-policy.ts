export type AiFailureKind = "quota" | "rate_limit" | "auth" | "timeout" | "server" | "invalid_image" | "unknown";

export function classifyAiFailure(err: unknown): AiFailureKind {
  const anyErr = err as { status?: number; code?: string; type?: string; message?: string };
  const status = anyErr?.status;
  const code = `${anyErr?.code ?? ""} ${anyErr?.type ?? ""} ${anyErr?.message ?? ""}`.toLowerCase();
  if (/insufficient_quota|billing|credit|quota exceeded/.test(code)) return "quota";
  if (status === 429 || /rate limit/.test(code)) return "rate_limit";
  if (status === 401 || status === 403 || /api key|unauthorized|forbidden/.test(code)) return "auth";
  if (/timeout|timed out|abort/.test(code)) return "timeout";
  if ((status ?? 0) >= 500) return "server";
  if (/image|mime|format|decode/.test(code)) return "invalid_image";
  return "unknown";
}

export function aiFailureUserMessage(kind: AiFailureKind): string {
  switch (kind) {
    case "quota":
      return "我剛剛暫時沒有完成圖片分析，不是你的照片有問題。這次不會扣使用次數；你可以稍後再傳一次，或先用文字告訴我餐點內容。\n\n慢慢來，我們換個方式也能繼續。";
    case "rate_limit":
      return "現在同時分析的人比較多，我剛剛還沒來得及看完。這次不會扣使用次數，請稍後再試，或先用文字告訴我吃了什麼。\n\n謝謝你等我一下，我們很快再繼續。";
    case "auth":
      return "圖片分析目前暫時無法使用，這次不會扣使用次數。你可以先用文字告訴我餐點，我仍然能幫你估算。\n\n不用擔心，我們先用另一個方式完成今天的紀錄。";
    case "invalid_image":
      return "這張圖片目前沒有成功讀取，可能是傳輸或格式不完整。可以重新傳原圖，或直接告訴我餐點有哪些食物。\n\n不用擔心，我會陪你把這餐記錄完成。";
    default:
      return "我剛剛在分析時中斷了，這次不會扣使用次數。可以稍後再試，或先用文字告訴我餐點內容。\n\n沒關係，我們換一個方式也可以繼續。";
  }
}

export function aiFailureAdminReason(kind: AiFailureKind): string {
  const map: Record<AiFailureKind, string> = {
    quota: "OpenAI API 額度或帳務限制，需立即檢查餘額、付款方式與用量上限",
    rate_limit: "OpenAI API 请求过多或速率限制，系统应延迟重试并限制并发",
    auth: "OpenAI API 金钥无效、被撤销或项目权限不足",
    timeout: "OpenAI API 请求逾时，建议保留任务并稍后重试",
    server: "OpenAI 服务端暂时异常，建议自动重试并观察恢复",
    invalid_image: "图片格式、大小或传输内容无法读取",
    unknown: "未分类的 AI 分析错误，请查看原始错误信息",
  };
  return map[kind];
}
