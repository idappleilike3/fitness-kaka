"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import type { GeneratedMenu, MenuQuestionnaire } from "@/lib/menu/generator";

type Order = {
  id: string;
  status: string;
  questionnaire: Partial<MenuQuestionnaire>;
  generated_menu: GeneratedMenu | null;
  revision_count: number;
};

type Payload = {
  member: { displayName: string };
  profileReady: boolean;
  order: Order | null;
};

const initialQuestionnaire: MenuQuestionnaire = {
  mealContext: "mixed",
  mealsPerDay: 3,
  budgetPerMeal: 150,
  allergies: [],
  dislikedFoods: [],
  dietStyle: "general",
  includeDrinks: true,
  includeLateSnack: false,
  notes: "",
};

export default function MenuPlanPage() {
  const [lineUserId, setLineUserId] = useState("");
  const [data, setData] = useState<Payload | null>(null);
  const [form, setForm] = useState(initialQuestionnaire);
  const [allergies, setAllergies] = useState("");
  const [disliked, setDisliked] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [day, setDay] = useState(1);

  async function load(uid: string) {
    const response = await fetch(`/api/menu-order?lineUserId=${encodeURIComponent(uid)}`);
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error ?? "載入失敗");
    setData(payload);
    const existing = payload.order?.questionnaire;
    if (existing && Object.keys(existing).length) {
      setForm({ ...initialQuestionnaire, ...existing });
      setAllergies((existing.allergies ?? []).join("、"));
      setDisliked((existing.dislikedFoods ?? []).join("、"));
    }
  }

  useEffect(() => {
    const uid = new URLSearchParams(window.location.search).get("lineUserId") ?? "";
    setLineUserId(uid);
    if (!uid) {
      setMessage("請從 LINE 會員中心開啟這個頁面。");
      return;
    }
    void load(uid).catch((error) => setMessage(error instanceof Error ? error.message : "載入失敗"));
  }, []);

  const selectedDay = useMemo(() => data?.order?.generated_menu?.days.find((item) => item.day === day), [data, day]);

  async function submit(action: "generate" | "regenerate") {
    if (!lineUserId) return;
    setBusy(true);
    setMessage("");
    const questionnaire = {
      ...form,
      allergies: allergies.split(/[、,，\n]/).map((item) => item.trim()).filter(Boolean),
      dislikedFoods: disliked.split(/[、,，\n]/).map((item) => item.trim()).filter(Boolean),
    };
    try {
      const response = await fetch("/api/menu-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lineUserId, action, questionnaire }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "生成失敗");
      await load(lineUserId);
      setDay(1);
      setMessage(action === "regenerate" ? "已重新生成一次，慢慢挑选适合你的搭配就好。" : "你的 7 天菜单准备好了。不是要你每餐完美，而是让每天更有方向。❤️");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "生成失敗");
    } finally {
      setBusy(false);
    }
  }

  const card: CSSProperties = { border: "1px solid #e8e1d8", borderRadius: 18, padding: 18, background: "#fff", marginTop: 16 };
  const input: CSSProperties = { width: "100%", padding: 12, border: "1px solid #d8d0c8", borderRadius: 10, marginTop: 6, boxSizing: "border-box" };
  const button: CSSProperties = { border: 0, borderRadius: 999, padding: "12px 18px", background: "#315c46", color: "white", fontWeight: 700, cursor: "pointer" };

  return (
    <main style={{ maxWidth: 760, margin: "0 auto", padding: 20, background: "#fbf8f3", minHeight: "100vh", color: "#2b2926" }}>
      <p style={{ color: "#65806f", fontWeight: 700 }}>FITNESS KAKA · 温暖姐姐型 AI 教练</p>
      <h1>7 天个人化减脂菜单</h1>
      <p>我会依你的身体目标和生活方式安排。外食、超商、自己煮都可以，不需要为了减脂过着很辛苦的生活。</p>
      {message ? <div style={{ ...card, background: "#f1f7f2" }}>{message}</div> : null}

      {!data?.profileReady ? <section style={card}><h2>先完成身体建档</h2><p>完成 BMI／BMR／TDEE 后，系统才能用更贴近你的热量与蛋白质目标安排菜单。</p></section> : null}
      {data?.profileReady && !data.order ? <section style={card}><h2>尚未购买 299 菜单</h2><p>购买后，这里会自动开放饮食问卷与 7 天菜单生成。</p></section> : null}

      {data?.profileReady && data.order && !data.order.generated_menu ? (
        <section style={card}>
          <h2>先让我了解你的日常</h2>
          <label>平常主要怎么吃？
            <select style={input} value={form.mealContext} onChange={(e) => setForm({ ...form, mealContext: e.target.value as MenuQuestionnaire["mealContext"] })}>
              <option value="mixed">外食、超商、自煮混合</option><option value="eating_out">主要外食</option><option value="convenience">主要超商</option><option value="home">主要自己煮</option>
            </select>
          </label>
          <label>一天通常吃几餐？
            <select style={input} value={form.mealsPerDay} onChange={(e) => setForm({ ...form, mealsPerDay: Number(e.target.value) as 2 | 3 | 4 })}>
              <option value={2}>2 餐</option><option value={3}>3 餐</option><option value={4}>3 餐＋点心</option>
            </select>
          </label>
          <label>每餐预算（元）<input style={input} type="number" min={0} value={form.budgetPerMeal} onChange={(e) => setForm({ ...form, budgetPerMeal: Number(e.target.value) })} /></label>
          <label>饮食类型
            <select style={input} value={form.dietStyle} onChange={(e) => setForm({ ...form, dietStyle: e.target.value as MenuQuestionnaire["dietStyle"] })}>
              <option value="general">一般饮食</option><option value="ovo_lacto">蛋奶素</option><option value="vegan">全素</option><option value="low_carb">低碳偏好</option><option value="no_pork">不吃猪</option><option value="no_beef">不吃牛</option>
            </select>
          </label>
          <label>过敏食物（可空白）<input style={input} value={allergies} onChange={(e) => setAllergies(e.target.value)} placeholder="例如：花生、虾" /></label>
          <label>不喜欢的食物（可空白）<input style={input} value={disliked} onChange={(e) => setDisliked(e.target.value)} placeholder="例如：香菜、青椒" /></label>
          <label>其他生活需求<textarea style={input} rows={4} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="例如：周五会聚餐、下午常想喝手摇饮" /></label>
          <div style={{ marginTop: 18 }}><button style={button} disabled={busy} onClick={() => void submit("generate")}>{busy ? "正在安排…" : "生成我的 7 天菜单"}</button></div>
        </section>
      ) : null}

      {data?.order?.generated_menu ? (
        <>
          <section style={card}>
            <h2>你的目标</h2>
            <p>每日约 {data.order.generated_menu.calorieTarget} kcal · 蛋白质约 {data.order.generated_menu.proteinTarget} g</p>
            <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 8 }}>
              {data.order.generated_menu.days.map((item) => <button key={item.day} onClick={() => setDay(item.day)} style={{ ...button, background: day === item.day ? "#315c46" : "#ddd5ca", color: day === item.day ? "white" : "#3a3834", whiteSpace: "nowrap" }}>Day {item.day}</button>)}
            </div>
          </section>
          {selectedDay ? <section style={card}><h2>{selectedDay.title}</h2>{selectedDay.meals.map((meal) => <article key={meal.name} style={{ borderTop: "1px solid #eee5db", padding: "14px 0" }}><strong>{meal.name}</strong><p>{meal.description}</p><p>{meal.kcal} kcal · 蛋白质 {meal.proteinG} g</p><small>可替换：{meal.alternatives.join("／")}</small></article>)}<p><strong>当天合计：{selectedDay.totalKcal} kcal · 蛋白质 {selectedDay.totalProteinG} g</strong></p><p>{selectedDay.coachMessage}</p></section> : null}
          <section style={card}><p>{data.order.generated_menu.disclaimer}</p>{data.order.revision_count < 1 ? <button style={button} disabled={busy} onClick={() => void submit("regenerate")}>免费重新生成一次</button> : <p>免费重新生成次数已使用。如果只想换一餐，可以从每餐的替换选项挑选，不需要整份重来。</p>}</section>
        </>
      ) : null}
    </main>
  );
}
