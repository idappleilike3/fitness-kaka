# 健身卡卡教練 Phase 1 MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 上線可測試、可收費的 LINE AI 飲食教練：會員建檔、圖片／文字飲食（確認後才存）、每日熱量、免費額度、藍新一次付 399／30 天、基礎 LIFF 總覽。

**Architecture:** Next.js App Router 部署於 Vercel；LINE Webhook 驗簽後走 services；OpenAI gpt-4o-mini 做 Vision／文字解析，結果進 pending，確認後才寫 meal；Supabase Postgres 存會員／訂單／額度；藍新 MPG 一次付清，以 Notify 為授權威。

**Tech Stack:** Node.js、Next.js 15、TypeScript、Supabase、LINE Messaging API + LIFF、OpenAI API、NewebPay MPG、Vitest、Vercel

## Global Constraints

- 產品名：**健身卡卡教練**；Slogan：拍照、打字即紀錄，你的 LINE 專屬 AI 減脂教練；語氣：專業、俐落、鼓勵、不囉嗦
- Phase 1 **不做**：語音分析、健身課表生成、定期定額、影片算熱量、上架 799
- 飲食：**確認後才寫入** meal_records；不可見圖即存
- 付款：**Notify 為準**，不信任 Return／前端成功頁
- 額度：免費每天圖片 2、文字 3、語音 0；圖片／文字／語音**分開扣**；扣點＝分析成功時（含重新辨識）
- 密鑰只放環境變數；同一把 `OPENAI_API_KEY`
- 時區：`Asia/Taipei`
- 營養公式：Mifflin-St Jeor；減脂熱量 TDEE×0.8；增肌 TDEE×1.1；維持 TDEE；蛋白減脂／增肌 1.8 g/kg、維持 1.4；脂肪熱量 25%
- 影片訊息：不下載、不呼叫 OpenAI；回覆請用照片或文字
- 語音訊息（P1）：不分析；回覆正式版再開放
- 不可宣稱醫療診斷；回覆含 AI 推估免責
- 規格衝突時先列出，不可擅自改商業規則
- 未實際跑測試不得宣稱測試通過

---

## File Structure (Phase 1)

```
fitness-kaka/
├── package.json
├── tsconfig.json
├── next.config.ts
├── vercel.json
├── vitest.config.ts
├── .env.example
├── .gitignore
├── README.md
├── docs/                          # 已存在規格
├── supabase/migrations/001_init.sql
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   ├── privacy/page.tsx
│   │   ├── terms/page.tsx
│   │   ├── liff/page.tsx
│   │   ├── pay/page.tsx
│   │   ├── payment/success/page.tsx
│   │   ├── payment/failed/page.tsx
│   │   └── api/
│   │       ├── health/route.ts
│   │       ├── line/webhook/route.ts
│   │       ├── newebpay/create/route.ts
│   │       ├── newebpay/notify/route.ts
│   │       ├── newebpay/return/route.ts
│   │       └── liff/summary/route.ts
│   ├── lib/
│   │   ├── env.ts
│   │   ├── line/signature.ts
│   │   ├── line/client.ts
│   │   ├── line/messages.ts
│   │   ├── openai/client.ts
│   │   ├── openai/meal-vision.ts
│   │   ├── openai/meal-text.ts
│   │   ├── openai/daily-qa.ts
│   │   ├── nutrition/calc.ts
│   │   ├── quota/daily.ts
│   │   ├── newebpay/crypto.ts
│   │   ├── newebpay/mpg.ts
│   │   └── supabase/admin.ts
│   ├── repositories/
│   │   ├── members.ts
│   │   ├── profiles.ts
│   │   ├── meals.ts
│   │   ├── quotas.ts
│   │   ├── orders.ts
│   │   ├── subscriptions.ts
│   │   └── logs.ts
│   ├── services/
│   │   ├── onboarding.ts
│   │   ├── meal-flow.ts
│   │   ├── daily-status.ts
│   │   ├── line-router.ts
│   │   └── subscribe.ts
│   └── types/
│       └── index.ts
└── tests/
    ├── nutrition/calc.test.ts
    ├── quota/daily.test.ts
    ├── newebpay/crypto.test.ts
    └── line/signature.test.ts
```

---

### Task 1: Scaffold Next.js + Vitest + env

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `vitest.config.ts`, `vercel.json`, `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/api/health/route.ts`, `src/lib/env.ts`, `src/types/index.ts`
- Modify: `.env.example`, `README.md`（若需補啟動指令）
- Test: `tests/smoke/env.test.ts`

**Interfaces:**
- Produces: `getEnv()` 回傳已驗證環境變數物件；缺必要變數在 server 啟動／呼叫時拋錯

- [ ] **Step 1: 初始化 package.json 與依賴**

```json
{
  "name": "fitness-kaka",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "next": "^15.1.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "@supabase/supabase-js": "^2.47.0",
    "zod": "^3.24.0",
    "openai": "^4.77.0"
  },
  "devDependencies": {
    "@types/node": "^22.10.0",
    "@types/react": "^19.0.0",
    "typescript": "^5.7.0",
    "vitest": "^2.1.0"
  }
}
```

- [ ] **Step 2: 實作 `src/lib/env.ts`（zod 驗證）**

必要欄位：`PUBLIC_BASE_URL`, `LINE_CHANNEL_SECRET`, `LINE_CHANNEL_ACCESS_TOKEN`, `OPENAI_API_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `NEWEBPAY_MERCHANT_ID`, `NEWEBPAY_HASH_KEY`, `NEWEBPAY_HASH_IV`, `NEWEBPAY_MODE`（預設 sandbox）, `OPENAI_MODEL`（預設 gpt-4o-mini）, `MAX_IMAGE_BYTES`（預設 5242880）。`LIFF_ID` 可選於早期。

- [ ] **Step 3: Health route**

`GET /api/health` 回 `{ ok: true, product: "健身卡卡教練", newebpayMode: env.NEWEBPAY_MODE }`（勿回傳任何 secret）。

- [ ] **Step 4: 寫測試確認 vitest 可跑**

```ts
import { describe, it, expect } from "vitest";
describe("smoke", () => {
  it("works", () => expect(1 + 1).toBe(2));
});
```

Run: `npm test`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add package.json tsconfig.json next.config.ts vitest.config.ts vercel.json src .env.example
git commit -m "chore: scaffold Next.js app for 健身卡卡教練"
```

---

### Task 2: Supabase migration 001_init

**Files:**
- Create: `supabase/migrations/001_init.sql`
- Reference: `docs/DATABASE_SCHEMA.md`

**Interfaces:**
- Produces: 表 `plans`, `members`, `member_profiles`, `subscriptions`, `payment_orders`, `payment_callbacks`, `pending_meal_analyses`, `meal_records`, `meal_items`, `daily_nutrition_summary`, `weight_records`, `workout_plans`, `workout_logs`, `usage_quotas`, `api_usage_logs`, `line_events`, `system_logs`
- Seed: `plans` 三列 `free` / `plan_399` / `plan_799`（799 is_active 可 true 但 P1 不上架銷售）

- [ ] **Step 1: 依 DATABASE_SCHEMA 寫完整 SQL**（含 PK／FK／UNIQUE／索引／`updated_at` trigger）

plans seed 範例：

```sql
INSERT INTO plans (id, name, price_twd, duration_days, daily_image_quota, daily_text_quota, daily_voice_quota, is_active) VALUES
  ('free', '免費', 0, 0, 2, 3, 0, true),
  ('plan_399', '卡卡減脂', 399, 30, 10, 30, 5, true),
  ('plan_799', '卡卡教練', 799, 30, 25, 60, 15, true);
```

- [ ] **Step 2: 在 Supabase SQL Editor 執行（或本地 supabase db reset）**

Expected: 無錯誤；`select * from plans` 三列

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/001_init.sql
git commit -m "feat(db): add Phase 1 schema and plan seeds"
```

---

### Task 3: Nutrition calculator（純函式 + TDD）

**Files:**
- Create: `src/lib/nutrition/calc.ts`
- Test: `tests/nutrition/calc.test.ts`

**Interfaces:**
- Produces:
  - `calcBmr(input: { sex: 'male'|'female'; weightKg: number; heightCm: number; age: number }): number`
  - `activityFactor(level: 'sedentary'|'light'|'moderate'|'high'): number` → 1.2 / 1.375 / 1.55 / 1.725
  - `calcTargets(profile): { bmi, bmr, tdee, calorieTarget, proteinG, carbG, fatG }`

- [ ] **Step 1: 寫失敗測試**

```ts
import { describe, it, expect } from "vitest";
import { calcBmr, calcTargets } from "@/lib/nutrition/calc";

describe("calcBmr", () => {
  it("male mifflin", () => {
    // 10*70 + 6.25*175 - 5*30 + 5 = 700+1093.75-150+5 = 1648.75
    expect(calcBmr({ sex: "male", weightKg: 70, heightCm: 175, age: 30 })).toBeCloseTo(1648.75, 1);
  });
});

describe("calcTargets cut", () => {
  it("uses 0.8 tdee and 1.8 protein", () => {
    const t = calcTargets({
      sex: "male", weightKg: 70, heightCm: 175, age: 30,
      activityLevel: "sedentary", goalType: "cut",
    });
    expect(t.calorieTarget).toBe(Math.round(t.tdee * 0.8));
    expect(t.proteinG).toBe(Math.round(70 * 1.8));
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

Run: `npm test -- tests/nutrition/calc.test.ts`

- [ ] **Step 3: 實作 calc.ts 至通過**

- [ ] **Step 4: Run — expect PASS**

- [ ] **Step 5: Commit**

```bash
git commit -am "feat(nutrition): BMR TDEE and macro targets"
```

---

### Task 4: Quota 分開扣（純函式 + repo 介面）

**Files:**
- Create: `src/lib/quota/daily.ts`, `src/repositories/quotas.ts`
- Test: `tests/quota/daily.test.ts`

**Interfaces:**
- Produces:
  - `canUse(used: { image: number; text: number; voice: number }, limits: same, kind: 'image'|'text'|'voice'): boolean`
  - `increment(used, kind): used`
  - `getTaipeiDate(now = new Date()): string` → `YYYY-MM-DD`
- Repository: `getOrCreateTodayQuota(memberId)`, `tryConsume(memberId, kind)` → `{ ok: boolean; used; limits }`（limits 來自目前有效 plan）

- [ ] **Step 1–4: TDD 分開扣與跨日日期字串**

- [ ] **Step 5: Commit**

```bash
git commit -am "feat(quota): separate daily image/text/voice counters"
```

---

### Task 5: LINE signature + client + message builders

**Files:**
- Create: `src/lib/line/signature.ts`, `src/lib/line/client.ts`, `src/lib/line/messages.ts`
- Test: `tests/line/signature.test.ts`

**Interfaces:**
- Produces:
  - `verifyLineSignature(body: string, signature: string, secret: string): boolean`（HMAC-SHA256 base64）
  - `replyText(replyToken, text)`, `replyFlex(...)`, `pushText(userId, text)`
  - `downloadContent(messageId): Promise<Buffer>`
  - Message copy helpers：歡迎、影片提示、語音未開放、免責 footer

影片固定文案：

```
教練目前只支援「照片」和「文字」記錄飲食喔！請拍一張餐點照片傳給我，或打字告訴我吃了什麼。
```

- [ ] **Step 1: signature 測試用已知 secret／body／signature 向量**

- [ ] **Step 2–4: 實作至 PASS**

- [ ] **Step 5: Commit**

```bash
git commit -am "feat(line): signature verify and reply helpers"
```

---

### Task 6: Members / profiles repositories + onboarding service

**Files:**
- Create: `src/lib/supabase/admin.ts`, `src/repositories/members.ts`, `src/repositories/profiles.ts`, `src/repositories/logs.ts`, `src/services/onboarding.ts`

**Interfaces:**
- `upsertMemberByLineUserId(lineUserId, displayName?)` → member
- `getProfile(memberId)`, `saveProfilePartial`, `completeProfile` → 呼叫 `calcTargets` 寫入快取欄位
- `onboarding.handleAnswer(member, textOrPostback)` → 下一步提示或完成訊息
- 首次 follow：建立 member + 若無 subscription 則綁 `free` plan subscription

- [ ] **Step 1: admin supabase client（service role）**

- [ ] **Step 2: follow／首次訊息建立會員 + free 訂閱**

- [ ] **Step 3: 逐步建檔狀態機（sex→age→height→weight→target→activity→freq→goal）**

- [ ] **Step 4: 未成年（age&lt;18）回覆專業諮詢提醒，仍可建檔但加免責**

- [ ] **Step 5: Commit**

```bash
git commit -am "feat(members): upsert, free plan, onboarding flow"
```

---

### Task 7: LINE webhook router（骨架）

**Files:**
- Create: `src/app/api/line/webhook/route.ts`, `src/services/line-router.ts`, `src/repositories/logs.ts`（line_events 去重）

**Interfaces:**
- `POST`：讀 raw body → verify signature → 解析 events → 逐一 `routeEvent` → 一律 200（LINE 要求；業務錯誤寫 system_logs）
- `ensureEventOnce(eventKey)`：插入 `line_events`，衝突則 skip

- [ ] **Step 1: 驗簽失敗回 401**

- [ ] **Step 2: follow → 歡迎 + onboarding**

- [ ] **Step 3: video → 固定提示（不呼叫 OpenAI）**

- [ ] **Step 4: audio → P1 未開放提示**

- [ ] **Step 5: 本機用 mock body 測驗簽；Commit**

```bash
git commit -am "feat(line): webhook verify, dedupe, media guards"
```

---

### Task 8: OpenAI meal text + pending + confirm

**Files:**
- Create: `src/lib/openai/client.ts`, `src/lib/openai/meal-text.ts`, `src/repositories/meals.ts`, `src/services/meal-flow.ts`
- Modify: `src/services/line-router.ts`

**Interfaces:**
- `analyzeMealFromText(text): MealAnalysisJson`
- `createPending(memberId, source, result)`
- `confirmPending(pendingId, memberId)` → meal_records + items + daily_nutrition_summary upsert 加總
- `discardPending(pendingId, memberId)`
- Postback: `meal:confirm:`, `meal:discard:`, `meal:retry:`, `meal:edit:`

流程：額度 `tryConsume('text')` → OpenAI → api_usage_logs → pending → 回覆結果＋按鈕＋免責 → 確認才入帳。

回覆須含：品項、總熱量、三大營養素、今日已攝取／剩餘、蛋白還差、AI 推估免責。

- [ ] **Step 1: meal JSON zod schema 驗證**

- [ ] **Step 2: 文字路徑接上 router（意圖：像飲食描述）**

- [ ] **Step 3: confirm／discard postback**

- [ ] **Step 4: 手動或整合測（mock OpenAI）**

- [ ] **Step 5: Commit**

```bash
git commit -am "feat(meal): text analysis with confirm-before-save"
```

---

### Task 9: OpenAI meal vision（圖片）

**Files:**
- Create: `src/lib/openai/meal-vision.ts`
- Modify: `src/services/meal-flow.ts`, `src/services/line-router.ts`

**Interfaces:**
- `analyzeMealFromImage(buffer: Buffer, mime: string): MealAnalysisJson`
- 下載 LINE content → 檢查 `MAX_IMAGE_BYTES` → sha256 `image_hash` → 短窗重複不重複扣額（仍可回上次 pending 提示）
- `tryConsume('image')` 成功後才呼叫 Vision

- [ ] **Step 1–3: 實作並接 image message**

- [ ] **Step 4: 重新辨識扣第二次圖片額度**

- [ ] **Step 5: Commit**

```bash
git commit -am "feat(meal): vision analysis with quota and confirm"
```

---

### Task 10: Daily status QA

**Files:**
- Create: `src/lib/openai/daily-qa.ts`, `src/services/daily-status.ts`
- Modify: `line-router.ts`

**Interfaces:**
- `getTodayStatus(memberId)` → targets + summary + remaining
- 規則匹配：「還能吃多少」「蛋白質」「超標」「麥當勞」等 → 用 DB 數據組短回覆；必要時 `daily_qa` 模型潤飾但必須注入當日數字
- **不扣**飲食額度；每會員每分鐘最多 6 次

- [ ] **Step 1–4: 實作 + 簡易測**

- [ ] **Step 5: Commit**

```bash
git commit -am "feat(daily): personalized remaining calorie answers"
```

---

### Task 11: NewebPay crypto + create/notify/return

**Files:**
- Create: `src/lib/newebpay/crypto.ts`, `src/lib/newebpay/mpg.ts`, `src/repositories/orders.ts`, `src/repositories/subscriptions.ts`, `src/services/subscribe.ts`, `src/app/api/newebpay/create/route.ts`, `notify/route.ts`, `return/route.ts`, `src/app/pay/page.tsx`, `payment/success/page.tsx`, `payment/failed/page.tsx`
- Test: `tests/newebpay/crypto.test.ts`

**Interfaces:**
- `encryptTradeInfo(plain: string): string`, `sha256TradeSha(tradeInfo: string): string`, `verifyAndDecrypt(tradeInfo, tradeSha)`
- `createOrder(memberId, planId='plan_399')` → amount **只讀 DB plans.price_twd**；`merchant_order_no` 唯一
- Notify：驗簽 → 若首次 paid → subscription +30 天 → LINE 通知；重複 → `payment_callbacks.is_duplicate=true`
- Return：redirect 成功／失敗頁並查 DB，**不在此授權威**

- [ ] **Step 1: TDD crypto**

- [ ] **Step 2: create API（需 line user 綁定參數／LIFF token 驗證——P1 可先用伺服器签发的短效 payToken）**

- [ ] **Step 3: notify 幂等**

- [ ] **Step 4: return 頁**

- [ ] **Step 5: Commit**

```bash
git commit -am "feat(pay): NewebPay MPG one-time 399 with notify authority"
```

---

### Task 12: LIFF 總覽 + 條款頁

**Files:**
- Create: `src/app/liff/page.tsx`, `src/app/api/liff/summary/route.ts`, `src/app/privacy/page.tsx`, `src/app/terms/page.tsx`
- Modify: `messages.ts`（給 LIFF／升級連結）

**Interfaces:**
- LIFF init → `liff.getIDToken()` → 後端驗證（LINE verify idtoken）→ 回今日熱量、剩餘、蛋白、當日 meals、方案、到期日、付款入口
- 顯示取消說明：一次付清無自動扣款；到期後回到免費額度
- 隱私權／使用條款：產品名、非醫療、資料用途、刪除申請方式（email 佔位可設定 env `SUPPORT_EMAIL`）

- [ ] **Step 1–4: 實作極簡單頁（非卡片堆砌；品牌名為主視覺層級）**

- [ ] **Step 5: Commit**

```bash
git commit -am "feat(liff): member summary, pay entry, legal pages"
```

---

### Task 13: vercel.json maxDuration + 部署文件對齊 + MVP_PROGRESS

**Files:**
- Modify: `vercel.json`, `docs/MVP_PROGRESS.md`, `docs/DEPLOYMENT_GUIDE.md`（若路徑有差）

```json
{
  "functions": {
    "src/app/api/line/webhook/route.ts": { "maxDuration": 60 },
    "src/app/api/newebpay/notify/route.ts": { "maxDuration": 30 }
  }
}
```

- [ ] **Step 1: 更新進度：規格通過、實作計畫完成、Coding 進行中各 Task 勾選**

- [ ] **Step 2: Commit**

```bash
git commit -am "chore: vercel durations and progress sync"
```

---

### Task 14: Phase 1 驗收測試（依 TEST_PLAN）

**Files:**
- 不假裝通過；依 `docs/TEST_PLAN.md` 手動＋自動化清單打勾

- [ ] **Step 1: `npm test` 全綠**

- [ ] **Step 2: 手動驗收表 1–12（含影片提示、付款 Notify、重複 Notify）**

- [ ] **Step 3: 將結果寫入 `docs/MVP_PROGRESS.md`**

- [ ] **Step 4: Commit**

```bash
git commit -am "test: record Phase 1 acceptance results"
```

---

## Spec coverage checklist（self-review）

| 規格要求 | Task |
|----------|------|
| 會員建檔 + BMI/BMR/TDEE | 3, 6 |
| 圖／文飲食確認後存 | 8, 9 |
| 每日個人化問答 | 10 |
| 免費額度 2/3/0 分開扣 | 4 |
| 影片／語音 P1 守衛 | 7 |
| 藍新 399／Notify／+30 天 | 11 |
| LIFF 總覽＋條款 | 12 |
| 密鑰環境變數 | 1, .env.example |
| DB 全表 | 2 |
| 不做語音課表定期定額 | Global + 未排 Task |

## Placeholder scan

無 TBD／「稍後實作」步驟；整合處以明確 mock／手動驗收描述。

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-07-23-fitness-kaka-phase1.md`.

**Two execution options:**

1. **Subagent-Driven（建議）** — 每個 Task 派一個新 subagent，Task 之間我幫你 review  
2. **Inline Execution** — 在本對話依序執行，每段 checkpoint 再繼續  

**Which approach?**
