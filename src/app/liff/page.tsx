"use client";

import Script from "next/script";
import { useCallback, useEffect, useState } from "react";

const LIFF_ID = process.env.NEXT_PUBLIC_LIFF_ID?.trim() || "2010804832-oPIqeXjJ";
const LIFF_URL = `https://liff.line.me/${LIFF_ID}`;

declare global {
  interface Window {
    liff?: {
      init(options: { liffId: string }): Promise<void>;
      isLoggedIn(): boolean;
      login(options?: { redirectUri?: string }): void;
      logout(): void;
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
  challenge: {
    day: number;
    missionTitle: string | null;
    missionCompleted: boolean;
    streakDays: number;
  };
};

const PLAN_LABELS: Record<string, string> = {
  free: "免費會員",
  plan_299: "7 天個人化減脂菜單",
  plan_399: "卡卡 Plus（月繳）",
  plan_799: "卡卡 Pro 教練（月繳）",
  plan_3590: "卡卡 Plus（年繳）",
  plan_7190: "卡卡 Pro 教練（年繳）",
};

export default function LiffPage() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [status, setStatus] = useState("正在連接 LINE 會員登入…");
  const [error, setError] = useState<string | null>(null);

  const login = useCallback(async () => {
    setError(null);
    setStatus("正在連接 LINE 會員登入…");

    try {
      const sdk = window.liff;
      if (!sdk) {
        throw new Error("LINE 登入元件尚未載入，請重新整理一次。");
      }

      await sdk.init({ liffId: LIFF_ID });

      if (!sdk.isLoggedIn()) {
        setStatus("正在開啟 LINE 登入…");
        sdk.login({ redirectUri: `${window.location.origin}/liff` });
        return;
      }

      setStatus("正在讀取會員資料…");
      const profile = await sdk.getProfile();
      setDisplayName(profile.displayName || "會員");

      const response = await fetch(
        `/api/liff/summary?lineUserId=${encodeURIComponent(profile.userId)}`,
        { cache: "no-store" },
      );
      const body = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(body?.error || "會員資料讀取失敗，請重新登入。");
      }
      setSummary(body as Summary);
      setStatus("");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "LINE 登入失敗，請重新開啟會員中心。");
      setStatus("");
    }
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      if (!summary && !error) {
        setError("登入等待超過 15 秒，請按下方按鈕重新登入。");
        setStatus("");
      }
    }, 15000);
    return () => window.clearTimeout(timeout);
  }, [summary, error]);

  return (
    <>
      <Script
        src="https://static.line-scdn.net/liff/edge/2/sdk.js"
        strategy="afterInteractive"
        onLoad={() => void login()}
        onError={() => {
          setStatus("");
          setError("LINE 登入元件載入失敗，請檢查網路後重試。");
        }}
      />

      <main style={{ minHeight: "100vh", background: "#090b10", color: "#f7f7fb", padding: "24px 16px" }}>
        <section style={{ maxWidth: 520, margin: "0 auto", background: "#121720", border: "1px solid #283241", borderRadius: 24, padding: 24, boxShadow: "0 22px 70px rgba(0,0,0,.4)" }}>
          <p style={{ color: "#bda6ff", fontWeight: 800, margin: 0 }}>KAKA FITNESS</p>
          <h1 style={{ fontSize: 30, margin: "8px 0 4px" }}>健身卡卡會員中心</h1>
          <p style={{ color: "#9fa9b8", marginTop: 0 }}>LINE 安全登入・查看今天的飲食與挑戰進度</p>

          {status ? <p style={{ padding: 16, borderRadius: 14, background: "#1b2230" }}>{status}</p> : null}

          {error ? (
            <div style={{ padding: 16, borderRadius: 14, background: "#311923", border: "1px solid #773449" }}>
              <strong>登入尚未完成</strong>
              <p style={{ marginBottom: 12 }}>{error}</p>
              <button type="button" onClick={() => void login()} style={{ width: "100%", border: 0, borderRadius: 999, padding: "13px 18px", background: "#06c755", color: "white", fontWeight: 900, fontSize: 16 }}>
                重新使用 LINE 登入
              </button>
              <a href={LIFF_URL} style={{ display: "block", textAlign: "center", color: "#cbb9ff", marginTop: 14 }}>
                從 LINE 重新開啟會員中心
              </a>
            </div>
          ) : null}

          {summary ? (
            <div>
              <h2 style={{ marginBottom: 4 }}>{displayName}，今天也一起加油</h2>
              <p style={{ color: "#9fa9b8", marginTop: 0 }}>{PLAN_LABELS[summary.planId] ?? summary.planId}</p>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <article style={{ background: "#1b2230", borderRadius: 18, padding: 16 }}>
                  <span style={{ color: "#aab4c3" }}>今日熱量</span>
                  <strong style={{ display: "block", fontSize: 24 }}>{summary.todayKcal} / {summary.calorieTarget}</strong>
                  <small>剩餘 {summary.remainingKcal} kcal</small>
                </article>
                <article style={{ background: "#1b2230", borderRadius: 18, padding: 16 }}>
                  <span style={{ color: "#aab4c3" }}>今日蛋白質</span>
                  <strong style={{ display: "block", fontSize: 24 }}>{summary.todayProtein} / {summary.proteinTarget} g</strong>
                </article>
              </div>

              <article style={{ marginTop: 12, background: "linear-gradient(135deg,#30205a,#1b2230)", borderRadius: 18, padding: 18 }}>
                <strong>30 天挑戰</strong>
                <p style={{ marginBottom: 0 }}>
                  {summary.challenge.day > 0
                    ? `Day ${summary.challenge.day}・連續 ${summary.challenge.streakDays} 天・${summary.challenge.missionCompleted ? "今日已完成" : summary.challenge.missionTitle || "等待完成今日任務"}`
                    : "尚未開始，回 LINE 輸入「我要參加三十天減脂挑戰」即可開始。"}
                </p>
              </article>

              <a href="/" style={{ display: "block", marginTop: 18, textAlign: "center", borderRadius: 999, padding: 14, background: "#8b5cf6", color: "white", textDecoration: "none", fontWeight: 900 }}>
                返回健身卡卡首頁
              </a>
            </div>
          ) : null}
        </section>
      </main>
    </>
  );
}
