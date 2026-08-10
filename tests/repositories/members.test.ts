import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase/admin", () => ({
  getAdminDb: () => ({
    from: () => ({
      update: () => ({
        eq: async () => ({ error: { message: "cursor write failed" } }),
      }),
    }),
  }),
}));

import { setOnboardingStep } from "@/repositories/members";

describe("onboarding cursor persistence", () => {
  it("rejects when Supabase did not save the next question", async () => {
    await expect(setOnboardingStep("member-1", "height")).rejects.toThrow(
      "cursor write failed",
    );
  });
});
