import { getAdminDb } from "@/lib/supabase/admin";

export async function ensureEventOnce(
  eventKey: string,
  eventType: string,
  memberId?: string,
): Promise<boolean> {
  const db = getAdminDb();
  const { error } = await db.from("line_events").insert({
    event_key: eventKey,
    event_type: eventType,
    member_id: memberId ?? null,
  });
  if (error) {
    // unique violation => duplicate
    if (error.code === "23505") return false;
    throw new Error(`Supabase line_events insert failed: ${error.message}`);
  }
  return true;
}

export async function logSystem(
  level: "info" | "warn" | "error",
  source: string,
  message: string,
  meta?: Record<string, unknown>,
): Promise<void> {
  const db = getAdminDb();
  await db.from("system_logs").insert({
    level,
    source,
    message,
    meta: meta ?? null,
  });
}

export async function logApiUsage(params: {
  memberId?: string;
  model: string;
  purpose: string;
  promptTokens?: number;
  completionTokens?: number;
  estCostUsd?: number;
  requestId?: string;
}): Promise<void> {
  const db = getAdminDb();
  await db.from("api_usage_logs").insert({
    member_id: params.memberId ?? null,
    model: params.model,
    purpose: params.purpose,
    prompt_tokens: params.promptTokens ?? 0,
    completion_tokens: params.completionTokens ?? 0,
    est_cost_usd: params.estCostUsd ?? null,
    request_id: params.requestId ?? null,
  });
}

/** Count API usage rows for rate limits (coach chat, etc.). */
export async function countApiUsageSince(
  memberId: string,
  purpose: string,
  sinceIso: string,
): Promise<number> {
  const db = getAdminDb();
  const { count, error } = await db
    .from("api_usage_logs")
    .select("id", { count: "exact", head: true })
    .eq("member_id", memberId)
    .eq("purpose", purpose)
    .gte("created_at", sinceIso);
  if (error) {
    throw new Error(`api_usage_logs count failed: ${error.message}`);
  }
  return count ?? 0;
}
