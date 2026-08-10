import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  updateResult: { error: { message: "write failed" } } as {
    error: { message: string } | null;
  },
  selectResult: {
    data: null,
    error: { message: "read failed" },
  } as { data: Record<string, unknown> | null; error: { message: string } | null },
  preferenceResult: {
    data: null,
    error: null,
  } as { data: Record<string, unknown> | null; error: { message: string } | null },
  writes: [] as Array<{ table: string; kind: string; payload: Record<string, unknown> }>,
}));

vi.mock("@/lib/supabase/admin", () => ({
  getAdminDb: () => ({
    from: (table: string) => ({
      select: () => ({
        eq: () => ({
          eq: () => ({ maybeSingle: async () => mocks.preferenceResult }),
          maybeSingle: async () => mocks.selectResult,
        }),
      }),
      update: (payload: Record<string, unknown>) => ({
        eq: async () => {
          mocks.writes.push({ table, kind: "update", payload });
          return mocks.updateResult;
        },
      }),
      upsert: async (payload: Record<string, unknown>) => {
        mocks.writes.push({ table, kind: "upsert", payload });
        return { error: null };
      },
      insert: async (payload: Record<string, unknown>) => {
        mocks.writes.push({ table, kind: "insert", payload });
        return { error: null };
      },
    }),
  }),
}));

import { getProfile, patchProfile } from "@/repositories/profiles";

describe("profile persistence", () => {
  it("stores new onboarding preferences without requiring new member_profiles columns", async () => {
    mocks.updateResult.error = null;
    mocks.writes.length = 0;

    await patchProfile("member-1", {
      height_cm: 165,
      health_context: "none",
      eating_pattern: "mixed",
    });

    expect(mocks.writes).toEqual([
      {
        table: "member_profiles",
        kind: "update",
        payload: { height_cm: 165 },
      },
      {
        table: "workout_plans",
        kind: "insert",
        payload: {
          member_id: "member-1",
          title: "nutrition_onboarding_preferences",
          plan_json: { health_context: "none", eating_pattern: "mixed" },
        },
      },
    ]);
  });

  it("rejects when Supabase did not save an onboarding answer", async () => {
    mocks.updateResult.error = { message: "write failed" };
    await expect(
      patchProfile("member-1", { height_cm: 165 }),
    ).rejects.toThrow("write failed");
  });

  it("rejects a profile read error instead of treating it as missing memory", async () => {
    await expect(getProfile("member-1")).rejects.toThrow("read failed");
  });
});
