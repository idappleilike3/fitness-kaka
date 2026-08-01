import { resolveSupportEmail } from "@/lib/support-email";

export default function PaymentFailedPage() {
  const supportEmail = resolveSupportEmail();

  return (
    <main style={{ padding: "2rem", maxWidth: 480, margin: "0 auto" }}>
      <h1>尚未確認付款</h1>
      <p>
        目前資料庫尚未標記為已付款。若你已扣款，請稍候或聯繫客服
        <a href={`mailto:${supportEmail}`}>{supportEmail}</a>
        ，勿重複亂點付款。
      </p>
    </main>
  );
}
