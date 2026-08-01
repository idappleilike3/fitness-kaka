import { afterEach, describe, expect, it, vi } from "vitest";

import { clearEnvCache } from "@/lib/env";
import { getLineProfile } from "@/lib/line/client";

describe("getLineProfile", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    clearEnvCache();
  });

  it("returns the LINE display name for a member", async () => {
    vi.stubEnv("LINE_CHANNEL_SECRET", "test-secret");
    vi.stubEnv("LINE_CHANNEL_ACCESS_TOKEN", "test-token");
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ displayName: "JENNIE" }), { status: 200 }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(getLineProfile("U123")).resolves.toEqual({
      displayName: "JENNIE",
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.line.me/v2/bot/profile/U123",
      expect.objectContaining({
        headers: { Authorization: "Bearer test-token" },
      }),
    );
  });

  it("returns null when LINE profile lookup fails", async () => {
    vi.stubEnv("LINE_CHANNEL_SECRET", "test-secret");
    vi.stubEnv("LINE_CHANNEL_ACCESS_TOKEN", "test-token");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 404 })));

    await expect(getLineProfile("U123")).resolves.toBeNull();
  });
});
