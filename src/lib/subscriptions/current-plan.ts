export type SubscriptionCandidate = {
  plan_id: string;
  status: string;
  expires_at: string | null;
};

export type CurrentPlan = {
  planId: string;
  expiresAt: string | null;
};

const PLAN_PRIORITY = [
  "plan_7190",
  "plan_799",
  "plan_3590",
  "plan_399",
] as const;

function isUnexpired(expiresAt: string | null, now: Date): boolean {
  if (!expiresAt) return true;
  const expires = new Date(expiresAt);
  return !Number.isNaN(expires.getTime()) && expires > now;
}

/**
 * Resolves the effective membership from subscriptions using absolute timestamps.
 * A row is eligible only when it remains active and has not reached expires_at.
 */
export function resolveCurrentPlan(
  subscriptions: SubscriptionCandidate[],
  now: Date = new Date(),
): CurrentPlan {
  const active = subscriptions.filter(
    (subscription) =>
      subscription.status === "active" &&
      isUnexpired(subscription.expires_at, now),
  );

  const preferred =
    PLAN_PRIORITY.map((planId) =>
      active
        .filter((subscription) => subscription.plan_id === planId)
        .sort((a, b) => {
          const aExpiry = a.expires_at ? new Date(a.expires_at).getTime() : Infinity;
          const bExpiry = b.expires_at ? new Date(b.expires_at).getTime() : Infinity;
          return bExpiry - aExpiry;
        })[0],
    ).find(Boolean) ??
    active.find((subscription) => subscription.plan_id !== "free");

  return preferred
    ? { planId: preferred.plan_id, expiresAt: preferred.expires_at }
    : { planId: "free", expiresAt: null };
}

export function isPaidCurrentPlan(planId: string): boolean {
  return planId !== "free";
}
