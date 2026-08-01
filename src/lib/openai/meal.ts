import { z } from "zod";
import { getOpenAIEnv } from "@/lib/env";
import { getOpenAI } from "@/lib/openai/client";
import type { MealAnalysisJson } from "@/types";

export const mealAnalysisSchema = z.object({
  items: z
    .array(
      z.object({
        name: z.string(),
        portion_text: z.string(),
        kcal: z.number(),
        protein_g: z.number(),
        carb_g: z.number(),
        fat_g: z.number(),
      }),
    )
    .min(1),
  total_kcal: z.number(),
  protein_g: z.number(),
  carb_g: z.number(),
  fat_g: z.number(),
  confidence: z.enum(["low", "medium", "high"]),
  notes: z.string().optional(),
});

const SYSTEM = `你是「健身卡卡教練」的飲食紀錄助理，不是醫生或營養師。
只做台灣常見食物的熱量與三大營養素推估，非醫療診斷。
看不清或不確定時降低 confidence，並在 notes 說明。
禁止鼓勵極端節食。只輸出 JSON，格式：
{"items":[{"name":"","portion_text":"","kcal":0,"protein_g":0,"carb_g":0,"fat_g":0}],"total_kcal":0,"protein_g":0,"carb_g":0,"fat_g":0,"confidence":"medium","notes":""}`;

export async function analyzeMealFromText(
  text: string,
): Promise<{ analysis: MealAnalysisJson; usage: { prompt: number; completion: number }; model: string }> {
  const env = getOpenAIEnv();
  const openai = getOpenAI();
  const res = await openai.chat.completions.create({
    model: env.OPENAI_MODEL,
    temperature: 0.2,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: SYSTEM },
      {
        role: "user",
        content: `使用者時區 Asia/Taipei。請分析這段飲食描述：\n${text}`,
      },
    ],
  });

  const raw = res.choices[0]?.message?.content ?? "{}";
  const parsed = mealAnalysisSchema.parse(JSON.parse(raw));
  return {
    analysis: parsed,
    usage: {
      prompt: res.usage?.prompt_tokens ?? 0,
      completion: res.usage?.completion_tokens ?? 0,
    },
    model: env.OPENAI_MODEL,
  };
}

export async function analyzeMealFromImage(
  buffer: Buffer,
  mime: string,
): Promise<{ analysis: MealAnalysisJson; usage: { prompt: number; completion: number }; model: string }> {
  const env = getOpenAIEnv();
  const openai = getOpenAI();
  const b64 = buffer.toString("base64");
  const res = await openai.chat.completions.create({
    model: env.OPENAI_MODEL,
    temperature: 0.2,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: SYSTEM },
      {
        role: "user",
        content: [
          {
            type: "text",
            text: "請辨識這張餐點照片的食物、份量與營養素（台灣常見外食優先）。",
          },
          {
            type: "image_url",
            image_url: {
              url: `data:${mime};base64,${b64}`,
              detail: "low",
            },
          },
        ],
      },
    ],
  });

  const raw = res.choices[0]?.message?.content ?? "{}";
  const parsed = mealAnalysisSchema.parse(JSON.parse(raw));
  return {
    analysis: parsed,
    usage: {
      prompt: res.usage?.prompt_tokens ?? 0,
      completion: res.usage?.completion_tokens ?? 0,
    },
    model: env.OPENAI_MODEL,
  };
}
