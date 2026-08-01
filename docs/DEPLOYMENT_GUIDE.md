# DEPLOYMENT_GUIDE.md — 新手部署教學

**版本：** 0.1（2026-07-23）  
**產品：** 健身卡卡教練  
**目標：** GitHub → Vercel；密鑰只在環境變數。

> 規格通過並完成 Coding 後，再依本文件實操。現階段先申請帳號即可。

---

## 0. 你需要先申請的帳號

1. GitHub  
2. Vercel（用 GitHub 登入）  
3. LINE Developers + LINE 官方帳號（**新的**，不要用塔羅那個）  
4. OpenAI API  
5. Supabase  
6. 藍新 NewebPay（先測試商店）  
7. （建議）自訂網域  

---

## 1. 建立 GitHub repo

1. 將本專案推到 GitHub（private 建議）  
2. 確認沒有 `.env`、沒有 Key  

---

## 2. Supabase

1. 開新專案  
2. SQL Editor 執行 `supabase/migrations/001_init.sql`（實作後會提供）  
3. 複製 URL 與 **service_role**（只放 Vercel server）  

---

## 3. LINE

1. 開 Messaging API Channel  
2. 開 LIFF（Endpoint 填 Vercel URL + `/liff`）  
3. Webhook URL：`https://你的網域/api/line/webhook`  
4. 開啟 Use webhook；關閉自動回應留言（避免雙重回覆）  

---

## 4. Vercel

1. Import GitHub repo  
2. Framework：Next.js  
3. 填入環境變數（見 ENVIRONMENT_VARIABLES）  
4. Deploy  
5. 將 `PUBLIC_BASE_URL` 設成正式網域後再 Deploy 一次  

建議正式收費前使用 **Pro**（拉長 Serverless 執行時間，利於 Vision）。

---

## 5. 藍新

1. 測試模式先跑通  
2. NotifyURL：`https://你的網域/api/newebpay/notify`  
3. ReturnURL：`https://你的網域/api/newebpay/return`  
4. 用測試卡完成一筆 → 檢查 DB subscription 到期日  
5. 確認正式環境前再切 `NEWEBPAY_MODE=production`  

---

## 6. 上線檢查清單

- [ ] `/api/line/webhook` 驗簽成功  
- [ ] 加好友會建立 member  
- [ ] 傳照片可分析並確認存檔  
- [ ] 免費額度用完會擋  
- [ ] 測試付款成功 +30 天  
- [ ] 重複 Notify 不加天  
- [ ] 傳影片只回提示、不呼叫 OpenAI  
- [ ] 隱私權／條款頁可開  
- [ ] GitHub 無 Secret  

---

## 7. 常見新手坑

| 問題 | 可能原因 |
|------|----------|
| LINE 沒回覆 | Webhook 未開、驗簽失敗、Reply token 過期 |
| Vision 超時 | Vercel 時限太短、圖太大 |
| 付款成功但沒開通 | 只看了 Return、Notify 未設定或驗簽失敗 |
| 本地測不到 LINE | 需要公開 HTTPS tunnel |
