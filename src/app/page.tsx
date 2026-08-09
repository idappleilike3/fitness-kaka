import Image from "next/image";
import Link from "next/link";
import { HomePlansSection } from "./HomePlansSection";
import {
  CoachClosing,
  FeatureStory,
  MealFlexStory,
  MovementStory,
  PainStory,
  PersonalPlanStory,
  PlateauStory,
  RoadmapStory,
  ThreeStepJourney,
} from "./HomeVisualStories";
import { ScrollReveal } from "./ScrollReveal";
import { SevenDayMenu } from "./SevenDayMenu";
import { resolveSupportEmail } from "@/lib/support-email";
import { KakaChatbot } from "./KakaChatbot";
import { PointerEffects } from "./PointerEffects";
import styles from "./page.module.css";

const LINE_OA_FALLBACK = "https://lin.ee/5rxQDpa";

function resolveLineOaUrl(): string {
  const fromEnv = process.env.LINE_OA_URL?.trim();
  if (fromEnv) return fromEnv;
  return LINE_OA_FALLBACK;
}

export default function HomePage() {
  const lineUrl = resolveLineOaUrl();
  const supportEmail = resolveSupportEmail();

  return (
    <div className={styles.page}>
      <ScrollReveal />
      <PointerEffects />

      <nav className={styles.topNav} aria-label="主要導覽">
        <div className={styles.navInner}>
          <a className={styles.navBrand} href="#top">
            <span className={styles.navMark}>K</span>
            <span>健身卡卡</span>
          </a>
          <div className={styles.navLinks}>
            <a href="#how">怎麼使用</a>
            <a href="#features">功能</a>
            <a href="#challenge">30 天挑戰</a>
            <a href="#plans">方案</a>
          </div>
          <div className={styles.navActions}>
            <Link className={styles.navLogin} href="/member-login">會員登入</Link>
            <a className={styles.navCta} href={lineUrl} rel="noopener noreferrer" target="_blank">
              加入 LINE
            </a>
          </div>
        </div>
      </nav>

      <header id="top" className={styles.hero}>
        <div className={styles.heroBg} aria-hidden />
        <div className={styles.heroGrid} aria-hidden />
        <div className={styles.heroGlow} aria-hidden />

        <div className={styles.heroInner}>
          <div className={styles.heroCopy}>
            <p className={styles.systemTag}>KAKA · 30 DAY CHALLENGE</p>
            <h1 className={styles.brand}>健身卡卡教練</h1>
            <p className={styles.headline}>不用節食，也不用每天算熱量</p>
            <p className={styles.support}>拍下每一餐，卡卡陪你完成 30 天減脂挑戰</p>
            <div className={styles.ctaGroup}>
              <a className={styles.ctaPrimary} href={lineUrl} rel="noopener noreferrer" target="_blank">
                立即免費開始挑戰
              </a>
              <Link className={styles.ctaSecondary} href="/member-login">已是會員？登入</Link>
            </div>
            <p className={styles.disclaimer}>
              點「免費開始」只會先進入健身卡卡官方 LINE，由卡卡先詢問你是否要開始體驗，不會直接把你送進複雜網頁。
            </p>
            <ul className={styles.trustRow} aria-label="服務特點">
              <li>7 天個人化菜單</li>
              <li>支援 LINE 使用</li>
              <li>拍照即可分析</li>
              <li>資料僅本人可見</li>
            </ul>
          </div>

          <div className={styles.heroVisual}>
            <div className={styles.visualFrame} data-tilt data-tilt-preserve-image>
              <Image
                className={styles.challengeImage}
                src="/images/hero-kaka-original.webp"
                alt="卡卡健身教練與 30 天減脂挑戰功能總覽"
                width={1086}
                height={1448}
                priority
                sizes="(max-width: 899px) 92vw, 46vw"
              />
            </div>
            <p className={styles.visualCaption}>DAY BY DAY · 讓改變看得見</p>
          </div>
        </div>
        <a className={styles.scrollCue} href="#problem" aria-label="向下查看">
          <span>SCROLL</span><i />
        </a>
      </header>

      <PainStory />
      <ThreeStepJourney />
      <PersonalPlanStory />
      <SevenDayMenu />
      <MealFlexStory />
      <FeatureStory />
      <MovementStory />
      <RoadmapStory />
      <PlateauStory />

      <div id="plans"><HomePlansSection lineUrl={lineUrl} /></div>

      <CoachClosing />

      <section className={styles.faqTeaser} aria-labelledby="faq-title">
        <div className={`${styles.sectionInner} ${styles.reveal}`} data-reveal>
          <p className={styles.sectionEyebrow}>QUESTIONS</p>
          <h2 id="faq-title" className={styles.sectionTitle}>開始前，你可能想知道</h2>
          <div className={styles.faqGrid}>
            <article><h3>辨識一定準確嗎？</h3><p>餐點與份量是 AI 推估，你可以修改後再確認。結果提供日常參考，不取代醫療或營養師建議。</p></article>
            <article><h3>一定要下載 App 嗎？</h3><p>不用，加入 LINE 就能開始使用與諮詢。</p></article>
            <article><h3>免費開始會直接進網頁嗎？</h3><p>不會。先進官方 LINE，由卡卡詢問你要不要開始體驗，再一步一步帶你設定。</p></article>
          </div>
          <Link className={styles.textLink} href="/faq">查看完整常見問題 →</Link>
        </div>
      </section>

      <section className={styles.closing} aria-labelledby="close-title">
        <div className={styles.sectionInner} data-reveal>
          <h2 id="close-title" className={styles.sectionTitle}>今天就開始第一餐</h2>
          <p className={styles.sectionLead}>不用完美，只要比昨天更健康</p>
          <div className={styles.ctaGroup}>
            <a className={styles.ctaPrimary} href={lineUrl} rel="noopener noreferrer" target="_blank">
              免費開始
            </a>
            <Link className={styles.ctaSecondary} href="/member-login">會員登入</Link>
          </div>
          <p className={styles.disclaimerBlock}>
            聲明：本服務之 AI 分析結果僅供生活參考，不構成醫療、營養師處方或診斷。如有疾病、飲食限制或特殊身體狀況，請諮詢合格醫療專業人員。
          </p>
        </div>
      </section>

      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <span>© {new Date().getFullYear()} 健身卡卡教練</span>
          <nav className={styles.footerLinks} aria-label="網站連結">
            <Link href="/faq">FAQ</Link>
            <a href={`mailto:${supportEmail}`}>聯絡／支援</a>
            <a href={lineUrl} rel="noopener noreferrer" target="_blank">LINE 官方帳號</a>
            <Link href="/privacy">隱私權政策</Link>
            <Link href="/terms">服務條款</Link>
            <Link href="/refund">退款政策</Link>
            <span>正式服務</span>
          </nav>
        </div>
      </footer>

      <KakaChatbot lineUrl={lineUrl} />
    </div>
  );
}
