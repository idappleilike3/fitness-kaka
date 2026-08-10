import { describe, expect, it } from "vitest";
import { welcomeFlexMessage } from "@/lib/line/welcome-flex";

describe("LINE follow welcome Flex", () => {
  it("shows the approved full welcome image with the three approved actions", () => {
    const message = welcomeFlexMessage();
    const hero = message.contents.hero;
    const footer = message.contents.footer;

    expect(hero).toMatchObject({
      type: "image",
      url: "https://fitness-kaka.vercel.app/images/line-welcome-final.png?v=1",
      aspectRatio: "2:3",
      aspectMode: "fit",
    });

    expect(footer.contents).toEqual([
      expect.objectContaining({
        type: "button",
        action: {
          type: "postback",
          label: "免費開始",
          data: "trial:ask",
          displayText: "我想免費開始",
        },
      }),
      expect.objectContaining({
        type: "button",
        action: {
          type: "uri",
          label: "看方案",
          uri: "https://fitness-kaka.vercel.app/#plans",
        },
      }),
      expect.objectContaining({
        type: "button",
        action: {
          type: "postback",
          label: "如何開始",
          data: "guide:how",
          displayText: "我想先看如何開始",
        },
      }),
    ]);
  });
});
