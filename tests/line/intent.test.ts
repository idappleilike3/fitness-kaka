import { describe, expect, it } from "vitest";
import {
  classifyTextIntent,
  classifyConsultationNeed,
  isEmojiOnlyMessage,
  isGreetingText,
  isNonMealMessageType,
  looksLikeDailyQuestion,
  shouldAnalyzeTextMeal,
  isPendingMealCorrection,
} from "@/lib/line/intent";
import {
  buildMealCorrectionPrompt,
  isPendingMealCorrection as mealFlowIsPendingCorrection,
} from "@/services/meal-flow";
import { sanitizeLineText } from "@/lib/line/text";
import {
  clearReplyMemory,
  pickNonRepeatingReply,
  rememberBotReply,
  wouldRepeatSameReply,
} from "@/lib/line/reply-memory";

describe("LINE text intent", () => {
  it.each([
    ["①", "weight_loss"],
    ["2", "habits"],
    ["③", "muscle"],
    ["4", "calorie_target"],
    ["⑤", "eating_out"],
    ["6", "other"],
    ["我想瘦 5 公斤", "weight_loss"],
    ["我想改善飲食習慣", "habits"],
    ["我想增肌提高蛋白質", "muscle"],
    ["不知道一天能吃多少", "calorie_target"],
    ["我每天都外食", "eating_out"],
  ])("classifies consultation choice %s as %s", (text, expected) => {
    expect(classifyConsultationNeed(text)).toBe(expected);
  });
  it.each(["在嗎", "嗨", "你好", "謝謝", "你沒有跟前面一起結合計算"])(
    "does not treat conversational text as a meal analysis: %s",
    (text) => {
      expect(shouldAnalyzeTextMeal(text)).toBe(false);
    },
  );

  it("recognizes a drink correction as meal content", () => {
    expect(shouldAnalyzeTextMeal("我是喝蜂蜜奶茶，還有冬瓜檸檬珍珠")).toBe(true);
  });

  it("recognizes a pending meal correction", () => {
    expect(
      mealFlowIsPendingCorrection("我是喝蜂蜜奶茶，還有冬瓜檸檬珍珠"),
    ).toBe(true);
  });

  it("recognizes a greeting without treating it as meal content", () => {
    expect(isGreetingText("在嗎")).toBe(true);
  });

  it("keeps stickers out of meal analysis routing", () => {
    expect(isNonMealMessageType("sticker")).toBe(true);
  });

  it("keeps the pending meal context when correcting items", () => {
    const prompt = buildMealCorrectionPrompt(
      {
        items: [
          {
            name: "雞肉漢堡",
            portion_text: "1 個",
            kcal: 420,
            protein_g: 22,
            carb_g: 42,
            fat_g: 18,
          },
        ],
        total_kcal: 420,
        protein_g: 22,
        carb_g: 42,
        fat_g: 18,
        confidence: "medium",
      },
      "我是喝蜂蜜奶茶，還有冬瓜檸檬珍珠",
    );

    expect(prompt).toContain("雞肉漢堡");
    expect(prompt).toContain("蜂蜜奶茶");
    expect(prompt).toContain("同一餐");
  });

  it("routes daily status before meal heuristics", () => {
    expect(classifyTextIntent("我今天吃了多少")).toBe("daily_status");
    expect(classifyTextIntent("今天還能吃多少")).toBe("daily_status");
    expect(looksLikeDailyQuestion("晚餐吃雞胸肉")).toBe(false);
    expect(classifyTextIntent("晚餐吃雞胸肉")).toBe("meal");
  });

  it("routes challenge / upgrade / help / greeting before meal", () => {
    expect(classifyTextIntent("開始挑戰")).toBe("challenge_start");
    expect(classifyTextIntent("我要參加三十天減脂挑戰")).toBe("challenge_start");
    expect(
      classifyTextIntent("我要參加三十天健身減脂計劃"),
    ).toBe("challenge_start");
    expect(classifyTextIntent("加入30天挑戰")).toBe("challenge_start");
    expect(classifyTextIntent("今日任務")).toBe("challenge_status");
    expect(classifyTextIntent("我想升級")).toBe("upgrade");
    expect(classifyTextIntent("怎麼用")).toBe("help");
    expect(classifyTextIntent("嗨")).toBe("greeting");
  });

  it("routes pending corrections before meal or chitchat when pending exists", () => {
    expect(
      classifyTextIntent("加上一杯無糖豆漿", { hasPendingMeal: true }),
    ).toBe("pending_correction");
    expect(
      classifyTextIntent("不是薯條", { hasPendingMeal: true }),
    ).toBe("pending_correction");
    expect(
      classifyTextIntent("是鹹酥雞不是炸豆腐", { hasPendingMeal: true }),
    ).toBe("pending_correction");
    expect(
      classifyTextIntent("不是炸豆腐是鹹酥雞", { hasPendingMeal: true }),
    ).toBe("pending_correction");
    expect(
      classifyTextIntent("這是素食", { hasPendingMeal: true }),
    ).toBe("pending_correction");
    expect(
      classifyTextIntent("他不是炸豆腐", { hasPendingMeal: true }),
    ).toBe("pending_correction");
    expect(
      classifyTextIntent("不是薯條", { hasPendingMeal: false }),
    ).toBe("chitchat");
    expect(
      classifyTextIntent("這是素食", { hasPendingMeal: false }),
    ).toBe("chitchat");
  });

  it("treats 「是A不是B」 as correction even without 加上/改成 keywords", () => {
    expect(isPendingMealCorrection("是鹹酥雞不是炸豆腐")).toBe(true);
    expect(isPendingMealCorrection("是雞腿")).toBe(true);
    expect(isPendingMealCorrection("這是素食")).toBe(true);
    expect(isPendingMealCorrection("他不是炸豆腐")).toBe(true);
    expect(shouldAnalyzeTextMeal("是鹹酥雞不是炸豆腐")).toBe(false);
  });

  it("detects emoji-only messages for soft ack routing", () => {
    expect(isEmojiOnlyMessage("😂")).toBe(true);
    expect(isEmojiOnlyMessage("👍👍")).toBe(true);
    expect(isEmojiOnlyMessage("是鹹酥雞")).toBe(false);
  });

  it("falls back to coach chitchat for health / advice questions", () => {
    expect(classifyTextIntent("減脂期宵夜可以吃什麼")).toBe("chitchat");
    expect(classifyTextIntent("我最近睡不好會不會影響減脂")).toBe("chitchat");
    expect(shouldAnalyzeTextMeal("減脂期宵夜可以吃什麼")).toBe(false);
    expect(shouldAnalyzeTextMeal("早餐吃雞胸肉")).toBe(true);
  });
});

describe("LINE reply text", () => {
  it("strips trailing Chinese or Western periods", () => {
    expect(sanitizeLineText("你好。")).toBe("你好");
    expect(sanitizeLineText("ok.")).toBe("ok");
    expect(sanitizeLineText("中間。還有字")).toBe("中間。還有字");
  });
});

describe("LINE reply memory", () => {
  it("detects identical canned replies within the short window", () => {
    clearReplyMemory();
    rememberBotReply("m1", "同一段說明");
    expect(wouldRepeatSameReply("m1", "同一段說明")).toBe(true);
    expect(pickNonRepeatingReply("m1", ["同一段說明", "換一句"])).toBe("換一句");
  });
});
