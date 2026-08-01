import type { MemberSalesProfile } from "@/repositories/sales-profiles";

export type FunnelStage = "discovering" | "warming" | "qualified" | "considering" | "ready" | "paused";

export type FunnelContext = {
  profile: MemberSalesProfile;
  profileCompleted: boolean;
  mealsLast7Days: number;
  daysSinceLastMeal: number | null;
  currentPlanId: string;
  lastMemberMessage?: string | null;
  now?: Date;
};

export type FunnelDecision = {
  key: string;
  stage: FunnelStage;
  recommendedPlan: "plan_299" | "plan_399" | "plan_799" | null;
  shouldSend: boolean;
  reason: string;
  message: string | null;
  nextFollowupAt: string | null;
};

const DAY = 86_400_000;

function paused(profile: MemberSalesProfile, now: Date): boolean {
  return Boolean(profile.sales_paused_until && new Date(profile.sales_paused_until).getTime() > now.getTime());
}

function strongestPlan(profile: MemberSalesProfile): "plan_299" | "plan_399" | "plan_799" | null {
  const ranked = [
    { plan: "plan_299" as const, score: profile.menu_need_score },
    { plan: "plan_399" as const, score: profile.accountability_need_score },
    { plan: "plan_799" as const, score: profile.challenge_need_score },
  ].sort((a, b) => b.score - a.score);
  return ranked[0].score >= 3 ? ranked[0].plan : null;
}

function opportunityScore(profile: MemberSalesProfile): number {
  return Math.min(100, Math.round(
    profile.menu_need_score * 2 +
    profile.accountability_need_score * 2.5 +
    profile.challenge_need_score * 2.5 +
    profile.purchase_intent_score * 4,
  ));
}

function stageFor(profile: MemberSalesProfile, now: Date): FunnelStage {
  if (paused(profile, now)) return "paused";
  const score = opportunityScore(profile);
  if (score >= 75) return "ready";
  if (score >= 55) return "considering";
  if (score >= 35) return "qualified";
  if (score >= 15) return "warming";
  return "discovering";
}

function recentRecommendation(profile: MemberSalesProfile, now: Date): boolean {
  if (!profile.last_recommended_at) return false;
  return now.getTime() - new Date(profile.last_recommended_at).getTime() < 3 * DAY;
}

function messageFor(plan: "plan_299" | "plan_399" | "plan_799", stage: FunnelStage): string {
  if (plan === "plan_299") {
    return stage === "ready"
      ? "我记得你最困扰的是每天不知道怎么搭配。今天先给你一个简单做法：每餐先选一份蛋白质，再补蔬菜和适量主食。如果你愿意，我也可以依你的热量、预算与外食习惯，帮你整理成 7 天个人化菜单；你可以先看看，不用急着决定。\n\n先把选择变简单，你会更容易稳定做下去。"
      : "你最近提到吃什么常常要想很久。今天先不用改变很多，只要选一餐，把主食、蛋白质和蔬菜都放进去就好。之后如果你想，我再帮你把一周的选择整理得更简单。\n\n一步一步来，比一次做到完美更重要。";
  }
  if (plan === "plan_399") {
    return stage === "ready"
      ? "我听起来你不是不知道怎么吃，而是忙起来、嘴馋或吃多一次时，很容易失去节奏。今天先从下一餐重新开始就好。如果你愿意，399 每日陪跑会每天帮你看记录、提醒蛋白质，也会在你吃多时帮你调整，而不是责备你；你也可以先继续免费使用。\n\n你需要的可能不是更用力，而是有人陪你稳定下来。"
      : "你最近比较像是卡在坚持，而不是知识不够。今天只做一件事：下一餐拍下来，我帮你一起看。等你觉得需要更稳定的提醒时，再来了解陪跑也可以。\n\n不用逼自己一次改变很多，你已经在往前走。";
  }
  return stage === "ready"
    ? "你提到希望有明确任务、进度和固定时间内的改变。今天先完成一个小任务：记录一餐，并写下今天最想改善的一件事。如果你愿意，799 会把 30 天拆成每天的小任务与每周调整，让你不用一直猜下一步；你可以先了解内容，不需要马上决定。\n\n把目标拆小，会比只靠意志力走得更稳。"
    : "你比较适合有清楚节奏的方式。今天先完成一餐记录，明天再加一个小任务就好。等你准备好时，我再帮你看看是否适合 30 天陪跑。\n\n每天前进一点点，就已经很有力量。";
}

export function decideSalesFunnel(ctx: FunnelContext): FunnelDecision {
  const now = ctx.now ?? new Date();
  const stage = stageFor(ctx.profile, now);
  const plan = strongestPlan(ctx.profile);

  if (ctx.currentPlanId !== "free") {
    return { key: "paid_no_sales", stage, recommendedPlan: null, shouldSend: false, reason: "会员已有付费方案，不主动升级推销", message: null, nextFollowupAt: null };
  }
  if (!ctx.profileCompleted) {
    return { key: "profile_first", stage, recommendedPlan: null, shouldSend: false, reason: "资料未完成，先完成需求诊断", message: null, nextFollowupAt: null };
  }
  if (stage === "paused") {
    return { key: "sales_paused", stage, recommendedPlan: null, shouldSend: false, reason: "会员表示暂不购买，暂停销售跟进", message: null, nextFollowupAt: ctx.profile.sales_paused_until };
  }
  if (!plan) {
    return { key: "needs_more_discovery", stage, recommendedPlan: null, shouldSend: false, reason: "需求讯号不足，继续倾听，不主动推荐", message: null, nextFollowupAt: new Date(now.getTime() + 3 * DAY).toISOString() };
  }
  if (recentRecommendation(ctx.profile, now)) {
    return { key: "recommendation_cooldown", stage, recommendedPlan: plan, shouldSend: false, reason: "近期已推荐过方案，避免重复推销", message: null, nextFollowupAt: new Date(new Date(ctx.profile.last_recommended_at as string).getTime() + 3 * DAY).toISOString() };
  }
  if (ctx.daysSinceLastMeal !== null && ctx.daysSinceLastMeal >= 3) {
    return { key: "care_before_sales", stage, recommendedPlan: null, shouldSend: false, reason: "连续未记录，优先关怀，不销售", message: null, nextFollowupAt: new Date(now.getTime() + DAY).toISOString() };
  }
  if (ctx.mealsLast7Days < 1 && ctx.profile.purchase_intent_score < 3) {
    return { key: "value_first", stage, recommendedPlan: plan, shouldSend: false, reason: "尚未体验核心价值，先引导完成一餐", message: null, nextFollowupAt: new Date(now.getTime() + 2 * DAY).toISOString() };
  }
  if (stage !== "considering" && stage !== "ready") {
    return { key: "nurture_only", stage, recommendedPlan: plan, shouldSend: false, reason: "仍在暖客阶段，只提供价值，不主动成交", message: null, nextFollowupAt: new Date(now.getTime() + 3 * DAY).toISOString() };
  }

  return {
    key: `funnel_${plan}_${stage}`,
    stage,
    recommendedPlan: plan,
    shouldSend: true,
    reason: stage === "ready" ? "需求与购买意愿明确，适合自然提出方案" : "需求明确，先给建议后温和邀请了解方案",
    message: messageFor(plan, stage),
    nextFollowupAt: new Date(now.getTime() + (stage === "ready" ? 2 : 4) * DAY).toISOString(),
  };
}
