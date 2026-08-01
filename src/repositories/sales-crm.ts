import { getAdminDb } from "@/lib/supabase/admin";
import type { MemberSalesProfile } from "@/repositories/sales-profiles";

export async function logConversationEvent(params: {
  memberId: string;
  direction: "member" | "assistant" | "admin";
  content: string;
  eventType?: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  const { error } = await getAdminDb().from("member_conversation_events").insert({
    member_id: params.memberId,
    direction: params.direction,
    channel: "line",
    event_type: params.eventType ?? "text",
    content: params.content.slice(0, 4000),
    metadata: params.metadata ?? {},
  });
  if (error) throw new Error(`记录对话失败: ${error.message}`);
}

export function opportunityFromProfile(profile: MemberSalesProfile): {
  score: number;
  stage: "discovering" | "warming" | "qualified" | "considering" | "ready" | "paused";
  summary: string;
  nextStep: string;
} {
  const raw = profile.menu_need_score * 2 + profile.accountability_need_score * 2.5 + profile.challenge_need_score * 2.5 + profile.purchase_intent_score * 4;
  const score = Math.max(0, Math.min(100, Math.round(raw)));
  const paused = Boolean(profile.sales_paused_until && new Date(profile.sales_paused_until).getTime() > Date.now());
  const stage = paused ? "paused" : score >= 75 ? "ready" : score >= 55 ? "considering" : score >= 35 ? "qualified" : score >= 15 ? "warming" : "discovering";
  const strongest = [
    [profile.menu_need_score, "需要把每天吃什么变简单"],
    [profile.accountability_need_score, "需要每天提醒与陪伴"],
    [profile.challenge_need_score, "偏好明确任务与进度追踪"],
  ].sort((a, b) => Number(b[0]) - Number(a[0]))[0]?.[1] ?? "仍在了解需求";
  const summary = `${strongest}${profile.price_sensitive ? "，对价格较敏感" : ""}${paused ? "，目前不希望收到销售推荐" : ""}`;
  const nextStep = paused
    ? "先提供帮助，不推荐方案；等暂停期结束或会员主动询问"
    : stage === "ready"
      ? "回应当前问题后，提出一个最适合的方案并保留『先继续免费』选项"
      : stage === "considering"
        ? "先分享一个与痛点相关的免费建议，再询问是否想看适合的方案"
        : "继续问一题了解卡点，不主动报价";
  return { score, stage, summary, nextStep };
}

export async function refreshFollowup(memberId: string, profile: MemberSalesProfile): Promise<void> {
  const opp = opportunityFromProfile(profile);
  const dueAt = opp.stage === "ready" ? new Date(Date.now() + 24 * 60 * 60 * 1000) : opp.stage === "considering" ? new Date(Date.now() + 3 * 24 * 60 * 60 * 1000) : null;
  const { error } = await getAdminDb().from("member_followups").upsert({
    member_id: memberId,
    opportunity_score: opp.score,
    opportunity_stage: opp.stage,
    need_summary: opp.summary,
    recommended_next_step: opp.nextStep,
    suggested_message: opp.stage === "ready" ? "我听起来你现在最需要的是把这件事变简单。我先给你一个今天就能做的小建议；如果你愿意，我再把最适合你的方案整理给你，不用急着决定。" : null,
    due_at: dueAt?.toISOString() ?? null,
    status: opp.stage === "paused" ? "snoozed" : "open",
    updated_at: new Date().toISOString(),
  }, { onConflict: "member_id" });
  if (error) throw new Error(`更新跟进记录失败: ${error.message}`);
}
