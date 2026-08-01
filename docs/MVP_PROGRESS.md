# MVP_PROGRESS.md — 健身卡卡進度

**最後更新：** 2026-07-23（Phase 2：語音 + 799 上架）

## 總體狀態

| 階段 | 狀態 |
|------|------|
| 需求審查與拍板 | ✅ 完成 |
| 正式規格文件 | ✅ 通過 |
| 實作計畫 | ✅ 完成 |
| Phase 1 Coding | ✅ 核心程式已落地 |
| Phase 2 語音紀錄 | ✅ Whisper → 飲食分析 → 確認後儲存；額度分開扣 |
| Phase 2 上架 799 | ✅ `plan_399`／`plan_799` 皆可建單付款 |
| 測試上線 | 🔄 Vercel Production；待填環境變數後手動驗收語音／付款 |
| 正式收費 | ⏳ 未開始 |

**正式 Production URL：** https://fitness-kaka.vercel.app  
（已設定 `PUBLIC_BASE_URL`；其餘 LINE／OpenAI／Supabase／NewebPay 密鑰請在 Vercel Dashboard 填入）

---

## 已確認項目

- 產品名：健身卡卡教練  
- 獨立 repo：`fitness-kaka`  
- Phase 1／2／3 範圍（驗證／正式／爆款）  
- 影片：只回提示（不算熱量）；P3 才做 Form Check  
- 免費體驗每天餐點分析 5 次（圖片／文字共用）／0 語音；聊天、問問題與貼圖不扣
- 付費方案圖片／文字／語音額度分開扣；OpenAI 同一 API Key（含 Whisper）
- **語音已開**：免費 CTA 升級；399＝5／天；799＝15／天；最長 60 秒  
- **399 與 799 皆可賣**（一次付 30 天）  
- 確認後才存飲食；Notify 為付款權威  

## 尚未確認／待你提供（不擋寫碼，但擋正式收款）

- [ ] 公司／行號與藍新申請身分  
- [ ] LINE OA、OpenAI、Supabase、Vercel 帳號  
- [ ] 正式網域名稱  
- [x] `SUPPORT_EMAIL`（刪除帳號／客服；預設 `gymcoachkaka@gmail.com`） 

## 建議拍板但可微調

- 蛋白質係數 1.8 g/kg（減脂／增肌）  
- 減脂熱量 TDEE×0.8  
- 扣額度時機＝分析流程開始時（含重新辨識；語音扣語音額度）  
- 399 語音 5 次／天、799 語音 15 次／天  

---

## Phase 1 開發順序（規格通過後）

1. Repo 基礎（Next.js、`.env.example`、CI 預留）  
2. Supabase migration  
3. LINE webhook 驗簽 + 歡迎 + 建會員  
4. 建檔對話 + BMR／TDEE  
5. 文字飲食 pending → 確認寫入  
6. 圖片飲食 Vision → 確認寫入  
7. 今日熱量查詢  
8. 額度系統  
9. 藍新建單／Notify／+30 天  
10. LIFF 總覽 + 條款  
11. 安全測試與試營運  

## Phase 2（本變更已完成部分）

1. ✅ 語音紀錄（Whisper + 確認流程 + 語音額度）  
2. ✅ 上架 plan_799；LIFF／升級文案顯示雙方案  
3. ⏳ LIFF 7／30 天圖表、體重趨勢、定期定額、模板健身建議（見 PHASE2_PLAN）

---

## 變更紀錄

| 日期 | 變更 |
|------|------|
| 2026-07-23 | 初版進度檔；規格撰寫，未 Coding |
| 2026-07-23 | 新增 `PHASE2_PLAN.md`（語音／圖表／定期定額；釐清非每日自動 AI） |
| 2026-07-23 | 規格通過；新增 Phase 1 實作計畫 |
| 2026-07-23 | Vercel Production 部署成功：https://fitness-kaka.vercel.app |
| 2026-07-23 | Phase 2：語音飲食紀錄上線 + plan_799 可購買 |
