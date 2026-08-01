import { describe, it, expect } from "vitest";
import { normalizeSupabaseUrl } from "@/lib/env";

describe("normalizeSupabaseUrl", () => {
  it("strips /rest/v1 and trailing slash", () => {
    expect(
      normalizeSupabaseUrl("https://abc.supabase.co/rest/v1/"),
    ).toBe("https://abc.supabase.co");
  });

  it("adds https for bare project host", () => {
    expect(normalizeSupabaseUrl("abc.supabase.co")).toBe(
      "https://abc.supabase.co",
    );
  });

  it("strips quotes and zero-width chars", () => {
    expect(normalizeSupabaseUrl('"https://abc.supabase.co"')).toBe(
      "https://abc.supabase.co",
    );
  });
});
