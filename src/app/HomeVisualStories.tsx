import Image from "next/image";
import styles from "./page.module.css";
import { MovementGallery, PlateauGallery, RoadmapGallery } from "./InteractiveStoryGalleries";

export function PainStory() {
  return (
    <section id="problem" className={styles.storySection} aria-labelledby="problem-title">
      <div className={styles.storySplit} data-reveal>
        <div className={styles.storyImage}>
          <Image src="/images/story-real-life.webp" alt="忙碌外食時，用手機拍下餐點開始記錄" fill sizes="(max-width: 860px) 100vw, 52vw" />
          <div className={styles.floatingChoice}>
            <small>今天午餐</small>
            <strong>不用查資料庫</strong>
            <span>拍下來，卡卡幫你整理</span>
          </div>
        </div>
        <div className={styles.storyCopy}>
          <p className={styles.sectionEyebrow}>WHY KAKA</p>
          <h2 id="problem-title" className={styles.displayTitle}>你不是不努力<br />只是記錄太難持續</h2>
          <p className={styles.storyLead}>減脂最累的通常不是少吃，而是每一餐都要查份量、算熱量、記蛋白質，最後還是不知道下一餐怎麼選。</p>
          <div className={styles.painList}>
            <article><b>查半天</b><span>外食份量不固定，資料庫找不到完全一樣的餐點</span></article>
            <article><b>看不懂</b><span>知道吃了多少，卻不知道今天還能吃什麼</span></article>
            <article><b>撐不久</b><span>工作一忙就漏記，健康計畫很快又回到原點</span></article>
          </div>
          <p className={styles.storyPunch}>卡卡把複雜的計算，變成你在 LINE 傳一張照片</p>
        </div>
      </div>
    </section>
  );
}

export function ThreeStepJourney() {
  return (
    <section id="how" className={`${styles.storySection} ${styles.journeySection}`} aria-labelledby="how-title">
      <div className={styles.storyHeading} data-reveal>
        <p className={styles.sectionEyebrow}>PHOTO → CHECK → ACTION</p>
        <h2 id="how-title" className={styles.sectionTitle}>不用完美，先完成今天的一步</h2>
        <p className={styles.sectionLead}>從一張餐點照片開始，卡卡把辨識結果變成你看得懂、能修改、也真的做得到的下一步。照片分析為營養估算，食材、份量與烹調方式由你確認後才計入。</p>
      </div>
      <div className={styles.journeyStage} data-reveal>
        <Image src="/images/story-photo-analysis.webp" alt="使用手機拍攝健康餐點" fill sizes="100vw" />
        <div className={styles.journeyRail}>
          <article><span>01</span><div><b>拍照、文字或語音</b><p>外食直接拍，沒照片就打字；付費方案忙碌時也能用語音說。</p></div></article>
          <article><span>02</span><div><b>先看分析，再確認</b><p>卡卡整理餐點、份量、熱量與蛋白質；辨識不準可修改，不會直接算進去。</p></div></article>
          <article><span>03</span><div><b>得到下一餐的方向</b><p>確認後更新今日剩餘額度，直接告訴你下一餐優先補什麼。</p></div></article>
        </div>
        <div className={styles.analysisCard}>
          <small>午餐分析 · 待確認</small>
          <strong>620 <i>kcal</i></strong>
          <div><span>蛋白質 48g</span><span>碳水 70g</span><span>脂肪 15g</span></div>
          <p>晚餐優先補蔬菜與蛋白質，主食份量減半即可</p>
          <b>確認紀錄</b>
        </div>
      </div>
    </section>
  );
}

export function FeatureStory() {
  return (
    <section id="features" className={`${styles.storySection} ${styles.featureStory}`} aria-labelledby="feature-title">
      <div className={styles.storyHeading} data-reveal>
        <p className={styles.sectionEyebrow}>BUILT FOR REAL LIFE</p>
        <h2 id="feature-title" className={styles.sectionTitle}>不是只算熱量，是陪你做下一個選擇</h2>
        <p className={styles.sectionLead}>每次輸入都要有回應、有方向，也看得到累積的改變。卡卡不只告訴你吃了多少，而是把數字翻成今天做得到的調整。</p>
      </div>
      <div className={styles.featureScenes} data-reveal>
        <article className={styles.inputScene}>
          <div><span>01 · 隨手記</span><h3>照片、文字、語音都能記</h3><p>依當下情境選最方便的方法，不用為了記錄停下生活。</p></div>
          <div className={styles.inputDock}><b>📷<small>拍照</small></b><b>⌨<small>文字</small></b><b>◉<small>語音</small></b></div>
        </article>
        <article className={styles.calorieScene}>
          <div><span>02 · 剩餘額度</span><h3>今日還能吃多少</h3><p>依目標與已確認餐點，即時更新今天的空間。</p></div>
          <div className={styles.calorieRing}><strong>1,240</strong><small>kcal 可用</small></div>
        </article>
        <article className={styles.proteinScene}>
          <div><span>03 · 營養追蹤</span><h3>減脂也要吃得完整</h3><p>同步追蹤蛋白質、碳水、脂肪、膳食纖維與喝水，不把少吃當成唯一答案。</p></div>
          <div className={styles.proteinMeter}><i /><strong>62 / 100 g</strong><small>晚餐再補 38g</small></div>
        </article>
        <article className={styles.confirmScene}>
          <div><span>04 · 你來確認</span><h3>辨識正確，才存進紀錄</h3><p>份量或餐點不準都能修改，避免一次誤判影響整天。</p></div>
          <div className={styles.confirmCard}><span>雞胸肉 120g</span><span>糙米飯 半碗</span><span>花椰菜 1 份</span><b>修改份量　✓ 確認</b></div>
        </article>
      </div>
    </section>
  );
}

export function PersonalPlanStory() {
  const fields = ["年齡・身高・體重", "目標與預計時間", "活動量・運動頻率", "外食・飲食偏好", "過敏與不吃食材", "睡眠・疲勞狀態"];
  return (
    <section className={`${styles.storySection} ${styles.personalStory}`} aria-labelledby="personal-title">
      <div className={styles.personalCopy} data-reveal>
        <p className={styles.sectionEyebrow}>PERSONAL BASELINE</p>
        <h2 id="personal-title" className={styles.displayTitle}>先了解你，再決定怎麼吃</h2>
        <p className={styles.storyLead}>同樣一份菜單，不會適合每一個人。開始前先建立身體資料、生活節奏與飲食限制，才能估算基礎代謝、每日消耗與合理的熱量目標。</p>
        <div className={styles.fieldCloud}>
          {fields.map((field) => <span key={field}>{field}</span>)}
        </div>
        <p className={styles.safetyNote}><b>安全優先</b>　卡卡不鼓勵極端節食。一般以每週約 0.25～0.75 公斤作為參考，再依 7～14 天趨勢調整。慢性病、懷孕或特殊健康狀況，應先諮詢合格醫療專業人員。</p>
      </div>
      <div className={styles.profileScanner} data-reveal>
        <div className={styles.scanHeader}><span>KAKA PROFILE</span><b>個人目標建議</b><i>已完成 86%</i></div>
        <div className={styles.scanBody}>
          <div className={styles.scanOrbit}><strong>1,680</strong><small>每日目標 kcal</small></div>
          <dl>
            <div><dt>基礎代謝 BMR</dt><dd>1,328 kcal</dd></div>
            <div><dt>每日消耗 TDEE</dt><dd>2,030 kcal</dd></div>
            <div><dt>建議熱量差</dt><dd>−350 kcal</dd></div>
            <div><dt>蛋白質目標</dt><dd>100 g</dd></div>
          </dl>
        </div>
        <small>示範畫面，實際目標依個人資料計算</small>
      </div>
    </section>
  );
}

export function MealFlexStory() {
  return (
    <section className={`${styles.storySection} ${styles.flexStory}`} aria-labelledby="flex-title">
      <div className={styles.storyHeading} data-reveal>
        <p className={styles.sectionEyebrow}>MEAL FLEX SYSTEM</p>
        <h2 id="flex-title" className={styles.sectionTitle}>菜單不是規定，是今天用得到的選擇</h2>
        <p className={styles.sectionLead}>外食環境、預算、食慾和活動量每天都不同。選一個做得到的版本，卡卡會重新計算今天的營養進度。</p>
      </div>
      <div className={styles.mealWorkbench} data-reveal>
        <aside>
          <span>選擇今天的情境</span>
          <b>外食版</b><b>超商版</b><b>居家版</b>
          <small>也支援素食替換、不吃牛肉、乳製品或海鮮</small>
        </aside>
        <div className={styles.mealPlate}>
          <span className={styles.plateProtein}>一掌心蛋白質</span>
          <span className={styles.plateVeg}>兩拳<br /><b>蔬菜</b></span>
          <span className={styles.plateCarb}>一拳<br /><b>主食</b></span>
        </div>
        <div className={styles.swapPanel}>
          <small>今晚臨時聚餐？</small>
          <h3>不用挨餓補償</h3>
          <p>白天正常吃，聚餐先選蛋白質與蔬菜；飲料、醬料與主食擇一調整即可。</p>
          <div><span>吃不飽</span><b>蔬菜或蛋白質 +1</b></div>
          <div><span>太飽了</span><b>下餐回到正常份量</b></div>
        </div>
      </div>
    </section>
  );
}

export function MovementStory() {
  return (
    <section className={`${styles.storySection} ${styles.movementStory}`} aria-labelledby="move-title">
      <div className={styles.movementIntro} data-reveal>
        <p className={styles.sectionEyebrow}>MOVE & RECOVER</p>
        <h2 id="move-title" className={styles.displayTitle}>吃對之外<br />也安排做得到的活動</h2>
        <p>不是把每天塞滿訓練，而是依時間、場地與經驗選擇能持續的模式。訓練日提醒補足能量，休息日照常吃、讓身體恢復。</p>
      </div>
      <div className={styles.movementModes} data-reveal>
        <MovementGallery />
        <div className={styles.recoveryBand}><b>今天很疲勞或不舒服？</b><span>降低強度、改成散步或休息，不為了連續打卡硬撐</span><i>每週查看運動完成率，再安排下一週</i></div>
      </div>
    </section>
  );
}

export function PlateauStory() {
  return (
    <section className={`${styles.storySection} ${styles.plateauStory}`} aria-labelledby="plateau-title">
      <div className={styles.plateauPanel} data-reveal>
        <div className={styles.trendHeader}><span>WEIGHT TREND</span><b>短期波動 ≠ 沒有效果</b></div>
        <svg viewBox="0 0 620 190" role="img" aria-label="十四天體重波動趨勢示意">
          <path d="M10 45 C65 85 95 35 145 78 S230 122 275 88 S350 45 395 80 S480 136 520 92 S575 60 610 72" />
          <line x1="10" y1="145" x2="610" y2="145" />
        </svg>
        <div className={styles.trendFactors}><span>經期</span><span>水分</span><span>睡眠</span><span>排便</span><span>活動量</span><span>飲食完成率</span></div>
        <p>體重短期沒下降，不代表減脂失敗。卡卡先看 7～14 天趨勢與生活因素，再決定是否調整熱量或運動。</p>
      </div>
      <div className={styles.coachCases} data-reveal>
        <p className={styles.sectionEyebrow}>REAL COACHING MOMENTS</p>
        <h2 id="plateau-title" className={styles.sectionTitle}>不是責備，是幫你把今天接回來</h2>
        <article><span>今天吃超標</span><p>「下一餐正常吃，不用跳餐補償。先補水，晚餐選清爽蛋白質與蔬菜就好」</p></article>
        <article><span>蛋白質不足</span><p>「便利商店可選無糖豆漿＋茶葉蛋，或雞胸搭沙拉，補到接近目標即可」</p></article>
        <article><span>聚餐前</span><p>「早餐午餐照常，聚餐先看菜色再分配主食、飲料和甜點，不需要餓一整天」</p></article>
      </div>
      <PlateauGallery />
    </section>
  );
}

export function RoadmapStory() {
  return (
    <section id="challenge" className={`${styles.storySection} ${styles.roadmapStory}`} aria-labelledby="milestone-title">
      <div className={styles.roadmapImage} data-reveal>
        <Image src="/images/story-roadmap.webp" alt="從開始記錄、調整飲食到建立穩定運動習慣的三十天歷程" fill sizes="100vw" />
        <div className={styles.roadmapIntro}>
          <p className={styles.sectionEyebrow}>30 DAY ROADMAP</p>
          <h2 id="milestone-title" className={styles.displayTitle}>有方向的挑戰<br />比硬撐更容易持續</h2>
          <p>不是連續打卡而已。每一階段都讓你看懂自己，再把下一步調整得更小、更實際。</p>
        </div>
      </div>
      <div data-reveal><RoadmapGallery /></div>
    </section>
  );
}

export function MemberDashboardPreview() {
  return (
    <section className={`${styles.storySection} ${styles.dashboardStory}`} aria-labelledby="world-title">
      <div className={styles.dashboardCopy} data-reveal>
        <p className={styles.sectionEyebrow}>YOUR DAILY HUD</p>
        <h2 id="world-title" className={styles.displayTitle}>把健康進度<br />放在看得懂的位置</h2>
        <p className={styles.storyLead}>不是用一堆數字製造壓力。會員中心會先告訴你今天完成了什麼，再指出最值得做的下一件事。</p>
        <ul>
          <li>今日餐點與剩餘熱量</li>
          <li>蛋白質、喝水與活動進度</li>
          <li>七天體重趨勢與挑戰任務</li>
          <li>目前方案與可用功能</li>
        </ul>
        <small>示範畫面，實際目標依個人資料計算</small>
      </div>
      <div className={styles.dashboardPhone} data-reveal>
        <div className={styles.dashboardTop}><span>DAY 08</span><b>早安，今天也一起完成</b><i>•••</i></div>
        <div className={styles.dashboardHero}>
          <div className={styles.energyRing}><strong>1,240</strong><small>剩餘熱量 kcal</small></div>
          <div><span>健康分數</span><strong>78</strong><small>/ 100</small></div>
        </div>
        <div className={styles.dashboardStats}>
          <article><span>蛋白質</span><b>62 / 100 g</b><i style={{ "--fill": "62%" } as React.CSSProperties} /></article>
          <article><span>喝水</span><b>4 / 8 杯</b><i style={{ "--fill": "50%" } as React.CSSProperties} /></article>
          <article><span>運動</span><b>散步 20 分</b><i style={{ "--fill": "67%" } as React.CSSProperties} /></article>
        </div>
        <div className={styles.weightTrend}><span>體重趨勢 · 7 天</span><svg viewBox="0 0 260 72" aria-hidden><path d="M4 19 C32 10 44 35 72 28 S112 51 138 38 S176 24 199 34 S231 54 256 42" /><line x1="4" y1="58" x2="256" y2="58" /></svg><b>−0.6 kg</b></div>
        <div className={styles.todayTask}><span>今日任務</span><b>晚餐補 38g 蛋白質</b><small>建議：雞胸、魚、豆腐擇一</small></div>
      </div>
    </section>
  );
}

export function CoachClosing() {
  return (
    <section className={styles.coachClosing} aria-labelledby="warmth-title">
      <Image src="/images/story-coach-support.webp" alt="卡卡教練在餐桌旁用手機提供飲食建議" fill sizes="100vw" />
      <div className={styles.coachTabletUi} data-reveal aria-label="平板上的今日飲食建議示範">
        <small>今日飲食回顧</small>
        <div><strong>1,420</strong><span>/ 1,680 kcal</span></div>
        <p>蛋白質　72 / 100g</p>
        <i><b /></i>
        <em>下一餐建議</em>
        <span>補一份蛋白質＋兩拳蔬菜</span>
      </div>
      <div className={styles.coachClosingCopy} data-reveal>
        <p className={styles.sectionEyebrow}>MORE THAN NUMBERS</p>
        <h2 id="warmth-title" className={styles.displayTitle}>卡卡陪你的<br />是下一個選擇</h2>
        <p>不是要求每餐都滿分，而是根據你今天真正吃的內容、運動、腰圍、體重、睡眠與疲勞狀態，給一個現在做得到的調整。</p>
        <blockquote>「今天不是要做到滿分<br />先把晚餐的蛋白質補好，就很棒了」</blockquote>
      </div>
    </section>
  );
}
