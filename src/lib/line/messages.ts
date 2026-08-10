import type { QuotaLimits } from "@/lib/quota/daily";

export const DISCLAIMER =
  "⚠️ AI 推估可能有誤差，結果非醫療診斷";

export function consultationStartMessage(): string {
  return [
    "你好～我是卡卡健身減脂營養教練 💜",
    "你今天想問什麼？可以直接告訴我：",
    "",
    "・設定減脂目標，我幫你算每天適合吃多少",
    "・傳餐點照片，分析熱量、蛋白質、碳水和脂肪",
    "・確認內容後，記錄今天的飲食",
    "・查詢今天剩餘熱量和蛋白質",
    "",
    "那我們現在開始，你目前最想改善什麼？",
    "",
    "① 減脂、瘦下來",
    "② 改善飲食習慣",
    "③ 增肌、提高蛋白質",
    "④ 不知道自己一天該吃多少",
    "⑤ 常常外食，不知道怎麼選",
    "⑥ 其他，直接告訴卡卡",
  ].join("\n");
}

/** Shared plan display names (monthly + yearly share the same tier). */
export function planDisplayName(planId: string): string {
  if (planId === "plan_799" || planId === "plan_7190") return "卡卡 Pro 教練";
  if (planId === "plan_399" || planId === "plan_3590") return "卡卡 Plus";
  if (planId === "free") return "免費";
  return planId;
}

export function welcomeMessage(): string {
  return consultationStartMessage();
}

export function videoNotSupportedMessage(): string {
  return "教練目前不支援用影片算熱量喔！請傳餐點照片、打字描述，或用語音告訴我吃了什麼（付費方案）";
}

/** Free plan: voice quota is 0 — nudge upgrade. */
export function voiceUpgradeCtaMessage(): string {
  return [
    "語音飲食紀錄是付費功能",
    "升級後可用：",
    "・卡卡 Plus NT$399／30 天（或年繳 NT$3590）：圖片 10／文字 30／語音 5（每天）",
    "・卡卡 Pro 教練 NT$799／30 天（或年繳 NT$7190）：圖片 25／文字 60／語音 15（每天）",
    "",
    "也可先打字或傳照片紀錄。開啟會員中心即可升級",
  ].join("\n");
}

export function audioTooLongMessage(): string {
  return "語音請控制在 60 秒以內，再傳一次給教練喔";
}

export function quotaExhaustedMessage(
  kind: "image" | "text" | "voice",
  limits?: QuotaLimits,
  planId = "free",
): string {
  if (
    limits?.mealAnalysis !== undefined &&
    (kind === "image" || kind === "text")
  ) {
    return [
      `今日免費餐點分析 ${limits.mealAnalysis} 次已用完`,
      "傳照片或打字共用此額度；聊天、問問題與貼圖不扣次數",
      "額度會在明天 00:00（台灣時間）重新計算",
      "今天先把已記錄的餐看懂，想持續記錄可升級卡卡 Plus 或卡卡 Pro 教練",
    ].join("\n");
  }
  const label =
    kind === "image"
      ? "圖片辨識"
      : kind === "text"
        ? "文字飲食分析"
        : "語音飲食分析";
  if (planId !== "free") {
    return [
      `今日${label}額度已用完`,
      `你目前是${planDisplayName(planId)}會員`,
      "額度會在明天 00:00（台灣時間）重新計算",
      "仍可查看今天已紀錄的摘要",
    ].join("\n");
  }
  return [
    `今日${label}額度已用完`,
    "額度會在明天 00:00（台灣時間）重新計算",
    "今天先把已記錄的餐看懂，仍可查看今天已紀錄的摘要",
    "想持續記錄可升級卡卡 Plus 或卡卡 Pro 教練",
  ].join("\n");
}

export function helpMessage(): string {
  return [
    "【健身卡卡教練｜怎麼用】",
    "體驗：先從一餐開始，拍照或打字都可以",
    "記錄：每天留下看得懂的飲食紀錄",
    "陪伴：每天知道下一步該做什麼",
    "",
    "・傳食物照片 → AI 估熱量（需確認才存檔）",
    "・打字描述吃了什麼（例如：雞胸 150g＋白飯半碗）",
    "・免費方案：每天共 5 次餐點分析（照片／打字共用；聊天不扣）",
    "・卡卡 Plus NT$399／30 天或 NT$3590／年：圖片 10／文字 30／語音 5（每天）",
    "・卡卡 Pro 教練 NT$799／30 天或 NT$7190／年：圖片 25／文字 60／語音 15（每天）",
    "・語音記飲食（付費方案，最長 60 秒）",
    "・問「今天還能吃多少」看剩餘熱量／蛋白質",
    "・說「我要參加三十天減脂挑戰」開始挑戰",
    "・說「升級」或點選單「升級方案」開通會員",
    "・底部圖文選單可快速開啟常用功能",
    "・更多說明見官網 FAQ：https://fitness-kaka.vercel.app/faq",
    "",
    DISCLAIMER,
  ].join("\n");
}

export function mealLogTipMessage(): string {
  return [
    "【怎麼記飲食】",
    "1. 傳餐點照片（最清楚）",
    "2. 或打字：例如「早餐：無糖優格＋香蕉」",
    "3. 付費會員可用語音說吃了什麼",
    "",
    "辨識後請點「確認紀錄」才會寫入今日摘要",
    DISCLAIMER,
  ].join("\n");
}

const GOAL_TYPE_LABEL: Record<string, string> = {
  cut: "減脂",
  bulk: "增肌",
  maintain: "維持",
};

export function goalsSummaryMessage(profile: {
  goal_type: string | null;
  calorie_target: number | null;
  protein_g_target: number | null;
  carb_g_target: number | null;
  fat_g_target: number | null;
  weight_kg: number | null;
  target_weight_kg: number | null;
}): string {
  const goal =
    (profile.goal_type && GOAL_TYPE_LABEL[profile.goal_type]) ||
    profile.goal_type ||
    "—";
  const kcal = profile.calorie_target ?? 0;
  const protein = profile.protein_g_target ?? 0;
  const carb = profile.carb_g_target ?? 0;
  const fat = profile.fat_g_target ?? 0;
  const lines = [
    "【我的每日目標】",
    `目標類型：${goal}`,
  ];
  if (profile.weight_kg != null && profile.target_weight_kg != null) {
    lines.push(
      `體重 ${Number(profile.weight_kg)} kg → 目標 ${Number(profile.target_weight_kg)} kg`,
    );
  }
  lines.push(
    `熱量 ${kcal} kcal`,
    `蛋白質 ${protein}g｜碳水 ${carb}g｜脂肪 ${fat}g`,
    "",
    "若要重算目標，請到會員中心或重新完成建檔",
    DISCLAIMER,
  );
  return lines.join("\n");
}

export function upgradePlansMessage(
  liffUrl?: string,
  currentPlan?: { planId: string; expiresAt: string | null },
): string {
  if (currentPlan && currentPlan.planId !== "free") {
    const name = planDisplayName(currentPlan.planId);
    const expiry = currentPlan.expiresAt
      ? new Date(currentPlan.expiresAt).toLocaleDateString("zh-TW", {
          timeZone: "Asia/Taipei",
        })
      : "未設定";
    return `你已是${name}會員，效期至 ${expiry}\n可直接傳餐點照片、文字或語音紀錄`;
  }
  const lines = [
    "可選擇方案（一次付清，月繳或年繳）：",
    "・免費體驗：先從一餐開始；照片＋打字共用 5 次／天",
    "・卡卡 Plus（記錄）：月繳 NT$399／30 天，年繳 NT$3590（一天不到 10 元）",
    "  每天：圖片 10／文字 30／語音 5",
    "・卡卡 Pro 教練（陪伴）：月繳 NT$799／30 天，年繳 NT$7190（一天不到 20 元）",
    "  每天：圖片 25／文字 60／語音 15",
    "",
    "體驗：先從一餐開始",
    "記錄：每天留下看得懂的飲食紀錄",
    "陪伴：每天知道下一步該做什麼",
    "年繳比月繳划算，同方案額度相同",
  ];
  if (liffUrl) {
    lines.push("", `開啟會員中心升級：${liffUrl}`);
  } else {
    lines.push("", "請從會員中心選擇方案付款");
  }
  return lines.join("\n");
}

export function mealResultMessage(params: {
  lines: string[];
  totalKcal: number;
  proteinG: number;
  carbG: number;
  fatG: number;
  todayKcal: number;
  projectedKcal: number;
  projectedProteinG: number;
  remainingKcal: number;
  proteinLeft: number;
}): string {
  return [
    "餐點辨識結果（AI 推估）",
    "",
    ...params.lines,
    "",
    `預估總熱量：${params.totalKcal} kcal`,
    `蛋白質：${params.proteinG}g`,
    `碳水：${params.carbG}g`,
    `脂肪：${params.fatG}g`,
    "",
    `今日已攝取（已確認）：${params.todayKcal.toLocaleString("zh-TW")} kcal`,
    `若確認這餐，今日累計：約 ${params.projectedKcal.toLocaleString("zh-TW")} kcal、蛋白質 ${params.projectedProteinG}g`,
    `確認後預計剩餘：約 ${params.remainingKcal.toLocaleString("zh-TW")} kcal`,
    `確認後蛋白質還差：約 ${params.proteinLeft}g`,
    "",
    "這筆尚未儲存，點「確認紀錄」後才會計入今日摘要",
    "",
    DISCLAIMER,
  ].join("\n");
}

function postbackItem(label: string, data: string) {
  return {
    type: "action" as const,
    action: {
      type: "postback" as const,
      label,
      data,
      displayText: label,
    },
  };
}

export function mealConfirmQuickReply(pendingId: string) {
  return {
    items: [
      postbackItem("確認紀錄", `meal:confirm:${pendingId}`),
      postbackItem("不儲存", `meal:discard:${pendingId}`),
      postbackItem("重新辨識", `meal:retry:${pendingId}`),
    ],
  };
}

/** LINE Quick Reply — max 13 items; labels ≤ 20 chars. */
export function onboardingSexQuickReply() {
  return {
    items: [
      postbackItem("男", "onboarding:sex:male"),
      postbackItem("女", "onboarding:sex:female"),
    ],
  };
}

export function onboardingActivityQuickReply() {
  return {
    items: [
      postbackItem("久坐", "onboarding:activity:sedentary"),
      postbackItem("輕度", "onboarding:activity:light"),
      postbackItem("中度", "onboarding:activity:moderate"),
      postbackItem("高強度", "onboarding:activity:high"),
    ],
  };
}

export function onboardingFreqQuickReply() {
  return {
    items: [0, 1, 2, 3, 4, 5, 6, 7].map((n) =>
      postbackItem(`${n}次`, `onboarding:freq:${n}`),
    ),
  };
}

export function onboardingGoalQuickReply() {
  return {
    items: [
      postbackItem("減脂瘦身", "onboarding:goal:cut"),
      postbackItem("控制飲食", "onboarding:goal:diet"),
      postbackItem("增肌塑形", "onboarding:goal:bulk"),
      postbackItem("改善健康", "onboarding:goal:health"),
    ],
  };
}

export function onboardingHealthQuickReply() {
  return {
    items: [
      postbackItem("沒有", "onboarding:health:none"),
      postbackItem("懷孕／哺乳中", "onboarding:health:pregnant"),
      postbackItem("飲食失調困擾", "onboarding:health:eating_disorder"),
      postbackItem("慢性病／特殊疾病", "onboarding:health:medical"),
    ],
  };
}

export function onboardingEatingQuickReply() {
  return {
    items: [
      postbackItem("大多自己煮", "onboarding:eating:mostly_home"),
      postbackItem("自煮外食各半", "onboarding:eating:mixed"),
      postbackItem("大多外食", "onboarding:eating:mostly_out"),
    ],
  };
}

export function onboardingQuickReplyForStep(step: string | null | undefined) {
  switch (step) {
    case "sex":
      return onboardingSexQuickReply();
    case "activity":
      return onboardingActivityQuickReply();
    case "freq":
      return onboardingFreqQuickReply();
    case "goal":
      return onboardingGoalQuickReply();
    case "health":
      return onboardingHealthQuickReply();
    case "eating":
      return onboardingEatingQuickReply();
    default:
      return undefined;
  }
}
