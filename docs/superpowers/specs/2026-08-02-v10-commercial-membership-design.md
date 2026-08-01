# 健身卡卡 v10 商業會員系統設計

## 1. 目標

把現有銷售首頁、LINE Bot、會員中心與管理後台整合成一套可營運的商業會員系統。

核心原則：

- 官網首頁維持銷售用途。
- 所有已註冊使用者都可用 LINE 身分登入會員中心。
- 免費會員可查看基礎資料與升級入口；付費功能依方案解鎖。
- 管理員可在後台手動登記付款並切換 399／799 月繳或年繳方案。
- 會員開通後，會員中心、每日額度、LINE 歡迎卡與 Rich Menu 必須同步更新。
- 到期後保留帳號與歷史資料，但付費功能重新上鎖並切回免費版 Rich Menu。

## 2. 使用者角色

### 免費會員

可使用：

- LINE 登入會員中心
- 基本資料與身體分析摘要
- 今日免費額度與剩餘額度
- 今日熱量、蛋白質基礎摘要
- 基礎使用教學與知識中心
- 方案比較、升級入口、客服與政策頁

鎖定：

- 完整歷史紀錄
- 進階趨勢圖
- 語音飲食紀錄
- 完整 30 天挑戰與勳章
- 每週報告
- 進階 AI 教練建議
- 進階提醒與個人化設定

### 399 會員（卡卡 Plus）

解鎖：

- 圖片 10／文字 30／語音 5 每日額度
- 完整飲食紀錄與歷史查詢
- 今日儀表板
- 30 天挑戰基礎版
- 每週飲食摘要與目標完成率
- 會員版 Rich Menu

### 799 會員（卡卡 Pro 教練）

包含 399 全部功能，另解鎖：

- 圖片 25／文字 60／語音 15 每日額度
- 進階 AI 教練建議
- 完整 30 天挑戰與 7／14／21／30 天勳章
- 進階提醒、健康檢查與教練回顧
- Pro 專屬內容與未來擴充功能

### 管理員

可：

- 密碼登入後台
- 搜尋會員姓名或 LINE UID
- 查看目前方案、狀態、到期日與每日用量
- 登記付款並開通方案
- 贈送／補償開通
- 暫停、恢復、延長、降級與到期處理
- 查看付款紀錄與操作紀錄

## 3. 主要頁面

### 3.1 官網首頁 `/`

用途：銷售與轉換。

導覽新增：

- 會員登入
- 加入 LINE

「會員登入」導向 `/member-login`；「加入 LINE」使用 `LINE_OA_URL`。

### 3.2 會員登入 `/member-login`

- 單一主按鈕：「使用 LINE 登入會員中心」
- 不提供 Email／密碼登入
- 若從 LINE 內開啟，優先走 LIFF
- 若從一般瀏覽器開啟，走 LINE Login OAuth
- 登入成功後導向 `/member`

### 3.3 會員中心 `/member`

首頁採 Dashboard：

- 歡迎詞、目前方案、到期日
- 今日剩餘熱量
- 蛋白質進度
- 喝水進度
- 今日任務
- 健康分數
- 30 天挑戰進度

六個主入口：

1. 記錄飲食
2. 今日／歷史紀錄
3. 我的目標
4. 30 天挑戰與勳章
5. 會員資料
6. 設定與知識中心

免費會員看到鎖定卡與升級說明；不得只靠前端隱藏，後端 API 也必須檢查方案權限。

### 3.4 管理後台 `/admin`

保留密碼登入，將現有 prompt 改成表單：

- 方案下拉：免費、299 菜單、399 月、399 年、799 月、799 年
- 付款方式：LINE、轉帳、現金、藍新、其他
- 實收金額
- 開通日期
- 自動計算到期日
- 備註
- 確認開通

開通成功後顯示結果摘要與操作紀錄。

## 4. 身分驗證與安全

- 不再接受網址直接傳入 `lineUserId` 作為可信身分。
- LIFF／LINE Login 取得的 access token 必須由後端向 LINE 驗證。
- 驗證成功後，以 LINE UID 建立伺服器端 Session Cookie。
- Session Cookie 使用 HttpOnly、Secure、SameSite=Lax。
- `/api/member/*` 僅從 Session 取得會員身分。
- 管理後台維持獨立管理 Session，不能與會員 Session 共用。
- 會員資料與方案權限全部由後端檢查。

## 5. 方案開通流程

管理員按「確認開通」後，後端以單一交易完成：

1. 建立付款紀錄。
2. 建立或更新會員方案。
3. 設定 `status=active`、`started_at`、`expires_at`。
4. 寫入管理操作紀錄。
5. 設定該 LINE UID 對應的會員版 Rich Menu。
6. 發送「會員開通成功」Flex 卡。

會員卡主按鈕：

- 立即登入會員中心

次按鈕：

- 開始 30 天挑戰

若 LINE 發送或 Rich Menu 切換失敗，不回滾會員開通；改寫入待重試紀錄並在後台顯示。

## 6. 雙版本 Rich Menu

### 免費版 2×3

- 拍照記飲食
- 今日還能吃多少
- 免費建檔
- 30 天挑戰介紹
- 查看方案
- 使用說明

### 會員版 2×3

- 拍照記飲食
- 今日儀表板
- 會員中心
- 我的目標
- 30 天挑戰／勳章
- 歷史紀錄與設定

切換規則：

- 註冊後預設免費版。
- 399／799 開通後立即切會員版。
- 到期、暫停或降級後切回免費版。
- 299 七天菜單為單次商品，不自動切成會員版。

## 7. 歡迎與通知卡

### 新好友歡迎卡

沿用既有 UI/UX 視覺與品牌風格，按鈕：

- 開始免費體驗
- 看使用教學
- 查看方案

### 會員開通卡

顯示：

- 會員名稱
- 開通方案
- 生效日與到期日
- 每日圖片／文字／語音額度

按鈕：

- 立即登入會員中心
- 開始 30 天挑戰

### 到期提醒

- 到期前 7 天、3 天、1 天提醒
- 到期後切回免費版
- 保留歷史資料與帳號

## 8. 資料模型補強

需要至少包含：

- `member_sessions`
- `membership_grants`
- `payments`
- `admin_operation_logs`
- `line_rich_menu_bindings`
- `line_delivery_jobs`
- `member_preferences`
- `member_achievements`

方案狀態：

- `free`
- `active`
- `paused`
- `expired`

## 9. API 邊界

### 會員端

- `POST /api/auth/line/callback`
- `POST /api/auth/logout`
- `GET /api/member/summary`
- `GET /api/member/meals`
- `PATCH /api/member/profile`
- `PATCH /api/member/preferences`
- `GET /api/member/challenge`
- `GET /api/member/knowledge`

### 管理端

- `POST /api/admin/session`
- `GET /api/admin/members`
- `POST /api/admin/members/:id/activate`
- `POST /api/admin/members/:id/pause`
- `POST /api/admin/members/:id/resume`
- `POST /api/admin/members/:id/extend`
- `POST /api/admin/members/:id/downgrade`

### LINE

- `POST /api/line/webhook`
- Rich Menu 建立與綁定服務
- Flex 歡迎卡與會員卡發送服務

## 10. 錯誤處理

- LINE 登入失敗：顯示重新登入按鈕，不顯示 UID。
- 找不到會員：建立免費會員資料後導向建檔。
- 後台開通重複提交：用 idempotency key 防止重複付款紀錄。
- Rich Menu／Flex 發送失敗：寫入重試佇列並在後台顯示。
- 方案到期：每次會員請求即時檢查，另以每日排程補掃。
- 會員中心 API 錯誤：顯示可理解中文，不暴露技術細節。

## 11. 測試與驗收

至少驗證：

- 官網會員登入入口在手機與桌機可見。
- 一般瀏覽器與 LINE 內登入都能建立安全 Session。
- 修改網址不能查看他人資料。
- 免費會員看到正確鎖定狀態。
- 後台可用表單開通四種付費方案。
- 開通後會員中心、額度、Flex 卡與 Rich Menu 同步更新。
- 暫停、到期後切回免費版。
- 299 菜單不會誤切會員版。
- 管理後台未登入不得讀取會員資料。
- Vercel Production Build 通過。
- 正式網址、LINE Webhook、會員登入與主要按鈕實機驗收。

## 12. 部署策略

- 所有修改直接提交至 GitHub `main`。
- Vercel 由 `main` 自動部署 Production。
- 部署前執行 TypeScript、單元測試與 Build。
- 部署後驗收正式網址與 LINE 流程。
- LINE Rich Menu 與歡迎卡屬 LINE API 發布步驟，不能只以網站部署成功判定完成。
