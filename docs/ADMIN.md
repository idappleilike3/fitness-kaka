# ADMIN.md — 管理員操作

**產品：** 健身卡卡教練  
**對象：** 營運／開發（一般使用者看不到本文件內容）

---

## LINE 狀態暗號

在官方帳號對話中傳送**完整一致**的暗號文字，機器人會回覆精簡布林狀態（不含任何密鑰）。缺項會附上對應暗號代碼：

```
卡卡狀態
line ok
openai off → OPEN-SETUP
supabase ok
newebpay ok
db ok
暗號 OPEN-SETUP｜飲食分析引擎還沒接上 請到部署平台環境變數補 OPENAI_API_KEY 後重新部署
```

也可直接傳單一暗號代碼（例如 `OPEN-SETUP`）取得該項說明。

| 暗號 | 意義 |
|------|------|
| `卡卡狀態`（或 `ADMIN_STATUS_CODE`） | 總覽布林狀態 |
| `OPEN-SETUP` | 缺 OpenAI（飲食／語音分析） |
| `DB-SETUP` | 缺 Supabase |
| `PAY-SETUP` | 缺藍新金流 |
| `SYS-SETUP` | 其他環境變數未齊 |

| 項目 | 意義 |
|------|------|
| `line` | Channel Secret／Access Token 已設定 |
| `openai` | OpenAI API Key 已設定 |
| `supabase` | Supabase URL＋Service Role 看起來有效 |
| `newebpay` | 藍新商店代號／HashKey／HashIV 已設定 |
| `db` | 能連上資料庫並讀到 `plans`（需 supabase 先 ok） |

### 設定總覽暗號

| 環境變數 | 預設 | 說明 |
|----------|------|------|
| `ADMIN_STATUS_CODE` | `卡卡狀態` | 可改成你自訂的字串，例如 `//kaka-status` |

建議：上線後改成只有你知道的字串；勿公開貼到社群。

---

## 手動開通會員方案

當需要補償、贈送或測試會員時，請用管理頁，不要直接執行 SQL：

1. 在 Vercel 正式環境設定 `ADMIN_PASSPHRASE`（高強度、只供內部使用）與既有的 `SUPABASE_URL`、`SUPABASE_SERVICE_ROLE_KEY`。
2. 在 Supabase SQL Editor 執行 `supabase/migrations/004_admin_operations.sql`，建立管理操作稽核表。
3. 部署後開啟 `https://你的網域/admin`，輸入 `ADMIN_PASSPHRASE` 解鎖；登入 Cookie 有效 8 小時，且只有瀏覽器可用。
4. 用會員顯示名稱或 LINE User ID 搜尋，即可查看目前方案、到期日、今日餐點、使用額度、30 天挑戰、付款與操作紀錄。
5. LINE 諮詢收款後按「登記付款並開通」，選擇 399／799 月繳或年繳方案、輸入實收金額與付款備註。
6. 補償或贈送用「贈送／補償開通」；需要時可暫停、恢復或延長既有方案。

系統會從 `plans.duration_days` 讀取天數；仍在效期內時會從原到期日往後延長，不會縮短效期。人工付款會建立 `payment_orders`、`subscriptions` 與 `admin_operation_logs` 紀錄。管理密碼只在伺服器驗證；`SUPABASE_SERVICE_ROLE_KEY` 不會傳給瀏覽器。

### 方案額度

| 方案 | 效期／價格 | 每日額度 |
|------|-----------|----------|
| 免費體驗 | 長期免費 | 照片＋文字合計 5 次；聊天不扣；語音 0 |
| 卡卡減脂 | NT$399／30 天 | 圖片 10、文字 30、語音 5 |
| 卡卡教練 | NT$799／30 天 | 圖片 25、文字 60、語音 15 |

---

## HTTP 健康檢查

瀏覽器或 curl：

```
GET /api/health
GET /api/health?hint=OPEN-SETUP
```

回傳 JSON：`config.line` / `openai` / `supabase` / `newebpay` 布林，以及 `db` 探測細節。帶正確 `hint`／`code` 時多一個 `adminHint`。同樣**不含密鑰值**。

錯誤日誌／`system_logs` metadata 會帶 `adminHintCode`（例如 `OPEN-SETUP`）。

---

## 使用者看到什麼（缺設定時）

一般會員只會收到溫和口語提示，所有 LINE 使用者可見的回覆（含 webhook、餐點結果、額度、幫助、建檔、錯誤與付款通知）結尾都不使用全形句號 `。` 或英文句點 `.`；句中需要的標點可保留，例如：

> 飲食分析服務還沒設定好喔 請稍後再試或聯絡客服

**不會**出現 `OPENAI_API_KEY`、Vercel、或管理員設定步驟。
