# DATABASE_SCHEMA_GROWTH.md — 成長功能資料模型

## 1. 對齊既有模型

本規格以既有 `members` 為唯一使用者主檔，絕不新增或複製 `users` 表。既有關聯如下：

- 身分與 LINE：`members`
- 健康目標：`member_profiles`
- 方案資格：`subscriptions`、`plans`
- 餐點與趨勢：`meal_records`、`daily_nutrition_summary`、`weight_records`
- 支付：`payment_orders`
- 事件去重：`line_events`

所有成長資料的 `member_id` 都外鍵至 `members.id`，使用既有 UUID、`timestamptz`、`set_updated_at()` trigger 慣例。挑戰商業日期一律由應用層以 Asia/Taipei 產生 `date`。

## 2. referrals 與 invite_codes

### invite_codes

| 欄位 | 型態 | 約束／說明 |
|---|---|---|
| id | uuid | PK，預設 `gen_random_uuid()` |
| inviter_member_id | uuid | FK `members.id`，不可空 |
| code | text | UNIQUE，不可空，使用不可猜測短碼 |
| source | text | `profile`／`share_card`／`campaign` |
| share_card_id | uuid | FK `share_cards.id`，可空 |
| status | text | `active`／`paused`／`revoked` |
| max_uses | integer | 可空，空值代表由風控規則決定 |
| expires_at | timestamptz | 可空 |
| created_at | timestamptz | 預設 `now()` |
| updated_at | timestamptz | 預設 `now()` |

索引：`code UNIQUE`、`(inviter_member_id, status)`、`(share_card_id)`  
規則：每位邀請人可有多張分享卡的代碼，但邀請關係一經成立不可由前台改綁。

### referrals

| 欄位 | 型態 | 約束／說明 |
|---|---|---|
| id | uuid | PK |
| invite_code_id | uuid | FK `invite_codes.id` |
| inviter_member_id | uuid | FK `members.id`，寫入時與代碼擁有人一致 |
| invited_member_id | uuid | FK `members.id`，UNIQUE，一位受邀者只一筆 |
| status | text | `clicked`／`joined`／`qualified`／`rejected`／`rewarded` |
| clicked_at | timestamptz | 可空 |
| joined_at | timestamptz | 可空 |
| qualified_at | timestamptz | 完成診斷＋首筆確認餐點後寫入 |
| rejection_reason | text | 風控或規則拒絕原因，僅內部 |
| metadata | jsonb | 脫敏歸因資訊，不存原始敏感資料 |
| created_at | timestamptz | 預設 `now()` |
| updated_at | timestamptz | 預設 `now()` |

索引：`invited_member_id UNIQUE`、`(inviter_member_id, status)`、`(invite_code_id, created_at)`  
檢查：`inviter_member_id <> invited_member_id`。

## 3. share_cards

| 欄位 | 型態 | 約束／說明 |
|---|---|---|
| id | uuid | PK |
| member_id | uuid | FK `members.id` |
| card_type | text | `diagnosis`／`meal`／`streak`／`report`／`badge` |
| source_entity_type | text | 來源類型，供稽核 |
| source_entity_id | uuid | 來源 ID，可空 |
| payload | jsonb | 已過濾的展示資料，禁止精確體重、原始照片與 LINE ID |
| privacy_mode | text | `anonymous` 預設／`nickname` |
| image_url | text | 可空，儲存產物 URL，不存原圖 |
| status | text | `draft`／`published`／`revoked`／`expired` |
| published_at | timestamptz | 可空 |
| expires_at | timestamptz | 可空 |
| created_at | timestamptz | 預設 `now()` |
| updated_at | timestamptz | 預設 `now()` |

索引：`(member_id, card_type, created_at DESC)`、`(status, expires_at)`。

## 4. missions 與 mission_progress

### missions

任務定義為系統模板，避免每位會員複製一份可變規則。

| 欄位 | 型態 | 約束／說明 |
|---|---|---|
| id | uuid | PK |
| code | text | UNIQUE，例如 `record_one_meal` |
| title | text | 任務名稱 |
| description | text | 顯示說明 |
| mission_type | text | `meal_record`／`protein_choice`／`daily_summary_view`／`weight_log`／`meal_plan` |
| verification_rule | jsonb | 完成需對應的可驗證事件條件 |
| xp_reward | integer | 非負整數 |
| badge_code | text | 可空，完成時評估的徽章 |
| is_active | boolean | 預設 true |
| created_at | timestamptz | 預設 `now()` |
| updated_at | timestamptz | 預設 `now()` |

### mission_progress

| 欄位 | 型態 | 約束／說明 |
|---|---|---|
| id | uuid | PK |
| member_id | uuid | FK `members.id` |
| mission_id | uuid | FK `missions.id` |
| challenge_day | integer | 1–30 |
| assigned_on | date | Asia/Taipei 日期 |
| status | text | `assigned`／`completed`／`skipped`／`expired` |
| progress_value | numeric | 預設 0 |
| target_value | numeric | 預設 1 |
| completed_at | timestamptz | 可空 |
| evidence_type | text | 例如 `meal_record` |
| evidence_id | uuid | 可空，對應可驗證來源 |
| created_at | timestamptz | 預設 `now()` |
| updated_at | timestamptz | 預設 `now()` |

唯一約束：`(member_id, mission_id, assigned_on)`  
索引：`(member_id, assigned_on)`、`(status, assigned_on)`。完成交易必須鎖定此列，避免 webhook 重送導致 XP 重複。

## 5. user_levels、badges 與 rewards

### user_levels

每位會員一列，儲存可由事件計算的快取狀態。

| 欄位 | 型態 | 約束／說明 |
|---|---|---|
| member_id | uuid | PK、FK `members.id` |
| level_code | text | `starter`／`steady`／`habit`／`challenger` |
| total_xp | integer | 預設 0、非負 |
| current_streak_days | integer | 預設 0、非負 |
| longest_streak_days | integer | 預設 0、非負 |
| challenge_started_on | date | 可空 |
| challenge_day | integer | 0–30 |
| updated_at | timestamptz | 預設 `now()` |

### badges

| 欄位 | 型態 | 約束／說明 |
|---|---|---|
| id | uuid | PK |
| code | text | UNIQUE |
| name | text | 顯示名稱 |
| description | text | 解鎖說明 |
| criteria | jsonb | 可驗證規則 |
| shareable | boolean | 預設 true |
| is_active | boolean | 預設 true |
| created_at | timestamptz | 預設 `now()` |

需另設 `member_badges` 關聯表，避免在會員列塞 JSON：
`member_id`、`badge_id`、`earned_at`、`source_type`、`source_id`，並對 `(member_id, badge_id)` 設 UNIQUE。

### rewards

獎勵帳本只記可撤銷、可稽核的授與，不直接變更額度計數。

| 欄位 | 型態 | 約束／說明 |
|---|---|---|
| id | uuid | PK |
| member_id | uuid | FK `members.id` |
| referral_id | uuid | FK `referrals.id`，可空 |
| reward_type | text | `streak_protection`／`bonus_xp`／`future_credit` |
| status | text | `pending`／`granted`／`redeemed`／`revoked`／`expired` |
| quantity | integer | 正整數 |
| available_from | timestamptz | 可空 |
| expires_at | timestamptz | 可空 |
| redeemed_at | timestamptz | 可空 |
| reason | text | 稽核原因 |
| created_at | timestamptz | 預設 `now()` |
| updated_at | timestamptz | 預設 `now()` |

索引：`(member_id, status, expires_at)`、`(referral_id, reward_type)`。邀請獎勵應有唯一性約束，避免同一 referral 對同一角色重複授與。

## 6. 建議補充表

本 PRD 的挑戰實例與報告需要下列兩張表，否則 30 天週期與報告快照無法明確追溯：

- `member_challenges`：`id`、`member_id`、`status`、`started_on`、`ends_on`、`completed_at`、`created_at`、`updated_at`，對進行中挑戰建立部分唯一索引
- `challenge_reports`：`id`、`challenge_id`、`member_id`、`report_day`（7／14／30）、`data_start_on`、`data_end_on`、`data_snapshot`、`ai_summary`、`plan_visibility`、`generated_at`

診斷可先以 `challenge_reports` 的 `report_day=0` 或新增 `fat_loss_diagnoses` 快照表實作。若診斷需要獨立歷史與版本比對，採後者：`member_id`、`challenge_id`、`input_snapshot`、`confidence`、`hypotheses`、`next_action`、`generated_at`。

## 7. RLS、隱私與資料保留

- 會員中心透過後端 API 存取；service role 僅在伺服器端
- 使用者只可讀寫自己的挑戰、分享卡與獎勵，絕不可查詢他人邀請或排行榜資料
- 分享卡 payload 在寫入前去識別化；撤銷時立即停止公開連結
- 風控原因、裝置雜湊與內部歸因 metadata 不在前端回傳
- 外鍵刪除策略需與既有 `members` 帳號刪除／匿名化流程一致

等待確認後再開發
