import Link from "next/link";
import { resolveSupportEmail } from "@/lib/support-email";

export default function RefundPage() {
  const supportEmail = resolveSupportEmail();

  return (
    <main style={{ padding: "2rem", maxWidth: 720, margin: "0 auto", lineHeight: 1.7 }}>
      <h1>退款政策 — 健身卡卡教練</h1>
      <p style={{ color: "#666", fontSize: "0.95rem" }}>最後更新：2026-08-02</p>

      <p>
        本服務「健身卡卡教練」為透過 LINE
        提供之數位訂閱／額度型 SaaS（線上服務），付費方案為一次付清、開通 30
        天進階額度，無自動續約、無自動扣款。金流由藍新金流（NewebPay）處理。
      </p>

      <h2>一、適用商品</h2>
      <ul>
        <li>卡卡減脂 NT$399／30 天</li>
        <li>卡卡教練 NT$799／30 天</li>
      </ul>
      <p>上述皆為數位內容／線上服務，付款成功後系統即開通對應額度，無實體商品寄送。</p>

      <h2>二、可申請退款情形</h2>
      <p>符合下列任一情形，可於付款完成後 <strong>7 日內</strong>提出退款申請：</p>
      <ol>
        <li>
          <strong>重複扣款或系統錯誤：</strong>
          同一筆訂單被重複收費、或付款成功但權益未正確開通，經我們查核屬實。
        </li>
        <li>
          <strong>尚未使用進階額度：</strong>
          開通後至申請當下，付費方案之圖片／文字／語音分析額度均未使用（僅免費額度不計）。
        </li>
        <li>
          <strong>服務重大無法使用：</strong>
          因可歸責於本服務之技術故障，導致付費功能長時間無法使用，且我們無法於合理時間內修復。
        </li>
      </ol>

      <h2>三、不適用退款情形</h2>
      <ol>
        <li>已使用任一付費方案進階額度（圖片、文字或語音分析）。</li>
        <li>超過付款完成後 7 日。</li>
        <li>方案 30 天效期已到期或已過半。</li>
        <li>因個人裝置、網路、LINE 帳號設定等非本服務可控因素無法使用。</li>
        <li>違反
          <Link href="/terms">使用條款</Link>
          （濫用、自動化刷取、上傳違法內容等）而被停權。
        </li>
        <li>更改心意、選錯方案，但已開始使用服務。</li>
      </ol>

      <h2>四、申請方式</h2>
      <p>請透過下列任一管道聯繫，並提供：</p>
      <ul>
        <li>LINE 顯示名稱或 userId（若可知）</li>
        <li>付款時間、金額、藍新／信用卡末四碼或訂單編號</li>
        <li>申請原因說明</li>
      </ul>
      <ul>
        <li>
          客服信箱：
          <a href={`mailto:${supportEmail}`}>{supportEmail}</a>
        </li>
        <li>
          LINE 官方帳號 ID：
          <a href="https://line.me/R/ti/p/@146iqokj" rel="noopener noreferrer" target="_blank">
            @146iqokj
          </a>
          （請於對話中說明「申請退款」）
        </li>
      </ul>
      <p>我們將於收到完整資料後 <strong>3–5 個工作天</strong>回覆審核結果。</p>

      <h2>五、退款處理</h2>
      <ol>
        <li>審核通過後，將透過藍新金流原路退回原付款方式。</li>
        <li>退款入帳時間依發卡銀行／付款工具而定，通常約 7–14 個工作天。</li>
        <li>退款完成後，該筆訂單對應之付費額度將立即停用，帳號回到免費額度。</li>
        <li>
          本服務不會以金流處理費為由扣款。若退款案件另產生必要的人工核對、帳務更正或其他行政作業，可能酌收合理行政處理費；實際金額與計算方式會在退款前清楚告知並取得申請人確認。重複扣款或可歸責於本服務的系統錯誤，不收取行政處理費。
        </li>
      </ol>

      <h2>六、其他說明</h2>
      <ul>
        <li>本服務為數位線上服務，原則上適用「提供數位內容／線上服務」之相關規範；上開退款條件為本商店對消費者之明確承諾。</li>
        <li>
          隱私相關請見
          <Link href="/privacy">隱私權政策</Link>
          ；服務範圍請見
          <Link href="/terms">使用條款</Link>。
        </li>
        <li>本政策如有更新，以本頁最新版本為準。</li>
      </ul>

      <p style={{ marginTop: "2rem" }}>
        <Link href="/">回到首頁</Link>
        {" · "}
        <Link href="/faq">FAQ</Link>
        {" · "}
        <Link href="/terms">使用條款</Link>
      </p>
    </main>
  );
}
