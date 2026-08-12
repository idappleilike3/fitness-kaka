export const MEAL_SLOTS = ["breakfast", "lunch", "dinner"] as const;
export type MealSlot = (typeof MEAL_SLOTS)[number];

const SLOT_ORDER = new Map(MEAL_SLOTS.map((slot, index) => [slot, index]));

export function maxMealSlotsForPlan(planId: string): number {
  if (planId === "plan_799" || planId === "plan_7190") return 3;
  if (planId === "plan_399" || planId === "plan_3590") return 2;
  if (planId === "plan_299") return 1;
  return 0;
}

export function canReceiveMealFollowups(
  planId: string,
  membershipActive: boolean,
): boolean {
  return membershipActive && maxMealSlotsForPlan(planId) > 0;
}

export function normalizeMealSlots(
  selected: readonly MealSlot[],
  planId: string,
): MealSlot[] {
  const max = maxMealSlotsForPlan(planId);
  if (max === 0) return [];
  const unique = [...new Set(selected)].sort(
    (a, b) => (SLOT_ORDER.get(a) ?? 99) - (SLOT_ORDER.get(b) ?? 99),
  );
  const fallback: MealSlot[] = ["breakfast"];
  return (unique.length ? unique : fallback).slice(0, max);
}

export function nextFollowupState(
  current: { misses: number; paused: boolean },
  event: "push" | "member_message",
): { misses: number; paused: boolean } {
  if (event === "member_message") return { misses: 0, paused: false };
  const misses = current.misses + 1;
  return { misses, paused: misses >= 3 };
}

export function parseMealSlotCommand(text: string): MealSlot[] | null {
  const value = text.trim();
  if (/^(?:關閉|停止|取消)(?:餐次)?提醒$/u.test(value)) return [];
  if (!/^提醒/u.test(value) || value === "提醒設定") return null;
  return MEAL_SLOTS.filter((slot) => {
    const label = { breakfast: "早餐", lunch: "午餐", dinner: "晚餐" }[slot];
    return value.includes(label);
  });
}
