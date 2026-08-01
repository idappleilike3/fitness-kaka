import type { QuotaKind } from "@/types";

export type QuotaCounters = {
  image: number;
  text: number;
  voice: number;
};

export type QuotaLimits = QuotaCounters & {
  /**
   * When set, image and text analyses share one daily budget.
   * Paid plans omit this field and retain separate limits.
   */
  mealAnalysis?: number;
};

export function canUse(
  used: QuotaCounters,
  limits: QuotaLimits,
  kind: QuotaKind,
): boolean {
  if (
    limits.mealAnalysis !== undefined &&
    (kind === "image" || kind === "text")
  ) {
    return used.image + used.text < limits.mealAnalysis;
  }
  return used[kind] < limits[kind];
}

export function increment(
  used: QuotaCounters,
  kind: QuotaKind,
): QuotaCounters {
  return { ...used, [kind]: used[kind] + 1 };
}

/** Business date in Asia/Taipei as YYYY-MM-DD. */
export function getTaipeiDate(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Taipei",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}
