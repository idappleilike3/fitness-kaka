import crypto from "node:crypto";
import {
  isAudioTooLong,
  MAX_AUDIO_SECONDS,
} from "@/lib/audio/duration";
import { replyMessage, startLoadingAnimation } from "@/lib/line/client";
import { isPendingMealCorrection } from "@/lib/line/intent";
import {
  audioTooLongMessage,
  mealConfirmQuickReply,
  mealResultMessage,
  quotaExhaustedMessage,
  voiceUpgradeCtaMessage,
} from "@/lib/line/messages";
import { analyzeMealFromText } from "@/lib/openai/meal";
import { understandImage } from "@/lib/openai/image-understanding";
import { transcribeAudio } from "@/lib/openai/whisper";
import { logApiUsage } from "@/repositories/logs";
import { recordConfirmedMealChallenge } from "@/repositories/challenges";
import { challengeMilestoneMessage, getChallengeMilestone } from "@/services/challenge";
import {
  confirmPending,
  createPending,
  discardPending,
  getLatestPending,
  getTodaySummary,
  updatePendingAnalysis,
} from "@/repositories/meals";
import { getProfile } from "@/repositories/profiles";
import { refundConsumed, tryConsume } from "@/repositories/quotas";
import type { MealAnalysisJson } from "@/types";

export { isPendingMealCorrection };

function formatMealText(analysis: MealAnalysisJson): string[] {
  return analysis.items.map(
    (i) => `${i.name}：${i.portion_text}`,
  );
}

export function calculateProjectedRemaining(input: {
  calorieTarget: number;
  proteinTarget: number;
  confirmedKcal: number;
  confirmedProteinG: number;
  currentMealKcal: number;
  currentMealProteinG: number;
}) {
  const projectedKcal = Math.max(
    0,
    Math.round(input.confirmedKcal + input.currentMealKcal),
  );
  const projectedProteinG = Math.max(
    0,
    Math.round(input.confirmedProteinG + input.currentMealProteinG),
  );

  return {
    projectedKcal,
    projectedProteinG,
    remainingKcal: Math.max(0, Math.round(input.calorieTarget - projectedKcal)),
    proteinLeft: Math.max(
      0,
      Math.round(input.proteinTarget - projectedProteinG),
    ),
  };
}

export function buildMealCorrectionPrompt(
  pendingAnalysis: MealAnalysisJson,
  correction: string,
): string {
  return [
    "使用者正在更正同一餐尚未確認的辨識結果。",
    "請保留未被更正的品項，依補充內容更新整餐的品項、份量與總營養素；不要把它當成另一餐。",
    "若使用者說「是A不是B」或「不是B是A」，請把 B 換成 A（例如炸豆腐→鹹酥雞），並重算該品項與總熱量。",
    "若使用者說「他不是X／它不是X／那不是X／不是X」，請移除或替換名稱像 X 的品項。",
    "若使用者說「這是素食／改成素食／沒有肉」，請把整餐調整為素食版本並重算營養素。",
    `原辨識結果：${JSON.stringify(pendingAnalysis)}`,
    `使用者補充／更正：${correction}`,
  ].join("\n");
}

async function replyMealPreview(
  replyToken: string,
  memberId: string,
  analysis: MealAnalysisJson,
  pendingId: string,
): Promise<void> {
  const profile = await getProfile(memberId);
  const today = await getTodaySummary(memberId);
  const target = profile?.calorie_target ?? 0;
  const proteinTarget = profile?.protein_g_target ?? 0;
  const todayKcal = Number(today.total_kcal) || 0;
  const todayProtein = Number(today.protein_g) || 0;
  const projected = calculateProjectedRemaining({
    calorieTarget: target,
    proteinTarget,
    confirmedKcal: todayKcal,
    confirmedProteinG: todayProtein,
    currentMealKcal: analysis.total_kcal,
    currentMealProteinG: analysis.protein_g,
  });
  const text = mealResultMessage({
    lines: formatMealText(analysis),
    totalKcal: Math.round(analysis.total_kcal),
    proteinG: Math.round(analysis.protein_g),
    carbG: Math.round(analysis.carb_g),
    fatG: Math.round(analysis.fat_g),
    todayKcal,
    projectedKcal: projected.projectedKcal,
    projectedProteinG: projected.projectedProteinG,
    remainingKcal: projected.remainingKcal,
    proteinLeft: projected.proteinLeft,
  });

  await replyMessage(replyToken, [
    {
      type: "text",
      text,
      quickReply: mealConfirmQuickReply(pendingId),
    },
  ]);
}

export async function handleTextMeal(
  replyToken: string,
  memberId: string,
  text: string,
): Promise<void> {
  if (isPendingMealCorrection(text)) {
    const pending = await getLatestPending(memberId);
    if (pending) {
      const originalAnalysis = pending.result_json as MealAnalysisJson;
      const correctionPrompt = buildMealCorrectionPrompt(originalAnalysis, text);
      const { analysis, usage, model } =
        await analyzeMealFromText(correctionPrompt);
      await logApiUsage({
        memberId,
        model,
        purpose: "text_meal_correction",
        promptTokens: usage.prompt,
        completionTokens: usage.completion,
      });
      await updatePendingAnalysis({
        pendingId: pending.id,
        memberId,
        analysis,
        inputText: [pending.input_text, text].filter(Boolean).join("\n"),
      });
      await replyMealPreview(replyToken, memberId, analysis, pending.id);
      return;
    }
  }

  const quota = await tryConsume(memberId, "text");
  if (!quota.ok) {
    await replyMessage(replyToken, [
      {
        type: "text",
        text: quotaExhaustedMessage("text", quota.limits, quota.planId),
      },
    ]);
    return;
  }

  let result: Awaited<ReturnType<typeof analyzeMealFromText>>;
  try {
    result = await analyzeMealFromText(text);
  } catch (err) {
    await refundConsumed(memberId, "text").catch((refundErr) => {
      console.error("[meal-flow] text quota refund failed", refundErr);
    });
    throw err;
  }
  const { analysis, usage, model } = result;
  await logApiUsage({
    memberId,
    model,
    purpose: "text_meal",
    promptTokens: usage.prompt,
    completionTokens: usage.completion,
  });
  const pendingId = await createPending({
    memberId,
    source: "text",
    analysis,
    inputText: text,
  });
  await replyMealPreview(replyToken, memberId, analysis, pendingId);
}

export async function handleImageMeal(
  replyToken: string,
  memberId: string,
  buffer: Buffer,
  mime: string,
  lineUserId?: string,
): Promise<void> {
  const maxBytes = (() => {
    const n = Number(process.env.MAX_IMAGE_BYTES);
    return Number.isFinite(n) && n > 0 ? n : 5_242_880;
  })();
  if (buffer.length > maxBytes) {
    await replyMessage(replyToken, [
      { type: "text", text: "圖片太大了，請壓縮後再傳（建議 5MB 以內）" },
    ]);
    return;
  }

  if (lineUserId) {
    await startLoadingAnimation(lineUserId, 20).catch((err) => {
      console.warn("[meal-flow] unable to start LINE loading animation", err);
    });
  }

  const imageHash = crypto.createHash("sha256").update(buffer).digest("hex");
  const result = await understandImage(buffer, mime);
  const { usage, model } = result;
  await logApiUsage({
    memberId,
    model,
    purpose: result.kind === "food" ? "vision_meal" : "vision_image_reply",
    promptTokens: usage.prompt,
    completionTokens: usage.completion,
  });

  if (result.kind !== "food" || !result.meal) {
    await replyMessage(replyToken, [{ type: "text", text: result.reply }]);
    return;
  }

  const quota = await tryConsume(memberId, "image");
  if (!quota.ok) {
    await replyMessage(replyToken, [
      {
        type: "text",
        text: `${result.reply}\n\n${quotaExhaustedMessage("image", quota.limits, quota.planId)}`,
      },
    ]);
    return;
  }

  try {
    const pendingId = await createPending({
      memberId,
      source: "image",
      analysis: result.meal,
      imageHash,
    });
    await replyMessage(replyToken, [{ type: "text", text: result.reply }]);
    await replyMealPreview(replyToken, memberId, result.meal, pendingId);
  } catch (err) {
    await refundConsumed(memberId, "image").catch((refundErr) => {
      console.error("[meal-flow] image quota refund failed", refundErr);
    });
    throw err;
  }
}

/**
 * Voice → Whisper → same text meal analysis → confirm before save.
 * Deducts **voice** quota once (not text). Free plan (voice 0) gets upgrade CTA.
 * Rejects audio longer than MAX_AUDIO_SECONDS without calling Whisper.
 */
export async function handleVoiceMeal(
  replyToken: string,
  memberId: string,
  buffer: Buffer,
  durationMs?: number | null,
): Promise<void> {
  if (isAudioTooLong(durationMs, MAX_AUDIO_SECONDS)) {
    await replyMessage(replyToken, [
      { type: "text", text: audioTooLongMessage() },
    ]);
    return;
  }

  const quota = await tryConsume(memberId, "voice");
  if (!quota.ok) {
    const msg =
      quota.planId === "free" && quota.limits.voice <= 0
        ? voiceUpgradeCtaMessage()
        : quotaExhaustedMessage("voice", quota.limits, quota.planId);
    await replyMessage(replyToken, [{ type: "text", text: msg }]);
    return;
  }

  const { text: transcript, model: whisperModel } =
    await transcribeAudio(buffer);
  await logApiUsage({
    memberId,
    model: whisperModel,
    purpose: "voice_transcribe",
    promptTokens: 0,
    completionTokens: 0,
  });

  const { analysis, usage, model } = await analyzeMealFromText(transcript);
  await logApiUsage({
    memberId,
    model,
    purpose: "voice_meal",
    promptTokens: usage.prompt,
    completionTokens: usage.completion,
  });

  const pendingId = await createPending({
    memberId,
    source: "voice",
    analysis,
    inputText: transcript,
  });
  await replyMealPreview(replyToken, memberId, analysis, pendingId);
}

export async function handleMealPostback(
  replyToken: string,
  memberId: string,
  data: string,
): Promise<void> {
  const [, action, pendingId] = data.split(":");
  if (!action || !pendingId) {
    await replyMessage(replyToken, [{ type: "text", text: "按鈕無效，請再試一次" }]);
    return;
  }
  if (action === "confirm") {
    const confirmed = await confirmPending(pendingId, memberId);
    const challenge = await recordConfirmedMealChallenge(
      memberId,
      confirmed.mealId,
      confirmed.recordedOn,
    ).catch((err) => {
      // A delayed G1 migration must never make a confirmed meal appear to fail.
      console.error("[meal-flow] challenge update failed", err);
      return null;
    });
    await replyMessage(replyToken, [
      {
        type: "text",
        text: (() => {
          if (!challenge?.missionCompleted) return "已幫你記下來了，繼續保持！";
          const milestone = getChallengeMilestone(challenge.streakDays);
          if (milestone) {
            return `已幫你記下來了，Day ${challenge.streakDays} 連續紀錄完成！\n\n${challengeMilestoneMessage(milestone)}`;
          }
          return `已幫你記下來了，Day ${challenge.streakDays} 連續紀錄完成！`;
        })(),
      },
    ]);
    return;
  }
  if (action === "discard") {
    await discardPending(pendingId, memberId);
    await replyMessage(replyToken, [
      { type: "text", text: "好，這筆不儲存" },
    ]);
    return;
  }
  if (action === "retry") {
    await discardPending(pendingId, memberId);
    await replyMessage(replyToken, [
      {
        type: "text",
        text: "請再傳一次照片、語音，或重新打字描述，我會重新辨識（會再扣一次額度）",
      },
    ]);
    return;
  }
  await replyMessage(replyToken, [
    { type: "text", text: "若要改份量，請直接打字重新描述這餐" },
  ]);
}
