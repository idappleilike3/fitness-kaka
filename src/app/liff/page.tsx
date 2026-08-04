"use client";

import Script from "next/script";
import { useCallback, useEffect, useMemo, useState } from "react";

const LIFF_ID = process.env.NEXT_PUBLIC_LIFF_ID?.trim() || "2010804832-oPIqeXjJ";
const LIFF_URL = `https://liff.line.me/${LIFF_ID}`;
const LINE_CHAT_URL = "https://line.me/R/oaMessage/@146iqokj/?%E6%88%91%E8%A6%81%E6%8B%8D%E7%85%A7%E8%A8%98%E9%8C%84";

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

type ViewKey = "home" | "photo" | "today" | "challenge" | "trial" | "records";

type Summary = {
  calorieTarget: number;
  proteinTarget: number;
  todayKcal: number;
  todayProtein: number;
  remainingKcal: number;
  planId: string;
  expiresAt: string | null;
  remainingDays: number | null;
  healthScore: number;
  challenge: {
    day: number;
    missionTitle: string | null;
    missionDescription?: string | null;
    missionCompleted: boolean;
    streakDays: number;
  };
  recentRecords: Array<{
    date: string;
    kcal: number;
    proteinG: number;
    carbG: number;
    fatG: number;
  }>;
};

const PLAN_LABELS: Record<string, string> = {
  free: "訪客／免費會員",
  plan_299: "付費 7 天體驗",
  plan_399: "卡卡 Plus（月繳）",
  plan_799: "卡卡 Pro 教練（月繳）",
  plan_3590: "卡卡 Plus（年繳）",
  plan_7190: "卡卡 Pro 教練（年繳）",
};

const VIEW_LABELS: Record<ViewKey, string> = {
  home: "會員中心",
  photo: "拍照記錄",
  today: "今日額度",
  challenge: "30 天挑戰",
  trial: "我的體驗",
  records: "我的紀錄",
};

const card: React.CSSProperties = {
  background: "#1b2230",
  border: "1px solid #2c3748",
  borderRadius: 18,
  padding: 16,
};

function normalizeView(value: string | null): ViewKey {
  return value && value in VIEW_LABELS ? (value as ViewKey) : "home";
}

export default function LiffPage() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [status, setStatus] = useState("正在連接 LINE 會員登入…");
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<ViewKey>("home");

  useEffect(() => {
    setView(normalizeView(new URL(window.location.href).searchParams.get("view")));
  }, []);

  const login = useCallback(async () => {
    setError(null);
    setStatus("正在連接 LINE 會員登入…");
    try {
      const sdk = window.liff;
      if (!sdk) throw new Error("LINE 登入元件尚未載入，請重新整理一次。");
      await sdk.init({ liffId: LIFF_ID });
      if (!sdk.isLoggedIn()) {
        setStatus("正在開啟 LINE 登入…");
        sdk.login({ redirectUri: window.location.href });
        return;
      }
      setStatus("正在讀取會員資料…");
      const profile = await sdk.getProfile();
      setDisplayName(profile.displayName || "會員");
      const response = await fetch(`/api/liff/summary?lineUserId=${encodeURIComponent(profile.userId)}`, { cache: "no-store" });
      const body = await response.json().catch(() => null);
      if (!response.ok) throw new Error(body?.error || "會員資料讀取失敗，請重新登入。");
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

  const caloriePercent = useMemo(() => {
    if (!summary?.calorieTarget) return 0;
    return Math.min(100, Math.round((summary.todayKcal / summary.calorieTarget) * 100));
  }, [summary]);

  const proteinPercent = useMemo(() => {
    if (!summary?.proteinTarget) return 0;
    return Math.min(100, Math.round((summary.todayProtein / summary.proteinTarget) * 100));
  }, [summary]);

  function switchView(next: ViewKey) {
    setView(next);
    const url = new URL(window.location.href);
    if (next === "home") url.searchParams.delete("view");
    else url.searchParams.set("view", next);
    window.history.replaceState({}, "", url);
  }

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

      <main style={{ minHeight: "100vh", background: "#090b10", color: "#f7f7fb", padding: "20px 14px 42px" }}>
        <section style={{ maxWidth: 620, margin: "0 auto", background: "#121720", border: "1px solid #283241", borderRadius: 24, padding: 20, boxShadow: "0 22px 70px rgba(0,0,0,.4)" }}>
          <p style={{ color: "#bda6ff", fontWeight: 800, margin: 0 }}>KAKA FITNESS</p>
          <h1 style={{ fontSize: 28, margin: "8px 0 4px" }}>{VIEW_LABELS[view]}</h1>
          <p style={{ color: "#9fa9b8", marginTop: 0 }}>LINE 安全登入・資料只提供本人查看</p>

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
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", marginBottom: 14 }}>
                <div>
                  <h2 style={{ margin: 0, fontSize: 21 }}>{displayName}，今天也一起加油</h2>
                  <p style={{ color: "#9fa9b8", margin: "5px 0 0" }}>{PLAN_LABELS[summary.planId] ?? summary.planId}</p>
                </div>
                {view !== "home" ? (
                  <button type="button" onClick={() => switchView("home")} style={{ border: "1px solid #42506a", borderRadius: 999, background: "transparent", color: "#e6e9ef", padding: "8px 12px" }}>
                    返回
                  </button>
                ) : null}
              </div>

              {view === "home" ? (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 10 }}>
                  {(["photo", "today", "challenge", "records", "trial"] as ViewKey[]).map((item) => (
                    <button key={item} type="button" onClick={() => switchView(item)} style={{ ...card, color: "#fff", textAlign: "left", cursor: "pointer", minHeight: 92 }}>
                      <strong style={{ display: "block", fontSize: 17 }}>{VIEW_LABELS[item]}</strong>
                      <small style={{ color: "#aab4c3" }}>點擊查看</small>
                    </button>
                  ))}
                  <a href="/#plans" style={{ ...card, color: "#fff", textDecoration: "none", minHeight: 58 }}>
                    <strong style={{ display: "block", fontSize: 17 }}>方案／客服</strong>
                    <small style={{ color: "#aab4c3" }}>續費、升級與聯絡</small>
                  </a>
                </div>
              ) : null}

              {view === "photo" ? (
                <article style={{ ...card, background: "linear-gradient(135deg,#4c1d62,#1b2230)" }}>
                  <h2 style={{ marginTop: 0 }}>拍下每一餐，傳給卡卡</h2>
                  <p style={{ color: "#d7dbe4", lineHeight: 1.7 }}>按下按鈕會回到卡卡官方 LINE。直接傳送餐點照片，卡卡會先分析熱量與營養，等你確認後才會存入紀錄。</p>
                  <a href={LINE_CHAT_URL} style={{ display: "block", textAlign: "center", borderRadius: 999, padding: 14, background: "#06c755", color: "white", textDecoration: "none", fontWeight: 900 }}>
                    開啟 LINE 拍照記錄
                  </a>
                </article>
              ) : null}

              {view === "today" ? (
                <div style={{ display: "grid", gap: 12 }}>
                  <article style={card}>
                    <span style={{ color: "#aab4c3" }}>今日熱量</span>
                    <strong style={{ display: "block", fontSize: 30, margin: "6px 0" }}>{summary.todayKcal} / {summary.calorieTarget || "尚未設定"}</strong>
                    <div style={{ height: 10, background: "#303b4c", borderRadius: 999, overflow: "hidden" }}><i style={{ display: "block", height: "100%", width: `${caloriePercent}%`, background: "#ec4899" }} /></div>
                    <p>今天還能吃約 <b>{summary.remainingKcal} kcal</b></p>
                  </article>
                  <article style={card}>
                    <span style={{ color: "#aab4c3" }}>今日蛋白質</span>
                    <strong style={{ display: "block", fontSize: 30, margin: "6px 0" }}>{summary.todayProtein} / {summary.proteinTarget || "尚未設定"} g</strong>
                    <div style={{ height: 10, background: "#303b4c", borderRadius: 999, overflow: "hidden" }}><i style={{ display: "block", height: "100%", width: `${proteinPercent}%`, background: "#8b5cf6" }} /></div>
                  </article>
                </div>
              ) : null}

              {view === "challenge" ? (
                <article style={{ ...card, background: "linear-gradient(135deg,#30205a,#1b2230)" }}>
                  <h2 style={{ marginTop: 0 }}>30 天挑戰</h2>
                  {summary.challenge.day > 0 ? (
                    <>
                      <strong style={{ fontSize: 28 }}>Day {summary.challenge.day}</strong>
                      <p>連續完成 {summary.challenge.streakDays} 天</p>
                      <p><b>{summary.challenge.missionCompleted ? "今日任務已完成 ✓" : summary.challenge.missionTitle || "等待今日任務"}</b></p>
                      {summary.challenge.missionDescription ? <p style={{ color: "#c9cfda" }}>{summary.challenge.missionDescription}</p> : null}
                    </>
                  ) : (
                    <>
                      <p>目前尚未開始挑戰。回到卡卡 LINE 輸入「我要參加三十天減脂挑戰」即可開始。</p>
                      <a href={LINE_CHAT_URL} style={{ display: "block", textAlign: "center", borderRadius: 999, padding: 14, background: "#8b5cf6", color: "white", textDecoration: "none", fontWeight: 900 }}>前往 LINE 開始挑戰</a>
                    </>
                  )}
                </article>
              ) : null}

              {view === "trial" ? (
                <article style={card}>
                  <h2 style={{ marginTop: 0 }}>我的方案與體驗</h2>
                  <p style={{ fontSize: 20, fontWeight: 800 }}>{PLAN_LABELS[summary.planId] ?? summary.planId}</p>
                  {summary.remainingDays !== null ? <p>目前剩餘約 <b style={{ color: "#fb7185", fontSize: 24 }}>{summary.remainingDays}</b> 天</p> : <p>目前沒有設定到期日。</p>}
                  <a href="/#plans" style={{ display: "block", textAlign: "center", borderRadius: 999, padding: 14, background: "#ec4899", color: "white", textDecoration: "none", fontWeight: 900 }}>查看升級方案</a>
                </article>
              ) : null}

              {view === "records" ? (
                <div style={{ display: "grid", gap: 10 }}>
                  <h2 style={{ marginBottom: 0 }}>最近 14 天營養紀錄</h2>
                  {summary.recentRecords.length ? summary.recentRecords.map((record) => (
                    <article key={record.date} style={{ ...card, display: "grid", gridTemplateColumns: "1.2fr 1fr 1fr", gap: 8, alignItems: "center" }}>
                      <strong>{record.date}</strong>
                      <span>{record.kcal} kcal</span>
                      <span>{record.proteinG}g 蛋白質</span>
                    </article>
                  )) : <article style={card}>目前還沒有已確認的飲食紀錄。先傳一張餐點照片給卡卡吧。</article>}
                </div>
              ) : null}
            </div>
          ) : null}
        </section>
      </main>
    </>
  );
}
