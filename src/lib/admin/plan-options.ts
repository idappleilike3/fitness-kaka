export const ADMIN_PLAN_OPTIONS = {
  plan_299: { label: "7 天個人化減脂菜單 NT$299", amount: 299, kind: "one_time" },
  plan_399: { label: "卡卡 Plus 月繳 NT$399", amount: 399, kind: "subscription" },
  plan_799: { label: "卡卡 Pro 月繳 NT$799", amount: 799, kind: "subscription" },
  plan_3590: { label: "卡卡 Plus 年繳 NT$3,590", amount: 3590, kind: "subscription" },
  plan_7190: { label: "卡卡 Pro 年繳 NT$7,190", amount: 7190, kind: "subscription" },
} as const;

export type AdminPlanId = keyof typeof ADMIN_PLAN_OPTIONS;

export function defaultPlanAmount(planId: AdminPlanId): number {
  return ADMIN_PLAN_OPTIONS[planId].amount;
}
