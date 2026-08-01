import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import {
  ADMIN_SESSION_COOKIE,
  createAdminSessionToken,
  hasAdminSession,
  verifyAdminPassphrase,
} from "@/lib/admin/auth";
import {
  addDaysFromLatestExpiry,
  isPaidPlan,
  maskLineUserId,
  normalizeMemberSearch,
  validateGrantPlanId,
} from "@/lib/admin/grant-plan";

describe("admin plan grant helpers", () => {
  it("denies an admin API request without a session cookie", () => {
    const request = new NextRequest("https://fitness-kaka.vercel.app/api/admin/members?q=JENNIE");

    expect(hasAdminSession(request)).toBe(false);
  });

  it("accepts a correctly signed unexpired admin session cookie", () => {
    process.env.ADMIN_PASSPHRASE = "owner-password-123";
    const token = createAdminSessionToken("owner-password-123", 1_800_000_000);
    const request = new NextRequest(
      "https://fitness-kaka.vercel.app/api/admin/members",
      { headers: { cookie: `${ADMIN_SESSION_COOKIE}=${token}` } },
    );

    expect(hasAdminSession(request, 1_800_000_100)).toBe(true);
  });

  it("rejects a wrong admin password", () => {
    process.env.ADMIN_PASSPHRASE = "owner-password-123";

    expect(verifyAdminPassphrase("wrong-password")).toBe(false);
  });

  it("accepts only paid plans that an admin can grant", () => {
    expect(validateGrantPlanId("plan_399")).toBe("plan_399");
    expect(validateGrantPlanId("plan_799")).toBe("plan_799");
    expect(validateGrantPlanId("plan_3590")).toBe("plan_3590");
    expect(validateGrantPlanId("plan_7190")).toBe("plan_7190");
    expect(validateGrantPlanId("free")).toBeNull();
    expect(validateGrantPlanId("plan_custom")).toBeNull();
  });

  it("identifies plans that should appear in the unlocked member list", () => {
    expect(isPaidPlan("plan_399")).toBe(true);
    expect(isPaidPlan("plan_799")).toBe(true);
    expect(isPaidPlan("plan_3590")).toBe(true);
    expect(isPaidPlan("plan_7190")).toBe(true);
    expect(isPaidPlan("free")).toBe(false);
  });

  it("requires a meaningful member search query", () => {
    expect(normalizeMemberSearch("  JENNIE  ")).toBe("JENNIE");
    expect(normalizeMemberSearch("  ")).toBeNull();
  });

  it("masks a LINE user id while preserving a recognizable suffix", () => {
    expect(maskLineUserId("U1234567890")).toBe("U12•••••890");
  });

  it("extends from a later active expiry instead of shortening it", () => {
    expect(
      addDaysFromLatestExpiry(
        new Date("2026-07-23T00:00:00.000Z"),
        "2026-08-01T00:00:00.000Z",
        30,
      ).toISOString(),
    ).toBe("2026-08-31T00:00:00.000Z");
  });

  it("starts a new grant from now when the existing expiry has passed", () => {
    expect(
      addDaysFromLatestExpiry(
        new Date("2026-07-23T00:00:00.000Z"),
        "2026-07-22T23:59:59.000Z",
        30,
      ).toISOString(),
    ).toBe("2026-08-22T00:00:00.000Z");
  });
});
