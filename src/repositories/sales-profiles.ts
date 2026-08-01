import { getAdminDb } from "@/lib/supabase/admin";
import type { SalesPlan, SalesSignals } from "@/services/sales-discovery";
import { refreshFollowup } from "@/repositories/sales-crm";

export type MemberSalesProfile = {
  member_id: string;
  menu_need_score: number;
  accountability_need_score: number;
  challenge_need_score: number;
  purchase_intent_score: number;
  price_sensitive: boolean;
  sales_paused_until: string | null;
  tags: string[];
  last_recommended_plan: string | null;
  last_recommended_at: string | null;
  updated_at: string;
};

const EMPTY = (memberId: string): MemberSalesProfile => ({
  member_id: memberId,
  menu_need_score: 0,
  accountability_need_score: 0,
  challenge_need_score: 0,
  purchase_intent_score: 0,
  price_sensitive: false,
  sales_paused_until: null,
  tags: [],
  last_recommended_plan: null,
  last_recommended_at: null,
  updated_at: new Date(0).toISOString(),
});

export async function getMemberSalesProfile(memberId: string): Promise<MemberSalesProfile> {
  const { data, error } = await getAdminDb()
    .from("member_sales_profiles")
    .select("*")
    .eq("member_id", memberId)
    .maybeSingle();
  if (error) throw new Error(`读取销售画像失败: ${error.message}`);
  return (data as MemberSalesProfile | null) ?? EMPTY(memberId);
}

function uniq(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))];
}

export async function mergeSalesSignals(
  memberId: string,
  current: MemberSalesProfile,
  signals: SalesSignals,
): Promise<MemberSalesProfile> {
  const pauseUntil = signals.pauseSelling
    ? new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString()
    : current.sales_paused_until;

  const payload = {
    member_id: memberId,
    menu_need_score: Math.min(20, current.menu_need_score + signals.menuNeed),
    accountability_need_score: Math.min(20, current.accountability_need_score + signals.accountabilityNeed),
    challenge_need_score: Math.min(20, current.challenge_need_score + signals.challengeNeed),
    purchase_intent_score: Math.min(20, current.purchase_intent_score + signals.purchaseIntent),
    price_sensitive: current.price_sensitive || signals.priceSensitive,
    sales_paused_until: pauseUntil,
    tags: uniq([...(current.tags ?? []), ...signals.tags]),
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await getAdminDb()
    .from("member_sales_profiles")
    .upsert(payload, { onConflict: "member_id" })
    .select("*")
    .single();
  if (error || !data) throw new Error(`更新销售画像失败: ${error?.message ?? "unknown"}`);
  const profile = data as MemberSalesProfile;
  await refreshFollowup(memberId, profile);
  return profile;
}

export function isSalesPaused(profile: MemberSalesProfile, now = new Date()): boolean {
  if (!profile.sales_paused_until) return false;
  return new Date(profile.sales_paused_until).getTime() > now.getTime();
}

export function canRecommendPlan(
  profile: MemberSalesProfile,
  plan: Exclude<SalesPlan, null>,
  now = new Date(),
): boolean {
  if (isSalesPaused(profile, now)) return false;
  if (!profile.last_recommended_at) return true;
  const elapsed = now.getTime() - new Date(profile.last_recommended_at).getTime();
  const cooldownMs = profile.last_recommended_plan === plan
    ? 7 * 24 * 60 * 60 * 1000
    : 3 * 24 * 60 * 60 * 1000;
  return elapsed >= cooldownMs;
}

export async function markPlanRecommended(
  memberId: string,
  plan: Exclude<SalesPlan, null>,
): Promise<void> {
  const { error } = await getAdminDb()
    .from("member_sales_profiles")
    .upsert({
      member_id: memberId,
      last_recommended_plan: plan,
      last_recommended_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }, { onConflict: "member_id" });
  if (error) throw new Error(`记录方案推荐失败: ${error.message}`);
}
