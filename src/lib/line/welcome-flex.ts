export function welcomeFlexMessage() {
  return {
    type: "flex",
    altText: "歡迎加入健身卡卡教練｜開始 30 天減脂挑戰",
    contents: {
      type: "bubble",
      size: "mega",
      hero: {
        type: "image",
        url: "https://fitness-kaka.vercel.app/images/line-welcome-final.png?v=1",
        size: "full",
        aspectRatio: "2:3",
        aspectMode: "fit",
        action: {
          type: "uri",
          uri: "https://liff.line.me/2010804832-oPIqeXjJ",
        },
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
              type: "uri",
              label: "免費開始",
              uri: "https://liff.line.me/2010804832-oPIqeXjJ",
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
              type: "message",
              label: "如何開始",
              text: "怎麼用",
            },
          },
        ],
      },
    },
  } as const;
}
