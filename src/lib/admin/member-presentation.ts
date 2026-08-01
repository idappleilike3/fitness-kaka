type AdminMemberRow = {
  id: string;
  display_name: string | null;
  line_user_id: string;
};

type AdminMemberSubscription = {
  plan_id: string;
  expires_at: string | null;
  status: string;
} | null;

type AdminGrantHistory = {
  planId: string;
  grantedAt: string;
  expiresAt: string | null;
  grantedBy: string;
};

export function toAdminMember(
  member: AdminMemberRow,
  current: AdminMemberSubscription,
  grantHistory: AdminGrantHistory[] = [],
  operations: {
    challenge?: unknown;
    todayMeals?: number;
    todayQuota?: { imageUsed: number; textUsed: number; voiceUsed: number };
    paymentHistory?: unknown[];
    operationHistory?: unknown[];
  } = {},
) {
  return {
    id: member.id,
    displayName: member.display_name?.trim() || "未設定名稱",
    lineUserId: member.line_user_id,
    currentPlanId: current?.plan_id ?? "free",
    currentExpiresAt: current?.expires_at ?? null,
    currentStatus: current?.status ?? "inactive",
    grantHistory,
    challenge: operations.challenge ?? null,
    todayMeals: operations.todayMeals ?? 0,
    todayQuota: operations.todayQuota ?? {
      imageUsed: 0,
      textUsed: 0,
      voiceUsed: 0,
    },
    paymentHistory: operations.paymentHistory ?? [],
    operationHistory: operations.operationHistory ?? [],
  };
}
