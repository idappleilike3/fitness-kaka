"use client";

import Image from "next/image";
import { useState } from "react";
import styles from "./page.module.css";

export type MealScenarioId = "dining" | "convenience" | "home";

type MealScenario = {
  id: MealScenarioId;
  label: string;
  kicker: string;
  image: string;
  imageAlt: string;
  meal: string;
  calories: string;
  protein: string;
  guidance: string;
  portions: readonly string[];
};

export const MEAL_SCENARIOS: readonly MealScenario[] = [
  {
    id: "dining",
    label: "外食版",
    kicker: "午休 30 分鐘也能選",
    image: "/images/scenario-dining-kaka.webp",
    imageAlt: "外食版卡卡教練陪你挑選健康餐盒",
    meal: "舒肥雞胸便當",
    calories: "620 kcal",
    protein: "42g",
    guidance: "飯留半碗、青菜選兩格，醬汁另外放。不是吃水煮餐，而是把最影響熱量的地方先調整。",
    portions: ["一掌心蛋白質", "青菜兩拳", "飯半碗～一碗"],
  },
  {
    id: "convenience",
    label: "超商版",
    kicker: "來不及吃飯的快速組合",
    image: "/images/scenario-convenience-kaka.webp",
    imageAlt: "超商版卡卡推薦鮪魚蛋吐司地瓜與無糖豆漿組合",
    meal: "鮪魚蛋吐司＋地瓜豆漿",
    calories: "510 kcal",
    protein: "39g",
    guidance: "鮪魚蛋吐司先補蛋白質與主食，再搭一份地瓜或水果、無糖豆漿。看得到份量，也不需要只吃生菜。",
    portions: ["鮪魚蛋吐司", "地瓜或水果一份", "無糖豆漿"],
  },
  {
    id: "home",
    label: "居家版",
    kicker: "一鍋完成，少洗幾個碗",
    image: "/images/scenario-home-kaka.webp",
    imageAlt: "居家版卡卡示範鮭魚豆腐蔬菜鍋",
    meal: "鮭魚豆腐蔬菜鍋",
    calories: "560 kcal",
    protein: "45g",
    guidance: "用鮭魚、豆腐與兩種蔬菜煮成一鍋，主食另外配半碗。份量清楚，家人也能一起吃。",
    portions: ["鮭魚一掌心", "豆腐半盒", "蔬菜兩拳＋半碗飯"],
  },
] as const;

export function getMealScenario(id: MealScenarioId): MealScenario {
  return MEAL_SCENARIOS.find((item) => item.id === id) ?? MEAL_SCENARIOS[0];
}

export function MealScenarioSwitcher() {
  const [activeId, setActiveId] = useState<MealScenarioId>("dining");
  const active = getMealScenario(activeId);

  return (
    <div className={styles.scenarioShell} data-tilt data-tilt-preserve-image data-reveal>
      <div className={styles.scenarioTabs} role="tablist" aria-label="選擇今天的飲食情境">
        {MEAL_SCENARIOS.map((scenario) => (
          <button
            key={scenario.id}
            id={`scenario-tab-${scenario.id}`}
            type="button"
            role="tab"
            aria-selected={activeId === scenario.id}
            aria-controls="scenario-panel"
            className={activeId === scenario.id ? styles.scenarioTabActive : styles.scenarioTab}
            onClick={() => setActiveId(scenario.id)}
          >
            <small>{scenario.kicker}</small>
            <strong>{scenario.label}</strong>
          </button>
        ))}
      </div>

      <div
        id="scenario-panel"
        role="tabpanel"
        aria-labelledby={`scenario-tab-${active.id}`}
        className={styles.scenarioPanel}
        key={active.id}
      >
        <div className={styles.scenarioVisual}>
          <Image src={active.image} alt={active.imageAlt} fill sizes="(max-width: 800px) 94vw, 48vw" />
          <div className={styles.scenarioScan} aria-hidden />
          <div className={styles.scenarioImageLabel}><span>KAKA PICK</span><b>{active.label}</b></div>
        </div>
        <div className={styles.scenarioContent}>
          <p>{active.kicker}</p>
          <h3>{active.meal}</h3>
          <div className={styles.scenarioMetrics}>
            <span><small>約</small><b>{active.calories}</b></span>
            <span><small>蛋白質</small><b>{active.protein}</b></span>
          </div>
          <p className={styles.scenarioGuidance}>{active.guidance}</p>
          <ul>{active.portions.map((portion) => <li key={portion}>{portion}</li>)}</ul>
          <small className={styles.scenarioNote}>營養為示範估算，實際份量由你確認後再記錄。</small>
        </div>
      </div>
    </div>
  );
}
