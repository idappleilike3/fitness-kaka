"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

import { ADMIN_PLAN_OPTIONS, defaultPlanAmount, type AdminPlanId } from "@/lib/admin/plan-options";

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

const plans = Object.fromEntries(Object.entries(ADMIN_PLAN_OPTIONS).map(([id, plan]) => [id, plan.label])) as Record<string, string>;
type PlanId = AdminPlanId;

type AdminTab = "overview" | "free" | "menus" | "plans" | "care" | "sales" | "challenges" | "status";

type MenuOrder = {
  id: string;
  status: string;
  revision_count: number;
  generated_at: string | null;
  delivered_at: string | null;
  created_at: string;
  members: { display_name: string | null; line_user_id: string } | null;
  generated_menu: Record<string, unknown> | null;
};

type ChallengeEnrollment = { id: string; status: string; started_on: string; ends_on: string; needs_admin_care: boolean; admin_note: string | null; members: { display_name: string | null; line_user_id: string } | null };


type SalesOpportunity = {
  id: string;
  member_id: string;
  opportunity_score: number;
  opportunity_stage: string;
  need_summary: string | null;
  recommended_next_step: string | null;
  suggested_message: string | null;
  due_at: string | null;
  status: string;
  members: { display_name: string | null; line_user_id: string } | null;
  salesProfile: { tags?: string[]; last_recommended_plan?: string | null; sales_paused_until?: string | null } | null;
  recentEvents: Array<{ direction: string; content: string; created_at: string }>;
};

type CareAlert = {
  id: string;
  alert_type: string;
  severity: "low" | "medium" | "high";
  reason: string;
  evidence: Record<string, unknown>;
  member_reply: string | null;
  admin_recommendation: string;
  status: string;
  created_at: string;
  members: { display_name: string | null; line_user_id: string } | null;
};

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
  const [activeTab, setActiveTab] = useState<AdminTab>("overview");
  const [menuOrders, setMenuOrders] = useState<MenuOrder[]>([]);
  const [careAlerts, setCareAlerts] = useState<CareAlert[]>([]);
  const [salesOpportunities, setSalesOpportunities] = useState<SalesOpportunity[]>([]);
  const [challengeEnrollments, setChallengeEnrollments] = useState<ChallengeEnrollment[]>([]);
  const [systemStatus, setSystemStatus] = useState<Record<string, { ok: boolean; reason: string }>>({});
  const visibleMembers = useMemo(() => {
    if (activeTab === "free") return members.filter((member) => member.currentPlanId === "free");
    if (activeTab === "plans") return members.filter((member) => member.currentPlanId !== "free");
    return members;
  }, [activeTab, members]);

  async function loadMenuOrders() {
    const response = await fetch("/api/admin/menu-orders");
    const data = await response.json();
    if (!response.ok) throw new Error(data.error ?? "读取菜单订单失败");
    setMenuOrders(data.orders ?? []);
  }

  async function loadCareAlerts() {
    const response = await fetch("/api/admin/care-alerts");
    const data = await response.json();
    if (!response.ok) throw new Error(data.error ?? "读取关怀通知失败");
    setCareAlerts(data.alerts ?? []);
  }

  async function loadSalesOpportunities() {
    const response = await fetch("/api/admin/sales-crm");
    const data = await response.json();
    if (!response.ok) throw new Error(data.error ?? "读取成交机会失败");
    setSalesOpportunities(data.opportunities ?? []);
  }
  async function loadChallenges() { const response = await fetch("/api/admin/challenges"); const data = await response.json(); if (!response.ok) throw new Error(data.error ?? "读取挑战失败"); setChallengeEnrollments(data.enrollments ?? []); }
  async function loadSystemStatus() { const response = await fetch("/api/admin/system-status"); const data = await response.json(); if (!response.ok) throw new Error(data.error ?? "读取系统状态失败"); setSystemStatus(data.services ?? {}); }

  async function changeAdminItem(path: string, body: object, success: string) {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "操作失败");
      setMessage(success);
      await Promise.all([loadMenuOrders(), loadCareAlerts(), loadSalesOpportunities(), loadChallenges(), loadSystemStatus()]);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "操作失败");
    } finally { setBusy(false); }
  }

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
    await Promise.all([loadMembers(), loadMenuOrders(), loadCareAlerts(), loadSalesOpportunities(), loadChallenges(), loadSystemStatus()]);
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
    const options = Object.entries(ADMIN_PLAN_OPTIONS)
      .map(([id, plan]) => `${id}｜${plan.label}`)
      .join("\n");
    const planId = window.prompt(`選擇方案代碼：\n${options}`, "plan_299") as PlanId | null;
    if (!planId || !(planId in ADMIN_PLAN_OPTIONS)) return;
    const amount = Number(window.prompt("實收金額（新台幣）", String(defaultPlanAmount(planId))));
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

      <nav style={styles.tabs} aria-label="後台功能">
        {[
          ["overview", "總覽"],
          ["free", "免費會員"],
          ["menus", "299 菜單訂單"],
          ["plans", "會員方案"],
          ["care", "關懷通知"],
          ["sales", "成交机会"],
          ["challenges", "799・30 天挑战"],
          ["status", "系统状态"],
        ].map(([id, label]) => (
          <button key={id} type="button" onClick={() => setActiveTab(id as AdminTab)} style={activeTab === id ? styles.activeTab : styles.tab}>
            {label}
          </button>
        ))}
      </nav>

      {activeTab === "overview" ? (
        <section style={styles.summaryGrid}>
          <div style={styles.summaryCard}><small>總會員</small><strong>{members.length}</strong></div>
          <div style={styles.summaryCard}><small>免費會員</small><strong>{members.filter((m) => m.currentPlanId === "free").length}</strong></div>
          <div style={styles.summaryCard}><small>付費會員</small><strong>{members.filter((m) => m.currentPlanId !== "free").length}</strong></div>
          <div style={styles.summaryCard}><small>今日餐點</small><strong>{members.reduce((sum, m) => sum + m.todayMeals, 0)}</strong></div>
        </section>
      ) : null}

      {activeTab === "menus" ? (
        <section style={styles.grid}>
          <div style={styles.operationPanel}>
            <h2>299 元｜7 天个人化减脂菜单</h2>
            <p>订单会从付款、问卷、自动生成、会员确认，一路记录到完成交付。</p>
          </div>
          {menuOrders.length === 0 ? <div style={styles.card}>目前没有菜单订单。</div> : menuOrders.map((order) => (
            <article key={order.id} style={styles.card}>
              <div style={styles.memberTitle}><div><h3 style={{ margin: 0 }}>{order.members?.display_name || "未设定名称"}</h3><small style={styles.muted}>{order.members?.line_user_id}</small></div><span style={styles.activeBadge}>{order.status}</span></div>
              <p>建立：{date(order.created_at)}｜生成：{date(order.generated_at)}｜重新生成 {order.revision_count}/1</p>
              <div style={styles.actions}>
                <button style={styles.secondary} disabled={busy} onClick={() => void changeAdminItem("/api/admin/menu-orders", { orderId: order.id, status: "revision_requested" }, "已标记需要调整")}>要求调整</button>
                {order.generated_menu ? <button style={styles.secondary} disabled={busy} onClick={() => { const edited = window.prompt("可编辑完整菜单 JSON；取消不会保存", JSON.stringify(order.generated_menu, null, 2)); if (!edited) return; try { void changeAdminItem("/api/admin/menu-orders", { orderId: order.id, action: "save_menu", generatedMenu: JSON.parse(edited) }, "菜单已保存，可预览后发送"); } catch { setMessage("菜单 JSON 格式不正确"); } }}>编辑菜单</button> : null}
                {order.generated_menu ? <button style={styles.primary} disabled={busy} onClick={() => { if (window.confirm("已预览会员菜单，确认现在发送 LINE Flex 卡片吗？")) void changeAdminItem("/api/admin/menu-orders", { orderId: order.id, action: "send", confirm: true }, "菜单已发送给会员"); }}>预览并确认发送</button> : null}
              </div>
            </article>
          ))}
        </section>
      ) : null}

      {activeTab === "challenges" ? <section style={styles.grid}><div style={styles.operationPanel}><h2>799・30 天挑战营运</h2><p>显示进行中的批次、会员进度与需要人工关怀的名单。</p><button style={styles.primary} onClick={() => { const name = window.prompt("批次名称", "8 月 30 天挑战"); const startsOn = window.prompt("开始日期 YYYY-MM-DD"); const endsOn = window.prompt("结束日期 YYYY-MM-DD"); if (name && startsOn && endsOn) void changeAdminItem("/api/admin/challenges", { action: "create_batch", name, startsOn, endsOn }, "挑战批次已建立"); }}>建立挑战批次</button></div>{challengeEnrollments.length === 0 ? <div style={styles.card}>目前没有挑战会员。</div> : challengeEnrollments.map((item) => <article key={item.id} style={styles.card}><div style={styles.memberTitle}><h3>{item.members?.display_name || "未设定名称"}</h3><span style={item.needs_admin_care ? styles.inactiveBadge : styles.activeBadge}>{item.needs_admin_care ? "需人工关怀" : item.status}</span></div><p>{date(item.started_on)}～{date(item.ends_on)}</p><p>{item.admin_note || "尚无管理员备注"}</p><button style={styles.secondary} onClick={() => { const note = window.prompt("关怀备注", item.admin_note ?? ""); if (note !== null) void changeAdminItem("/api/admin/challenges", { action: "care", enrollmentId: item.id, needsCare: !item.needs_admin_care, note }, "关怀名单已更新"); }}>{item.needs_admin_care ? "完成关怀" : "加入关怀名单"}</button></article>)}</section> : null}

      {activeTab === "status" ? <section style={styles.grid}><div style={styles.operationPanel}><h2>API・LINE・系统状态中心</h2><p>所有异常都会显示中文原因，方便直接判断下一步。</p></div>{Object.entries(systemStatus).map(([key, value]) => <article key={key} style={styles.card}><div style={styles.memberTitle}><h3>{key}</h3><span style={value.ok ? styles.activeBadge : styles.inactiveBadge}>{value.ok ? "正常" : "需处理"}</span></div><p>{value.reason}</p></article>)}</section> : null}

      {activeTab === "care" ? (
        <section style={styles.grid}>
          <div style={styles.operationPanel}>
            <h2>管理员关怀通知中心</h2>
            <p>这里会告诉你发生什么、为什么触发、系统已经怎么回应，以及建议你下一步怎么做。</p>
          </div>
          {careAlerts.length === 0 ? <div style={styles.card}>目前没有需要你处理的关怀通知。</div> : careAlerts.map((alert) => (
            <article key={alert.id} style={styles.card}>
              <div style={styles.memberTitle}><div><h3 style={{ margin: 0 }}>{alert.members?.display_name || "未设定名称"}</h3><small style={styles.muted}>{alert.members?.line_user_id}</small></div><span style={alert.severity === "high" ? styles.inactiveBadge : styles.activeBadge}>{alert.severity === "high" ? "高风险" : alert.severity === "medium" ? "需关怀" : "提醒"}</span></div>
              <p><strong>原因：</strong>{alert.reason}</p>
              {alert.member_reply ? <p><strong>系统已回应：</strong>{alert.member_reply}</p> : null}
              <p><strong>建议你：</strong>{alert.admin_recommendation}</p>
              <div style={styles.actions}>
                <button style={styles.secondary} disabled={busy} onClick={() => void changeAdminItem("/api/admin/care-alerts", { alertId: alert.id, status: "in_progress" }, "已标记处理中")}>开始处理</button>
                <button style={styles.primary} disabled={busy} onClick={() => void changeAdminItem("/api/admin/care-alerts", { alertId: alert.id, status: "resolved" }, "已标记处理完成")}>标记完成</button>
              </div>
            </article>
          ))}
        </section>
      ) : null}


      {activeTab === "sales" ? (
        <section style={styles.grid}>
          <div style={styles.operationPanel}>
            <h2>对话成交机会与循序跟进</h2>
            <p>依会员真实需求、聊天内容与购买意愿排序。先帮助、再建议；会员表示不想购买时会暂停跟进。</p>
          </div>
          {salesOpportunities.length === 0 ? <div style={styles.card}>目前还没有可评估的对话资料。</div> : salesOpportunities.map((item) => (
            <article key={item.id} style={styles.card}>
              <div style={styles.memberTitle}><div><h3 style={{ margin: 0 }}>{item.members?.display_name || "未设定名称"}</h3><small style={styles.muted}>{item.members?.line_user_id}</small></div><span style={item.opportunity_score >= 70 ? styles.activeBadge : styles.inactiveBadge}>{item.opportunity_score} 分｜{item.opportunity_stage}</span></div>
              <p><strong>需求摘要：</strong>{item.need_summary || "仍在了解"}</p>
              <p><strong>下一步：</strong>{item.recommended_next_step || "继续倾听"}</p>
              {item.salesProfile?.tags?.length ? <p><strong>标签：</strong>{item.salesProfile.tags.join("、")}</p> : null}
              {item.recentEvents?.length ? <div style={styles.history}><strong>最近对话</strong>{item.recentEvents.slice(0, 4).map((event, index) => <p key={index} style={styles.muted}>{event.direction === "member" ? "会员" : "AI"}：{event.content}</p>)}</div> : null}
              {item.suggested_message ? <p><strong>建议话术：</strong>{item.suggested_message}</p> : null}
              <div style={styles.actions}>
                {item.suggested_message ? <button style={styles.primary} disabled={busy} onClick={() => {
                  const edited = window.prompt("发送前可编辑，让语气更像你本人", item.suggested_message ?? "");
                  if (edited?.trim()) void changeAdminItem("/api/admin/sales-crm", { followupId: item.id, action: "send_suggested", message: edited.trim() }, "已发送温和跟进讯息");
                }}>预览并发送 LINE</button> : null}
                <button style={styles.secondary} disabled={busy} onClick={() => void changeAdminItem("/api/admin/sales-crm", { followupId: item.id, action: "snooze", days: 3 }, "已延后 3 天跟进")}>稍后再跟进</button>
                <button style={styles.secondary} disabled={busy} onClick={() => void changeAdminItem("/api/admin/sales-crm", { followupId: item.id, action: "done" }, "已记录完成跟进")}>标记已跟进</button>
              </div>
            </article>
          ))}
        </section>
      ) : null}

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
        {(["menus", "care", "sales", "challenges", "status"].includes(activeTab) ? [] : visibleMembers).map((member) => (
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
  tabs: { display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 18 },
  tab: { border: "1px solid #ddcad3", background: "#fff", borderRadius: 999, padding: "10px 14px", cursor: "pointer" },
  activeTab: { border: "1px solid #bb3e72", background: "#bb3e72", color: "#fff", borderRadius: 999, padding: "10px 14px", cursor: "pointer" },
  summaryGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 12, marginBottom: 18 },
  summaryCard: { display: "grid", gap: 6, padding: 18, borderRadius: 18, background: "#fff3f7", boxShadow: "0 8px 24px rgba(73,31,50,.06)" },
  operationPanel: { padding: 22, borderRadius: 20, background: "#fff", border: "1px solid #eadbe2", marginBottom: 18 },
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
