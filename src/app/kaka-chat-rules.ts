export const KAKA_LINE_URL = "https://lin.ee/5rxQDpa";

export type KakaTopicId =
  | "healthy-loss"
  | "today-meal"
  | "meal-scenarios"
  | "protein"
  | "trial"
  | "plans";

export type KakaSuggestion = {
  id: KakaTopicId;
  label: string;
};

export type KakaReply = {
  id: KakaTopicId | "medical-safety" | "fallback";
  answer: string;
  followUps: KakaTopicId[];
  lineUrl?: string;
};

export const KAKA_SUGGESTIONS: readonly KakaSuggestion[] = [
  { id: "healthy-loss", label: "怎麼健康減脂？" },
  { id: "today-meal", label: "今天怎麼吃？" },
  { id: "meal-scenarios", label: "外食／超商怎麼選？" },
  { id: "protein", label: "蛋白質怎麼補？" },
  { id: "trial", label: "7 天體驗有什麼？" },
  { id: "plans", label: "方案怎麼選？" },
] as const;

const REPLIES: Record<KakaTopicId, Omit<KakaReply, "id">> = {
  "healthy-loss": {
    answer: "健康減脂不是越少吃越好。先知道自己的每日需求，再用足夠蛋白質、蔬菜與可持續的熱量差慢慢調整；每週約 0.25～0.75 公斤通常比較容易維持。",
    followUps: ["today-meal", "protein", "trial"],
  },
  "today-meal": {
    answer: "先把一餐配成：一掌心蛋白質、兩拳蔬菜和一拳主食。今天若已吃得比較油，下一餐回到清爽正常份量，不用跳餐補償。",
    followUps: ["meal-scenarios", "protein", "healthy-loss"],
  },
  "meal-scenarios": {
    answer: "外食先找便當或自助餐的蛋白質＋兩份青菜；超商可選雞胸、茶葉蛋或無糖豆漿搭地瓜與沙拉；居家則用一鍋料理把肉、菜和主食一起配好。",
    followUps: ["today-meal", "protein", "trial"],
  },
  protein: {
    answer: "每餐先安排一份蛋白質最簡單，例如雞蛋、豆腐、魚、雞肉、無糖豆漿或希臘優格。卡卡會依你的目標顯示今天還差多少，不需要一次補完。",
    followUps: ["today-meal", "meal-scenarios", "trial"],
  },
  trial: {
    answer: "7 天免費體驗可以建立個人熱量與蛋白質方向、用餐點照片看營養估算，並查看今天下一餐最值得調整的一件事。加入 LINE 就能開始，不用下載 App。",
    followUps: ["healthy-loss", "meal-scenarios", "plans"],
  },
  plans: {
    answer: "如果想先試用，從 7 天免費體驗開始；想拿到完整個人化 7 日菜單，可看 NT$299 方案。需要更完整的追蹤與陪伴，可以到 LINE 告訴卡卡你的目標再選。",
    followUps: ["trial", "healthy-loss", "today-meal"],
    lineUrl: KAKA_LINE_URL,
  },
};

const KEYWORDS: Record<KakaTopicId, readonly string[]> = {
  "healthy-loss": ["健康減脂", "健康瘦", "減肥", "減重", "瘦身", "不復胖", "熱量差"],
  "today-meal": ["今天吃", "怎麼吃", "下一餐", "早餐", "午餐", "晚餐", "餐盤"],
  "meal-scenarios": ["外食", "超商", "便利商店", "居家", "自煮", "便當", "聚餐"],
  protein: ["蛋白質", "雞胸", "豆漿", "豆腐", "茶葉蛋", "高蛋白"],
  trial: ["7天", "七天", "免費", "體驗", "試用"],
  plans: ["方案", "價格", "費用", "多少錢", "299", "購買", "付費"],
};

const MEDICAL_TERMS = [
  "糖尿病", "高血壓", "腎臟", "懷孕", "孕婦", "飲食障礙", "厭食", "暴食",
  "停藥", "藥物", "診斷", "胸痛", "暈倒", "500卡", "斷食", "催吐",
];

function normalize(input: string): string {
  return input.toLowerCase().replace(/[\s，。！？、,.!?／/_-]+/g, "");
}

export function getKakaSuggestion(id: KakaTopicId): KakaSuggestion {
  return KAKA_SUGGESTIONS.find((item) => item.id === id) ?? KAKA_SUGGESTIONS[0];
}

export function matchKakaAnswer(input: string): KakaReply {
  const normalized = normalize(input);

  if (MEDICAL_TERMS.some((term) => normalized.includes(normalize(term)))) {
    return {
      id: "medical-safety",
      answer: "這個問題涉及疾病、藥物或身體安全，卡卡不能替你診斷或調整藥物。請先諮詢醫師或營養師；若想整理一般飲食問題，也可以到 LINE 告訴我們你的情況。",
      followUps: ["healthy-loss", "today-meal"],
      lineUrl: KAKA_LINE_URL,
    };
  }

  const ranked = (Object.entries(KEYWORDS) as [KakaTopicId, readonly string[]][])
    .map(([id, words]) => ({
      id,
      score: words.reduce((score, word) => score + (normalized.includes(normalize(word)) ? normalize(word).length : 0), 0),
    }))
    .sort((a, b) => b.score - a.score);

  if (ranked[0]?.score > 0) {
    return { id: ranked[0].id, ...REPLIES[ranked[0].id] };
  }

  return {
    id: "fallback",
    answer: "卡卡目前先回答健康減脂、飲食、蛋白質、7 天體驗和方案問題。你可以點下面的問題繼續，或到 LINE 讓我們親自了解你的需要。",
    followUps: ["healthy-loss", "today-meal", "trial"],
    lineUrl: KAKA_LINE_URL,
  };
}
