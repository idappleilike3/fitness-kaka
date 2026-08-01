import { getOpenAIEnv } from "@/lib/env";
import { getOpenAI } from "@/lib/openai/client";
import { sanitizeLineText } from "@/lib/line/text";

const SYSTEM = `你是「健身卡卡教練」在 LINE 上的健康陪伴教練，不是醫生或營養師。
用台灣繁體中文回覆，語氣短、鼓勵、具體，可執行。
只討論飲食、運動習慣、睡眠節奏、壓力與可持續減脂／增肌習慣。
禁止醫療診斷、開藥、極端節食、催吐、未成年不安全熱量建議。
若問題與健康／飲食無關，禮貌帶回飲食紀錄或今日目標。
回覆 1～4 句即可；句尾不要加句號（。或 .）。
若使用者問今日已吃多少／還能吃多少，請依系統提供的 SQL 數字回答，不可虛構。`;

export type CoachContext = {
  displayName?: string | null;
  goalType?: string | null;
  calorieTarget?: number | null;
  proteinTarget?: number | null;
  todayKcal?: number;
  todayProteinG?: number;
  remainingKcal?: number | null;
  proteinLeft?: number | null;
};

function formatContext(ctx: CoachContext): string {
  const lines = [
    `稱呼：${ctx.displayName?.trim() || "學員"}`,
    `目標類型：${ctx.goalType ?? "未設定"}`,
    `每日熱量目標：${ctx.calorieTarget ?? "未設定"}`,
    `每日蛋白質目標：${ctx.proteinTarget ?? "未設定"}`,
    `今日已確認攝取：${ctx.todayKcal ?? 0} kcal、蛋白質 ${Math.round(ctx.todayProteinG ?? 0)}g`,
  ];
  if (ctx.remainingKcal != null) {
    lines.push(`今日剩餘熱量約：${ctx.remainingKcal} kcal`);
  }
  if (ctx.proteinLeft != null) {
    lines.push(`蛋白質還差約：${ctx.proteinLeft}g`);
  }
  return lines.join("\n");
}

export async function replyCoachChat(
  userText: string,
  ctx: CoachContext,
): Promise<{
  reply: string;
  usage: { prompt: number; completion: number };
  model: string;
}> {
  const env = getOpenAIEnv();
  const openai = getOpenAI();
  const res = await openai.chat.completions.create({
    model: env.OPENAI_MODEL,
    temperature: 0.5,
    max_tokens: 280,
    messages: [
      { role: "system", content: SYSTEM },
      {
        role: "user",
        content: [
          "以下是會員當日 SQL 統計與目標（不可虛構）：",
          formatContext(ctx),
          "",
          `使用者說：${userText}`,
        ].join("\n"),
      },
    ],
  });

  const raw = res.choices[0]?.message?.content?.trim() || "我在～想記飲食直接傳照片或打字就可以";
  return {
    reply: sanitizeLineText(raw),
    usage: {
      prompt: res.usage?.prompt_tokens ?? 0,
      completion: res.usage?.completion_tokens ?? 0,
    },
    model: env.OPENAI_MODEL,
  };
}
