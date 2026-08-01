# ENVIRONMENT_VARIABLES.md — 環境變數

**版本：** 0.1（2026-07-23）  
**產品：** 健身卡卡教練

所有密鑰只放 Vercel／本機 `.env.local`，**不要貼到 GitHub 或聊天室。**

---

## 必要變數（Phase 1）

| 變數 | 說明 | 哪裡取得 |
|------|------|----------|
| `LINE_CHANNEL_SECRET` | Webhook 驗簽 | LINE Developers → Messaging API |
| `LINE_CHANNEL_ACCESS_TOKEN` | 回覆／下載內容 | 同上 |
| `LINE_CHANNEL_ID` | Channel ID | 同上 |
| `LIFF_ID` | LIFF 初始化 | LINE Developers → LIFF |
| `OPENAI_API_KEY` | Vision／Chat／Whisper（語音）共用同一把 | platform.openai.com |
| `OPENAI_MODEL` | 預設 `gpt-4o-mini` | 可覆寫 |
| `SUPABASE_URL` | 專案 URL | Supabase Settings |
| `SUPABASE_SERVICE_ROLE_KEY` | 伺服器專用 | 同上（勿曝光前端） |
| `SUPABASE_ANON_KEY` | 若 LIFF 直連才需要；P1 可不給前端 | 同上 |
| `NEWEBPAY_MERCHANT_ID` | 商店代號 | 藍新後台 |
| `NEWEBPAY_HASH_KEY` | HashKey | 藍新後台 |
| `NEWEBPAY_HASH_IV` | HashIV | 藍新後台 |
| `NEWEBPAY_MODE` | `sandbox` 或 `production` | 自訂 |
| `PUBLIC_BASE_URL` | 例如 `https://your-app.vercel.app` | Vercel 網域 |
| `TZ` | 建議 `Asia/Taipei` | — |

## 選用

| 變數 | 說明 |
|------|------|
| `LINE_OA_URL` | 官網「加入 LINE」連結（LINE 官方帳號加好友 URL）；未設時首頁用 `https://line.me/R/ti/p/` placeholder |
| `SUPPORT_EMAIL` | 客服信箱（退款／隱私／FAQ／頁尾 mailto）；未設時預設 `gymcoachkaka@gmail.com` |
| `NEWEBPAY_GATEWAY_URL` | 覆寫閘道 URL |
| `MAX_IMAGE_BYTES` | 預設 5242880（5MB） |
| `ADMIN_DELETE_TOKEN` | 內部刪除帳號用（若有） |
| `ADMIN_STATUS_CODE` | LINE 狀態暗號；預設 `卡卡狀態`（見 [ADMIN.md](./ADMIN.md)） |
| `ADMIN_PASSPHRASE` | `/admin` 手動開通會員的管理密碼；請設定高強度、不重複的字串 |

---

## 服務未設定時的使用者文案與管理員暗號

一般使用者（LINE）只會看到溫和提示，**不會**出現 `OPENAI_API_KEY`、Vercel、管理員設定步驟。例如：

> 飲食分析服務還沒設定好喔 請稍後再試或聯絡客服

管理員請用 **LINE 暗號**查狀態：預設 `卡卡狀態`（可用 `ADMIN_STATUS_CODE` 覆寫），或缺項代碼 `OPEN-SETUP`／`DB-SETUP`／`PAY-SETUP`。亦可 `GET /api/health?hint=OPEN-SETUP`。完整說明見 [ADMIN.md](./ADMIN.md)。

---

## 本機設定步驟（新手）

1. 複製 `.env.example` → `.env.local`  
2. 逐一填入（不要提交 `.env.local`）  
3. `npm run dev`  
4. 用 ngrok／Cloudflare Tunnel 把 webhook 指到本機  

Vercel：Project → Settings → Environment Variables → 正式／Preview 分開設定；Preview 勿放正式金流 Key。

`/admin` 還需要既有的 `SUPABASE_URL` 與 `SUPABASE_SERVICE_ROLE_KEY`。三個變數都應只設定在伺服器環境；絕不可使用 `NEXT_PUBLIC_` 前綴。
