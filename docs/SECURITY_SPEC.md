# SECURITY_SPEC.md — 安全與成本控制

**版本：** 0.1（2026-07-23）  
**產品：** 健身卡卡教練

---

## 1. 密鑰

- 所有 Secret 僅環境變數  
- `.env*` 列入 `.gitignore`  
- 提供 `.env.example`（無真實值）  
- 前端／LIFF 不得嵌入 Channel Secret、HashKey、OpenAI Key  

---

## 2. LINE

- 驗證 `X-Line-Signature`  
- 失敗回 401，不處理 body  
- `line_events.event_key` 去重，防止重複扣額／重複回覆  

---

## 3. 藍新

- 驗證 TradeSha／解密 TradeInfo  
- 以 Notify 為授權威  
- 重複 Notify 幂等  
- 建單金額以後端 plan 為準  

---

## 4. 額度與 Rate limit

- 每日圖片／文字／語音**分開**計數（`usage_quotas`）  
- 超出回覆升級，不呼叫 OpenAI  
- QA／意圖分類：每會員每分鐘次數上限（防刷）  
- IP／會員異常使用可寫 `system_logs` 並人工停用  

---

## 5. 媒體限制

| 類型 | 限制 |
|------|------|
| 圖片 | ≤ 5MB；image/*；可縮圖 |
| 語音 P2 | ≤ 60 秒 |
| 影片 P1 | **不下載分析**，只回提示 |

`image_hash`：相同 hash 短時間窗口內不重複扣圖片額度（仍可提示「請用確認按鈕」）。

---

## 6. OpenAI 成本紀錄

每呼叫寫 `api_usage_logs`（tokens、model、purpose、est_cost）。  
禁止在 log 存完整 Secret 或信用卡號。

---

## 7. 個資與健康資料

- 最小化：只存減脂服務必要欄位  
- 隱私權政策、使用條款上線必備  
- 申請刪除：標記 `members.status=deleted` + 匿名化／刪除 meals（流程 P1 可半人工）  
- 不做醫療診斷；特殊族群顯示專業諮詢提醒  

---

## 8. LIFF

- 使用 LINE Login／liff.getIDToken 驗身後才讀會員資料  
- P1 建議資料全走後端 API（Service Role 僅伺服器）  

---

## 9. 錯誤處理

- 對外友善短訊；對內 `system_logs`  
- 不向使用者暴露堆疊與金鑰  
