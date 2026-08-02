"use client";

import Script from "next/script";
import { useCallback, useEffect, useState, type CSSProperties } from "react";
import { DEFAULT_SUPPORT_EMAIL } from "@/lib/support-email";

declare global {
  interface Window {
    liff?: {
      init(options: { liffId: string }): Promise<void>;
      isLoggedIn(): boolean;
      login(options?: { redirectUri?: string }): void;
      getProfile(): Promise<{ userId: string; displayName: string; pictureUrl?: string }>;
    };
  }
}

type Summary = {
  calorieTarget: number;
  proteinTarget: number;
  todayKcal: number;
  todayProtein: number;
  remainingKcal: number;
  planId: string;
  expiresAt: string | null;
  menuOrder: { id: string; status: string; revision_count: number } | null;
  healthScore: { status: "incomplete" | "ready"; score: number | null };
  challenge: {
    day: number;
    missionTitle: string | null;
    missionDescription: string | null;
    missionCompleted: boolean;
    streakDays: number;
  };
};

type SellablePlan = "plan_299" | "plan_399" | "plan_799" | "plan_3590" | "plan_7190";

const PLAN_LABELS: Record<string, string> = {
  free: "免費",
  plan_299: "7 天個人化減脂菜單",
  plan_399: "卡卡 Plus（月繳）",
  plan_799: "卡卡 Pro 教練（月繳）",
  plan_3590: "卡卡 Plus（年繳）",
  plan_7190: "卡卡 Pro 教練（年繳）",
};

export default function LiffPage() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lineUserId, setLineUserId] = useState<string | null>(null);
  const [paying, setPaying] = useState<SellablePlan | null>(null);

  const initializeLiff = useCallback(async () => {
    try {
      const liffId = process.env.NEXT_PUBLIC_LIFF_ID?.trim();
      if (!liffId) {
        setError("會員登入尚未完成 LIFF ID 設定，請聯絡卡卡客服。");
        return;
      }

      const sdk = window.liff;
      if (!sdk) return;
      await sdk.init({ liffId });
      if (!sdk.isLoggedIn()) {
        sdk.login({ redirectUri: window.location.href });
        return;
      }

      const profile = await sdk.getProfile();
      const uid = profile.userId;
      setLineUserId(uid);
      const res = await fetch(`/api/liff/summary?lineUserId=${encodeURIComponent(uid)}`);
      if (!res.ok) throw new Error("無法載入會員資料");
      setSummary((await res.json()) as Summary);
    } catch (e) {
      setError(e instanceof Error ? e.message : "LINE 登入失敗，請重新開啟會員中心。");
    }
  }, []);

  useEffect(() => {
    if (window.liff) void initializeLiff();
  }, [initializeLiff]);

  async function startPay(planId: SellablePlan) {
    if (!lineUserId) return;
    setPaying(planId);
    setError(null);
    try {
      const res = await fetch("/api/newebpay/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lineUserId, planId }),
      });
      const data = (await res.json()) as { payUrl?: string; error?: string };
      if (!res.ok || !data.payUrl) {
        setError(data.error ?? "無法建立訂單");
        return;
      }
      window.location.href = data.payUrl;
    } catch {
      setError("無法建立訂單");
    } finally {
      setPaying(null);
    }
  }

  const btnStyle: CSSProperties = {
    display: "block",
    width: "100%",
    marginTop: "0.75rem",
    padding: "0.75rem 1.25rem",
    border: "none",
    background: "#111",
    color: "#fff",
    fontSize: "1rem",
    cursor: "pointer",
    textAlign: "left",
  };

  return (
    <>
      <Script
        src="https://static.line-scdn.net/liff/edge/2/sdk.js"
        strategy="afterInteractive"
        onLoad={() => void initializeLiff()}
      />
      <main style={{ padding: "1.5rem", maxWidth: 480, margin: "0 auto" }}>
        <h1 style={{ fontSize: "1.75rem", marginBottom: "0.25rem" }}>健身卡卡教練</h1>
        <p style={{ color: "#555", marginTop: 0 }}>今日總覽</p>
        {error && <p style={{ color: "#b00020" }}>{error}</p>}
        {!error && !summary ? <p>正在登入並載入會員資料…</p> : null}
        {summary && (
          <section style={{ lineHeight: 1.8 }}>
            <p>今日熱量：{summary.todayKcal} / {summary.calorieTarget} kcal</p>
            <p>剩餘：{summary.remainingKcal} kcal</p>
            <p>蛋白質：{summary.todayProtein} / {summary.proteinTarget} g</p>
            <p>方案：{PLAN_LABELS[summary.planId] ?? summary.planId}</p>
            <p>到期日：{summary.expiresAt ?? "免費（無到期）"}</p>
            <section style={{ marginTop: "1.25rem", padding: "1rem", border: "1px solid #ddd", borderRadius: 12 }}>
              <strong>30 天挑戰</strong>
              {summary.challenge.day === 0 ? (
                <p>到 LINE 輸入「我要參加三十天減脂挑戰」，從今天 Day 1 開始</p>
              ) : (
                <>
                  <p>Day {summary.challenge.day} · 連續紀錄 {summary.challenge.streakDays} 天</p>
                  <p>今日任務：{summary.challenge.missionTitle ?? "確認一餐"}（{summary.challenge.missionCompleted ? "已完成" : "待完成"}）</p>
                </>
              )}
              <p>今日健康分數：{summary.healthScore.status === "ready" ? ` ${summary.healthScore.score}／100` : " 資料不足，確認一餐並完成目標設定後顯示"}</p>
            </section>

            <p style={{ marginTop: "1.25rem", marginBottom: 0, fontWeight: 600 }}>升級方案（一次付清）</p>
            <p style={{ fontSize: "0.9rem", color: "#555", marginTop: "0.25rem" }}>免費體驗：照片＋打字共用 5 次／天、聊天不扣、語音 0。付費方案的圖片、文字、語音額度分開計算；年繳與月繳額度相同。</p>

            <p style={{ marginTop: "1rem", marginBottom: 0, fontWeight: 600 }}>一次性個人化菜單</p>
            <button type="button" disabled={paying !== null} onClick={() => void startPay("plan_299")} style={{ ...btnStyle, background: "#7a5b40" }}>
              {paying === "plan_299" ? "建立訂單中…" : "7 天個人化減脂菜單 NT$299"}
            </button>
            <p style={{ fontSize: "0.85rem", color: "#666" }}>付款後填寫飲食問卷，系統會依你的熱量、蛋白質目標和生活方式生成菜單，並可免費重新生成一次。</p>
            {summary.menuOrder ? <a href={`/menu-plan?lineUserId=${encodeURIComponent(lineUserId ?? "")}`} style={{ display: "block", marginTop: 8 }}>打開我的 7 天菜單</a> : null}

            <p style={{ marginTop: "1rem", marginBottom: 0, fontWeight: 600 }}>月繳（30 天）</p>
            <button type="button" disabled={paying !== null} onClick={() => void startPay("plan_399")} style={btnStyle}>
              {paying === "plan_399" ? "建立訂單中…" : "卡卡 Plus NT$399（圖 10／文 30／語音 5）"}
            </button>
            <button type="button" disabled={paying !== null} onClick={() => void startPay("plan_799")} style={{ ...btnStyle, background: "#1a4d2e" }}>
              {paying === "plan_799" ? "建立訂單中…" : "卡卡 Pro 教練 NT$799（圖 25／文 60／語音 15）"}
            </button>

            <p style={{ marginTop: "1.25rem", marginBottom: 0, fontWeight: 600 }}>年繳（365 天・更划算）</p>
            <button type="button" disabled={paying !== null} onClick={() => void startPay("plan_3590")} style={btnStyle}>
              {paying === "plan_3590" ? "建立訂單中…" : "卡卡 Plus NT$3590／年（一天不到 10 元）"}
            </button>
            <p style={{ fontSize: "0.8rem", color: "#888", margin: "0.2rem 0 0" }}><s>月繳約 NT$4788</s> ・ 年繳更省</p>
            <button type="button" disabled={paying !== null} onClick={() => void startPay("plan_7190")} style={{ ...btnStyle, background: "#1a4d2e" }}>
              {paying === "plan_7190" ? "建立訂單中…" : "卡卡 Pro 教練 NT$7190／年（一天不到 20 元）"}
            </button>
            <p style={{ fontSize: "0.8rem", color: "#888", margin: "0.2rem 0 0" }}><s>月繳約 NT$9588</s> ・ 年繳更省</p>

            <p style={{ fontSize: "0.85rem", color: "#666", marginTop: "1rem" }}>一次付清，無自動扣款；到期後回到免費額度。付費可用語音記飲食（最長 60 秒）。</p>
            <p style={{ fontSize: "0.85rem" }}>
              <a href="/privacy">隱私權政策</a> · <a href="/terms">使用條款</a> · <a href="/refund">退款政策</a> · <a href={`mailto:${DEFAULT_SUPPORT_EMAIL}`}>客服 {DEFAULT_SUPPORT_EMAIL}</a>
            </p>
          </section>
        )}
      </main>
    </>
  );
}
