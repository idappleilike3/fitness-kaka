# 健身卡卡教練

> 拍照、打字即紀錄，你的 LINE 專屬 AI 減脂教練。

**狀態：規格定案中（尚未開始正式 Coding）**

## 這是什麼？

健身卡卡教練是一個可商業化收費的 LINE Bot + LIFF 產品：

- 使用者在 LINE 傳食物照片或文字描述
- AI 推估熱量與三大營養素（需使用者確認後才存檔）
- 依個人資料計算每日熱量／蛋白質目標
- 免費有每日額度；付費開通 30 天會員（藍新金流一次付清）
- 免費體驗每天 5 次餐點分析（圖片／文字共用，聊天不扣；語音 0）；卡卡減脂 NT$399／30 天為圖 10／文 30／語音 5，卡卡教練 NT$799／30 天為圖 25／文 60／語音 15；付費方案額度分開計算；影片不算熱量

## 三階段路線

| 階段 | 目標 | 重點 |
|------|------|------|
| Phase 1 驗證市場 | 獲取首批付費客 | LINE 綁定、圖／文飲食、每日熱量、單次購買、基礎 LIFF |
| Phase 2 正式版 | 提高留存、完整訂閱 | 語音、模板健身建議、圖表、體重趨勢、定期定額（資格允許時） |
| Phase 3 爆款版 | 裂變增長 | 週報告、邀請好友、教練／營養師分潤 |

**Phase 1 不做：** 語音、健身課表生成、定期定額。

## 文件索引（請先讀這些）

| 文件 | 說明 |
|------|------|
| [docs/PRODUCT_SPEC.md](docs/PRODUCT_SPEC.md) | 產品規格 |
| [docs/BUSINESS_MODEL.md](docs/BUSINESS_MODEL.md) | 商業模式與定價 |
| [docs/SYSTEM_ARCHITECTURE.md](docs/SYSTEM_ARCHITECTURE.md) | 系統架構 |
| [docs/DATABASE_SCHEMA.md](docs/DATABASE_SCHEMA.md) | 資料庫設計 |
| [docs/LINE_FLOW_SPEC.md](docs/LINE_FLOW_SPEC.md) | LINE 對話流程 |
| [docs/RICH_MENU.md](docs/RICH_MENU.md) | LINE 圖文選單（Rich Menu）設定 |
| [docs/OPENAI_PROMPT_SPEC.md](docs/OPENAI_PROMPT_SPEC.md) | OpenAI Prompt |
| [docs/NEWEBPAY_SPEC.md](docs/NEWEBPAY_SPEC.md) | 藍新金流 |
| [docs/SECURITY_SPEC.md](docs/SECURITY_SPEC.md) | 安全與成本控制 |
| [docs/DEPLOYMENT_GUIDE.md](docs/DEPLOYMENT_GUIDE.md) | 新手部署教學 |
| [docs/TEST_PLAN.md](docs/TEST_PLAN.md) | 測試計畫 |
| [docs/ENVIRONMENT_VARIABLES.md](docs/ENVIRONMENT_VARIABLES.md) | 環境變數 |
| [docs/PHASE2_PLAN.md](docs/PHASE2_PLAN.md) | Phase 2 正式版（語音／圖表／定期定額） |
| [docs/superpowers/plans/2026-07-23-fitness-kaka-phase1.md](docs/superpowers/plans/2026-07-23-fitness-kaka-phase1.md) | Phase 1 實作計畫 |
| [docs/MVP_PROGRESS.md](docs/MVP_PROGRESS.md) | MVP 進度 |
| [docs/superpowers/specs/2026-07-23-fitness-kaka-design.md](docs/superpowers/specs/2026-07-23-fitness-kaka-design.md) | 設計總覽（已拍板摘要） |

## 技術棧（已拍板）

- Node.js + Next.js（App Router）
- LINE Messaging API + LIFF
- OpenAI API（Phase 1：Vision + Chat；Phase 2：Whisper）
- Supabase（Postgres）
- 藍新 NewebPay（Phase 1：MPG 一次付清 30 天）
- Vercel 部署

## 重要原則

1. **密鑰只放環境變數**，絕不寫死在程式碼或提交到 GitHub
2. **飲食紀錄必須使用者確認後才寫入資料庫**
3. **付款狀態以藍新伺服器 Notify 為準**，不信任前端成功頁
4. **不做醫療／營養診斷**；必要時顯示專業諮詢提醒
5. 規格未確認前不大規模 Coding；每階段更新 `MVP_PROGRESS.md`

## 本地開發

```bash
cp .env.example .env.local
# 填入 LINE / OpenAI / Supabase / 藍新 變數
npm install
npm test
npm run dev
```

Webhook 本機需 HTTPS tunnel，指向 `https://你的tunnel/api/line/webhook`。

### LINE 圖文選單（Rich Menu）

預設 2×3 選單圖：`assets/line/rich-menu-2x3.webp`。建立／設為預設：

```bash
node scripts/generate-rich-menu-image.mjs   # 可選：重產圖片
vercel env pull .env.vercel --yes --environment=production
node --env-file=.env.vercel scripts/setup-rich-menu.mjs
```

詳見 [docs/RICH_MENU.md](docs/RICH_MENU.md)。腳本可重跑（會刪除同名舊選單再重建）。

Supabase：在 SQL Editor 執行 `supabase/migrations/001_init.sql`。

## 官網首頁

- 正式網域：`https://fitness-kaka.vercel.app`
- 「加入 LINE」使用環境變數 `LINE_OA_URL`（Vercel／`.env.local`）。**若未設定**，按鈕會連到 placeholder `https://line.me/R/ti/p/`，請到 LINE Official Account Manager 複製加好友連結後填入並重新部署。
- 教練自介照片：把檔案放到 `public/images/coach-portrait.jpg` 後重新部署；尚未放置時首頁會顯示佔位區塊。

## 授權

Private — 健身卡卡產品專用。
