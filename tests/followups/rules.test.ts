import { describe, expect, it } from "vitest";

import {
  canReceiveMealFollowups,
  maxMealSlotsForPlan,
  nextFollowupState,
  normalizeMealSlots,
  parseMealSlotCommand,
} from "@/lib/followups/rules";

describe("paid LINE meal follow-up rules", () => {
  it("never enables meal follow-ups for free or expired memberships", () => {
    expect(canReceiveMealFollowups("free", true)).toBe(false);
    expect(canReceiveMealFollowups("plan_799", false)).toBe(false);
  });

  it("limits Plus to two meals and Pro to three", () => {
    expect(maxMealSlotsForPlan("plan_399")).toBe(2);
    expect(maxMealSlotsForPlan("plan_3590")).toBe(2);
    expect(maxMealSlotsForPlan("plan_799")).toBe(3);
    expect(maxMealSlotsForPlan("plan_7190")).toBe(3);
  });

  it("uses breakfast as the paid default and trims selected meals to plan allowance", () => {
    expect(normalizeMealSlots([], "plan_399")).toEqual(["breakfast"]);
    expect(
      normalizeMealSlots(["dinner", "breakfast", "lunch"], "plan_399"),
    ).toEqual(["breakfast", "lunch"]);
  });

  it("pauses after three unanswered pushes and resumes when the member messages", () => {
    expect(nextFollowupState({ misses: 2, paused: false }, "push")).toEqual({
      misses: 3,
      paused: true,
    });
    expect(nextFollowupState({ misses: 3, paused: true }, "member_message")).toEqual({
      misses: 0,
      paused: false,
    });
  });

  it("parses member meal choices without treating the settings help command as a change", () => {
    expect(parseMealSlotCommand("提醒設定")).toBeNull();
    expect(parseMealSlotCommand("提醒早餐、晚餐")).toEqual(["breakfast", "dinner"]);
    expect(parseMealSlotCommand("關閉餐次提醒")).toEqual([]);
  });
});
