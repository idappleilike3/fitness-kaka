import { describe, expect, it } from "vitest";

import { resolveCurrentPlan } from "@/lib/subscriptions/current-plan";

describe("resolveCurrentPlan", () => {
  const now = new Date("2026-07-23T14:00:00.000Z");

  it("uses an unexpired active plan_799 over free or lower plans", () => {
    expect(
      resolveCurrentPlan(
        [
          {
            plan_id: "free",
            status: "active",
            expires_at: null,
          },
          {
            plan_id: "plan_399",
            status: "active",
            expires_at: "2026-08-01T00:00:00.000Z",
          },
          {
            plan_id: "plan_799",
            status: "active",
            expires_at: "2026-08-22T00:00:00.000Z",
          },
        ],
        now,
      ),
    ).toMatchObject({
      planId: "plan_799",
      expiresAt: "2026-08-22T00:00:00.000Z",
    });
  });

  it("prefers yearly Pro over monthly Plus", () => {
    expect(
      resolveCurrentPlan(
        [
          {
            plan_id: "plan_399",
            status: "active",
            expires_at: "2026-08-01T00:00:00.000Z",
          },
          {
            plan_id: "plan_7190",
            status: "active",
            expires_at: "2027-07-23T00:00:00.000Z",
          },
        ],
        now,
      ),
    ).toMatchObject({
      planId: "plan_7190",
      expiresAt: "2027-07-23T00:00:00.000Z",
    });
  });
});
