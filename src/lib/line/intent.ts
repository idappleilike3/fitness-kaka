export type TextIntent =
  | "daily_status"
  | "challenge_start"
  | "challenge_status"
  | "upgrade"
  | "help"
  | "greeting"
  | "pending_correction"
  | "meal"
  | "chitchat";

export type ConsultationNeed =
  | "weight_loss"
  | "habits"
  | "muscle"
  | "calorie_target"
  | "eating_out"
  | "other";

export function classifyConsultationNeed(text: string): ConsultationNeed {
  const t = text.trim().replace(/[。！!？?]/g, "");
  const numbered = t.match(/^[①②③④⑤⑥1-6]/u)?.[0];
  const numberMap: Record<string, ConsultationNeed> = {
    "①": "weight_loss", "1": "weight_loss", "②": "habits", "2": "habits",
    "③": "muscle", "3": "muscle", "④": "calorie_target", "4": "calorie_target",
    "⑤": "eating_out", "5": "eating_out", "⑥": "other", "6": "other",
  };
  if (numbered) return numberMap[numbered];
  if (/外食|便當|自助餐|超商|便利商店/u.test(t)) return "eating_out";
  if (/一天.*吃多少|每日.*熱量|熱量目標|不知道.*吃多少/u.test(t)) return "calorie_target";
  if (/增肌|提高蛋白質|增加肌肉/u.test(t)) return "muscle";
  if (/改善飲食|飲食習慣|戒宵夜|戒飲料/u.test(t)) return "habits";
  if (/瘦|減脂|减脂|目標體重/u.test(t)) return "weight_loss";
  return "other";
}

const GREETINGS = new Set([
  "在嗎",
  "嗨",
  "哈囉",
  "你好",
  "您好",
  "hello",
  "hi",
  "hey",
  "謝謝",
  "感謝",
]);

export function isGreetingText(text: string): boolean {
  return GREETINGS.has(text.trim().toLowerCase());
}

export function isHelpRequest(text: string): boolean {
  return /^(?:怎麼用|使用方式|help|幫助)$/iu.test(text.trim());
}

export function isNonMealMessageType(type: string | undefined): boolean {
  return type === "sticker";
}

/** Pure emoji / kaomoji bubbles — never route to help or correction hints. */
export function isEmojiOnlyMessage(text: string): boolean {
  const t = text.trim();
  if (!t) return false;
  const stripped = t.replace(
    /[\p{Extended_Pictographic}\p{Emoji_Presentation}\p{Emoji_Modifier}\uFE0F\u200D\s]/gu,
    "",
  );
  if (stripped.length > 0) return false;
  return /[\p{Extended_Pictographic}\p{Emoji_Presentation}]/u.test(t);
}

export function looksLikeUpgrade(text: string): boolean {
  const t = text.trim();
  return (
    t === "升級" ||
    t.includes("升級") ||
    t.includes("買會員") ||
    t.includes("付費") ||
    t.includes("訂閱")
  );
}

export function looksLikeChallengeStart(text: string): boolean {
  const t = text.trim();
  if (
    /^(?:開始挑戰|開始30天挑戰|開始 30 天挑戰|我要參加三十天減脂挑戰)$/u.test(t)
  ) {
    return true;
  }
  // 「我要參加三十天健身減脂計劃」／「加入 30 天挑戰」
  const wantsJoin =
    /(?:參加|加入|報名)/u.test(t) ||
    /(?:開始).{0,8}(?:挑戰|計劃|計畫)/u.test(t) ||
    /我要(?:參加|加入|報名|挑戰)/u.test(t);
  const mentionsDays = /(?:30\s*天|三十天)/u.test(t);
  const mentionsPlan = /(?:挑戰|計劃|計畫|減脂|健身)/u.test(t);
  return wantsJoin && mentionsDays && mentionsPlan;
}

export function looksLikeChallengeStatus(text: string): boolean {
  return /^(?:今日任務|打卡狀態|挑戰進度|我的挑戰)$/u.test(text.trim());
}

/**
 * Daily totals / remaining — SQL path only.
 * Keep narrow so meal logs like「晚餐吃雞胸」do not get stolen.
 */
export function looksLikeDailyQuestion(text: string): boolean {
  const q = text.trim();
  if (!q) return false;
  if (
    /還能吃多少|今天吃了?多少|今日吃了?多少|今天攝取|今日攝取|今日狀態|今天狀態|今日摘要/.test(
      q,
    )
  ) {
    return true;
  }
  if (/(?:今天|今日).*(?:還能吃|蛋白|超標|還差|多少)/.test(q)) {
    return true;
  }
  if (/蛋白質還差|還差多少蛋白/.test(q)) return true;
  if (/(?:今天|今日).*(?:麥當勞|速食|宵夜|晚餐建議|建議吃)/.test(q)) {
    return true;
  }
  return false;
}

export function shouldAnalyzeTextMeal(text: string): boolean {
  const t = text.trim().toLowerCase();
  if (t.length < 2) return false;
  if (looksLikeFoodAdviceQuestion(t)) return false;

  const keywords = [
    "吃",
    "喝",
    "餐",
    "飯",
    "麵",
    "早餐",
    "午餐",
    "晚餐",
    "點心",
    "麥當勞",
    "便當",
    "kcal",
    "卡",
  ];
  return keywords.some((keyword) => t.includes(keyword));
}

/** Advice / what-to-eat questions → coach chat, not meal logging. */
export function looksLikeFoodAdviceQuestion(text: string): boolean {
  const t = text.trim();
  if (/(?:吃了|喝了|剛剛吃|剛吃|剛喝)/.test(t)) return false;
  if (/^(?:早餐|午餐|晚餐|點心)[:：]/.test(t)) return false;
  return (
    /(?:可以|該|該不該|要不要|適合|建議).*(?:吃|喝)/.test(t) ||
    /(?:吃|喝).*(?:什麼|嗎|好嗎)/.test(t) ||
    /(?:宵夜|減脂|增肌).*(?:吃|喝)/.test(t)
  );
}

export function isPendingMealCorrection(text: string): boolean {
  const t = text.trim();
  if (!t) return false;

  // Natural Chinese swaps: 是A不是B / 不是B是A / 應該是A
  if (/是.+不是|不是.+是|應該是|搞錯了?|弄錯了?|認錯了?|看錯了?/.test(t)) {
    return true;
  }

  // Diet / attribute clarifications: 「這是素食」「改成素食」「沒有肉」
  if (
    /(?:這是|那是|改成|改為).*(?:素食|素的|全素|蛋奶素|沒有肉|無肉)/u.test(t) ||
    /(?:是素食|吃素|沒有肉|全素|蛋奶素)/u.test(t)
  ) {
    return true;
  }

  // Pronoun / typo negations: 「他不是炸豆腐」「它不是X」「那不是X」
  if (/(?:他|它|那|這)?不是[\u4e00-\u9fffA-Za-z0-9]/u.test(t)) {
    return true;
  }

  if (
    /(?:更正|改成|改為|其實|補充|補上|新增|加上|還有|多了|少了|我是|不是)/u.test(
      t,
    )
  ) {
    return true;
  }

  // Short 「是鹹酥雞」「這是雞腿」 style fix while a pending meal is open
  if (
    /^(?:是|這是|那是)[\u4e00-\u9fffA-Za-z0-9].{0,40}$/u.test(t) &&
    !isGreetingText(t) &&
    !isHelpRequest(t)
  ) {
    return true;
  }

  return false;
}

/**
 * Rule-based intent before any meal GPT call.
 * Priority: daily → challenge → upgrade → help → pending → greeting → meal → chitchat.
 * Pending corrections must beat greeting so 「是A不是B」 never becomes help copy.
 */
export function classifyTextIntent(
  text: string,
  options?: { hasPendingMeal?: boolean },
): TextIntent {
  const t = text.trim();
  if (!t) return "chitchat";
  if (isEmojiOnlyMessage(t)) return "chitchat";

  if (looksLikeDailyQuestion(t)) return "daily_status";
  if (looksLikeChallengeStart(t)) return "challenge_start";
  if (looksLikeChallengeStatus(t)) return "challenge_status";
  if (looksLikeUpgrade(t)) return "upgrade";
  if (isHelpRequest(t)) return "help";

  // Correction path before greeting — critical for pending meals
  if (options?.hasPendingMeal && isPendingMealCorrection(t)) {
    return "pending_correction";
  }

  if (isGreetingText(t)) return "greeting";
  if (looksLikeFoodAdviceQuestion(t)) return "chitchat";
  if (shouldAnalyzeTextMeal(t)) return "meal";
  return "chitchat";
}
