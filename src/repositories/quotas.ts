import { getAdminDb } from "@/lib/supabase/admin";
import {
  canUse,
  getTaipeiDate,
  type QuotaCounters,
  type QuotaLimits,
} from "@/lib/quota/daily";
import { resolveCurrentPlan } from "@/lib/subscriptions/current-plan";
import type { QuotaKind } from "@/types";

const FREE_LIMITS: QuotaLimits = {
  image: 5,
  text: 5,
  voice: 0,
  mealAnalysis: 5,
};

export async function getActivePlanLimits(memberId: string): Promise<{
  planId: string;
  limits: QuotaLimits;
}> {
  const db = getAdminDb();
  const { data: subs } = await db
    .from("subscriptions")
    .select("plan_id, status, expires_at")
    .eq("member_id", memberId)
    .eq("status", "active");

  const current = resolveCurrentPlan(subs ?? []);
  if (current.planId === "free") {
    return { planId: "free", limits: FREE_LIMITS };
  }

  const { data: plan } = await db
    .from("plans")
    .select("daily_image_quota, daily_text_quota, daily_voice_quota")
    .eq("id", current.planId)
    .maybeSingle();

  if (!plan) return { planId: "free", limits: FREE_LIMITS };
  return {
    planId: current.planId,
    limits: {
      image: plan.daily_image_quota,
      text: plan.daily_text_quota,
      voice: plan.daily_voice_quota,
    },
  };
}

export async function tryConsume(
  memberId: string,
  kind: QuotaKind,
): Promise<{
  ok: boolean;
  used: QuotaCounters;
  limits: QuotaLimits;
  planId: string;
}> {
  const db = getAdminDb();
  const date = getTaipeiDate();
  const { planId, limits } = await getActivePlanLimits(memberId);

  const { data: existing } = await db
    .from("usage_quotas")
    .select("*")
    .eq("member_id", memberId)
    .eq("quota_date", date)
    .maybeSingle();

  let used: QuotaCounters = existing
    ? {
        image: existing.image_used,
        text: existing.text_used,
        voice: existing.voice_used,
      }
    : { image: 0, text: 0, voice: 0 };

  if (!canUse(used, limits, kind)) {
    return { ok: false, used, limits, planId };
  }

  used = { ...used, [kind]: used[kind] + 1 };

  if (existing) {
    await db
      .from("usage_quotas")
      .update({
        image_used: used.image,
        text_used: used.text,
        voice_used: used.voice,
      })
      .eq("id", existing.id);
  } else {
    await db.from("usage_quotas").insert({
      member_id: memberId,
      quota_date: date,
      image_used: used.image,
      text_used: used.text,
      voice_used: used.voice,
    });
  }

  return { ok: true, used, limits, planId };
}

/** Reverses one just-consumed quota when analysis fails before a result exists. */
export async function refundConsumed(
  memberId: string,
  kind: QuotaKind,
): Promise<void> {
  const db = getAdminDb();
  const date = getTaipeiDate();
  const { data: existing, error: readError } = await db
    .from("usage_quotas")
    .select("*")
    .eq("member_id", memberId)
    .eq("quota_date", date)
    .maybeSingle();
  if (readError || !existing) {
    throw new Error(readError?.message ?? "quota record not found for refund");
  }

  const next = Math.max(0, Number(existing[`${kind}_used`]) - 1);
  const { error: updateError } = await db
    .from("usage_quotas")
    .update({ [`${kind}_used`]: next })
    .eq("id", existing.id);
  if (updateError) throw new Error(updateError.message);
}
