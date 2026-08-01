import { replyCoachChat, type CoachContext } from "@/lib/openai/coach";
import { getTaipeiDate } from "@/lib/quota/daily";
import { countApiUsageSince, logApiUsage } from "@/repositories/logs";
import { getTodaySummary } from "@/repositories/meals";
import { getProfile } from "@/repositories/profiles";

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

  return { ok: true, reply };
}
