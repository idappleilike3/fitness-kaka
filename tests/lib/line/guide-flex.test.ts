import { describe, expect, it } from "vitest";

import { welcomeFlexMessage } from "@/lib/line/welcome-flex";
import { howToUseFlexMessage, trialAskFlexMessage } from "@/lib/line/guide-flex";

describe("LINE guided onboarding cards", () => {
  it("asks before starting the free experience instead of opening LIFF directly", () => {
    const message = welcomeFlexMessage() as any;
    const freeButton = message.contents.footer.contents[0];
    expect(freeButton.action.type).toBe("postback");
    expect(freeButton.action.data).toBe("trial:ask");
  });

  it("presents how-to instructions as six simple visual cards", () => {
    const message = howToUseFlexMessage() as any;
    expect(message.type).toBe("flex");
    expect(message.contents.type).toBe("carousel");
    expect(message.contents.contents).toHaveLength(6);
    expect(message.contents.contents[0].body.contents[0].text).toContain("先認識卡卡");
    expect(message.contents.contents[5].footer.contents[0].action.data).toBe("trial:ask");
  });

  it("free experience confirmation offers start and not-now choices", () => {
    const message = trialAskFlexMessage() as any;
    const buttons = message.contents.footer.contents;
    expect(buttons[0].action.data).toBe("trial:start");
    expect(buttons[1].action.data).toBe("trial:notnow");
  });
});
