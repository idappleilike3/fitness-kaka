export type EngagementPlan = "free" | "plan_299" | "plan_399" | "plan_799" | "plan_3590" | "plan_7190";
export type EngagementContext = {
  planId: EngagementPlan;
  profileCompleted: boolean;
  daysSinceJoined: number;
  daysSinceLastMeal: number | null;
  mealsToday: number;
  localHour: number;
  displayName?: string | null;
};
export type EngagementDecision = { key: string; message: string } | null;

const name = (value?: string | null) => value?.trim() || "你";

export function decideEngagement(ctx: EngagementContext): EngagementDecision {
  const who = name(ctx.displayName);
  if (!ctx.profileCompleted) {
    return {
      key: "finish_profile",
      message: `${who}，我们先把身体资料补完整，我才能帮你估算比较适合的热量与蛋白质。一次只问一题，不会很久。\n\n慢慢来，我会陪你把第一步做好。`,
    };
  }

  if (ctx.daysSinceLastMeal !== null && ctx.daysSinceLastMeal >= 3) {
    return {
      key: "care_inactive_3d",
      message: `${who}，最近是不是比较忙？不用补登前几天，从下一餐重新拍就好。你也可以告诉我是太忙、忘记拍，还是吃多了不想面对，我会帮你把步骤变简单。\n\n没有关系，我们从现在继续就好。`,
    };
  }

  if (ctx.planId === "free") {
    if (ctx.mealsToday === 0) {
      return {
        key: "free_first_meal",
        message: `${who}，今天可以先从一餐开始。直接拍你实际吃的食物，我会帮你估算热量、蛋白质、碳水和脂肪。\n\n不用追求完美，先看懂一餐就很棒。`,
      };
    }
    if (ctx.daysSinceJoined >= 2) {
      return {
        key: "free_value_tip",
        message: `${who}，你已经开始记录了。今天先观察一个重点：每餐有没有一份蛋白质。鸡蛋、豆腐、鱼、肉或无糖豆浆都可以。\n\n把一个习惯做好，比一次改很多更容易坚持。`,
      };
    }
  }

  const plus = ctx.planId === "plan_399" || ctx.planId === "plan_3590";
  const pro = ctx.planId === "plan_799" || ctx.planId === "plan_7190";
  if (plus || pro) {
    if (ctx.localHour < 11) {
      return { key: "paid_morning", message: `${who}，早安。今天先喝一杯水，早餐记得安排一份蛋白质。忙的话也不用复杂，茶叶蛋加无糖豆浆就可以。\n\n今天照自己的节奏开始就很好。` };
    }
    if (ctx.localHour < 17) {
      return { key: "paid_noon", message: `${who}，午餐不用刻意吃很少，先选一份蛋白质，再加蔬菜和适量主食。外食一样可以慢慢瘦。\n\n吃得稳定，比忍到晚上更重要。` };
    }
    return { key: pro ? "pro_evening" : "plus_evening", message: `${who}，今天辛苦了。不管今天有没有完全照计划，都不用责怪自己。把最后一餐记录下来，我会帮你看明天最简单的调整。\n\n稳定比完美重要，你今天仍然有在前进。` };
  }

  return null;
}
