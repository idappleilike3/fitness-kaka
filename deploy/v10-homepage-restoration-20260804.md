# 健身卡卡 v10 首頁恢復與改造驗收紀錄

日期：2026-08-04

## 目標與來源

- 來源：`main`、`v10-full-preview`、`v10-final-image-layout`、`v10-safe-integration` 歷史分支與既有持久化圖片。
- 目標：保留 v10 完整內容與指定女教練圖片，恢復粉紫溫暖品牌；新增健康減脂、營養指引與 7 天免費體驗導覽。
- 正確 LINE 加好友網址：`https://lin.ee/5rxQDpa`。

## 本次範圍

- 首頁 Hero、導覽列、會員登入、7 天體驗三步驟、CTA 與 FAQ 摘要。
- 免費方案文案改為 7 天免費體驗；299／399／799 價格不變。
- 粉紫品牌色、圓角玻璃卡、浮動卡與柔和動畫；保留 reduced-motion 與手機單欄。
- FAQ／退款頁移除錯誤的其他產品 LINE 帳號連結，統一導向健身卡卡。
- 未修改 API、會員資料庫、後台、金流、LINE Rich Menu 發布與餐點分析服務。

## 驗證結果

- `npm test -- tests/homepage/content.test.ts tests/compliance/newebpay-review.test.ts`：22/22 通過。
- `npm run build`：通過，首頁與 27 個其他路由完成建置。
- `git diff --check`：通過。
- 完整 `npm test`：127/131 通過；3 項既有 LINE 訊息／載入動畫測試失敗，另 1 項舊 LINE 帳號預期已於本次修正後通過。
- 本機 Next.js 開發伺服器：明確綁定 `127.0.0.1` 後 Ready；環境未提供 `agent-browser` 指令，視覺驗收改於正式部署後執行。

## 正式部署後驗收

- Vercel Production 必須顯示 READY。
- `/`、`/member-login`、`/faq`、`/refund` 必須正常回應。
- 首頁必須顯示「好好吃，也能健康減脂」、「開始 7 天免費體驗」與會員登入。
- LINE 按鈕必須導向 `https://lin.ee/5rxQDpa`。
- 網站部署與 LINE OA Rich Menu／歡迎詞為分開項目；本次不宣稱 LINE OA 圖片已更新。
