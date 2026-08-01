export const GRANTABLE_PLAN_IDS = [
  "plan_399",
  "plan_799",
  "plan_3590",
  "plan_7190",
] as const;

export type GrantablePlanId = (typeof GRANTABLE_PLAN_IDS)[number];

export function validateGrantPlanId(value: unknown): GrantablePlanId | null {
  return typeof value === "string" &&
    (GRANTABLE_PLAN_IDS as readonly string[]).includes(value)
    ? (value as GrantablePlanId)
    : null;
}

export function isPaidPlan(value: unknown): value is GrantablePlanId {
  return validateGrantPlanId(value) !== null;
}

export function normalizeMemberSearch(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const query = value.trim();
  return query.length > 0 ? query.slice(0, 100) : null;
}

export function maskLineUserId(lineUserId: string): string {
  if (lineUserId.length <= 6) return "••••••";
  return `${lineUserId.slice(0, 3)}${"•".repeat(
    lineUserId.length - 6,
  )}${lineUserId.slice(-3)}`;
}

export function addDaysFromLatestExpiry(
  now: Date,
  existingExpiry: string | null | undefined,
  durationDays: number,
): Date {
  const existing = existingExpiry ? new Date(existingExpiry) : null;
  const startsAt =
    existing && !Number.isNaN(existing.getTime()) && existing > now
      ? existing
      : now;
  const expiresAt = new Date(startsAt);
  expiresAt.setUTCDate(expiresAt.getUTCDate() + durationDays);
  return expiresAt;
}
