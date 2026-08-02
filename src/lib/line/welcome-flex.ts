export function welcomeFlexMessage() {
  return {
    type: "flex",
    altText: "歡迎加入健身卡卡教練",
    contents: {
      type: "bubble",
      size: "mega",
      hero: {
        type: "image",
        url: "https://fitness-kaka.vercel.app/images/coach-portrait.png",
        size: "full",
        aspectRatio: "20:13",
        aspectMode: "cover",
        action: {
          type: "uri",
          uri: "https://liff.line.me/2010804832-oPIqeXjJ",
        },
      },
      body: {
        type: "box",
        layout: "vertical",
        spacing: "md",
        backgroundColor: "#07110E",
        contents: [
          {
            type: "text",
            text: "嗨，我是卡卡",
            weight: "bold",
            size: "xl",
            color: "#F4FFF9",
          },
          {
            type: "text",
            text: "不用節食，也不用每天自己算熱量。拍下每一餐，我陪你完成 30 天減脂挑戰。",
            wrap: true,
            size: "md",
            color: "#CBE6D8",
            lineSpacing: "5px",
          },
          {
            type: "separator",
            color: "#244D3C",
            margin: "md",
          },
          {
            type: "text",
            text: "你可以馬上試",
            weight: "bold",
            color: "#72E2A4",
          },
          {
            type: "text",
            text: "• 傳食物照片，AI 估算熱量\n• 打字告訴我吃了什麼\n• 問『今天還能吃多少』看剩餘",
            wrap: true,
            color: "#E7F5EE",
            size: "sm",
            lineSpacing: "5px",
          },
        ],
      },
      footer: {
        type: "box",
        layout: "vertical",
        spacing: "sm",
        backgroundColor: "#07110E",
        contents: [
          {
            type: "button",
            style: "primary",
            color: "#06C755",
            height: "sm",
            action: {
              type: "uri",
              label: "開始使用卡卡",
              uri: "https://liff.line.me/2010804832-oPIqeXjJ",
            },
          },
          {
            type: "button",
            style: "secondary",
            height: "sm",
            action: {
              type: "message",
              label: "查看怎麼用",
              text: "怎麼用",
            },
          },
          {
            type: "text",
            text: "AI 推估可能有誤差，結果非醫療診斷",
            wrap: true,
            align: "center",
            color: "#82988D",
            size: "xxs",
            margin: "sm",
          },
        ],
      },
    },
  } as const;
}
