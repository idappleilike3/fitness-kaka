# LINE 圖文選單（Rich Menu）

健身卡卡教練預設圖文選單：2×3（六格），圖片與上傳腳本已放在 repo。

## 選單佈局

```
┌────────────┬────────────┬────────────┐
│ 今日狀態   │ 記飲食     │ 會員中心   │
│ menu:today │ menu:meal  │ URI /liff  │
├────────────┼────────────┼────────────┤
│ 升級方案   │ 我的目標   │ 幫助       │
│ menu:upgrade│ menu:goals│ menu:help  │
└────────────┴────────────┴────────────┘
```

| 格 | 標籤 | Action |
|----|------|--------|
| 1 | 今日狀態 | postback `menu:today`（顯示文字「今日還能吃多少」） |
| 2 | 記飲食 | postback `menu:meal` → 回覆拍照／打字／語音提示 |
| 3 | 會員中心 | URI `https://fitness-kaka.vercel.app/liff` |
| 4 | 升級方案 | postback `menu:upgrade` |
| 5 | 我的目標 | postback `menu:goals`（建檔完成才顯示目標） |
| 6 | 幫助 | postback `menu:help` |

圖片路徑：`assets/line/rich-menu-2x3.webp`（2500×1686）

Webhook 會在 `src/services/line-router.ts` 處理所有 `menu:*` postback。

---

## 方式 A：用腳本一鍵建立（推薦）

### 1. 準備圖片（可選，repo 已含成品）

```bash
node scripts/generate-rich-menu-image.mjs
```

會覆寫 `assets/line/rich-menu-2x3.webp`。

### 2. 取得 Channel Access Token（不要把 token 貼到聊天或 commit）

從本機已登入的 Vercel 專案拉取 production 環境變數：

```bash
vercel env pull .env.vercel --yes --environment=production
```

或在 `.env.local` 填入 `LINE_CHANNEL_ACCESS_TOKEN`（與 Messaging API 相同那把）。

### 3. 建立並設為預設選單

```bash
node --env-file=.env.vercel scripts/setup-rich-menu.mjs
# 或
node --env-file=.env.local scripts/setup-rich-menu.mjs
```

腳本會：

1. 刪除同名舊選單 `健身卡卡_default_v1`（冪等：可重跑）
2. 建立新 Rich Menu（2×3 areas）
3. 上傳 PNG
4. 設為「所有使用者」預設圖文選單

常用參數：

```bash
node --env-file=.env.vercel scripts/setup-rich-menu.mjs --dry-run
node --env-file=.env.vercel scripts/setup-rich-menu.mjs --keep-old
```

### 4. 在手機驗證

開啟官方帳號聊天室 → 點底部「教練選單」→ 逐格點擊確認回覆。若看不到新圖，關閉聊天再進一次，或等數分鐘快取更新。

---

## 腳本無法執行時

請在已登入且已連結 `fitness-kaka` 的終端機依序執行：

```bash
vercel link
vercel env pull .env.vercel --yes --environment=production
node --env-file=.env.vercel scripts/setup-rich-menu.mjs
```

若出現 `Missing LINE_CHANNEL_ACCESS_TOKEN`，請確認 Vercel Production 環境已有同名變數，再重新執行第二、三行。Token 請使用 LINE Developers 的 **Messaging API Channel access token**，不是 Channel secret。

若出現 `401` 或 `403`，請到 LINE Developers 重新發行／確認 Token，更新 Vercel 的 `LINE_CHANNEL_ACCESS_TOKEN` 後重新部署，再重跑上方命令。

若出現圖片檔案錯誤，先執行：

```bash
node scripts/generate-rich-menu-image.mjs
node --env-file=.env.vercel scripts/setup-rich-menu.mjs
```

成功時終端機會顯示 `Set as default rich menu for all users.`。LINE 聊天室可能需要重新開啟或等待幾分鐘才會看到新選單。

---

## 方式 B：LINE Official Account Manager 手動上傳

1. 開啟 [LINE Official Account Manager](https://manager.line.biz/) → 你的帳號  
2. **主頁** → **圖文選單**（或 Messaging API 通道的 Rich menus）  
3. 建立選單，聊天列文字建議：`教練選單`  
4. 上傳 `assets/line/rich-menu-2x3.webp`  
5. 劃分 2 列 × 3 欄，依上表設定 postback／URI  
6. 設為預設並發佈  

手動時 postback data 必須與上表完全一致（含 `menu:` 前綴），否則 webhook 不會對應到正確回覆。

---

## 冪等與注意事項

- 腳本以名稱 `健身卡卡_default_v1` 識別「我們的」選單；重跑會先刪同名再重建，不會清掉你手動建的其他名稱選單。  
- Token 只存在環境變數／本機 `.env.*`；`.env.vercel` 已應在 `.gitignore`。  
- 部署 webhook 程式後，postback 才會生效；僅上傳圖片不會處理 `menu:*`。  
- 會員中心 URI 目前寫死 production LIFF；若換網域請同步改 `scripts/setup-rich-menu.mjs` 的 `LIFF_URL`。

---

## 相關檔案

| 檔案 | 用途 |
|------|------|
| `assets/line/rich-menu-2x3.webp` | 選單圖 |
| `scripts/generate-rich-menu-image.mjs` | 產生 PNG |
| `scripts/setup-rich-menu.mjs` | 建立／上傳／設預設 |
| `src/services/line-router.ts` | `menu:*` 路由 |
| `src/lib/line/messages.ts` | 幫助／記飲食／目標文案 |
