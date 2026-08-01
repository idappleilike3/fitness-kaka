import { replyCoachChat, type CoachContext } from "@/lib/openai/coach";
import { getTaipeiDate } from "@/lib/quota/daily";
import { countApiUsageSince, logApiUsage } from "@/repositories/logs";
import { getTodaySummary } from "@/repositories/meals";
import { getProfile } from "@/repositories/profiles";
import {
  detectSalesSignals,
  recommendPlan,
  salesDiscoveryQuestion,
  planRecommendationCopy,
} from "@/services/sales-discovery";
import {
  canRecommendPlan,
  getMemberSalesProfile,
  isSalesPaused,
  markPlanRecommended,
  mergeSalesSignals,
} from "@/repositories/sales-profiles";

/** Soft daily cap — coach chat does not consume meal analysis quota. */
export const COACH_CHAT_DAILY_LIMIT = 40;

/** Minimum gap between coach GPT calls per member (ms). */
export const COACH_CHAT_COOLDOWN_MS = 2_500;

export type CoachChatResult =
  | { ok: true; reply: string }
  | { ok: false; reply: string; reason: "rate_limit" | "daily_limit" };

export async function handleCoachChat(
  memberId: string,
  text: string,
  displayName?: string | null,
): Promise<CoachChatResult> {
  const sinceCool = new Date(Date.now() - COACH_CHAT_COOLDOWN_MS).toISOString();
  const recent = await countApiUsageSince(memberId, "coach_chat", sinceCool);
  if (recent > 0) {
    return {
      ok: false,
      reason: "rate_limit",
      reply: "稍等一下再傳給我，我先幫你整理這一則",
    };
  }

  const dayStart = `${getTaipeiDate()}T00:00:00+08:00`;
  const usedToday = await countApiUsageSince(memberId, "coach_chat", dayStart);
  if (usedToday >= COACH_CHAT_DAILY_LIMIT) {
    return {
      ok: false,
      reason: "daily_limit",
      reply:
        "今天教練聊天次數先到這裡～仍可傳餐點照片／打字記飲食，或問「今天還能吃多少」",
    };
  }

  const profile = await getProfile(memberId);
  const today = await getTodaySummary(memberId);
  const calorieTarget = profile?.calorie_target ?? null;
  const proteinTarget = profile?.protein_g_target ?? null;
  const todayKcal = Number(today.total_kcal) || 0;
  const todayProteinG = Number(today.protein_g) || 0;

  const ctx: CoachContext = {
    displayName,
    goalType: profile?.goal_type ?? null,
    calorieTarget,
    proteinTarget,
    todayKcal,
    todayProteinG,
    remainingKcal:
      calorieTarget != null ? Math.max(0, calorieTarget - todayKcal) : null,
    proteinLeft:
      proteinTarget != null
        ? Math.max(0, proteinTarget - Math.round(todayProteinG))
        : null,
  };

  const { reply, usage, model } = await replyCoachChat(text, ctx);
  await logApiUsage({
    memberId,
    model,
    purpose: "coach_chat",
    promptTokens: usage.prompt,
    completionTokens: usage.completion,
  });

  const signals = detectSalesSignals(text);
  const before = await getMemberSalesProfile(memberId);
  const salesProfile = await mergeSalesSignals(memberId, before, signals);
  const discoveryQuestion = salesDiscoveryQuestion(text);
  const plan = recommendPlan({
    ...signals,
    menuNeed: salesProfile.menu_need_score,
    accountabilityNeed: salesProfile.accountability_need_score,
    challengeNeed: salesProfile.challenge_need_score,
    purchaseIntent: salesProfile.purchase_intent_score,
  });
  let adaptiveReply = reply.trim();

  // 先诊断，再给价值，再于明确购买意图或累计需求足够时自然推荐。
  // 同一方案七天内不重复推荐；用户说先不用后暂停三天。
  if (signals.pauseSelling || isSalesPaused(salesProfile)) {
    adaptiveReply += "\n\n没问题，我们先专心把今天做好；你想了解方案时再告诉我就好。\n\n不用急着决定，找到你能长期做到的方法最重要。";
  } else if (plan && signals.purchaseIntent >= 3 && canRecommendPlan(salesProfile, plan)) {
    adaptiveReply += `\n\n${planRecommendationCopy(plan)}`;
    await markPlanRecommended(memberId, plan);
  } else if (discoveryQuestion) {
    adaptiveReply += `\n\n${discoveryQuestion}`;
  }

  return { ok: true, reply: adaptiveReply };
}
