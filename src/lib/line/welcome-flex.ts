export function welcomeFlexMessage() {
  return {
    type: "flex",
    altText: "歡迎加入健身卡卡教練｜先選你想怎麼開始",
    contents: {
      type: "bubble",
      size: "mega",
      hero: {
        type: "image",
        url: "https://fitness-kaka.vercel.app/images/line-welcome-final.png?v=1",
        size: "full",
        aspectRatio: "2:3",
        aspectMode: "fit",
      },
      footer: {
        type: "box",
        layout: "vertical",
        spacing: "sm",
        backgroundColor: "#F8F0FF",
        contents: [
          {
            type: "button",
            style: "primary",
            color: "#7141CA",
            height: "sm",
            action: {
              type: "postback",
              label: "免費開始",
              data: "trial:ask",
              displayText: "我想免費開始",
            },
          },
          {
            type: "button",
            style: "secondary",
            height: "sm",
            action: {
              type: "uri",
              label: "看方案",
              uri: "https://fitness-kaka.vercel.app/#plans",
            },
          },
          {
            type: "button",
            style: "secondary",
            height: "sm",
            action: {
              type: "postback",
              label: "如何開始",
              data: "guide:how",
              displayText: "我想先看如何開始",
            },
          },
        ],
      },
    },
  } as const;
}
