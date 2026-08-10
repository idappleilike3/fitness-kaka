import { describe, expect, it } from "vitest";

import { welcomeFlexMessage } from "@/lib/line/welcome-flex";
import { trialAskFlexMessage } from "@/lib/line/guide-flex";
import { consultationStartMessage } from "@/lib/line/messages";

describe("LINE guided onboarding cards", () => {
  it("asks before starting the free experience instead of opening LIFF directly", () => {
    const message = welcomeFlexMessage() as any;
    const freeButton = message.contents.footer.contents[0];
    expect(freeButton.action.type).toBe("postback");
    expect(freeButton.action.data).toBe("trial:ask");
  });

  it("explains how to start as a direct consultation instead of a tutorial Flex", () => {
    const message = consultationStartMessage();
    expect(message).toContain("我是卡卡健身減脂營養教練");
    expect(message).toContain("① 設定減脂目標");
    expect(message).toContain("⑥ 其他，直接告訴卡卡");
    expect(message).toContain("你目前最想改善什麼");
    expect(message).not.toContain("STEP 1");
  });

  it("free experience confirmation offers start and not-now choices", () => {
    const message = trialAskFlexMessage() as any;
    const buttons = message.contents.footer.contents;
    expect(buttons[0].action.data).toBe("trial:start");
    expect(buttons[1].action.data).toBe("trial:notnow");
  });
});
