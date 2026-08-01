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
