import { validateGrantPlanId, type GrantablePlanId } from "./grant-plan";

type PauseOperation = {
  memberId: string;
  action: "pause";
  note: string | null;
};

type ResumeOperation = {
  memberId: string;
  action: "resume";
  note: string | null;
};

type ExtendOperation = {
  memberId: string;
  action: "extend";
  days: number;
  note: string | null;
};

type RecordPaymentOperation = {
  memberId: string;
  action: "record_payment";
  planId: GrantablePlanId;
  amountTwd: number;
  note: string | null;
};

export type MemberOperation =
  | PauseOperation
  | ResumeOperation
  | ExtendOperation
  | RecordPaymentOperation;

export function parseMemberOperation(value: unknown): MemberOperation | null {
  if (!value || typeof value !== "object") return null;
  const input = value as Record<string, unknown>;
  const memberId =
    typeof input.memberId === "string" ? input.memberId.trim() : "";
  const note =
    typeof input.note === "string" && input.note.trim()
      ? input.note.trim().slice(0, 500)
      : null;
  if (!memberId) return null;
  if (input.action === "pause" || input.action === "resume") {
    return { memberId, action: input.action, note };
  }
  if (input.action === "extend") {
    const days = input.days;
    return Number.isInteger(days) && Number(days) >= 1 && Number(days) <= 365
      ? { memberId, action: "extend", days: Number(days), note }
      : null;
  }
  if (input.action === "record_payment") {
    const planId = validateGrantPlanId(input.planId);
    const amountTwd = input.amountTwd;
    return planId &&
      Number.isInteger(amountTwd) &&
      Number(amountTwd) >= 1 &&
      Number(amountTwd) <= 1_000_000
      ? {
          memberId,
          action: "record_payment",
          planId,
          amountTwd: Number(amountTwd),
          note,
        }
      : null;
  }
  return null;
}
