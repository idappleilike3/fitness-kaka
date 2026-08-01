import { resolveSupportEmail } from "@/lib/support-email";

export default function PrivacyPage() {
  const supportEmail = resolveSupportEmail();

  return (
    <main style={{ padding: "2rem", maxWidth: 720, margin: "0 auto", lineHeight: 1.7 }}>
      <h1>隱私權政策 — 健身卡卡教練</h1>
      <p>我們蒐集 LINE userId、身體資料與飲食紀錄，僅用於提供熱量與減脂教練服務。</p>
      <p>本服務不做醫療診斷。資料不會出售給無關第三方。</p>
      <p>
        若要申請刪除帳號與資料，請透過 LINE 官方帳號或客服信箱
        <a href={`mailto:${supportEmail}`}>{supportEmail}</a>
        聯繫我們。
      </p>
    </main>
  );
}
