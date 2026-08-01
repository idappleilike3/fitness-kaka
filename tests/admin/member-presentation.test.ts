import { describe, expect, it } from "vitest";

import { toAdminMember } from "@/lib/admin/member-presentation";

describe("admin member presentation", () => {
  it("includes the full LINE ID for the internal admin list", () => {
    expect(
      toAdminMember(
        {
          id: "member-1",
          display_name: "JENNIE",
          line_user_id: "U1234567890",
        },
        null,
      ),
    ).toMatchObject({
      displayName: "JENNIE",
      lineUserId: "U1234567890",
      currentPlanId: "free",
      challenge: null,
      todayMeals: 0,
      todayQuota: { imageUsed: 0, textUsed: 0, voiceUsed: 0 },
      paymentHistory: [],
      operationHistory: [],
    });
  });
});
