"use client";

import { useState } from "react";
import styles from "./page.module.css";

type BillingCycle = "month" | "year";

type ServiceItem = { text: string; status: "ready" | "soon" };

type PlanDef = {
  id: string;
  tier: string;
  name: string;
  featured: boolean;
  badge: string | null;
  quota: string;
  services: ServiceItem[];
  monthlyPrice: string;
  yearlyPrice: string;
  yearlyNote: string;
  yearlyStrike: string;
  monthlyNote: string;
};

const PLANS: PlanDef[] = [
  {
    id: "free",
    tier: "體驗",
    name: "免費",
    featured: true,
    badge: "先從這裡開始",
    quota: "餐點分析：照片＋文字合計 5 次／天",
    services: [
      { text: "AI 拍照分析", status: "ready" },
      { text: "BMI／BMR／TDEE 身體分析", status: "ready" },
      { text: "今日熱量", status: "ready" },
    ],
    monthlyPrice: "NT$0",
    yearlyPrice: "NT$0",
    yearlyNote: "先從一餐開始",
    yearlyStrike: "",
    monthlyNote: "先從一餐開始",
  },
  {
    id: "menu299",
    tier: "菜單",
    name: "7 天個人化減脂菜單",
    featured: true,
    badge: "一次付費・完整 7 天",
    quota: "依身體資料、目標與飲食偏好規劃",
    services: [
      { text: "完整 Day 1～Day 7 菜單", status: "ready" },
      { text: "每天早／午／晚餐＋點心", status: "ready" },
      { text: "每日熱量與蛋白質目標", status: "ready" },
      { text: "飲食禁忌與外食偏好調整", status: "ready" },
      { text: "一次付費，不自動續扣", status: "ready" },
    ],
    monthlyPrice: "NT$299",
    yearlyPrice: "NT$299",
    yearlyNote: "／份",
    yearlyStrike: "",
    monthlyNote: "／份",
  },
  {
    id: "plus",
    tier: "記錄",
    name: "卡卡 Plus",
    featured: false,
    badge: null,
    quota: "每天：圖 10／文 30／語 5",
    services: [
      { text: "AI 拍照分析", status: "ready" },
      { text: "AI 文字分析", status: "ready" },
      { text: "每日熱量管理", status: "ready" },
      { text: "每日飲食紀錄", status: "ready" },
      { text: "歷史紀錄", status: "ready" },
      { text: "今日健康儀表板", status: "ready" },
      { text: "每週飲食摘要／熱量分析／目標完成率", status: "soon" },
    ],
    monthlyPrice: "NT$399",
    yearlyPrice: "NT$3590",
    yearlyNote: "／年・一天不到 10 元",
    yearlyStrike: "月繳 NT$4788",
    monthlyNote: "/ 30 天",
  },
  {
    id: "pro",
    tier: "陪伴",
    name: "卡卡 Pro 教練",
    featured: false,
    badge: "每天知道下一步",
    quota: "每天：圖 25／文 60／語 15",
    services: [
      { text: "AI 每日健康檢查／下一步建議", status: "soon" },
      { text: "每週健康檢查報告", status: "soon" },
      { text: "30 天減脂挑戰＋成果追蹤", status: "soon" },
      { text: "提醒協助你完成喝水與運動", status: "soon" },
    ],
    monthlyPrice: "NT$799",
    yearlyPrice: "NT$7190",
    yearlyNote: "／年・一天不到 20 元",
    yearlyStrike: "月繳 NT$9588",
    monthlyNote: "/ 30 天",
  },
];

export function HomePlansSection({ lineUrl }: { lineUrl: string }) {
  const [cycle, setCycle] = useState<BillingCycle>("month");

  return (
    <section className={styles.plans} aria-labelledby="plan-title">
      <div className={styles.sectionInner} data-reveal>
        <p className={styles.sectionEyebrow}>MISSION TIERS</p>
        <h2 id="plan-title" className={styles.sectionTitle}>
          體驗、記錄、陪伴：你需要哪一種？
        </h2>
        <p className={styles.sectionLead}>
          價格透明，先透過 LINE 了解你的目標與需求，再由卡卡教練協助購買與開始計畫。
        </p>

        <div className={styles.billingToggle} role="group" aria-label="計費週期">
          <button
            type="button"
            className={
              cycle === "month"
                ? `${styles.billingBtn} ${styles.billingBtnActive}`
                : styles.billingBtn
            }
            onClick={() => setCycle("month")}
            aria-pressed={cycle === "month"}
          >
            月繳
          </button>
          <button
            type="button"
            className={
              cycle === "year"
                ? `${styles.billingBtn} ${styles.billingBtnActive}`
                : styles.billingBtn
            }
            onClick={() => setCycle("year")}
            aria-pressed={cycle === "year"}
          >
            年繳・更划算
          </button>
        </div>

        <div className={styles.planGrid}>
          {PLANS.map((plan) => {
            const isYear = cycle === "year" && plan.id !== "free";
            const price = isYear ? plan.yearlyPrice : plan.monthlyPrice;
            const note = isYear ? plan.yearlyNote : plan.monthlyNote;
            return (
              <article
                key={plan.id}
                className={
                  `${styles.planCard}${plan.featured ? ` ${styles.planFeatured}` : ""}${plan.id === "pro" ? ` ${styles.planPro}` : ""}`
                }
              >
                {plan.badge ? (
                  <span className={styles.planBadge}>{plan.badge}</span>
                ) : null}
                <p className={styles.planTier}>{plan.tier}</p>
                <h3 className={styles.planName}>{plan.name}</h3>
                <p className={styles.planPrice}>
                  <span className={styles.planPriceNum}>{price}</span>
                  <span className={styles.planPriceNote}>{note}</span>
                </p>
                {isYear && plan.yearlyStrike ? (
                  <p className={styles.planStrike}>
                    <s>{plan.yearlyStrike}</s>
                    <span> 年繳更省</span>
                  </p>
                ) : null}
                <p className={styles.quotaSummary}>{plan.quota}</p>
                <ul className={styles.serviceList}>
                  {plan.services.map((s) => (
                    <li key={s.text}>
                      <span
                        className={
                          s.status === "soon"
                            ? styles.tagSoon
                            : styles.tagReady
                        }
                      >
                        {s.status === "soon" ? "陸續開放" : "可用"}
                      </span>
                      {s.text}
                    </li>
                  ))}
                </ul>
                <a
                  className={plan.id === "free" ? styles.planCtaAlt : styles.planCta}
                  href={lineUrl}
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  {plan.id === "free" ? "免費加入 LINE" : "LINE 諮詢購買"}
                </a>
                {plan.id !== "free" ? <small className={styles.linePurchaseNote}>加入 LINE 後，由卡卡教練確認需求與付款方式</small> : null}
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
