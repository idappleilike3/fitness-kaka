import { z } from "zod";
import { getOpenAIEnv } from "@/lib/env";
import { getOpenAI } from "@/lib/openai/client";

export const imageKindSchema = z.object({
  kind: z.enum([
    "food",
    "menu",
    "packaged_food",
    "exercise",
    "selfie",
    "pet",
    "scenery",
    "screenshot",
    "document",
    "other",
  ]),
  description: z.string().min(1),
  compliment: z.string().min(1),
  contains_food: z.boolean(),
  confidence: z.enum(["low", "medium", "high"]),
});

export type ImageUnderstanding = z.infer<typeof imageKindSchema>;

const SYSTEM = `你是「健身卡卡」的圖片理解器。先判斷圖片類型，不做身材、體重、體脂、疾病或外貌好壞判定。
分類：food 實際餐點、menu 菜單、packaged_food 有營養標示的包裝食品、exercise 運動情境、selfie 人物／生活照、pet 寵物、scenery 風景、screenshot 畫面截圖、document 文件、other 其他。
compliment 必須自然、溫暖、不浮誇；人物照只能稱讚精神、氛圍、穿搭或照片感覺，不評論胖瘦。
只輸出 JSON：{"kind":"food","description":"","compliment":"","contains_food":true,"confidence":"high"}`;

export async function understandImage(buffer: Buffer, mime: string) {
  const env = getOpenAIEnv();
  const openai = getOpenAI();
  const res = await openai.chat.completions.create({
    model: env.OPENAI_MODEL,
    temperature: 0.1,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: SYSTEM },
      {
        role: "user",
        content: [
          { type: "text", text: "請先理解並分類這張圖片。" },
          {
            type: "image_url",
            image_url: { url: `data:${mime};base64,${buffer.toString("base64")}`, detail: "low" },
          },
        ],
      },
    ],
  });
  const raw = res.choices[0]?.message?.content ?? "{}";
  return {
    result: imageKindSchema.parse(JSON.parse(raw)),
    usage: {
      prompt: res.usage?.prompt_tokens ?? 0,
      completion: res.usage?.completion_tokens ?? 0,
    },
    model: env.OPENAI_MODEL,
  };
}

export function nonFoodReply(info: ImageUnderstanding): string {
  const lead = info.compliment.trim();
  const scope = "我目前主要陪你做減脂飲食紀錄，能辨識實際餐點的熱量、蛋白質、碳水和脂肪，不會根據生活照判斷胖瘦、體重或體脂。";
  switch (info.kind) {
    case "menu":
      return `${lead}\n\n我看到這是一張菜單。你可以告訴我想點哪幾樣，我會幫你比較比較適合減脂的搭配；若要精估熱量，點餐後再拍實際餐點給我。\n\n慢慢選就好，我會陪你找到吃得開心又比較平衡的方式。`;
    case "packaged_food":
      return `${lead}\n\n我看到的是包裝食品。請再拍清楚正面與營養標示，我可以幫你整理每份熱量與蛋白質；若已經盛盤，也可以拍實際份量。\n\n不用一次做到完美，看懂一個標示就是很好的進步。`;
    case "exercise":
      return `${lead}\n\n${scope} 若想記錄運動，也可以告訴我運動種類和時間；運動後的餐點拍給我，我再幫你看蛋白質夠不夠。\n\n今天願意動起來，已經是在照顧自己了。`;
    case "selfie":
      return `${lead}\n\n${scope} 有吃飯時直接拍餐點給我，我會幫你分析。\n\n慢慢來，我會陪你把每天的飲食照顧好。`;
    case "pet":
      return `${lead}\n\n${scope} 等你吃飯時再拍餐點給我，我會接著幫你記錄。\n\n讓自己開心，也是健康生活很重要的一部分。`;
    case "scenery":
      return `${lead}\n\n${scope} 旅途中有吃到餐點，可以直接拍給我，我會幫你看看怎麼享受美食又保持平衡。\n\n放鬆也很重要，不需要每一天都繃得很緊。`;
    case "screenshot":
    case "document":
      return `${lead}\n\n我看到的是畫面或文件，不是實際餐點，因此不會計入今天的飲食。若你想問裡面的文字，可以直接把問題打給我；要分析熱量，請拍實際食物。\n\n傳錯照片也沒關係，我們接著做就好。`;
    default:
      return `${lead}\n\n${scope} 請再拍一張能清楚看到食物與份量的照片。\n\n不用擔心，我會陪你把這餐記錄完成。`;
  }
}
