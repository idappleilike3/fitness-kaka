import { describe, expect, it } from "vitest";
import { KAKA_SUGGESTIONS, matchKakaAnswer } from "@/app/kaka-chat-rules";

describe("Kaka local chat rules", () => {
  it("offers the approved starter questions", () => {
    expect(KAKA_SUGGESTIONS.map((item) => item.id)).toEqual([
      "healthy-loss",
      "today-meal",
      "meal-scenarios",
      "protein",
      "trial",
      "plans",
    ]);
  });

  it.each([
    ["我今天外食要怎麼選？", "meal-scenarios"],
    ["超商便利商店可以吃什麼", "meal-scenarios"],
    ["蛋白質不夠怎麼補", "protein"],
    ["免費七天能做什麼", "trial"],
    ["價格和方案怎麼選", "plans"],
  ])("matches synonyms in %s", (input, expectedId) => {
    expect(matchKakaAnswer(input).id).toBe(expectedId);
  });

  it("routes medical and extreme dieting questions to a safety reply first", () => {
    const reply = matchKakaAnswer("我有糖尿病，可以停藥每天只吃 500 卡嗎？");
    expect(reply.id).toBe("medical-safety");
    expect(reply.lineUrl).toBe("https://lin.ee/5rxQDpa");
    expect(reply.answer).toContain("醫師");
  });

  it("returns a helpful local fallback and LINE route for an unknown question", () => {
    const reply = matchKakaAnswer("量子電腦怎麼運作");
    expect(reply.id).toBe("fallback");
    expect(reply.lineUrl).toBe("https://lin.ee/5rxQDpa");
    expect(reply.followUps.length).toBeGreaterThanOrEqual(2);
  });
});
