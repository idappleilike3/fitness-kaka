"use client";

import Image from "next/image";
import { useState } from "react";
import styles from "./page.module.css";

type Story = {
  key: string;
  label: string;
  title: string;
  copy: string;
  image: string;
};

function StorySwitcher({
  stories,
  ariaLabel,
}: {
  stories: readonly Story[];
  ariaLabel: string;
}) {
  const [active, setActive] = useState(0);
  const story = stories[active];

  return (
    <div className={styles.storySwitcher}>
      <div className={styles.storyTabs} role="tablist" aria-label={ariaLabel}>
        {stories.map((item, index) => (
          <button
            key={item.key}
            type="button"
            role="tab"
            aria-selected={active === index}
            className={active === index ? styles.storyTabActive : undefined}
            onClick={() => setActive(index)}
          >
            {item.label}
          </button>
        ))}
      </div>
      <article className={styles.storySwitchCard} role="tabpanel">
        <div className={styles.storySwitchImage}>
          <Image
            src={story.image}
            alt={story.title}
            fill
            sizes="(max-width: 860px) 100vw, 60vw"
            priority={active === 0}
          />
        </div>
        <div className={styles.storySwitchCopy}>
          <span>{story.label}</span>
          <h3>{story.title}</h3>
          <p>{story.copy}</p>
        </div>
      </article>
    </div>
  );
}

const roadmapStories = [
  { key: "d1", label: "Day 1", title: "建立起點", copy: "完成身體資料、飲食偏好與目標熱量", image: "/images/stories/day-1.png" },
  { key: "d3", label: "Day 3", title: "找到阻力", copy: "看見最容易超標或漏吃蛋白質的一餐", image: "/images/stories/day-3.png" },
  { key: "d7", label: "Day 7", title: "第一週回顧", copy: "整理常吃餐點，取得下一週調整建議", image: "/images/stories/day-7.png" },
  { key: "d14", label: "Day 14", title: "穩定節奏", copy: "比較飲食與體重趨勢，微調每日目標", image: "/images/stories/day-14.png" },
  { key: "d21", label: "Day 21", title: "習慣成形", copy: "建立外食、聚餐與忙碌日的備用策略", image: "/images/stories/day-21.png" },
  { key: "d30", label: "Day 30", title: "成果報告", copy: "回顧完成率、營養趨勢與下一階段方向", image: "/images/stories/day-30.png" },
] as const;

const movementStories = [
  { key: "home", label: "居家徒手", title: "10–20 分鐘", copy: "深蹲、推牆、臀橋，從能穩定完成的強度開始", image: "/images/stories/move-home.png" },
  { key: "walk", label: "健走", title: "20–40 分鐘", copy: "依目前步數增加，不要求一開始就跑步", image: "/images/stories/move-walk.png" },
  { key: "gym", label: "健身房", title: "每週 2–4 次", copy: "以全身阻力訓練為主，依程度安排組數", image: "/images/stories/move-gym.png" },
] as const;

const plateauStories = [
  { key: "worry", label: "卡住了", title: "體重短期沒有下降", copy: "先別責怪自己，短期波動不等於沒有進步", image: "/images/stories/plateau-worry.png" },
  { key: "review", label: "找原因", title: "教練先看 7～14 天趨勢", copy: "一起檢視睡眠、水分、經期、排便、活動量與飲食完成率", image: "/images/stories/plateau-review.png" },
  { key: "adjust", label: "小調整", title: "調整飲食與訓練", copy: "不靠挨餓補償，只改一個現在做得到的選擇", image: "/images/stories/plateau-adjust.png" },
  { key: "progress", label: "再前進", title: "重新看見進步", copy: "把能持續的節奏接回來，再決定下一階段方向", image: "/images/stories/plateau-progress.png" },
] as const;

export function RoadmapGallery() {
  return <StorySwitcher stories={roadmapStories} ariaLabel="切換 30 天階段" />;
}

export function MovementGallery() {
  return <StorySwitcher stories={movementStories} ariaLabel="切換運動方式" />;
}

export function PlateauGallery() {
  return <StorySwitcher stories={plateauStories} ariaLabel="切換停滯期教練回應" />;
}
