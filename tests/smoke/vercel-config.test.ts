import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

type VercelConfig = {
  crons?: Array<{ path: string; schedule: string }>;
};

describe("Vercel cron configuration", () => {
  it("keeps every Hobby cron expression to one run per day", () => {
    const config = JSON.parse(readFileSync("vercel.json", "utf8")) as VercelConfig;

    expect(config.crons).toEqual([
      { path: "/api/cron/member-engagement?window=morning", schedule: "0 0 * * *" },
      { path: "/api/cron/member-engagement?window=noon", schedule: "0 4 * * *" },
      { path: "/api/cron/member-engagement?window=evening", schedule: "0 13 * * *" },
    ]);
  });
});
