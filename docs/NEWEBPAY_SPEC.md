# NEWEBPAY_SPEC.md — 藍新金流規格

**版本：** 0.1（2026-07-23）  
**產品：** 健身卡卡教練  
**Phase 1：** MPG **一次付清**，開通／延長 **30 天**  
**可售方案：** `plan_399`（NT$399）、`plan_799`（NT$799）  
**Phase 1／2 不做：** 定期定額（待資格）

---

## 1. 環境變數

見 `ENVIRONMENT_VARIABLES.md`：

- `NEWEBPAY_MERCHANT_ID`
- `NEWEBPAY_HASH_KEY`
- `NEWEBPAY_HASH_IV`
- `NEWEBPAY_MODE` = `sandbox` | `production`
- `PUBLIC_BASE_URL`

---

## 2. 流程（必須遵守）

```
建立 payment_orders（status=pending, merchant_order_no 唯一）
  → AES 加密 TradeInfo + SHA256 TradeSha
  → 使用者導向藍新 MPG
  → Notify（伺服器對伺服器）驗簽
      → 成功：order=paid、寫 callback、更新 subscription +30 天
      → 已付過的重複 Notify：記 is_duplicate，不加天數
  → Return（瀏覽器）：只顯示成功／失敗頁，並查 DB 狀態
```

**權威來源 = Notify，不是 Return，也不是前端自己說成功。**

---

## 3. 訂單編號

- `merchant_order_no` 全域唯一（建議：`KK` + yyyymmdd + 隨機／序號）  
- 長度與字元集符合藍新文件  
- 失敗重試不可复用已 paid 的編號  

---

## 4. API 路由

| Method | Path | 說明 |
|--------|------|------|
| POST | `/api/newebpay/create` | 建立訂單，回付款 URL／表單參數 |
| POST | `/api/newebpay/notify` | 藍新背景通知 |
| GET/POST | `/api/newebpay/return` | 使用者導回 |

Create 必須驗證呼叫者身分（LIFF ID token 或後端 session），不可讓陌生人任意建單刷單。

---

## 5. 金額

- `amount_twd` 以 DB `plans.price_twd` 為準（399 或 799），**不信任前端傳價**  
- Create API 允許 `planId`: `plan_399` | `plan_799`

---

## 6. 訂閱更新

Notify 驗證成功且首次 paid：

1. `payment_orders.status = paid`，`paid_at = now()`  
2. 若現有 active 付費訂閱未過期：`expires_at += 30 days`  
3. 若無或已過期：新建 subscription，`starts_at=now()`，`expires_at=now()+30d`，`plan_id`＝訂單方案（399 或 799）  
4. LINE 通知使用者到期日  

---

## 7. 測試

- 先用 sandbox  
- 測：成功付款、失敗、重複 Notify、Return 重整不重複加天  

---

## 8. Phase 2 預告

定期定額另開規格；需商店資格。未到位前維持一次付 + 到期提醒。
