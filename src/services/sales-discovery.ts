export type SalesPlan = "plan_299" | "plan_399" | "plan_799" | null;

export type SalesSignals = {
  menuNeed: number;
  accountabilityNeed: number;
  challengeNeed: number;
  purchaseIntent: number;
  priceSensitive: boolean;
  pauseSelling: boolean;
  tags: string[];
};

const has = (text: string, words: string[]) => words.some((word) => text.includes(word));

export function detectSalesSignals(input: string): SalesSignals {
  const text = input.trim().toLowerCase();
  let menuNeed = 0;
  let accountabilityNeed = 0;
  let challengeNeed = 0;
  let purchaseIntent = 0;
  const tags: string[] = [];

  if (has(text, ["不知道吃什麼", "菜單", "食譜", "外食怎麼吃", "每天吃什麼"])) {
    menuNeed += 3;
    tags.push("菜單需求高");
  }
  if (has(text, ["容易放棄", "沒辦法堅持", "需要提醒", "嘴饞", "暴食", "常忘記"])) {
    accountabilityNeed += 3;
    tags.push("陪伴需求高");
  }
  if (has(text, ["30天", "三十天", "挑戰", "固定時間", "進度", "任務", "成果"])) {
    challengeNeed += 3;
    tags.push("挑戰需求高");
  }
  if (has(text, ["多少錢", "價格", "怎麼買", "我要買", "付款", "升級"])) {
    purchaseIntent += 3;
    tags.push("購買意願高");
  }
  const priceSensitive = has(text, ["太貴", "預算", "便宜", "沒錢", "先免費"]);
  if (priceSensitive) tags.push("價格敏感");
  const pauseSelling = has(text, ["不要推銷", "先不用", "不想買", "暫時不要", "晚點再說"]);
  if (pauseSelling) tags.push("暫停銷售");

  return { menuNeed, accountabilityNeed, challengeNeed, purchaseIntent, priceSensitive, pauseSelling, tags };
}

export function recommendPlan(signals: SalesSignals): SalesPlan {
  if (signals.pauseSelling) return null;
  if (signals.challengeNeed >= Math.max(signals.menuNeed, signals.accountabilityNeed) && signals.challengeNeed >= 3) return "plan_799";
  if (signals.accountabilityNeed >= Math.max(signals.menuNeed, signals.challengeNeed) && signals.accountabilityNeed >= 3) return "plan_399";
  if (signals.menuNeed >= 3) return "plan_299";
  return null;
}

export function salesDiscoveryQuestion(input: string): string | null {
  const signals = detectSalesSignals(input);
  if (signals.pauseSelling) return null;
  if (signals.menuNeed >= 3) return "你现在最困扰的是不知道怎么搭配，还是知道怎么吃却没时间准备呢？";
  if (signals.accountabilityNeed >= 3) return "你比较容易卡在忘记记录、晚上嘴馋，还是吃多一次就想放弃呢？";
  if (signals.challengeNeed >= 3) return "你希望有人每天给任务和追踪，还是比较想每周看到一次完整成果分析呢？";
  return null;
}

export function planRecommendationCopy(plan: Exclude<SalesPlan, null>): string {
  if (plan === "plan_299") {
    return "听起来你现在最需要的是把『每天吃什么』变简单。我可以依你的热量、蛋白质、预算与外食习惯，生成一份 7 天个人化菜单。你也可以先继续免费记录，觉得需要时再决定。\n\n先把选择变简单，你会更容易稳定做下去。";
  }
  if (plan === "plan_399") {
    return "你不是不知道怎么吃，而是少了一个每天帮你拉回节奏的人。399 每日陪跑会看你的记录、提醒蛋白质，也会在吃多时帮你调整，而不是责备你。你也可以先继续免费使用。\n\n你需要的可能不是更用力，而是有人陪你稳定下来。";
  }
  return "你比较适合有明确节奏的方式。799 会把 30 天拆成每天的小任务，搭配饮食、运动、记录与每周调整，让你不用一直猜下一步。你也可以先了解内容，不需要马上决定。\n\n把目标拆小，会比只靠意志力走得更稳。";
}
