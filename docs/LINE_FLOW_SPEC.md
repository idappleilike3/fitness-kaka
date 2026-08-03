# LINE_FLOW_SPEC.md — LINE 對話與事件流程

**版本：** 0.1（2026-07-23）

---

## 1. 通道

- Messaging API Webhook：`POST /api/line/webhook`  
- 必須驗證 `X-Line-Signature`  
- Reply Token 優先；逾時改 Push（注意配額）  
- LIFF：會員總覽／付款入口（Endpoint 綁 Vercel 網域）

---

## 2. 首次加入／跟隨

**事件：** `follow` 或首次 `message`

1. Upsert `members` by `line_user_id`  
2. 回覆歡迎圖文卡
3. 若 profile 未完成 → 同一次回覆自動顯示「1 分鐘了解你」與第一題，不需再按開始
4. Rich Menu（2×3）：今日狀態｜記飲食｜會員中心｜升級方案｜我的目標｜幫助  
   詳見 [RICH_MENU.md](./RICH_MENU.md)；postback 前綴 `menu:` 

---

## 3. 建檔對話（Phase 1）

建議逐步詢問（每題一則，按鈕優先）：

1. 主要目標（4 按鈕）：減脂瘦身／控制飲食／增肌塑形／改善健康
2. 性別
3. 年齡（數字驗證 12–100；未成年另給提醒）
4. 身高 cm
5. 體重 kg
6. 目標體重
7. 活動量（4 按鈕）
8. 每週健身次數（0～7）

完成後回覆：BMI、TDEE、每日熱量與蛋白目標 +「傳照片或打字即可記飲食」。

狀態機存於 DB 或 `members` 附屬 `onboarding_step`（可放 profile jsonb／獨立欄，實作時選一種並文件化）。

---

## 4. 圖片訊息

```
image → 驗簽 → 去重 → 查額度
  → 不足：升級文案
  → 足夠：下載 → Vision → pending → 回覆結果+按鈕 → 扣圖片額度
```

**Postback data 建議：**

- `meal:confirm:<pendingId>`  
- `meal:edit:<pendingId>`  
- `meal:retry:<pendingId>`  
- `meal:discard:<pendingId>`  

`edit`：引導使用者回覆新份量文字，再跑一次文字解析（扣文字額度）或只調係數（P1 可簡化為「重新輸入完整描述」）。

---

## 5. 文字訊息路由

| 意圖 | 處理 |
|------|------|
| 建檔中 | 交給 onboarding |
| 明確飲食描述 | 文字 meal 分析（扣額度） |
| 「今天還能吃多少」等 | QA（不扣飲食額度，可限速） |
| 「升級／買會員」 | 付費 LIFF 連結 |
| 其他 | 簡短說明能做什麼 |

意圖分類可用輕量規則 + 必要時一次小模型分類（計入 api_usage，可不扣使用者飲食額度，但要 rate limit）。

---

## 6. 語音（Phase 2 only）

`audio` → 查**語音額度**（與文字分開）→ 下載 → Whisper → 同文字 meal 流程（確認後才存）。  
扣：**語音 1 次**（不扣文字次數）。  
公司成本：同一 `OPENAI_API_KEY`（Whisper + Chat）。

Phase 1 收到語音：回覆「語音紀錄將在正式版開放，請先打字或傳照片。」

---

## 6.1 影片（video）— Phase 1 處理

**不做熱量分析。** 收到 `video`／`file`（影片）時回覆：

> 教練目前只支援「照片」和「文字」記錄飲食喔！請拍一張餐點照片傳給我，或打字告訴我吃了什麼。

Phase 2 語音上線後，文案改為可含「語音訊息」。  
Phase 3：影片用於 Form Check（動作糾正），走 LIFF／影音處理，**不算熱量**。

---

## 7. 額度用完文案要點

- 告知今日已用完哪一種額度  
- 仍可查今日已紀錄摘要（不新分析）  
- 提供 399 購買入口  

---

## 8. 付款相關 LINE 通知

- Notify 成功後 Push／Reply：「付款成功，會員至 YYYY-MM-DD」  
- 失敗：勿在 Return 單獨授權威  

---

## 9. 時區

一律 **Asia/Taipei** 計算「今日」額度與 summary 日期。
