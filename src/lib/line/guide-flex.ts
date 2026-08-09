const PURPLE = "#7141CA";
const PINK = "#EF5DA8";
const DARK = "#241436";
const MUTE = "#6F647A";

function textBubble(params: {
  step: string;
  title: string;
  text: string;
  icon: string;
  buttonLabel?: string;
  buttonData?: string;
  buttonUri?: string;
}) {
  const footerContents: any[] = [];
  if (params.buttonLabel && params.buttonData) {
    footerContents.push({
      type: "button",
      style: "primary",
      color: PURPLE,
      height: "sm",
      action: {
        type: "postback",
        label: params.buttonLabel,
        data: params.buttonData,
        displayText: params.buttonLabel,
      },
    });
  } else if (params.buttonLabel && params.buttonUri) {
    footerContents.push({
      type: "button",
      style: "primary",
      color: PURPLE,
      height: "sm",
      action: { type: "uri", label: params.buttonLabel, uri: params.buttonUri },
    });
  }

  return {
    type: "bubble",
    size: "kilo",
    header: {
      type: "box",
      layout: "vertical",
      backgroundColor: "#F8F0FF",
      paddingAll: "18px",
      contents: [
        { type: "text", text: params.step, size: "xs", color: PURPLE, weight: "bold" },
        { type: "text", text: params.icon, size: "3xl", margin: "md" },
      ],
    },
    body: {
      type: "box",
      layout: "vertical",
      spacing: "md",
      paddingAll: "20px",
      contents: [
        { type: "text", text: params.title, size: "xl", weight: "bold", color: DARK, wrap: true },
        { type: "text", text: params.text, size: "sm", color: MUTE, wrap: true, lineSpacing: "6px" },
      ],
    },
    ...(footerContents.length
      ? {
          footer: {
            type: "box",
            layout: "vertical",
            spacing: "sm",
            paddingAll: "16px",
            contents: footerContents,
          },
        }
      : {}),
  } as const;
}

export function howToUseFlexMessage() {
  return {
    type: "flex",
    altText: "健身卡卡如何使用｜6 步驟圖文教學",
    contents: {
      type: "carousel",
      contents: [
        textBubble({
          step: "STEP 1",
          icon: "💜",
          title: "先認識卡卡",
          text: "加入官方 LINE 後，不用先研究功能。卡卡會先問你想不想開始 7 天體驗，再帶你完成設定。",
          buttonLabel: "我想先了解",
          buttonData: "trial:ask",
        }),
        textBubble({
          step: "STEP 2",
          icon: "🎯",
          title: "設定你的目標",
          text: "回答幾個簡單問題：減脂、增肌或維持，以及基本身體資料。完成後才計算你的熱量與蛋白質方向。",
        }),
        textBubble({
          step: "STEP 3",
          icon: "📸",
          title: "直接傳餐點照片",
          text: "吃東西時拍一張照片丟給卡卡。食物照片會直接分析熱量、蛋白質、碳水與脂肪，不先跟你聊天。",
        }),
        textBubble({
          step: "STEP 4",
          icon: "✅",
          title: "看完再確認",
          text: "辨識結果正確就按「確認紀錄」。如果食物或份量不對，直接打字更正，卡卡會重新計算。",
        }),
        textBubble({
          step: "STEP 5",
          icon: "🔥",
          title: "每天看剩餘額度",
          text: "點「今日還能吃多少」，就能看到今天已吃多少、還剩多少熱量，以及蛋白質還差多少。",
        }),
        textBubble({
          step: "STEP 6",
          icon: "🏆",
          title: "跟著卡卡持續做",
          text: "用 30 天挑戰把記錄變成習慣。你不用一次做到完美，只要每天完成一個小步驟。",
          buttonLabel: "開始 7 天體驗",
          buttonData: "trial:ask",
        }),
      ],
    },
  } as const;
}

export function trialAskFlexMessage() {
  return {
    type: "flex",
    altText: "要開始 7 天免費體驗嗎？",
    contents: {
      type: "bubble",
      size: "mega",
      header: {
        type: "box",
        layout: "vertical",
        backgroundColor: "#F8F0FF",
        paddingAll: "20px",
        contents: [
          { type: "text", text: "7 天免費體驗", color: PURPLE, weight: "bold", size: "sm" },
          { type: "text", text: "想讓卡卡開始陪你嗎？", color: DARK, weight: "bold", size: "xl", wrap: true, margin: "md" },
        ],
      },
      body: {
        type: "box",
        layout: "vertical",
        spacing: "md",
        paddingAll: "20px",
        contents: [
          { type: "text", text: "先回答幾個簡單問題，卡卡會幫你建立個人熱量、蛋白質與飲食方向。", color: MUTE, size: "sm", wrap: true, lineSpacing: "6px" },
          { type: "text", text: "不會一按就跳去付款，也不會直接把你丟到複雜網頁。", color: PINK, size: "sm", weight: "bold", wrap: true },
        ],
      },
      footer: {
        type: "box",
        layout: "vertical",
        spacing: "sm",
        paddingAll: "16px",
        contents: [
          {
            type: "button",
            style: "primary",
            color: PURPLE,
            action: { type: "postback", label: "好，開始體驗", data: "trial:start", displayText: "好，開始體驗" },
          },
          {
            type: "button",
            style: "secondary",
            action: { type: "postback", label: "我先看看怎麼用", data: "trial:notnow", displayText: "我先看看怎麼用" },
          },
        ],
      },
    },
  } as const;
}

export function officialGuideFlexMessage() {
  return {
    type: "flex",
    altText: "歡迎來到健身卡卡｜下一步這樣做",
    contents: {
      type: "bubble",
      size: "mega",
      body: {
        type: "box",
        layout: "vertical",
        spacing: "md",
        paddingAll: "20px",
        contents: [
          { type: "text", text: "剛加入，不知道先按哪裡？", size: "lg", weight: "bold", color: DARK, wrap: true },
          { type: "text", text: "不用把所有功能看完。先選一個你現在最需要的，卡卡會一步一步帶你。", size: "sm", color: MUTE, wrap: true, lineSpacing: "6px" },
        ],
      },
      footer: {
        type: "box",
        layout: "vertical",
        spacing: "sm",
        paddingAll: "16px",
        contents: [
          { type: "button", style: "primary", color: PURPLE, action: { type: "postback", label: "我想免費開始", data: "trial:ask", displayText: "我想免費開始" } },
          { type: "button", style: "secondary", action: { type: "postback", label: "先看如何使用", data: "guide:how", displayText: "先看如何使用" } },
          { type: "button", style: "secondary", action: { type: "message", label: "我有問題", text: "我有問題" } },
        ],
      },
    },
  } as const;
}
