import type { ProfileRow } from "@/repositories/profiles";

export type MealContext = "mixed" | "eating_out" | "convenience" | "home";

export type MenuQuestionnaire = {
  mealContext: MealContext;
  mealsPerDay: 2 | 3 | 4;
  budgetPerMeal: number;
  allergies: string[];
  dislikedFoods: string[];
  dietStyle: "general" | "ovo_lacto" | "vegan" | "low_carb" | "no_pork" | "no_beef";
  includeDrinks: boolean;
  includeLateSnack: boolean;
  notes: string;
};

export type GeneratedMeal = {
  name: string;
  description: string;
  kcal: number;
  proteinG: number;
  alternatives: string[];
};

export type GeneratedMenuDay = {
  day: number;
  title: string;
  meals: GeneratedMeal[];
  totalKcal: number;
  totalProteinG: number;
  coachMessage: string;
};

export type GeneratedMenu = {
  calorieTarget: number;
  proteinTarget: number;
  context: MealContext;
  days: GeneratedMenuDay[];
  generatedAt: string;
  disclaimer: string;
  source?: "openai" | "safe_fallback" | "rules";
};

const OPTIONS: Record<MealContext, Array<Omit<GeneratedMeal, "kcal" | "proteinG"> & { kcalRatio: number; proteinRatio: number }>> = {
  eating_out: [
    { name: "早餐店蛋白質早餐", description: "蛋餅減醬＋無糖豆漿，可依飽足感加茶葉蛋", kcalRatio: 0.23, proteinRatio: 0.22, alternatives: ["鮪魚蛋吐司不加美乃滋", "地瓜＋茶葉蛋＋無糖豆漿"] },
    { name: "便當店平衡午餐", description: "半碗飯、兩份青菜、一份掌心大主菜", kcalRatio: 0.36, proteinRatio: 0.39, alternatives: ["烤雞腿便當飯減半", "滷雞胸便當加青菜"] },
    { name: "日常外食晚餐", description: "湯麵減少湯量並加蛋或豆腐，或自助餐選三菜一肉", kcalRatio: 0.31, proteinRatio: 0.31, alternatives: ["火鍋多菜多肉少加工品", "牛肉湯＋半碗飯＋燙青菜"] },
    { name: "彈性點心", description: "水果搭配優格或無糖豆漿，不需要完全戒甜", kcalRatio: 0.1, proteinRatio: 0.08, alternatives: ["小份水果＋優格", "無糖拿鐵"] },
  ],
  convenience: [
    { name: "超商早餐組合", description: "地瓜＋茶葉蛋＋無糖豆漿", kcalRatio: 0.22, proteinRatio: 0.22, alternatives: ["御飯糰＋高蛋白牛奶", "全麥三明治＋無糖拿鐵"] },
    { name: "超商午餐組合", description: "舒肥雞胸＋飯糰＋沙拉，醬料用一半", kcalRatio: 0.36, proteinRatio: 0.4, alternatives: ["健康餐盒＋茶葉蛋", "關東煮白蘿蔔、蛋、豆腐＋飯糰"] },
    { name: "超商晚餐組合", description: "烤地瓜＋雞胸或豆腐＋蔬菜湯", kcalRatio: 0.31, proteinRatio: 0.31, alternatives: ["蕎麥麵＋溏心蛋", "鮪魚飯糰＋沙拉＋豆漿"] },
    { name: "超商點心", description: "優格或高蛋白飲，選一份就好", kcalRatio: 0.11, proteinRatio: 0.07, alternatives: ["無糖優格", "小瓶高蛋白飲"] },
  ],
  home: [
    { name: "居家簡單早餐", description: "燕麥、牛奶或豆漿，加一顆蛋與水果", kcalRatio: 0.23, proteinRatio: 0.22, alternatives: ["全麥吐司＋蛋＋豆漿", "希臘優格燕麥碗"] },
    { name: "居家平衡午餐", description: "一碗飯、掌心大蛋白質、兩拳蔬菜", kcalRatio: 0.35, proteinRatio: 0.39, alternatives: ["雞腿排＋糙米＋青菜", "鮭魚＋地瓜＋炒菇"] },
    { name: "居家清爽晚餐", description: "豆腐或魚肉搭蔬菜與適量主食", kcalRatio: 0.32, proteinRatio: 0.31, alternatives: ["豆腐菇菇鍋＋冬粉", "蒸魚＋半碗飯＋青菜"] },
    { name: "居家點心", description: "水果、堅果或無糖飲品擇一", kcalRatio: 0.1, proteinRatio: 0.08, alternatives: ["香蕉半根＋牛奶", "水果＋無糖優格"] },
  ],
  mixed: [],
};
OPTIONS.mixed = [...OPTIONS.eating_out.slice(0, 1), ...OPTIONS.convenience.slice(1, 2), ...OPTIONS.home.slice(2, 3), ...OPTIONS.eating_out.slice(3, 4)];

function safeTarget(profile: ProfileRow, key: "calorie_target" | "protein_g_target", fallback: number) {
  const value = Number(profile[key]);
  return Number.isFinite(value) && value > 0 ? Math.round(value) : fallback;
}

function filterMeal(meal: GeneratedMeal, questionnaire: MenuQuestionnaire): GeneratedMeal {
  const excluded = [...questionnaire.allergies, ...questionnaire.dislikedFoods].map((item) => item.trim()).filter(Boolean);
  if (!excluded.some((item) => `${meal.name}${meal.description}`.includes(item))) return meal;
  return {
    ...meal,
    name: "可替換的平衡餐",
    description: "已避開你填寫的不吃食物，請從替換選項選擇一份同類型餐點。",
  };
}

export function generateSevenDayMenu(profile: ProfileRow, questionnaire: MenuQuestionnaire, now = new Date()): GeneratedMenu {
  const calorieTarget = safeTarget(profile, "calorie_target", 1600);
  const proteinTarget = safeTarget(profile, "protein_g_target", 100);
  const base = OPTIONS[questionnaire.mealContext];
  const selected = base.slice(0, questionnaire.mealsPerDay === 2 ? 3 : questionnaire.mealsPerDay);

  const days = Array.from({ length: 7 }, (_, index) => {
    const rotated = selected.map((_, mealIndex) => selected[(mealIndex + index) % selected.length]);
    const meals = rotated.map((item) => filterMeal({
      name: item.name,
      description: item.description,
      kcal: Math.max(120, Math.round(calorieTarget * item.kcalRatio)),
      proteinG: Math.max(6, Math.round(proteinTarget * item.proteinRatio)),
      alternatives: item.alternatives,
    }, questionnaire));
    return {
      day: index + 1,
      title: index === 6 ? "彈性平衡日" : `生活減脂 Day ${index + 1}`,
      meals,
      totalKcal: meals.reduce((sum, meal) => sum + meal.kcal, 0),
      totalProteinG: meals.reduce((sum, meal) => sum + meal.proteinG, 0),
      coachMessage: index === 6
        ? "今天可以安排一餐喜歡的食物，不需要挨餓補償。慢慢吃、吃到滿足就好。"
        : "不用每餐都完美，先做到大方向接近目標就很棒。慢慢來，你正在建立能維持的節奏。",
    };
  });

  return {
    calorieTarget,
    proteinTarget,
    context: questionnaire.mealContext,
    days,
    generatedAt: now.toISOString(),
    disclaimer: "本菜單為一般健康飲食建議，不取代醫師或合格營養師針對疾病、孕期或特殊需求的評估。",
    source: "rules",
  };
}

export function parseMenuQuestionnaire(input: unknown): MenuQuestionnaire | null {
  if (!input || typeof input !== "object") return null;
  const value = input as Record<string, unknown>;
  const mealContext = value.mealContext;
  const mealsPerDay = Number(value.mealsPerDay);
  const budgetPerMeal = Number(value.budgetPerMeal);
  const dietStyle = value.dietStyle;
  if (!["mixed", "eating_out", "convenience", "home"].includes(String(mealContext))) return null;
  if (![2, 3, 4].includes(mealsPerDay)) return null;
  if (!Number.isFinite(budgetPerMeal) || budgetPerMeal < 0 || budgetPerMeal > 5000) return null;
  if (!["general", "ovo_lacto", "vegan", "low_carb", "no_pork", "no_beef"].includes(String(dietStyle))) return null;
  const strings = (raw: unknown) => Array.isArray(raw) ? raw.filter((item): item is string => typeof item === "string").map((item) => item.trim()).filter(Boolean).slice(0, 20) : [];
  return {
    mealContext: mealContext as MealContext,
    mealsPerDay: mealsPerDay as 2 | 3 | 4,
    budgetPerMeal: Math.round(budgetPerMeal),
    allergies: strings(value.allergies),
    dislikedFoods: strings(value.dislikedFoods),
    dietStyle: dietStyle as MenuQuestionnaire["dietStyle"],
    includeDrinks: Boolean(value.includeDrinks),
    includeLateSnack: Boolean(value.includeLateSnack),
    notes: typeof value.notes === "string" ? value.notes.trim().slice(0, 1000) : "",
  };
}
