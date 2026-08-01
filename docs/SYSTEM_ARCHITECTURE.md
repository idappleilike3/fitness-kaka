# SYSTEM_ARCHITECTURE.md — 系統架構

**版本：** 0.1（2026-07-23）

---

## 1. 總覽

```
┌─────────────┐     ┌──────────────────────┐     ┌─────────────┐
│ LINE App    │────▶│ Vercel / Next.js     │────▶│ Supabase    │
│ + LIFF Web  │◀────│ API Routes + Pages   │◀────│ Postgres    │
└─────────────┘     └──────────┬───────────┘     └─────────────┘
                               │
                    ┌──────────┼──────────┐
                    ▼          ▼          ▼
               OpenAI API   NewebPay   LINE Messaging API
               (Vision/Chat) (MPG)     (Reply/Push/Content)
```

**部署：** GitHub → Vercel  
**執行模型：** Serverless（注意 webhook 內「下載圖 + Vision」需足夠 maxDuration）

---

## 2. 服務職責

| 層 | 職責 |
|----|------|
| `app/api/line/webhook` | 驗簽、去重、路由事件、回覆 |
| `app/api/newebpay/*` | 建單、Notify、Return |
| `app/liff` | 會員總覽 UI（LIFF） |
| `lib/line` | Signature、Client、Flex、下載 content |
| `lib/openai` | Vision／Meal parse／安全 prompt |
| `lib/nutrition` | BMI／BMR／TDEE／macros（純函式） |
| `lib/quota` | 每日額度檢查與扣減 |
| `lib/newebpay` | AES／SHA256／TradeSha 驗證 |
| `services/*` | 跨 repo 業務：pending meal、confirm、subscribe |
| `repositories/*` | 只負責 DB 存取 |

原則：**一個檔案一個職責**；禁止全部塞進單一巨大 `server.js`。

---

## 3. 核心資料流

### 3.1 飲食圖片

1. LINE image message → webhook  
2. 驗證 `X-Line-Signature`  
3. `line_events` 以 `event_id`／webhook eventId 去重  
4. 查 member、subscription、今日 quota  
5. 額度不足 → 回覆升級引導  
6. GET LINE content → 檢查 MIME／大小  
7. OpenAI Vision → 結構化 JSON  
8. 寫入 `pending_meal_analyses`（未入帳）  
9. Reply Flex／文字 + postback 按鈕  
10. postback `confirm` → 交易寫入 meal + summary；`discard` → 標記放棄  

### 3.2 付款

1. LIFF／Bot → `POST /api/newebpay/create`（需驗證 LINE 登入或綁定 token）  
2. 建立 `payment_orders`（唯一 MerchantOrderNo）  
3. 回傳付款頁 URL 或自動 POST 表單  
4. 使用者付款  
5. **Notify** → 驗簽 → 幂等更新訂單 → 更新／建立 subscription  
6. Return → 只顯示結果頁（再次查 DB，不直接授權威）  

---

## 4. Vercel 注意事項

| 風險 | 對策 |
|------|------|
| 函數超時 | `maxDuration` 提高（Pro）；圖片先壓縮／限制解析度 |
| 冷啟動 | 保持依賴精簡；關鍵路徑少做重初始化 |
| Cron | P1 可用手動／外部提醒；P2 再加到期提醒 Cron |
| 密鑰 | 僅 Vercel Environment Variables |

---

## 5. 環境

| 環境 | 用途 |
|------|------|
| local | `.env.local` + LINE ngrok／Cloudflare Tunnel |
| preview | Vercel Preview（勿連正式金流） |
| production | 正式 LINE Webhook + 藍新 production |

---

## 6. 觀測

- `api_usage_logs`：model、tokens、預估成本、member_id  
- `system_logs`：錯誤堆疊摘要（不含 Secret）  
- Vercel 日誌：5xx 告警（人工先看）  
