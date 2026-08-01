export type HealthScoreInput = {
  totalKcal: number;
  proteinG: number;
  calorieTarget: number;
  proteinTarget: number;
};

export type HealthScore =
  | { status: "incomplete"; score: null }
  | { status: "ready"; score: number };

/**
 * A transparent, non-medical daily adherence score.
 * It is only available after targets and confirmed nutrition totals exist.
 */
export function calculateHealthScore(input: HealthScoreInput): HealthScore {
  if (
    input.calorieTarget <= 0 ||
    input.proteinTarget <= 0 ||
    (input.totalKcal <= 0 && input.proteinG <= 0)
  ) {
    return { status: "incomplete", score: null };
  }

  const caloriePenalty = Math.min(
    50,
    Math.floor(
      (Math.abs(input.totalKcal - input.calorieTarget) / input.calorieTarget) *
        100,
    ),
  );
  const proteinGapPercent = Math.max(
    0,
    ((input.proteinTarget - input.proteinG) / input.proteinTarget) * 100,
  );
  const proteinPenalty = Math.min(50, Math.ceil(proteinGapPercent / 2));

  return {
    status: "ready",
    score: Math.max(0, 100 - caloriePenalty - proteinPenalty),
  };
}


export type ChallengeMilestone = {
  day: 7 | 14 | 21 | 30;
  icon: string;
  title: string;
  message: string;
};

const CHALLENGE_MILESTONES: ChallengeMilestone[] = [
  { day: 7, icon: "🥉", title: "开始养成", message: "你已经连续记录 7 天，新的习惯正在成形。" },
  { day: 14, icon: "🥈", title: "持续坚持", message: "连续 14 天完成记录，你已经走过一半的重要路程。" },
  { day: 21, icon: "🥇", title: "建立习惯", message: "连续 21 天完成记录，饮食记录已经越来越自然。" },
  { day: 30, icon: "👑", title: "挑战完成", message: "恭喜完成 30 天挑战，这是你认真照顾自己的证明。" },
];

export function getChallengeMilestone(streakDays: number): ChallengeMilestone | null {
  return CHALLENGE_MILESTONES.find((item) => item.day === streakDays) ?? null;
}

export function challengeMilestoneMessage(milestone: ChallengeMilestone): string {
  return [
    `${milestone.icon} 30 天挑战勋章`,
    `Day ${milestone.day}｜${milestone.title}`,
    milestone.message,
    "继续记录下一餐，卡卡会陪你走到最后。",
  ].join("\n");
}
