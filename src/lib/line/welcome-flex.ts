export function welcomeFlexMessage() {
  return {
    type: "flex",
    altText: "歡迎加入健身卡卡教練｜開始 30 天減脂挑戰",
    contents: {
      type: "bubble",
      size: "mega",
      hero: {
        type: "image",
        url: "https://fitness-kaka.vercel.app/api/line/assets/welcome-card?v=10",
        size: "full",
        aspectRatio: "4:5",
        aspectMode: "cover",
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
            type: "box",
            layout: "horizontal",
            spacing: "sm",
            contents: [
              {
                type: "button",
                style: "secondary",
                height: "sm",
                action: {
                  type: "message",
                  label: "看方案",
                  text: "方案",
                },
              },
              {
                type: "button",
                style: "secondary",
                height: "sm",
                action: {
                  type: "message",
                  label: "如何使用",
                  text: "怎麼用",
                },
              },
            ],
          },
          {
            type: "text",
            text: "AI 推估僅供生活參考，非醫療診斷",
            wrap: true,
            align: "center",
            color: "#7D6B8B",
            size: "xxs",
            margin: "sm",
          },
        ],
      },
    },
  } as const;
}
