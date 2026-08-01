import Link from "next/link";

export default function AiPlatformPage() {
  return (
    <main style={{ padding: "2rem", maxWidth: 720, margin: "0 auto", lineHeight: 1.7 }}>
      <h1>AI 串接平台與資料使用說明</h1>
      <p style={{ color: "#666", fontSize: "0.95rem" }}>最後更新：2026-08-02</p>

      <h2>一、AI 串接平台</h2>
      <p>
        「健身卡卡教練」透過 OpenAI API 串接人工智慧功能，用於提供飲食紀錄、餐點辨識、營養推估、語音轉文字及教練式生活建議。本服務不是開放式 AI 交易平台，也不代替第三方收付款。
      </p>

      <h2>二、AI 功能用途</h2>
      <ul>
        <li>辨識使用者主動傳送的餐點照片，推估食物、份量、熱量與三大營養素。</li>
        <li>理解使用者輸入的飲食文字，整理為可確認的餐點紀錄。</li>
        <li>將使用者主動傳送的語音轉換為文字，再依內容提供飲食紀錄或一般教練建議。</li>
        <li>根據使用者已提供的目標與紀錄，產生非醫療性質的生活管理提醒。</li>
      </ul>

      <h2>三、傳送與保存的資料範圍</h2>
      <p>
        只有完成當次功能所需的餐點照片、飲食文字、語音內容與必要的對話脈絡會傳送至 OpenAI API 處理。系統不會為了 AI 分析主動讀取使用者手機中的其他照片、聯絡人或未傳送的資料。
      </p>
      <p>
        AI 回傳的營養內容會先顯示給使用者檢查；只有在使用者確認後，才會寫入健身卡卡的個人飲食紀錄。帳號與服務紀錄依
        <Link href="/privacy">隱私權政策</Link>管理，不會出售給無關第三方。
      </p>

      <h2>四、限制与人工确认</h2>
      <p>
        AI 結果可能因照片角度、份量、食材或描述不足而產生誤差，僅供日常飲食管理參考，非醫療診斷、營養師處方或治療建議。使用者應先確認內容；如有疾病、過敏、懷孕、飲食失調或特殊健康狀況，請諮詢合格醫療專業人員。
      </p>

      <h2>五、客服聯絡</h2>
      <p>
        LINE 官方帳號 ID：
        <a href="https://line.me/R/ti/p/@146iqokj" rel="noopener noreferrer" target="_blank">@146iqokj</a>
      </p>

      <p style={{ marginTop: "2rem" }}>
        <Link href="/">回到首頁</Link>
        {" · "}
        <Link href="/privacy">隱私權政策</Link>
        {" · "}
        <Link href="/terms">服務條款</Link>
      </p>
    </main>
  );
}
