# TECH_ARCHITECTURE_GROWTH.md — 成長技術架構

## 1. 架構目標

在現有系統上提供 30 天挑戰、AI 減脂診斷、分享與邀請、轉換與報告，同時維持 LINE 對話快速、付款可信、敏感健康資料最小化與所有寫入可冪等。

```text
LINE 使用者
  ↔ LINE Messaging API
  ↔ Next.js API Routes / Server Services
  ↔ Supabase PostgreSQL
  ↔ OpenAI

會員中心（LIFF WebView）
  ↔ Next.js App Router
  ↔ Next.js API Routes
  ↔ Supabase PostgreSQL

會員中心付款頁
  ↔ Next.js 訂單 API
  ↔ NewebPay MPG
  ↔ callback API

Next.js 應用
  → Vercel 部署與排程觸發
```

## 2. 元件職責

| 元件 | 職責 | 不應承擔 |
|---|---|---|
| LINE Messaging API | 接收 follow、message、postback；回覆與推播 | 商業規則、資料庫直接存取 |
| Next.js | 驗簽、路由、授權、服務編排、會員中心頁面與 API | 將 service role 暴露至瀏覽器 |
| Supabase | 會員、餐點、挑戰、分享、邀請、訂閱的持久化與約束 | 直接對外公開敏感資料 |
| OpenAI | 餐點理解、診斷整理、報告文字草稿 | 總熱量權威計算、付款決策、健康醫療判斷 |
| NewebPay | 建立付款交易與傳遞付款結果 | 前端自行決定訂閱啟用 |
| Vercel | Next.js 執行、環境變數、排程端點 | 長時間背景佇列的唯一可靠來源 |

## 3. LINE 與會員中心流程

### LINE

1. `POST /api/line/webhook` 先驗證 `X-Line-Signature`
2. 以 `line_events.event_key` 去重，並依 `line_user_id` 查找既有 `members`
3. 新事件交由既有 router 分到建檔、餐點、任務、診斷入口、方案或一般問答
4. 耗時 AI 工作需先回覆處理中訊息或使用安全非同步策略，避免 reply token 逾時
5. 只有已同意提醒的會員可收到排程 push，且遵守每日一則一般提醒上限

### 會員中心

對使用者名稱一律是「會員中心」。技術上由 LIFF WebView 載入 Next.js，但這個術語不出現在一般使用者文案。

- LINE Login／LIFF 身分令牌由後端驗證後建立受限 session
- 前端不持有 Supabase service role
- 所有會員資料、挑戰進度、分享卡預覽、方案與付款經 Next.js API 存取
- 分享頁可使用短效公開 token，但只能讀取去識別化 `share_cards.payload`

## 4. Supabase 資料與一致性

既有 `members` 是唯一會員識別。成長功能新增 `member_challenges`、`missions`、`mission_progress`、`user_levels`、`badges`、`member_badges`、`share_cards`、`invite_codes`、`referrals`、`rewards`，細節見 `DATABASE_SCHEMA_GROWTH.md`。

### 交易與冪等

- 餐點確認、任務完成、XP／streak／徽章判定須在單一資料庫交易或等效原子 RPC 中完成
- 以唯一索引和來源事件 ID 防止 LINE webhook、使用者重點擊、排程重跑造成重複授獎
- 付款開通沿用 `payment_callbacks` 去重，只以驗簽成功的 NewebPay Notify 作為權威
- 邀請先建立歸因，再在診斷＋首餐＋風控通過後轉為 `qualified` 與授獎

### 隱私與 RLS

- 使用者只能讀寫自己的 `member_id` 資料
- 風控 metadata、邀請審核理由、付款原始回呼與 OpenAI 原始內容僅由後端讀取
- share card 永遠由後端清洗輸出，絕不把 `member_profiles`、原始餐點照片或完整診斷物件直接公開

## 5. AI 與純計算的邊界

| 能力 | 實作方式 | 原因 |
|---|---|---|
| BMI、BMR、TDEE、巨量營養素目標 | 純計算、固定公式 | 可重現、可測試，不需要 AI |
| 免費餐點額度與方案權限 | 純資料庫／商業規則 | 必須精確、不可由模型決定 |
| streak、XP、徽章、有效邀請 | 純事件規則與交易 | 防重複、防濫用、可稽核 |
| NewebPay 訂單與開通 | 純伺服器端加密、驗簽與資料庫 | 金流安全 |
| 餐點照片／文字結構化 | OpenAI，輸出受 Zod schema 驗證 | AI 適合非結構化理解 |
| 「為什麼我瘦不下來」診斷 | 規則先萃取證據＋OpenAI 生成可讀敘述 | 防止 AI 捏造資料與醫療結論 |
| Day 7／14／30 報告 | SQL／程式聚合數據＋OpenAI 摘要 | 數據來源可查、語氣可個人化 |
| 任務選擇 | MVP 以規則優先，AI 僅可建議文案 | 維持可預測性與安全 |

每個 OpenAI 回應需要：結構化輸出驗證、資料不足處理、敏感健康情境攔截、模型與成本記錄至 `api_usage_logs`。聊天不是餐點額度，但仍須做頻率與成本限制。

## 6. 付款與方案

- 既有 `plans`／`subscriptions`／`payment_orders` 保持權威
- MVP 用 `plan_399` 與 `plan_799` 對應 Plus／Pro，顯示名稱調整前需先確認既有資料與付款內容一致
- 年費 3,590／7,190 在方案、NewebPay 商品與退款機制確認前不可開放下單
- 前端付款結果頁只顯示處理中或狀態，真正開通以 callback 成功為準

## 7. 排程、可觀測性與失敗處理

### 排程

Vercel Cron 或等效受驗證的排程端點處理：

- 依 Asia/Taipei 產生日任務與發送符合資格的提醒
- 生成 Day 7、14、30 報告
- 過期分享卡、邀請代碼與獎勵清理
- 重新嘗試可安全重跑的報告或推播工作

每個排程執行都須有 idempotency key、執行摘要與失敗記錄。若未來推播量、AI 延遲或重試需求超出 Vercel 函式限制，再導入明確佇列，不在 MVP 預先增加基礎設施。

### 監控

記錄但不洩漏敏感內容：

- LINE webhook 驗簽失敗、重複事件、回覆／推播失敗
- AI schema 驗證失敗、逾時、成本與安全攔截
- 任務與獎勵冪等衝突、可疑邀請、分享連結失效
- NewebPay callback 驗簽與訂閱開通狀態

健康檢查維持既有 `/api/health`。新服務失敗時採用可理解的 LINE 回覆與可重試工作，不遺失餐點或付款狀態。

## 8. 明確延後的架構

- AI 健康商城：沒有商品、推薦、訂單或聯盟資料模型
- 完整公開排行榜：沒有跨會員公開查詢或即時排名服務
- 真人教練、社群、影片分析與複雜健身計畫：不納入成長 MVP

等待確認後再開發
