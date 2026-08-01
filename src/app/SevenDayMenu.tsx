"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import styles from "./page.module.css";

const DAYS = [
  { day: "Day 1", theme: "穩定開始", image: "/images/menu-day-1.png", kcal: "1,480", protein: "105g", meals: [
    { label: "早餐", name: "優格莓果燕麥杯", kcal: 330 },
    { label: "午餐", name: "舒肥雞胸糙米餐盒", kcal: 520 },
    { label: "晚餐", name: "鮭魚豆腐蔬菜鍋", kcal: 470 },
    { label: "點心", name: "無糖豆漿＋茶葉蛋", kcal: 160 },
  ] },
  { day: "Day 2", theme: "外食也能瘦", image: "/images/menu-day-2.png", kcal: "1,520", protein: "110g", meals: [
    { label: "早餐", name: "鮪魚蛋全麥吐司", kcal: 360 },
    { label: "午餐", name: "自助餐半飯雙青菜", kcal: 500 },
    { label: "晚餐", name: "牛肉蔬菜湯＋地瓜", kcal: 470 },
    { label: "點心", name: "芭樂＋原味堅果", kcal: 190 },
  ] },
  { day: "Day 3", theme: "高蛋白日", image: "/images/menu-day-3.png", kcal: "1,500", protein: "118g", meals: [
    { label: "早餐", name: "雞蛋起司全麥貝果", kcal: 390 },
    { label: "午餐", name: "香料雞腿藜麥沙拉", kcal: 510 },
    { label: "晚餐", name: "蒜香蝦仁蒸蛋餐", kcal: 440 },
    { label: "點心", name: "希臘優格", kcal: 160 },
  ] },
  { day: "Day 4", theme: "纖維補給", image: "/images/menu-day-4.png", kcal: "1,460", protein: "102g", meals: [
    { label: "早餐", name: "香蕉燕麥蛋餅", kcal: 340 },
    { label: "午餐", name: "鯖魚五穀蔬菜餐", kcal: 530 },
    { label: "晚餐", name: "菇菇雞肉豆腐煲", kcal: 420 },
    { label: "點心", name: "毛豆＋小番茄", kcal: 170 },
  ] },
  { day: "Day 5", theme: "解饞不爆卡", image: "/images/menu-day-5.png", kcal: "1,530", protein: "108g", meals: [
    { label: "早餐", name: "薯泥雞肉生菜捲", kcal: 350 },
    { label: "午餐", name: "韓式牛肉拌飯減飯", kcal: 520 },
    { label: "晚餐", name: "番茄海鮮義大利麵", kcal: 500 },
    { label: "點心", name: "可可高蛋白飲", kcal: 160 },
  ] },
  { day: "Day 6", theme: "週末彈性吃", image: "/images/menu-day-6.png", kcal: "1,560", protein: "100g", meals: [
    { label: "早餐", name: "酪梨蛋開放吐司", kcal: 390 },
    { label: "午餐", name: "日式雞肉蕎麥麵", kcal: 480 },
    { label: "晚餐", name: "火鍋肉片蔬菜盤", kcal: 510 },
    { label: "點心", name: "水果優格", kcal: 180 },
  ] },
  { day: "Day 7", theme: "輕盈收尾", image: "/images/menu-day-7.png", kcal: "1,450", protein: "106g", meals: [
    { label: "早餐", name: "豆漿蛋白燕麥粥", kcal: 340 },
    { label: "午餐", name: "檸檬魚排地瓜餐", kcal: 490 },
    { label: "晚餐", name: "雞肉蔬菜味噌湯", kcal: 450 },
    { label: "點心", name: "低脂鮮奶＋奇異果", kcal: 170 },
  ] },
] as const;

export function SevenDayMenu() {
  const [activeDay, setActiveDay] = useState(0);
  const touchStart = useRef<number | null>(null);
  const menu = DAYS[activeDay];
  const move = (step: number) => setActiveDay((current) => (current + step + DAYS.length) % DAYS.length);

  return (
    <section id="seven-day-menu" className={styles.menuSection} aria-labelledby="menu-title">
      <div className={styles.sectionInner} data-reveal>
        <p className={styles.sectionEyebrow}>7-DAY PERSONAL MENU</p>
        <h2 id="menu-title" className={styles.sectionTitle}>七天不是同一張圖，是每天都知道怎麼吃</h2>
        <p className={styles.sectionLead}>每一天都有不同餐點、每餐熱量與每日營養目標。299 元一次取得個人化版本，內容會依身體資料、目標、飲食偏好與禁忌重新調配。</p>

        <div className={styles.dayTabs} role="tablist" aria-label="選擇菜單天數">
          {DAYS.map((item, index) => (
            <button key={item.day} type="button" role="tab" aria-selected={activeDay === index}
              className={activeDay === index ? styles.dayTabActive : styles.dayTab}
              onClick={() => setActiveDay(index)}>
              {item.day.replace("Day ", "D")}
            </button>
          ))}
        </div>

        <div className={styles.menuCarousel}>
          <button className={styles.carouselArrow} type="button" aria-label="上一天" onClick={() => move(-1)}>‹</button>
          <div className={styles.menuShowcase} key={menu.day}
            onTouchStart={(event) => { touchStart.current = event.touches[0].clientX; }}
            onTouchEnd={(event) => {
              if (touchStart.current === null) return;
              const delta = event.changedTouches[0].clientX - touchStart.current;
              if (Math.abs(delta) > 45) move(delta < 0 ? 1 : -1);
              touchStart.current = null;
            }}>
            <div className={styles.menuVisual}>
              <Image src={menu.image} alt={`${menu.day} ${menu.theme}四餐菜單實拍示意`} fill sizes="(max-width: 900px) 94vw, 54vw" priority={activeDay === 0} />
              <div className={styles.menuPhotoBadge}><b>{menu.day}</b><span>{menu.theme}</span></div>
            </div>
            <div className={styles.menuDetails}>
              <p className={styles.menuDay}>{menu.day}／{menu.theme}</p>
              <div className={styles.menuMetrics}><span><small>每日總熱量</small>{menu.kcal} kcal</span><span><small>蛋白質目標</small>{menu.protein}</span></div>
              <ul>
                {menu.meals.map((meal) => (
                  <li key={meal.label}><span><b>{meal.label}</b>{meal.name}</span><strong>{meal.kcal} kcal</strong></li>
                ))}
              </ul>
            </div>
          </div>
          <button className={styles.carouselArrow} type="button" aria-label="下一天" onClick={() => move(1)}>›</button>
        </div>
        <p className={styles.menuHint}>點 D1～D7 或左右箭頭切換・手機可直接左右滑</p>
      </div>
    </section>
  );
}
