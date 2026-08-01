import Link from "next/link";
import { resolveSupportEmail } from "@/lib/support-email";

export default function TermsPage() {
  const supportEmail = resolveSupportEmail();

  return (
    <main style={{ padding: "2rem", maxWidth: 720, margin: "0 auto", lineHeight: 1.7 }}>
      <h1>使用條款 — 健身卡卡教練</h1>
      <p>
        本服務提供 AI 推估之飲食與熱量參考，非醫療、非營養師診斷。孕婦、未成年人、飲食失調或慢性病患者請諮詢專業人員。
      </p>
      <p>
        付費方案為一次付清、開通 30 天進階額度：卡卡減脂 NT$399（圖片 10／文字 30／語音 5 次／天）或卡卡教練 NT$799（圖片 25／文字 60／語音 15 次／天）。到期後回到免費額度，無自動扣款。
      </p>
      <p>禁止濫用、自動化刷取 API 或上傳違法內容。</p>
      <p>
        退款條件與申請方式請見
        <Link href="/refund">退款政策</Link>
        ；客服信箱：
        <a href={`mailto:${supportEmail}`}>{supportEmail}</a>。
      </p>
    </main>
  );
}
