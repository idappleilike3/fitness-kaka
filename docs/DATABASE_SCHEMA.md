# DATABASE_SCHEMA.md — Supabase 資料庫規格

**版本：** 0.1（2026-07-23）  
**引擎：** PostgreSQL（Supabase）  
**慣例：**  
- PK 預設 `uuid` + `gen_random_uuid()`  
- 時間：`timestamptz`，`created_at` 預設 `now()`，`updated_at` 用 trigger 更新  
- 金額：整數 **分** 或 **元**？→ Phase 1 用 **TWD 整數元**（`amount_twd int`）  
- 軟刪：`deleted_at timestamptz null`

以下「允許空」= NULL 是否允許。實作以 `supabase/migrations/001_init.sql` 為準。

---

## 1. plans（方案定義）

| 欄位 | 型態 | PK/FK | 預設 | 空 | 說明 |
|------|------|-------|------|-----|------|
| id | text | PK | — | NO | `free` / `plan_399` / `plan_799` |
| name | text | | | NO | 顯示名稱 |
| price_twd | int | | 0 | NO | 0／399／799 |
| duration_days | int | | 0 | NO | 免費 0；付費 30 |
| daily_image_quota | int | | | NO | |
| daily_text_quota | int | | | NO | |
| daily_voice_quota | int | | 0 | NO | |
| is_active | boolean | | true | NO | |
| created_at | timestamptz | | now() | NO | |
| updated_at | timestamptz | | now() | NO | |

索引：`is_active`

---

## 2. members

| 欄位 | 型態 | PK/FK | 預設 | 空 | 說明 |
|------|------|-------|------|-----|------|
| id | uuid | PK | gen_random_uuid() | NO | |
| line_user_id | text | UNIQUE | | NO | LINE userId |
| display_name | text | | | YES | |
| status | text | | `active` | NO | active／deleted |
| consent_at | timestamptz | | | YES | 同意條款時間 |
| created_at | timestamptz | | now() | NO | |
| updated_at | timestamptz | | now() | NO | |
| deleted_at | timestamptz | | | YES | |

索引：`line_user_id` UNIQUE；`status`

---

## 3. member_profiles

| 欄位 | 型態 | PK/FK | 預設 | 空 | 說明 |
|------|------|-------|------|-----|------|
| id | uuid | PK | gen_random_uuid() | NO | |
| member_id | uuid | FK→members.id UNIQUE | | NO | |
| sex | text | | | YES | male／female／other |
| age | int | | | YES | |
| height_cm | numeric(5,1) | | | YES | |
| weight_kg | numeric(5,1) | | | YES | |
| target_weight_kg | numeric(5,1) | | | YES | |
| activity_level | text | | | YES | sedentary／light／moderate／high |
| workout_frequency | int | | | YES | 每週次數 |
| goal_type | text | | | YES | cut／bulk／maintain |
| bmi | numeric(5,2) | | | YES | 快取 |
| bmr | numeric(8,2) | | | YES | |
| tdee | numeric(8,2) | | | YES | |
| calorie_target | int | | | YES | |
| protein_g_target | int | | | YES | |
| carb_g_target | int | | | YES | |
| fat_g_target | int | | | YES | |
| profile_completed_at | timestamptz | | | YES | |
| created_at | timestamptz | | now() | NO | |
| updated_at | timestamptz | | now() | NO | |

索引：`member_id` UNIQUE

---

## 4. subscriptions

| 欄位 | 型態 | PK/FK | 預設 | 空 | 說明 |
|------|------|-------|------|-----|------|
| id | uuid | PK | gen_random_uuid() | NO | |
| member_id | uuid | FK→members | | NO | |
| plan_id | text | FK→plans | | NO | |
| status | text | | `active` | NO | active／expired／cancelled |
| starts_at | timestamptz | | now() | NO | |
| expires_at | timestamptz | | | YES | 免費可 null=永久免費檔 |
| source_order_id | uuid | FK→payment_orders | | YES | |
| created_at | timestamptz | | now() | NO | |
| updated_at | timestamptz | | now() | NO | |

索引：`(member_id, status)`；`expires_at`  
業務：取「目前有效」= status active 且 (expires_at is null or expires_at > now())，付費檔優先於 free。

---

## 5. payment_orders

| 欄位 | 型態 | PK/FK | 預設 | 空 | 說明 |
|------|------|-------|------|-----|------|
| id | uuid | PK | gen_random_uuid() | NO | |
| merchant_order_no | text | UNIQUE | | NO | 藍新訂單編號，不可重複 |
| member_id | uuid | FK→members | | NO | |
| plan_id | text | FK→plans | | NO | |
| amount_twd | int | | | NO | |
| status | text | | `pending` | NO | pending／paid／failed／refunded |
| paid_at | timestamptz | | | YES | |
| newebpay_trade_no | text | | | YES | |
| raw_return_payload | jsonb | | | YES | 可截斷／脫敏 |
| created_at | timestamptz | | now() | NO | |
| updated_at | timestamptz | | now() | NO | |

索引：`merchant_order_no` UNIQUE；`(member_id, created_at desc)`；`status`

---

## 6. payment_callbacks

| 欄位 | 型態 | PK/FK | 預設 | 空 | 說明 |
|------|------|-------|------|-----|------|
| id | uuid | PK | gen_random_uuid() | NO | |
| payment_order_id | uuid | FK→payment_orders | | YES | |
| merchant_order_no | text | | | NO | |
| callback_type | text | | | NO | notify／return |
| verify_ok | boolean | | false | NO | |
| is_duplicate | boolean | | false | NO | 重複通知 |
| payload | jsonb | | | NO | |
| created_at | timestamptz | | now() | NO | |

索引：`(merchant_order_no, callback_type, created_at)`  
幂等：同一 order 已 paid 再次 Notify → 記 callback、`is_duplicate=true`、不重複加天數。

---

## 7. pending_meal_analyses（確認前暫存）

| 欄位 | 型態 | PK/FK | 預設 | 空 | 說明 |
|------|------|-------|------|-----|------|
| id | uuid | PK | gen_random_uuid() | NO | |
| member_id | uuid | FK | | NO | |
| source | text | | | NO | image／text／voice |
| status | text | | `pending` | NO | pending／confirmed／discarded／expired |
| input_text | text | | | YES | |
| image_hash | text | | | YES | 防重複計費 |
| result_json | jsonb | | | NO | 食物列與營養 |
| total_kcal | int | | | YES | |
| protein_g | numeric | | | YES | |
| carb_g | numeric | | | YES | |
| fat_g | numeric | | | YES | |
| expires_at | timestamptz | | | NO | 如 +24h |
| created_at | timestamptz | | now() | NO | |
| updated_at | timestamptz | | now() | NO | |

索引：`(member_id, status, created_at desc)`；`image_hash`

---

## 8. meal_records

| 欄位 | 型態 | PK/FK | 預設 | 空 | 說明 |
|------|------|-------|------|-----|------|
| id | uuid | PK | gen_random_uuid() | NO | |
| member_id | uuid | FK | | NO | |
| pending_id | uuid | FK→pending | | YES | |
| meal_type | text | | `other` | NO | breakfast／lunch／dinner／snack／other |
| recorded_on | date | | | NO | 使用者時區日期（預設 Asia/Taipei） |
| total_kcal | int | | 0 | NO | |
| protein_g | numeric(8,2) | | 0 | NO | |
| carb_g | numeric(8,2) | | 0 | NO | |
| fat_g | numeric(8,2) | | 0 | NO | |
| note | text | | | YES | |
| created_at | timestamptz | | now() | NO | |
| updated_at | timestamptz | | now() | NO | |

索引：`(member_id, recorded_on)`

---

## 9. meal_items

| 欄位 | 型態 | PK/FK | 預設 | 空 | 說明 |
|------|------|-------|------|-----|------|
| id | uuid | PK | gen_random_uuid() | NO | |
| meal_record_id | uuid | FK→meal_records | | NO | |
| name | text | | | NO | |
| portion_text | text | | | YES | 約 1 碗 |
| kcal | int | | 0 | NO | |
| protein_g | numeric(8,2) | | 0 | NO | |
| carb_g | numeric(8,2) | | 0 | NO | |
| fat_g | numeric(8,2) | | 0 | NO | |
| sort_order | int | | 0 | NO | |
| created_at | timestamptz | | now() | NO | |

索引：`meal_record_id`

---

## 10. daily_nutrition_summary

| 欄位 | 型態 | PK/FK | 預設 | 空 | 說明 |
|------|------|-------|------|-----|------|
| id | uuid | PK | gen_random_uuid() | NO | |
| member_id | uuid | FK | | NO | |
| summary_date | date | | | NO | |
| total_kcal | int | | 0 | NO | |
| protein_g | numeric(8,2) | | 0 | NO | |
| carb_g | numeric(8,2) | | 0 | NO | |
| fat_g | numeric(8,2) | | 0 | NO | |
| water_ml | int | | 0 | NO | P1 可恒 0 |
| exercise_kcal | int | | 0 | NO | P1 可恒 0 |
| created_at | timestamptz | | now() | NO | |
| updated_at | timestamptz | | now() | NO | |

唯一索引：`(member_id, summary_date)`

---

## 11. weight_records

| 欄位 | 型態 | PK/FK | 預設 | 空 | 說明 |
|------|------|-------|------|-----|------|
| id | uuid | PK | gen_random_uuid() | NO | |
| member_id | uuid | FK | | NO | |
| recorded_on | date | | | NO | |
| weight_kg | numeric(5,1) | | | NO | |
| created_at | timestamptz | | now() | NO | |

索引：`(member_id, recorded_on)`  
P1：可只在改 profile 時寫一筆。

---

## 12. workout_plans / workout_logs

Phase 1 **建表預留**，API 不開放生成。

**workout_plans：** id, member_id, title, plan_json, week_start, created_at, updated_at  
**workout_logs：** id, member_id, plan_id null, logged_on, exercises_json, created_at  

---

## 13. usage_quotas

| 欄位 | 型態 | PK/FK | 預設 | 空 | 說明 |
|------|------|-------|------|-----|------|
| id | uuid | PK | gen_random_uuid() | NO | |
| member_id | uuid | FK | | NO | |
| quota_date | date | | | NO | Asia/Taipei |
| image_used | int | | 0 | NO | |
| text_used | int | | 0 | NO | |
| voice_used | int | | 0 | NO | |
| created_at | timestamptz | | now() | NO | |
| updated_at | timestamptz | | now() | NO | |

唯一：`(member_id, quota_date)`

---

## 14. api_usage_logs

| 欄位 | 型態 | PK/FK | 預設 | 空 | 說明 |
|------|------|-------|------|-----|------|
| id | uuid | PK | gen_random_uuid() | NO | |
| member_id | uuid | FK | | YES | |
| provider | text | | `openai` | NO | |
| model | text | | | NO | |
| purpose | text | | | NO | vision_meal／text_meal／qa／whisper |
| prompt_tokens | int | | 0 | NO | |
| completion_tokens | int | | 0 | NO | |
| est_cost_usd | numeric(10,6) | | | YES | |
| request_id | text | | | YES | |
| created_at | timestamptz | | now() | NO | |

索引：`(member_id, created_at desc)`；`(purpose, created_at)`

---

## 15. line_events

| 欄位 | 型態 | PK/FK | 預設 | 空 | 說明 |
|------|------|-------|------|-----|------|
| id | uuid | PK | gen_random_uuid() | NO | |
| event_key | text | UNIQUE | | NO | LINE webhook event dedupe key |
| member_id | uuid | FK | | YES | |
| event_type | text | | | NO | |
| payload_summary | jsonb | | | YES | 脫敏摘要 |
| created_at | timestamptz | | now() | NO | |

---

## 16. system_logs

| 欄位 | 型態 | PK/FK | 預設 | 空 | 說明 |
|------|------|-------|------|-----|------|
| id | uuid | PK | gen_random_uuid() | NO | |
| level | text | | `info` | NO | info／warn／error |
| source | text | | | NO | |
| message | text | | | NO | |
| meta | jsonb | | | YES | 禁止存 API Key |
| created_at | timestamptz | | now() | NO | |

索引：`(level, created_at desc)`

---

## RLS 方針（P1）

- Service role 僅在 Vercel server 使用  
- LIFF 若用 anon key：僅能讀自己的 member（經 LINE Login token 換 session 後）  
- P1 可採「全部經後端 API」，前端不直連敏感表（較單純，建議）  
