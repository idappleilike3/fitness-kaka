"use client";

import { FormEvent, useEffect, useState } from "react";

type Member = {
  id: string;
  displayName: string;
  lineUserId: string;
  currentPlanId: string;
  currentExpiresAt: string | null;
  currentStatus: string;
  challenge: { status: string; startedOn: string; endsOn: string } | null;
  todayMeals: number;
  todayQuota: { imageUsed: number; textUsed: number; voiceUsed: number };
  grantHistory: Array<{ planId: string; grantedAt: string; expiresAt: string | null; grantedBy: string }>;
  paymentHistory: Array<{ planId: string; amountTwd: number; status: string; paidAt: string }>;
  operationHistory: Array<{ action: string; planId: string | null; amountTwd: number | null; note: string | null; createdAt: string }>;
};

const plans = {
  plan_399: "卡卡 Plus 月繳 NT$399",
  plan_799: "卡卡 Pro 月繳 NT$799",
  plan_3590: "卡卡 Plus 年繳 NT$3,590",
  plan_7190: "卡卡 Pro 年繳 NT$7,190",
} as const;
type PlanId = keyof typeof plans;

const actionLabels: Record<string, string> = {
  grant_plan: "手動開通",
  record_payment: "登記付款並開通",
  pause: "暫停方案",
  resume: "恢復方案",
  extend: "延長方案",
};

function date(value: string | null) {
  return value
    ? new Date(value).toLocaleDateString("zh-TW", { timeZone: "Asia/Taipei" })
    : "無";
}

export default function AdminPage() {
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [passphrase, setPassphrase] = useState("");
  const [members, setMembers] = useState<Member[]>([]);
  const [query, setQuery] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function loadMembers(search = "") {
    setBusy(true);
    try {
      const response = await fetch(`/api/admin/members${search ? `?q=${encodeURIComponent(search)}` : ""}`);
      if (response.status === 401) {
        setAuthenticated(false);
        return;
      }
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "讀取會員失敗");
      setAuthenticated(true);
      setMembers(data.members ?? []);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "讀取會員失敗");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    void fetch("/api/admin/session")
      .then((response) => response.json())
      .then((data) => {
        setAuthenticated(Boolean(data.authenticated));
        if (data.authenticated) void loadMembers();
      })
      .catch(() => setAuthenticated(false));
  }, []);

  async function login(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    const response = await fetch("/api/admin/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ passphrase }),
    });
    const data = await response.json();
    setBusy(false);
    if (!response.ok) {
      setMessage(data.error ?? "登入失敗");
      return;
    }
    setPassphrase("");
    setAuthenticated(true);
    await loadMembers();
  }

  async function logout() {
    await fetch("/api/admin/session", { method: "DELETE" });
    setAuthenticated(false);
    setMembers([]);
  }

  async function request(path: string, body: object, success: string) {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch(path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "操作失敗");
      setMessage(success);
      await loadMembers(query.trim());
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "操作失敗");
    } finally {
      setBusy(false);
    }
  }

  async function recordPayment(member: Member) {
    const planId = window.prompt(
      "輸入方案代碼：plan_399、plan_799、plan_3590、plan_7190",
      "plan_399",
    ) as PlanId | null;
    if (!planId || !(planId in plans)) return;
    const defaultAmount = { plan_399: 399, plan_799: 799, plan_3590: 3590, plan_7190: 7190 }[planId];
    const amount = Number(window.prompt("實收金額（新台幣）", String(defaultAmount)));
    if (!Number.isInteger(amount) || amount <= 0) return;
    const note = window.prompt("付款方式或備註", "LINE 諮詢購買") ?? "";
    await request(
      "/api/admin/member-action",
      { memberId: member.id, action: "record_payment", planId, amountTwd: amount, note },
      `已登記 ${member.displayName} 付款並開通方案`,
    );
  }

  if (authenticated === null) {
    return <main style={styles.shell}><p>正在確認管理員身分…</p></main>;
  }
  if (!authenticated) {
    return (
      <main style={styles.loginShell}>
        <form onSubmit={login} style={styles.loginCard}>
          <span style={styles.eyebrow}>FITNESS KAKA OWNER</span>
          <h1 style={{ marginBottom: 8 }}>管理後台</h1>
          <p style={styles.muted}>輸入管理密碼後才能查看會員與付款資料</p>
          <label htmlFor="admin-password">管理密碼</label>
          <input
            id="admin-password"
            type="password"
            autoComplete="current-password"
            value={passphrase}
            onChange={(event) => setPassphrase(event.target.value)}
            style={styles.input}
            required
          />
          <button disabled={busy} style={styles.primary}>{busy ? "登入中…" : "安全登入"}</button>
          {message ? <p role="alert" style={styles.error}>{message}</p> : null}
        </form>
      </main>
    );
  }

  return (
    <main style={styles.shell}>
      <header style={styles.header}>
        <div><span style={styles.eyebrow}>FITNESS KAKA OWNER</span><h1 style={{ margin: 0 }}>營運管理中心</h1></div>
        <button onClick={() => void logout()} style={styles.secondary}>登出</button>
      </header>

      <form
        onSubmit={(event) => { event.preventDefault(); void loadMembers(query.trim()); }}
        style={styles.toolbar}
      >
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜尋姓名或 LINE ID" style={styles.input} />
        <button disabled={busy} style={styles.primary}>搜尋</button>
        <button type="button" disabled={busy} onClick={() => { setQuery(""); void loadMembers(); }} style={styles.secondary}>全部會員</button>
      </form>

      {message ? <p role="status" style={styles.notice}>{message}</p> : null}
      <p style={styles.muted}>共顯示 {members.length} 位會員｜今日資料依台灣時間計算</p>

      <section style={styles.grid}>
        {members.map((member) => (
          <article key={member.id} style={styles.card}>
            <div style={styles.memberTitle}>
              <div><h2 style={{ margin: 0 }}>{member.displayName}</h2><small style={styles.muted}>{member.lineUserId}</small></div>
              <span style={member.currentStatus === "active" ? styles.activeBadge : styles.inactiveBadge}>
                {member.currentStatus === "active" ? "啟用中" : member.currentStatus === "paused" ? "已暫停" : "未啟用"}
              </span>
            </div>
            <div style={styles.stats}>
              <div><small>目前方案</small><strong>{member.currentPlanId === "free" ? "免費" : plans[member.currentPlanId as PlanId] ?? member.currentPlanId}</strong></div>
              <div><small>到期日</small><strong>{date(member.currentExpiresAt)}</strong></div>
              <div><small>今日餐點</small><strong>{member.todayMeals} 筆</strong></div>
              <div><small>今日額度</small><strong>圖 {member.todayQuota.imageUsed}｜文 {member.todayQuota.textUsed}｜語音 {member.todayQuota.voiceUsed}</strong></div>
            </div>
            <p style={styles.muted}>30 天挑戰：{member.challenge ? `${date(member.challenge.startedOn)}～${date(member.challenge.endsOn)}` : "尚未開始"}</p>

            <div style={styles.actions}>
              <button disabled={busy} onClick={() => void recordPayment(member)} style={styles.primary}>登記付款並開通</button>
              <button disabled={busy} onClick={() => {
                const planId = window.prompt("輸入方案代碼", "plan_399") as PlanId | null;
                if (planId && planId in plans) void request("/api/admin/grant-plan", { memberId: member.id, planId }, "已手動開通方案");
              }} style={styles.secondary}>贈送／補償開通</button>
              <button disabled={busy} onClick={() => void request("/api/admin/member-action", { memberId: member.id, action: "pause" }, "已暫停方案")} style={styles.secondary}>暫停</button>
              <button disabled={busy} onClick={() => void request("/api/admin/member-action", { memberId: member.id, action: "resume" }, "已恢復方案")} style={styles.secondary}>恢復</button>
              <button disabled={busy} onClick={() => {
                const days = Number(window.prompt("延長幾天？", "30"));
                if (Number.isInteger(days) && days > 0) void request("/api/admin/member-action", { memberId: member.id, action: "extend", days }, `已延長 ${days} 天`);
              }} style={styles.secondary}>延長</button>
            </div>

            <details><summary>付款紀錄（{member.paymentHistory.length}）</summary>
              {member.paymentHistory.length ? <ul>{member.paymentHistory.map((item, index) => <li key={index}>{date(item.paidAt)}｜{plans[item.planId as PlanId] ?? item.planId}｜NT${item.amountTwd.toLocaleString()}｜{item.status}</li>)}</ul> : <p>尚無付款紀錄</p>}
            </details>
            <details><summary>管理操作紀錄（{member.operationHistory.length}）</summary>
              {member.operationHistory.length ? <ul>{member.operationHistory.map((item, index) => <li key={index}>{date(item.createdAt)}｜{actionLabels[item.action] ?? item.action}{item.note ? `｜${item.note}` : ""}</li>)}</ul> : <p>尚無操作紀錄</p>}
            </details>
          </article>
        ))}
      </section>
    </main>
  );
}

const styles: Record<string, React.CSSProperties> = {
  shell: { maxWidth: 1180, margin: "0 auto", padding: "28px 18px 60px", fontFamily: "system-ui, sans-serif", color: "#2b2025" },
  loginShell: { minHeight: "100vh", display: "grid", placeItems: "center", padding: 20, background: "linear-gradient(145deg,#fff7fa,#f4e8ef)" },
  loginCard: { width: "min(420px,100%)", display: "grid", gap: 12, padding: 28, borderRadius: 24, background: "#fff", boxShadow: "0 20px 60px rgba(73,31,50,.12)" },
  header: { display: "flex", justifyContent: "space-between", gap: 16, alignItems: "center", marginBottom: 22 },
  eyebrow: { color: "#bb3e72", fontWeight: 800, letterSpacing: 1.4, fontSize: 12 },
  muted: { color: "#76636b" },
  toolbar: { display: "flex", flexWrap: "wrap", gap: 10, padding: 14, borderRadius: 18, background: "#fff3f7", marginBottom: 16 },
  input: { flex: "1 1 220px", minWidth: 0, padding: "12px 14px", border: "1px solid #d7c5cd", borderRadius: 12, fontSize: 16 },
  primary: { border: 0, borderRadius: 12, padding: "11px 15px", color: "#fff", background: "#c13f73", fontWeight: 800, cursor: "pointer" },
  secondary: { border: "1px solid #c13f73", borderRadius: 12, padding: "10px 14px", color: "#a52d60", background: "#fff", fontWeight: 700, cursor: "pointer" },
  grid: { display: "grid", gap: 16 },
  card: { padding: 20, border: "1px solid #eadce2", borderRadius: 20, background: "#fff", boxShadow: "0 8px 28px rgba(66,31,47,.06)", overflow: "hidden" },
  memberTitle: { display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" },
  activeBadge: { padding: "5px 9px", borderRadius: 999, color: "#176b45", background: "#e4f7ed", fontWeight: 700, fontSize: 13 },
  inactiveBadge: { padding: "5px 9px", borderRadius: 999, color: "#8a5c12", background: "#fff4d9", fontWeight: 700, fontSize: 13 },
  stats: { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 10, margin: "16px 0" },
  actions: { display: "flex", flexWrap: "wrap", gap: 8, margin: "16px 0" },
  notice: { padding: 12, borderRadius: 12, color: "#176b45", background: "#e9f8f0", fontWeight: 700 },
  error: { padding: 10, borderRadius: 10, color: "#a21c42", background: "#fff0f3" },
};
