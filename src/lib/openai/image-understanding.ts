import { z } from "zod";
import { getOpenAIEnv } from "@/lib/env";
import { getOpenAI } from "@/lib/openai/client";
import { mealAnalysisSchema } from "@/lib/openai/meal";
import type { ImageUnderstanding } from "@/types";

export const imageKindSchema = z.enum([
  "food",
  "person",
  "exercise",
  "pet",
  "scenery",
  "life",
  "product",
  "screenshot",
  "unknown",
]);

export const imageUnderstandingSchema = z
  .object({
    kind: imageKindSchema,
    reply: z.string().min(1).max(240),
    meal: mealAnalysisSchema.optional(),
  })
  .superRefine((value, ctx) => {
    if (value.kind === "food" && !value.meal) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["meal"],
        message: "food images require meal nutrition",
      });
    }
    if (value.kind !== "food" && value.meal) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["meal"],
        message: "non-food images must not include meal nutrition",
      });
    }
  });

const SYSTEM = `你是「健身卡卡」本人，是溫暖、自然、有觀察力的飲食與健身陪伴教練。
使用者可能傳任何圖片。先看懂畫面，再像真人一樣針對圖片說 1～3 句繁體中文；不要說「分類結果」或使用制式客服語氣。

分類只能是 food、person、exercise、pet、scenery、life、product、screenshot、unknown。
- food：清楚可見、足以估算的食物或飲料。reply 先自然回應餐點，再說會協助估算；meal 必須包含完整營養估算。
- person：自拍或人物照。友善回應情境，不批評外貌或身材，不主動要求減肥，不推測年齡、健康、族群、性別認同等敏感屬性。
- exercise：運動或健身情境。自然鼓勵，可詢問是否想記錄運動或調整飲食。
- pet、scenery、life、product：針對真正看見的內容聊天，可問一個貼近情境的小問題。
- screenshot：說明看見的是截圖或文字資訊，詢問想解讀、整理或判斷哪一部分；不要宣稱資訊真偽。
- unknown：誠實說目前無法確定，請使用者補充想問什麼，不可猜成食物。

只輸出 JSON。格式：
{"kind":"pet","reply":"..."}
食物格式另加 meal：{"items":[{"name":"","portion_text":"","kcal":0,"protein_g":0,"carb_g":0,"fat_g":0}],"total_kcal":0,"protein_g":0,"carb_g":0,"fat_g":0,"confidence":"medium","notes":""}`;

export async function understandImage(
  buffer: Buffer,
  mime: string,
): Promise<ImageUnderstanding & { usage: { prompt: number; completion: number }; model: string }> {
  const env = getOpenAIEnv();
  const openai = getOpenAI();
  const b64 = buffer.toString("base64");
  const response = await openai.chat.completions.create({
    model: env.OPENAI_MODEL,
    temperature: 0.35,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: SYSTEM },
      {
        role: "user",
        content: [
          {
            type: "text",
            text: "請先像真人一樣回應這張圖片，再依規則提供適合的下一步。",
          },
          {
            type: "image_url",
            image_url: { url: `data:${mime};base64,${b64}`, detail: "low" },
          },
        ],
      },
    ],
  });
  const raw = response.choices[0]?.message?.content ?? "{}";
  const parsed = imageUnderstandingSchema.parse(JSON.parse(raw));
  return {
    ...parsed,
    usage: {
      prompt: response.usage?.prompt_tokens ?? 0,
      completion: response.usage?.completion_tokens ?? 0,
    },
    model: env.OPENAI_MODEL,
  };
}
