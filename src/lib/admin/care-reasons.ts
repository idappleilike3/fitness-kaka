export type CareAlertInput =
  | { type: "inactive"; memberName: string; days: number }
  | { type: "low_intake"; memberName: string; days: number; ratio: number }
  | { type: "quit_message"; memberName: string; quote?: string }
  | { type: "payment_failure"; memberName: string; detail?: string }
  | { type: "line_failure"; memberName: string; lineError?: string };

export type CareAlertPresentation = {
  title: string;
  severity: "low" | "medium" | "high";
  reason: string;
  memberReply: string;
  adminRecommendation: string;
};

export function describeCareAlert(input: CareAlertInput): CareAlertPresentation {
  switch (input.type) {
    case "inactive":
      return {
        title: "會員關懷提醒",
        severity: input.days >= 3 ? "medium" : "low",
        reason: `${input.memberName} 已連續 ${input.days} 天沒有新增飲食紀錄，可能是工作忙、忘記紀錄，或暫時失去節奏。`,
        memberReply: "最近是不是比較忙呢？不用補完之前所有紀錄，從下一餐重新開始就好。需要我幫你把步驟變簡單一點嗎？",
        adminRecommendation: input.days >= 3 ? "建議傳送一次人工關懷訊息，先了解原因，不要連續催促。" : "先由系統溫和提醒即可。",
      };
    case "low_intake":
      return {
        title: "健康風險提醒",
        severity: "high",
        reason: `${input.memberName} 已連續 ${input.days} 天低於建議熱量的 ${Math.round(input.ratio * 100)}%，可能有過度節食風險。`,
        memberReply: "今天吃得比建議範圍少很多。減脂不是吃得越少越好，長期反而更容易疲累、嘴饞或反彈。下一餐請正常吃，補一份主食和蛋白質就好。",
        adminRecommendation: "暫停提供進一步減量建議，人工確認近況；若涉及疾病、飲食失調或持續極端飲食，建議轉介醫師或合格營養師。",
      };
    case "quit_message":
      return {
        title: "需要關懷",
        severity: "high",
        reason: `${input.memberName} 表達想放棄${input.quote ? `：「${input.quote}」` : ""}。`,
        memberReply: "我知道你現在可能很挫折，但一次沒有做到，不代表你失敗了。今天先不用要求自己完美，我們只找一件最容易重新開始的事就好。",
        adminRecommendation: "建議今天內由管理員親自關心一次，先理解情緒与阻礙，再調整目標。",
      };
    case "payment_failure":
      return {
        title: "付款異常",
        severity: "high",
        reason: `${input.memberName} 的付款或方案開通狀態不一致${input.detail ? `：${input.detail}` : ""}。`,
        memberReply: "你的付款資料正在確認中，請先不要重複付款。我們會替你確認並盡快回覆。",
        adminRecommendation: "核對訂單、付款回傳與會員方案寫入紀錄，確認後再補開權限或退款。",
      };
    case "line_failure":
      return {
        title: "LINE 推播失敗",
        severity: "medium",
        reason: `${input.memberName} 的 LINE 訊息發送失敗${input.lineError ? `（錯誤 ${input.lineError}）` : ""}，可能是會員封鎖官方帳號、UID 與目前 Messaging API 不同 Provider，或 Channel Access Token 設定異常。`,
        memberReply: "目前 LINE 訊息暫時沒有送達，你的會員資料不會因此消失。重新加入官方帳號後即可繼續使用。",
        adminRecommendation: "確認會員好友狀態、LINE Provider、Channel Access Token 與 UID 來源，並保留原始錯誤碼。",
      };
  }
}
