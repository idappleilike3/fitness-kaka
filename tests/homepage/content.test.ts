import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(process.cwd(), "src/app");
const page = readFileSync(resolve(root, "page.tsx"), "utf8");
const plans = readFileSync(resolve(root, "HomePlansSection.tsx"), "utf8");
const menu = readFileSync(resolve(root, "SevenDayMenu.tsx"), "utf8");
const visualStoriesPath = resolve(root, "HomeVisualStories.tsx");
const visualStories = readFileSync(visualStoriesPath, "utf8");
const interactiveStories = readFileSync(resolve(root, "InteractiveStoryGalleries.tsx"), "utf8");

describe("homepage commercial content", () => {
  it("does not publish beta labels", () => {
    expect(page).not.toMatch(/Beta|測試中/i);
  });

  it("uses the Fitness Kaka LINE account instead of another product account", () => {
    expect(page).toContain('const LINE_OA_FALLBACK = "https://lin.ee/5rxQDpa"');
    expect(page).not.toContain("@146iqokj");
  });

  it("gives visitors visible member login and seven-day trial actions", () => {
    expect(page).toContain('href="/member-login"');
    expect(page).toContain("會員登入");
    expect(page).toContain("開始 7 天免費體驗");
    expect(page).not.toMatch(/14\s*天(?:免費)?體驗/);
  });

  it("explains what visitors experience during the seven-day trial", () => {
    expect(page).toContain('id="trial"');
    for (const text of ["建立個人目標", "拍照看懂每一餐", "每天知道下一步"]) {
      expect(page).toContain(text);
    }
  });

  it("publishes the NT$299 seven-day menu offer", () => {
    expect(plans).toContain('monthlyPrice: "NT$299"');
    expect(plans).toContain("完整 Day 1～Day 7 菜單");
  });

  it("contains seven distinct selectable menu days", () => {
    const days = menu.match(/day: "Day \d"/g) ?? [];
    expect(days).toHaveLength(7);
    expect(menu).toContain("role=\"tablist\"");
  });

  it("uses seven distinct real menu images and per-meal calories", () => {
    const images = menu.match(/image: "\/images\/menu-day-\d\.webp"/g) ?? [];
    expect(images).toHaveLength(7);
    expect(menu).toContain('label: "早餐"');
    expect(menu).toContain('label: "午餐"');
    expect(menu).toContain('label: "晚餐"');
    expect(menu).toContain('label: "點心"');
    expect(menu).toContain("kcal:");
  });

  it("provides manual carousel controls and a swipe gesture", () => {
    expect(menu).toContain('aria-label="上一天"');
    expect(menu).toContain('aria-label="下一天"');
    expect(menu).toContain("onTouchStart");
    expect(menu).toContain("onTouchEnd");
  });

  it("restores the original coach hero and expands the story sections", () => {
    expect(page).toContain("/images/hero-kaka-original.webp");
    expect(visualStories).toContain("陪你做下一個選擇");
    expect(visualStories).toContain("每一階段都讓你看懂自己");
    expect(visualStories).toContain("把健康進度");
  });

  it("mounts real intersection-observer scroll reveals", () => {
    expect(page).toContain("<ScrollReveal />");
    expect(page).toContain("data-reveal");
  });

  it("mounts the complete visual story sections without the removed member dashboard", () => {
    expect(page).toContain("<PainStory");
    expect(page).toContain("<ThreeStepJourney");
    expect(page).toContain("<FeatureStory");
    expect(page).toContain("<RoadmapStory");
    expect(page).not.toContain("<MemberDashboardPreview");
    expect(page).toContain("<CoachClosing");
  });

  it("pairs the expanded copy with real story imagery and a complete dashboard", () => {
    expect(visualStories).toContain("/images/story-real-life.webp");
    expect(visualStories).toContain("/images/story-photo-analysis.webp");
    expect(visualStories).toContain("/images/story-roadmap.webp");
    expect(visualStories).toContain("/images/story-coach-support.webp");
    expect(visualStories).toContain("剩餘熱量");
    expect(visualStories).toContain("蛋白質");
    expect(visualStories).toContain("喝水");
    expect(visualStories).toContain("體重趨勢");
    expect(visualStories).toContain("今日任務");
  });

  it("explains personal assessment and safe goal calculation", () => {
    expect(page).toContain("<PersonalPlanStory");
    expect(visualStories).toContain("先了解你，再決定怎麼吃");
    expect(visualStories).toContain("基礎代謝");
    expect(visualStories).toContain("每日消耗");
    expect(visualStories).toContain("每週約 0.25～0.75 公斤");
    expect(visualStories).toContain("慢性病、懷孕或特殊健康狀況");
  });

  it("covers nutrition beyond calories and clearly labels estimates", () => {
    for (const text of ["膳食纖維", "腰圍", "睡眠", "疲勞"]) {
      expect(visualStories).toContain(text);
    }
    expect(visualStories).toContain("照片分析為營養估算");
    expect(visualStories).toContain("確認後才計入");
    expect(visualStories).toContain("示範畫面，實際目標依個人資料計算");
  });

  it("offers realistic meal substitutions instead of a rigid menu", () => {
    expect(page).toContain("<MealFlexStory");
    for (const text of ["外食版", "超商版", "居家版", "素食替換", "一掌心蛋白質", "聚餐"]) {
      expect(visualStories).toContain(text);
    }
  });

  it("adds actionable training and recovery coaching", () => {
    expect(page).toContain("<MovementStory");
    for (const text of ["居家徒手", "健走", "健身房", "訓練日", "休息日", "降低強度"]) {
      expect(`${visualStories}\n${interactiveStories}`).toContain(text);
    }
  });

  it("provides clickable roadmap, movement and plateau image switching", () => {
    expect(interactiveStories).toContain('role="tablist"');
    expect(interactiveStories).toContain("RoadmapGallery");
    expect(interactiveStories).toContain("MovementGallery");
    expect(interactiveStories).toContain("PlateauGallery");
    expect(interactiveStories.match(/\/images\/stories\//g)).toHaveLength(13);
  });

  it("routes every paid plan to LINE consultation purchase", () => {
    expect(plans).toContain("LINE 諮詢購買");
    expect(plans).not.toContain("前往會員中心升級");
  });

  it("explains plateaus and gives concrete coach responses", () => {
    expect(page).toContain("<PlateauStory");
    expect(visualStories).toContain("7～14 天趨勢");
    for (const text of ["經期", "水分", "排便", "今天吃超標", "蛋白質不足", "聚餐前"]) {
      expect(visualStories).toContain(text);
    }
  });
});
