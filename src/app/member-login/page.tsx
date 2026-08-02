import Link from "next/link";
import styles from "./page.module.css";

function resolveMemberLoginUrl(): string {
  const liffUrl = process.env.NEXT_PUBLIC_MEMBER_LIFF_URL?.trim();
  if (liffUrl) return liffUrl;

  const liffId = process.env.NEXT_PUBLIC_LIFF_ID?.trim();
  if (liffId) return `https://liff.line.me/${liffId}`;

  return process.env.LINE_OA_URL?.trim() || "https://lin.ee/5rxQDpa";
}

export default function MemberLoginPage() {
  const loginUrl = resolveMemberLoginUrl();

  return (
    <main className={styles.page}>
      <section className={styles.card} aria-labelledby="member-login-title">
        <Link className={styles.brand} href="/" aria-label="返回健身卡卡首頁">
          <span className={styles.brandMark}>K</span>
          <span>健身卡卡教練</span>
        </Link>
        <div className={styles.badge}>MEMBER ACCESS</div>
        <h1 id="member-login-title">會員登入</h1>
        <p className={styles.lead}>使用 LINE 安全確認身分，登入後即可查看今天的熱量、蛋白質、挑戰進度與會員方案。</p>
        <a className={styles.loginButton} href={loginUrl} rel="noopener noreferrer">
          <span className={styles.lineIcon}>LINE</span>
          使用 LINE 一鍵登入
        </a>
        <div className={styles.infoGrid}>
          <article><strong>免費會員</strong><span>可查看基本資料、免費額度與升級方案。</span></article>
          <article><strong>付費會員</strong><span>依 399／799 方案解鎖完整紀錄、挑戰與教練功能。</span></article>
        </div>
        <p className={styles.note}>尚未加入 LINE？登入按鈕會先帶你加入「健身卡卡教練」官方帳號，再從 LINE 開啟會員中心。</p>
        <div className={styles.links}>
          <Link href="/">返回首頁</Link>
          <Link href="/privacy">隱私權政策</Link>
          <Link href="/faq">常見問題</Link>
        </div>
      </section>
    </main>
  );
}
