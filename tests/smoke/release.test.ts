import { describe, expect, it } from "vitest";
import { getReleaseInfo } from "@/lib/release";

describe("release info", () => {
  it("identifies the complete v10 production baseline", () => {
    expect(getReleaseInfo()).toEqual({
      version: "v10",
      ui: "dark-three-card",
      source: "complete-main",
    });
  });
});
