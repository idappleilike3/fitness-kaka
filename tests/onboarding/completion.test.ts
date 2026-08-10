import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  profile: null as Record<string, unknown> | null,
  preferences: null as Record<string, unknown> | null,
  savedPatch: null as Record<string, unknown> | null,
}));

vi.mock("@/lib/supabase/admin", () => ({
  getAdminDb: () => ({
    from: (table: string) => ({
      select: () => ({
        eq: () => ({
          eq: () => ({
            maybeSingle: async () => ({ data: state.preferences, error: null }),
          }),
          maybeSingle: async () => ({ data: state.profile, error: null }),
        }),
      }),
      update: (patch: Record<string, unknown>) => ({
        eq: async () => {
          if (table === "member_profiles") state.savedPatch = patch;
          return { error: null };
        },
      }),
    }),
  }),
}));

import { completeProfileIfReady } from "@/repositories/profiles";

const ordinaryProfile = {
  member_id: "member-1",
  sex: "female",
  age: 30,
  height_cm: 165,
  weight_kg: 60,
  target_weight_kg: 55,
  activity_level: "light",
  workout_frequency: 3,
  goal_type: "cut",
  health_context: "none",
  eating_pattern: "mostly_out",
  calorie_target: null,
  protein_g_target: null,
  carb_g_target: null,
  fat_g_target: null,
  profile_completed_at: null,
};

describe("personalized onboarding completion", () => {
  beforeEach(() => {
    state.savedPatch = null;
    state.profile = {
      ...ordinaryProfile,
      health_context: undefined,
      eating_pattern: undefined,
    };
    state.preferences = {
      plan_json: { health_context: "none", eating_pattern: "mostly_out" },
    };
  });

  it("saves ordinary BMI, BMR, TDEE and macro targets with next actions", async () => {
    const result = await completeProfileIfReady("member-1");

    expect(result.done).toBe(true);
    expect(state.savedPatch).toMatchObject({
      bmi: 22.04,
      calorie_target: 1452,
      protein_g_target: 108,
    });
    expect(result.summary).toContain("BMI 22.04");
    expect(result.summary).toContain("拍照分析");
    expect(result.summary).toContain("今天還能吃多少");
    expect(result.summary).toContain("記錄飲食");
  });

  it.each([
    ["pregnant", 30],
    ["eating_disorder", 30],
    ["medical", 30],
    ["none", 17],
  ])("uses maintenance rather than a calorie deficit for safety context %s", async (health, age) => {
    state.profile = { ...ordinaryProfile, health_context: undefined, eating_pattern: undefined, age };
    state.preferences = {
      plan_json: { health_context: health, eating_pattern: "mostly_out" },
    };

    const result = await completeProfileIfReady("member-1");

    expect(result.done).toBe(true);
    expect(state.savedPatch?.calorie_target).toBe(
      Math.round(Number(state.savedPatch?.tdee)),
    );
    expect(result.summary).toContain("不套用一般減脂熱量");
    expect(result.summary).toContain("專業人員");
  });
});
