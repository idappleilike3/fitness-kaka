import { imageUnderstandingSchema } from "@/lib/openai/image-understanding";
import type { ImageUnderstanding } from "@/types";

export function buildGeminiImagePrompt(): string {
  return `你是健身卡卡的圖片辨識引擎。請判斷圖片內容並只輸出 JSON，不要 Markdown。\n\n分類只能是 food、person、exercise、pet、scenery、life、product、screenshot、unknown。\n- food：清楚可見且可估算的食物或飲料。食物照片不要聊天，不要寒暄，不要先評論好不好吃；直接回傳營養分析。meal 必須包含 items、total_kcal、protein_g、carb_g、fat_g、confidence。reply 請留空字串。\n- person/exercise/pet/scenery/life/product/screenshot/unknown：非食物圖片才自然聊天，reply 用 1～3 句繁體中文；不可附 meal。人物不可批評外貌身材或推測敏感屬性。\n\n食物 JSON 範例：{"kind":"food","reply":"","meal":{"items":[{"name":"雞胸肉","portion_text":"約 120g","kcal":198,"protein_g":37,"carb_g":0,"fat_g":4}],"total_kcal":198,"protein_g":37,"carb_g":0,"fat_g":4,"confidence":"medium","notes":"依照片估算"}}\n非食物 JSON 範例：{"kind":"pet","reply":"這張毛孩的表情很有戲 😄"}`;
}

export function extractGeminiJson(raw: string): string {
  return raw.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
}

export async function understandImageWithGemini(
  buffer: Buffer,
  mime: string,
): Promise<ImageUnderstanding & { usage: { prompt: number; completion: number }; model: string }> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) throw new Error("GEMINI_API_KEY is not configured");
  const model = process.env.GEMINI_MODEL?.trim() || "gemini-2.5-flash";
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [
          { text: buildGeminiImagePrompt() },
          { inline_data: { mime_type: mime, data: buffer.toString("base64") } },
        ] }],
        generationConfig: { responseMimeType: "application/json" },
      }),
    },
  );
  if (!response.ok) throw new Error(`Gemini image analysis failed: ${response.status} ${await response.text()}`);
  const body = await response.json() as any;
  const raw = body?.candidates?.[0]?.content?.parts?.map((p: any) => p?.text || "").join("") || "{}";
  const parsed = imageUnderstandingSchema.parse(JSON.parse(extractGeminiJson(raw)));
  return {
    ...parsed,
    usage: {
      prompt: Number(body?.usageMetadata?.promptTokenCount) || 0,
      completion: Number(body?.usageMetadata?.candidatesTokenCount) || 0,
    },
    model,
  };
}
