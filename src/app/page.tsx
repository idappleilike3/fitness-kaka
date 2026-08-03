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

/**
 * Homepage = marketing + plan comparison only.
 * Full 5-section dashboard / 30-day challenge / Chart.js → next phase.
 */

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
            <a href="#trial">7 天體驗</a>
            <a href="#features">功能</a>
            <a href="#challenge">30 天挑戰</a>
            <a href="#plans">方案</a>
          </div>
          <div className={styles.navActions}>
            <Link className={styles.navLogin} href="/member-login">會員登入</Link>
            <a className={styles.navCta} href={lineUrl} rel="noopener noreferrer" target="_blank">
              免費體驗
            </a>
          </div>
        </div>
      </nav>

      {/* Hero: one promise, one primary action, one dominant product visual. */}
      <header id="top" className={styles.hero}>
        <div className={styles.heroBg} aria-hidden />
        <div className={styles.heroGrid} aria-hidden />
        <div className={styles.heroGlow} aria-hidden />

        <div className={styles.heroInner}>
          <div className={styles.heroCopy}>
            <p className={styles.systemTag}>KAKA FITNESS · HEALTHY FAT LOSS</p>
            <h1 className={styles.brand}>健身卡卡教練</h1>
            <p className={styles.headline}>
              好好吃，也能健康減脂
            </p>
            <p className={styles.support}>
              從熱量、蛋白質到每一餐的選擇，卡卡用看得懂的圖片與指引，陪你一步一步瘦得健康、不復胖。
            </p>
            <div className={styles.ctaGroup}>
              <a
                className={styles.ctaPrimary}
                href={lineUrl}
                rel="noopener noreferrer"
                target="_blank"
              >
                開始 7 天免費體驗
              </a>
              <Link className={styles.ctaSecondary} href="/member-login">會員登入</Link>
            </div>
            <p className={styles.disclaimer}>
              先體驗個人目標、餐點拍照分析與每日營養指引。AI 推估供生活參考，不取代醫療或營養師建議。
            </p>
            <ul className={styles.trustRow} aria-label="服務特點">
              <li>不鼓勵極端節食</li>
              <li>蛋白質與營養並重</li>
              <li>LINE 拍照就能記錄</li>
              <li>溫暖陪伴不責備</li>
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
            <div className={styles.heroFloatCard}>
              <span>今天的下一步</span>
              <strong>晚餐補一份蛋白質</strong>
              <small>不用少吃一餐，也能慢慢靠近目標</small>
            </div>
            <p className={styles.visualCaption}>EAT WELL · MOVE WELL · FEEL BETTER</p>
          </div>
        </div>
        <a className={styles.scrollCue} href="#problem" aria-label="向下查看">
          <span>SCROLL</span><i />
        </a>
      </header>

      <section id="trial" className={styles.trialPreview} aria-labelledby="trial-title">
        <div className={styles.sectionInner} data-reveal>
          <p className={styles.sectionEyebrow}>7-DAY FREE EXPERIENCE</p>
          <h2 id="trial-title" className={styles.sectionTitle}>進來就能免費體驗什麼？</h2>
          <p className={styles.sectionLead}>不用先懂營養，也不用先準備完美菜單。從你的身體與生活開始，7 天把健康減脂變成每天都做得到的小步驟。</p>
          <div className={styles.trialGrid}>
            <article data-tilt>
              <span>01</span>
              <div><small>第一步</small><h3>建立個人目標</h3><p>依身高、體重、活動量計算 BMI、BMR、TDEE，以及合理的熱量與蛋白質方向。</p></div>
            </article>
            <article data-tilt>
              <span>02</span>
              <div><small>每一餐</small><h3>拍照看懂每一餐</h3><p>傳餐點照片，先看熱量、蛋白質、碳水與脂肪估算，確認後才寫入紀錄。</p></div>
            </article>
            <article data-tilt>
              <span>03</span>
              <div><small>每一天</small><h3>每天知道下一步</h3><p>看到今天還能吃多少、還差多少蛋白質，以及下一餐最值得調整的一件事。</p></div>
            </article>
          </div>
          <div className={styles.trialCtaRow}>
            <a className={styles.ctaPrimary} href={lineUrl} rel="noopener noreferrer" target="_blank">開始 7 天免費體驗</a>
            <span>加入 LINE 即可開始 · 不用下載 App</span>
          </div>
        </div>
      </section>

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
            <article><h3>7 天免費體驗可以做什麼？</h3><p>建立個人目標、拍照分析餐點，查看每天剩餘熱量與蛋白質方向，再決定是否繼續。</p></article>
          </div>
          <Link className={styles.textLink} href="/faq">查看完整常見問題 →</Link>
        </div>
      </section>

      <section className={styles.closing} aria-labelledby="close-title">
        <div className={styles.sectionInner} data-reveal>
          <h2 id="close-title" className={styles.sectionTitle}>
            今天就開始第一餐
          </h2>
          <p className={styles.sectionLead}>
            不用完美，只要比昨天更健康
          </p>
          <div className={styles.ctaGroup}>
            <a
              className={styles.ctaPrimary}
              href={lineUrl}
              rel="noopener noreferrer"
              target="_blank"
            >
              開始 7 天免費體驗
            </a>
          </div>
          <p className={styles.disclaimerBlock}>
            聲明：本服務之 AI
            分析結果僅供生活參考，不構成醫療、營養師處方或診斷。如有疾病、飲食限制或特殊身體狀況，請諮詢合格醫療專業人員。
          </p>
        </div>
      </section>

      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <span>© {new Date().getFullYear()} 健身卡卡教練</span>
          <nav className={styles.footerLinks} aria-label="網站連結">
            <Link href="/faq">FAQ</Link>
            <a href={`mailto:${supportEmail}`}>聯絡／支援</a>
            <a href={lineUrl} rel="noopener noreferrer" target="_blank">加入健身卡卡 LINE</a>
            <Link href="/privacy">隱私權政策</Link>
            <Link href="/terms">服務條款</Link>
            <Link href="/refund">退款政策</Link>
            <Link href="/ai-platform">AI 串接平台說明</Link>
            <span>正式服務</span>
          </nav>
        </div>
      </footer>
      <KakaChatbot lineUrl={lineUrl} />
    </div>
  );
}
