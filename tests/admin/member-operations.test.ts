import { describe, expect, it } from "vitest";

import { parseMemberOperation } from "@/lib/admin/member-operations";

describe("admin member operations", () => {
  it("accepts a manual payment with a positive integer amount and plan", () => {
    expect(
      parseMemberOperation({
        memberId: "member-1",
        action: "record_payment",
        planId: "plan_399",
        amountTwd: 399,
        note: "LINE 匯款",
      }),
    ).toEqual({
      memberId: "member-1",
      action: "record_payment",
      planId: "plan_399",
      amountTwd: 399,
      note: "LINE 匯款",
    });
  });

  it("rejects a zero-day extension", () => {
    expect(
      parseMemberOperation({
        memberId: "member-1",
        action: "extend",
        days: 0,
      }),
    ).toBeNull();
  });

  it("accepts pause and resume without unrelated values", () => {
    expect(
      parseMemberOperation({ memberId: "member-1", action: "pause" }),
    ).toEqual({ memberId: "member-1", action: "pause", note: null });
    expect(
      parseMemberOperation({ memberId: "member-1", action: "resume" }),
    ).toEqual({ memberId: "member-1", action: "resume", note: null });
  });
});
