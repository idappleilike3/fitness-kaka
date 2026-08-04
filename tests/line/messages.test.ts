import { describe, expect, it } from "vitest";
import {
  audioTooLongMessage,
  helpMessage,
  mealResultMessage,
  planDisplayName,
  quotaExhaustedMessage,
  upgradePlansMessage,
  videoNotSupportedMessage,
  voiceUpgradeCtaMessage,
  welcomeMessage,
} from "@/lib/line/messages";

describe("quota exhausted messages", () => {
  it("explains the free shared meal-analysis limit without charging chat", () => {
    const message = quotaExhaustedMessage("image", {
      image: 5,
      text: 5,
      voice: 0,
      mealAnalysis: 5,
    });

    expect(message).toContain("今日免費餐點分析 5 次已用完");
    expect(message).toContain("傳照片或打字共用此額度");
    expect(message).toContain("聊天、問問題與貼圖不扣次數");
  });

  it("tells users that text-analysis quota resets tomorrow", () => {
    const message = quotaExhaustedMessage("text");

    expect(message).toContain("今日文字飲食分析額度已用完");
    expect(message).toContain("明天 00:00（台灣時間）重新計算");
  });
});

describe("meal preview messages", () => {
  it("explains that an unconfirmed meal is not yet in today's total", () => {
    const message = mealResultMessage({
      lines: ["雞肉漢堡：1 個"],
      totalKcal: 420,
      proteinG: 22,
      carbG: 42,
      fatG: 18,
      todayKcal: 0,
      projectedKcal: 420,
      projectedProteinG: 22,
      remainingKcal: 1800,
      proteinLeft: 100,
    });

    expect(message).toContain("今日已攝取（已確認）：0 kcal");
    expect(message).toContain("點「確認紀錄」後才會計入");
  });
});

describe("plan comparison messages", () => {
  it("clearly distinguishes free, Plus, and Pro quotas with yearly options", () => {
    const help = helpMessage();
    const upgrade = upgradePlansMessage();

    expect(help).toContain("每天共 5 次餐點分析（照片／打字共用；聊天不扣）");
    expect(help).toContain("卡卡 Plus NT$399／30 天或 NT$3590／年");
    expect(help).toContain("卡卡 Pro 教練 NT$799／30 天或 NT$7190／年");
    expect(upgrade).toContain("月繳或年繳");
    expect(upgrade).toContain("免費體驗：先從一餐開始");
    expect(upgrade).toContain("卡卡 Plus（記錄）");
    expect(upgrade).toContain("卡卡 Pro 教練（陪伴）");
    expect(upgrade).toContain("一天不到 10 元");
    expect(upgrade).toContain("一天不到 20 元");
    expect(upgrade).toContain("會員中心");
    expect(upgrade).not.toContain("LIFF");
  });

  it("does not sell an upgrade to an active paid member", () => {
    const message = upgradePlansMessage(undefined, {
      planId: "plan_799",
      expiresAt: "2026-08-22T00:00:00.000Z",
    });

    expect(message).toContain("你已是卡卡 Pro 教練會員");
    expect(message).toContain("2026/8/22");
    expect(message).not.toContain("開啟會員中心升級");
  });

  it("maps yearly plan ids to the same display tier", () => {
    expect(planDisplayName("plan_3590")).toBe("卡卡 Plus");
    expect(planDisplayName("plan_7190")).toBe("卡卡 Pro 教練");
  });

  it("does not upsell when a paid plan quota is exhausted", () => {
    const message = quotaExhaustedMessage(
      "voice",
      { image: 25, text: 60, voice: 15 },
      "plan_799",
    );

    expect(message).toContain("卡卡 Pro 教練");
    expect(message).not.toContain("升級卡卡 Plus");
  });
});

describe("LINE chat copy", () => {
  it("keeps welcome, help, upgrade, and quota copy aligned", () => {
    const welcome = welcomeMessage();
    const help = helpMessage();
    const upgrade = upgradePlansMessage();
    const quota = quotaExhaustedMessage("image", {
      image: 5,
      text: 5,
      voice: 0,
      mealAnalysis: 5,
    });

    expect(welcome).toContain("嗨，我是卡卡");
    expect(welcome).toContain("我要參加三十天減脂挑戰");
    expect(welcome).toContain("怎麼用");
    expect(help).toContain("體驗：先從一餐開始");
    expect(help).toContain("記錄：每天留下看得懂的飲食紀錄");
    expect(help).toContain("陪伴：每天知道下一步該做什麼");
    expect(upgrade).toContain("體驗：先從一餐開始");
    expect(upgrade).toContain("記錄：每天留下看得懂的飲食紀錄");
    expect(upgrade).toContain("陪伴：每天知道下一步該做什麼");
    expect(quota).toContain("今天先把已記錄的餐看懂");
  });

  it("does not end user-facing message bubbles with a Chinese or Western period", () => {
    const messages = [
      welcomeMessage(),
      videoNotSupportedMessage(),
      voiceUpgradeCtaMessage(),
      audioTooLongMessage(),
      quotaExhaustedMessage("image"),
      quotaExhaustedMessage("text", {
        image: 5,
        text: 5,
        voice: 0,
        mealAnalysis: 5,
      }),
      helpMessage(),
      upgradePlansMessage(),
      mealResultMessage({
        lines: ["雞肉漢堡：1 個"],
        totalKcal: 420,
        proteinG: 22,
        carbG: 42,
        fatG: 18,
        todayKcal: 0,
        projectedKcal: 420,
        projectedProteinG: 22,
        remainingKcal: 1800,
        proteinLeft: 100,
      }),
    ];

    for (const message of messages) {
      expect(message).not.toMatch(/[。.]\s*$/u);
    }
  });
});
