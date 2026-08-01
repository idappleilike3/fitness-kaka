"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { DEFAULT_SUPPORT_EMAIL } from "@/lib/support-email";

type Summary = {
  calorieTarget: number;
  proteinTarget: number;
  todayKcal: number;
  todayProtein: number;
  remainingKcal: number;
  planId: string;
  expiresAt: string | null;
  healthScore: { status: "incomplete" | "ready"; score: number | null };
  challenge: {
    day: number;
    missionTitle: string | null;
    missionDescription: string | null;
    missionCompleted: boolean;
    streakDays: number;
  };
};

type SellablePlan = "plan_399" | "plan_799" | "plan_3590" | "plan_7190";

const PLAN_LABELS: Record<string, string> = {
  free: "免費",
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

  useEffect(() => {
    async function load() {
      try {
        const params = new URLSearchParams(window.location.search);
        const uid = params.get("lineUserId");
        if (!uid) {
          setError(
            "請從 LINE 開啟會員中心。",
          );
          return;
        }
        setLineUserId(uid);
        const res = await fetch(
          `/api/liff/summary?lineUserId=${encodeURIComponent(uid)}`,
        );
        if (!res.ok) throw new Error("無法載入摘要");
        setSummary((await res.json()) as Summary);
      } catch (e) {
        setError(e instanceof Error ? e.message : "載入失敗");
      }
    }
    void load();
  }, []);

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
    <main style={{ padding: "1.5rem", maxWidth: 480, margin: "0 auto" }}>
      <h1 style={{ fontSize: "1.75rem", marginBottom: "0.25rem" }}>
        健身卡卡教練
      </h1>
      <p style={{ color: "#555", marginTop: 0 }}>今日總覽</p>
      {error && <p style={{ color: "#b00020" }}>{error}</p>}
      {summary && (
        <section style={{ lineHeight: 1.8 }}>
          <p>
            今日熱量：{summary.todayKcal} / {summary.calorieTarget} kcal
          </p>
          <p>剩餘：{summary.remainingKcal} kcal</p>
          <p>
            蛋白質：{summary.todayProtein} / {summary.proteinTarget} g
          </p>
          <p>方案：{PLAN_LABELS[summary.planId] ?? summary.planId}</p>
          <p>到期日：{summary.expiresAt ?? "免費（無到期）"}</p>
          <section
            style={{
              marginTop: "1.25rem",
              padding: "1rem",
              border: "1px solid #ddd",
              borderRadius: 12,
            }}
          >
            <strong>30 天挑戰</strong>
            {summary.challenge.day === 0 ? (
              <p>
                到 LINE 輸入「我要參加三十天減脂挑戰」，從今天 Day 1 開始
              </p>
            ) : (
              <>
                <p>Day {summary.challenge.day} · 連續紀錄 {summary.challenge.streakDays} 天</p>
                <p>
                  今日任務：{summary.challenge.missionTitle ?? "確認一餐"}（
                  {summary.challenge.missionCompleted ? "已完成" : "待完成"}）
                </p>
              </>
            )}
            <p>
              今日健康分數：
              {summary.healthScore.status === "ready"
                ? ` ${summary.healthScore.score}／100`
                : " 資料不足，確認一餐並完成目標設定後顯示"}
            </p>
          </section>

          <p style={{ marginTop: "1.25rem", marginBottom: 0, fontWeight: 600 }}>
            升級方案（一次付清）
          </p>
          <p style={{ fontSize: "0.9rem", color: "#555", marginTop: "0.25rem" }}>
            免費體驗：照片＋打字共用 5 次／天、聊天不扣、語音 0。付費方案的圖片、文字、語音額度分開計算；年繳與月繳額度相同。
          </p>

          <p style={{ marginTop: "1rem", marginBottom: 0, fontWeight: 600 }}>
            月繳（30 天）
          </p>
          <button
            type="button"
            disabled={paying !== null}
            onClick={() => void startPay("plan_399")}
            style={btnStyle}
          >
            {paying === "plan_399"
              ? "建立訂單中…"
              : "卡卡 Plus NT$399（圖 10／文 30／語音 5）"}
          </button>
          <button
            type="button"
            disabled={paying !== null}
            onClick={() => void startPay("plan_799")}
            style={{ ...btnStyle, background: "#1a4d2e" }}
          >
            {paying === "plan_799"
              ? "建立訂單中…"
              : "卡卡 Pro 教練 NT$799（圖 25／文 60／語音 15）"}
          </button>

          <p style={{ marginTop: "1.25rem", marginBottom: 0, fontWeight: 600 }}>
            年繳（365 天・更划算）
          </p>
          <button
            type="button"
            disabled={paying !== null}
            onClick={() => void startPay("plan_3590")}
            style={btnStyle}
          >
            {paying === "plan_3590"
              ? "建立訂單中…"
              : "卡卡 Plus NT$3590／年（一天不到 10 元）"}
          </button>
          <p style={{ fontSize: "0.8rem", color: "#888", margin: "0.2rem 0 0" }}>
            <s>月繳約 NT$4788</s> ・ 年繳更省
          </p>
          <button
            type="button"
            disabled={paying !== null}
            onClick={() => void startPay("plan_7190")}
            style={{ ...btnStyle, background: "#1a4d2e" }}
          >
            {paying === "plan_7190"
              ? "建立訂單中…"
              : "卡卡 Pro 教練 NT$7190／年（一天不到 20 元）"}
          </button>
          <p style={{ fontSize: "0.8rem", color: "#888", margin: "0.2rem 0 0" }}>
            <s>月繳約 NT$9588</s> ・ 年繳更省
          </p>

          <p style={{ fontSize: "0.85rem", color: "#666", marginTop: "1rem" }}>
            一次付清，無自動扣款；到期後回到免費額度。付費可用語音記飲食（最長
            60 秒）。
          </p>
          <p style={{ fontSize: "0.85rem" }}>
            <a href="/privacy">隱私權政策</a> · <a href="/terms">使用條款</a> ·{" "}
            <a href="/refund">退款政策</a>
            {" · "}
            <a href={`mailto:${DEFAULT_SUPPORT_EMAIL}`}>客服 {DEFAULT_SUPPORT_EMAIL}</a>
          </p>
        </section>
      )}
    </main>
  );
}
