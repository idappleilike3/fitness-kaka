# 健身卡卡 v10 商業會員系統 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 建立安全的 LINE 會員登入、可依方案解鎖的會員中心、可視化後台開通流程、雙版本 Rich Menu 與會員通知卡，並由 GitHub `main` 自動部署到 Vercel Production。

**Architecture:** 保留現有 Next.js App Router、Supabase 與 LINE Messaging API 架構。新增伺服器端會員 Session、集中式方案權限服務與 LINE Rich Menu／Flex 發送服務；會員中心 API 僅從 Session 取得 LINE UID，管理端則維持獨立管理 Session。後台方案開通先完成資料交易，再非同步處理 Rich Menu 綁定與 Flex 發送，失敗寫入重試工作。

**Tech Stack:** Next.js 15 App Router、TypeScript、React 19、Supabase Postgres、LINE Login／LIFF、LINE Messaging API、Vitest、Vercel。

## Global Constraints

- 所有已註冊使用者都可用 LINE 身分登入會員中心。
- 免費會員可查看基礎資料與升級入口；付費功能依方案解鎖。
- 不再信任網址中的 `lineUserId`。
- 會員 Session Cookie 必須為 HttpOnly、Secure、SameSite=Lax。
- 管理員 Session 與會員 Session 必須完全分離。
- 299 七天菜單是單次商品，不得切換會員版 Rich Menu。
- 方案開通成功不因 LINE 發送失敗而回滾；失敗寫入重試工作。
- 所有修改提交至 GitHub `main`，由 Vercel 自動部署 Production。

---

## File Structure

- `src/lib/auth/member-session.ts`：建立、驗證與清除會員 Session。
- `src/lib/auth/line-token.ts`：驗證 LINE access token 並取得 LINE UID。
- `src/lib/membership/access.ts`：方案狀態與功能權限判斷。
- `src/lib/membership/activate.ts`：管理員開通、暫停、恢復、延長、降級的交易流程。
- `src/lib/line/rich-menu.ts`：免費／會員 Rich Menu 建立與使用者綁定。
- `src/lib/line/flex-cards.ts`：歡迎卡、會員開通卡、到期提醒卡。
- `src/lib/line/delivery-jobs.ts`：LINE 發送失敗重試工作。
- `src/app/member-login/page.tsx`：會員登入頁。
- `src/app/member/page.tsx`：會員中心 Dashboard。
- `src/app/api/auth/line/callback/route.ts`：LINE token 驗證與 Session 建立。
- `src/app/api/auth/logout/route.ts`：會員登出。
- `src/app/api/member/*`：會員資料 API。
- `src/app/admin/page.tsx`：後台表單式方案開通 UI。
- `src/app/api/admin/members/[id]/*`：管理員會員操作 API。
- `supabase/migrations/002_membership_v10.sql`：Session、Rich Menu 綁定、重試工作、偏好與成就資料表。
- `tests/`：登入、權限、開通、Rich Menu 與 API 測試。

---

### Task 1: 會員資料模型與方案權限核心

**Files:**
- Create: `supabase/migrations/002_membership_v10.sql`
- Create: `src/lib/membership/access.ts`
- Test: `tests/membership/access.test.ts`

**Interfaces:**
- Produces: `resolveMembershipState(planId, status, expiresAt, now)`
- Produces: `canAccessFeature(state, feature)`
- Produces: `MembershipFeature` union type

- [ ] **Step 1: Write the failing tests**

```ts
import { describe, expect, it } from "vitest";
import { canAccessFeature, resolveMembershipState } from "@/lib/membership/access";

describe("membership access", () => {
  it("treats expired paid plans as free", () => {
    const state = resolveMembershipState("plan_399", "active", "2026-01-01T00:00:00Z", new Date("2026-08-02T00:00:00Z"));
    expect(state.tier).toBe("free");
  });

  it("unlocks history for 399 but not advanced coaching", () => {
    const state = resolveMembershipState("plan_399", "active", "2026-09-01T00:00:00Z", new Date("2026-08-02T00:00:00Z"));
    expect(canAccessFeature(state, "history")).toBe(true);
    expect(canAccessFeature(state, "advanced_coaching")).toBe(false);
  });

  it("does not treat menu_299 as membership", () => {
    const state = resolveMembershipState("menu_299", "active", null, new Date());
    expect(state.tier).toBe("free");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/membership/access.test.ts`
Expected: FAIL because `src/lib/membership/access.ts` does not exist.

- [ ] **Step 3: Implement the permission service and migration**

Implement exact tiers `free | plus | pro`, feature keys `history | voice | challenge | achievements | weekly_report | advanced_coaching | advanced_reminders`, and expiry normalization. Migration creates `member_sessions`, `line_rich_menu_bindings`, `line_delivery_jobs`, `member_preferences`, `member_achievements` with indexes on `member_id`, `line_user_id`, `status`, and `next_attempt_at`.

- [ ] **Step 4: Run tests**

Run: `npm test -- tests/membership/access.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/002_membership_v10.sql src/lib/membership/access.ts tests/membership/access.test.ts
git commit -m "feat: add v10 membership access model"
```

---

### Task 2: 安全 LINE 登入與會員 Session

**Files:**
- Create: `src/lib/auth/line-token.ts`
- Create: `src/lib/auth/member-session.ts`
- Create: `src/app/api/auth/line/callback/route.ts`
- Create: `src/app/api/auth/logout/route.ts`
- Test: `tests/auth/member-session.test.ts`
- Test: `tests/api/auth-line-callback.test.ts`

**Interfaces:**
- Consumes: Supabase service client and `members.line_user_id`
- Produces: `verifyLineAccessToken(accessToken): Promise<{ lineUserId: string; displayName?: string }>`
- Produces: `createMemberSession(memberId): Promise<string>`
- Produces: `requireMemberSession(): Promise<{ memberId: string; lineUserId: string }>`

- [ ] **Step 1: Write failing tests for token verification and cookie security**

Test that invalid tokens return 401, valid mocked LINE profile creates a free member if absent, and response sets cookie with `HttpOnly`, `Secure`, and `SameSite=Lax`.

- [ ] **Step 2: Run tests to verify failure**

Run: `npm test -- tests/auth/member-session.test.ts tests/api/auth-line-callback.test.ts`
Expected: FAIL because routes and helpers do not exist.

- [ ] **Step 3: Implement LINE token verification**

Use official LINE profile endpoint with `Authorization: Bearer <accessToken>`. Never accept `lineUserId` from request body. Validate missing, malformed, expired, and revoked token responses and return Chinese user-safe errors.

- [ ] **Step 4: Implement hashed server Session**

Generate 32-byte random token, store SHA-256 hash in `member_sessions`, set raw token in `fitness_kaka_member` cookie, update `last_seen_at`, and reject expired or revoked sessions.

- [ ] **Step 5: Implement callback and logout routes**

`POST /api/auth/line/callback` accepts `{ accessToken }`; `POST /api/auth/logout` revokes current session and clears cookie.

- [ ] **Step 6: Run tests**

Run: `npm test -- tests/auth/member-session.test.ts tests/api/auth-line-callback.test.ts`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/lib/auth src/app/api/auth tests/auth tests/api/auth-line-callback.test.ts
git commit -m "feat: add secure LINE member sessions"
```

---

### Task 3: 會員登入頁與官網入口

**Files:**
- Create: `src/app/member-login/page.tsx`
- Create: `src/app/member-login/member-login.module.css`
- Modify: `src/app/page.tsx`
- Modify: `src/app/page.module.css`
- Test: `tests/ui/member-login.test.tsx`

**Interfaces:**
- Consumes: `POST /api/auth/line/callback`
- Produces: `/member-login` and `/member` navigation flow

- [ ] **Step 1: Write UI tests**

Assert desktop and mobile navigation contain `會員登入`; login page has one primary `使用 LINE 登入會員中心` button, no password fields, and a clear retry error state.

- [ ] **Step 2: Run tests to verify failure**

Run: `npm test -- tests/ui/member-login.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implement member login page**

Initialize LIFF when available; otherwise start LINE Login OAuth. After receiving an access token, post it to callback API and navigate to `/member`. Do not render or log UID.

- [ ] **Step 4: Add homepage navigation entry**

Add `會員登入` next to `加入 LINE`, preserving sales CTA hierarchy and responsive mobile layout.

- [ ] **Step 5: Run tests and build**

Run: `npm test -- tests/ui/member-login.test.tsx && npm run build`
Expected: PASS and build succeeds.

- [ ] **Step 6: Commit**

```bash
git add src/app/member-login src/app/page.tsx src/app/page.module.css tests/ui/member-login.test.tsx
git commit -m "feat: add member login entry"
```

---

### Task 4: 會員中心 API 與 Dashboard

**Files:**
- Create: `src/app/api/member/summary/route.ts`
- Create: `src/app/api/member/meals/route.ts`
- Create: `src/app/api/member/profile/route.ts`
- Create: `src/app/api/member/preferences/route.ts`
- Create: `src/app/api/member/challenge/route.ts`
- Create: `src/app/api/member/knowledge/route.ts`
- Create: `src/app/member/page.tsx`
- Create: `src/app/member/member.module.css`
- Test: `tests/api/member-access.test.ts`
- Test: `tests/ui/member-dashboard.test.tsx`

**Interfaces:**
- Consumes: `requireMemberSession`, `resolveMembershipState`, `canAccessFeature`
- Produces: Session-only member APIs and dashboard cards

- [ ] **Step 1: Write failing API authorization tests**

Verify no cookie returns 401, query-string UID is ignored, free members receive locked feature metadata, and 399／799 receive correct feature flags.

- [ ] **Step 2: Run tests to verify failure**

Run: `npm test -- tests/api/member-access.test.ts tests/ui/member-dashboard.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implement member APIs**

All APIs load member ID only from Session. Summary returns plan, expiry, quotas, calorie/protein/water progress, health score, challenge day, and feature flags. Restricted endpoints return 403 with `{ code: "FEATURE_LOCKED", requiredTier }`.

- [ ] **Step 4: Implement dashboard UI**

Render greeting, plan badge, remaining calories, protein, water, mission, health score, challenge progress, and six cards: 記錄飲食、今日／歷史紀錄、我的目標、30 天挑戰與勳章、會員資料、設定與知識中心. Free users see branded lock overlays and upgrade CTA.

- [ ] **Step 5: Run tests and build**

Run: `npm test -- tests/api/member-access.test.ts tests/ui/member-dashboard.test.tsx && npm run build`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/app/api/member src/app/member tests/api/member-access.test.ts tests/ui/member-dashboard.test.tsx
git commit -m "feat: add membership dashboard and protected APIs"
```

---

### Task 5: 後台表單式方案開通與冪等交易

**Files:**
- Create: `src/lib/membership/activate.ts`
- Create: `src/app/api/admin/members/[id]/activate/route.ts`
- Create: `src/app/api/admin/members/[id]/pause/route.ts`
- Create: `src/app/api/admin/members/[id]/resume/route.ts`
- Create: `src/app/api/admin/members/[id]/extend/route.ts`
- Create: `src/app/api/admin/members/[id]/downgrade/route.ts`
- Modify: `src/app/admin/page.tsx`
- Test: `tests/membership/activate.test.ts`
- Test: `tests/ui/admin-activation-form.test.tsx`

**Interfaces:**
- Produces: `activateMembership(input: ActivateMembershipInput): Promise<ActivationResult>`
- Produces: idempotency-key protected admin activation endpoint

- [ ] **Step 1: Write failing transaction tests**

Test plan duration mapping: `plan_399` and `plan_799` = 30 days; `plan_3590` and `plan_7190` = 365 days; `menu_299` creates product purchase only. Duplicate idempotency key must return original result without duplicate payment.

- [ ] **Step 2: Run tests to verify failure**

Run: `npm test -- tests/membership/activate.test.ts tests/ui/admin-activation-form.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implement activation service**

Within one database transaction create payment, membership grant, update current plan/status/dates, and write admin operation log. After commit enqueue LINE sync work.

- [ ] **Step 4: Replace prompt-based admin UI**

Each member card gets a form with plan dropdown, payment method, actual amount, activation date, calculated expiry preview, note, and confirmation. Include success summary and disable duplicate submission while pending.

- [ ] **Step 5: Implement pause/resume/extend/downgrade endpoints**

All endpoints require admin Session, write operation logs, and enqueue Rich Menu synchronization.

- [ ] **Step 6: Run tests and build**

Run: `npm test -- tests/membership/activate.test.ts tests/ui/admin-activation-form.test.tsx && npm run build`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/lib/membership/activate.ts src/app/api/admin/members src/app/admin/page.tsx tests/membership/activate.test.ts tests/ui/admin-activation-form.test.tsx
git commit -m "feat: add commercial membership activation workflow"
```

---

### Task 6: 雙版本 Rich Menu 與自動綁定

**Files:**
- Create: `src/lib/line/rich-menu.ts`
- Create: `scripts/setup-rich-menus-v10.mjs`
- Create: `assets/line/rich-menu-free-v10.webp`
- Create: `assets/line/rich-menu-member-v10.webp`
- Test: `tests/line/rich-menu.test.ts`

**Interfaces:**
- Produces: `syncMemberRichMenu(memberId): Promise<void>`
- Produces: `ensureV10RichMenus(): Promise<{ freeRichMenuId: string; memberRichMenuId: string }>`

- [ ] **Step 1: Write failing mapping tests**

Verify free, paused, expired, and `menu_299` map to free menu; active 399／799 map to member menu.

- [ ] **Step 2: Run tests to verify failure**

Run: `npm test -- tests/line/rich-menu.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement two menu definitions**

Free menu actions: 拍照記飲食、今日還能吃多少、免費建檔、30 天挑戰介紹、查看方案、使用說明. Member menu actions: 拍照記飲食、今日儀表板、會員中心、我的目標、30 天挑戰／勳章、歷史紀錄與設定.

- [ ] **Step 4: Implement binding service**

Read cached menu IDs from environment or `line_rich_menu_bindings`, link by LINE UID using LINE API, store sync status/error, and enqueue retries on failure.

- [ ] **Step 5: Run tests**

Run: `npm test -- tests/line/rich-menu.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/lib/line/rich-menu.ts scripts/setup-rich-menus-v10.mjs assets/line tests/line/rich-menu.test.ts
git commit -m "feat: add free and member rich menus"
```

---

### Task 7: 歡迎卡、會員開通卡與 LINE 重試工作

**Files:**
- Create: `src/lib/line/flex-cards.ts`
- Create: `src/lib/line/delivery-jobs.ts`
- Modify: `src/services/line-router.ts`
- Test: `tests/line/flex-cards.test.ts`
- Test: `tests/line/delivery-jobs.test.ts`

**Interfaces:**
- Produces: `buildWelcomeFlexCard()`
- Produces: `buildMembershipActivatedFlexCard(input)`
- Produces: `enqueueLineDeliveryJob(input)`
- Produces: `processDueLineDeliveryJobs(limit)`

- [ ] **Step 1: Write failing Flex payload tests**

Verify welcome card contains 開始免費體驗、看使用教學、查看方案. Membership card contains member name, plan, dates, quotas, primary 立即登入會員中心 and secondary 開始 30 天挑戰.

- [ ] **Step 2: Run tests to verify failure**

Run: `npm test -- tests/line/flex-cards.test.ts tests/line/delivery-jobs.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement Flex card builders**

Use existing UI/UX copy and image URLs hosted on `fitness-kaka.vercel.app`; keep fallback text for accessibility and LINE send failures.

- [ ] **Step 4: Connect follow event**

On LINE follow, ensure free member, send welcome Flex, and bind free Rich Menu.

- [ ] **Step 5: Implement retry queue**

Delivery jobs use states `pending | processing | succeeded | failed`, exponential delays, max 5 attempts, and store Chinese admin-readable error summaries.

- [ ] **Step 6: Run tests and build**

Run: `npm test -- tests/line/flex-cards.test.ts tests/line/delivery-jobs.test.ts && npm run build`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/lib/line src/services/line-router.ts tests/line
git commit -m "feat: add LINE welcome and membership cards"
```

---

### Task 8: 到期處理、提醒與會員等級

**Files:**
- Create: `src/lib/membership/expiry.ts`
- Create: `src/lib/membership/achievements.ts`
- Create: `src/app/api/cron/membership-expiry/route.ts`
- Modify: `vercel.json`
- Test: `tests/membership/expiry.test.ts`
- Test: `tests/membership/achievements.test.ts`

**Interfaces:**
- Produces: `normalizeExpiredMembership(memberId)`
- Produces: `calculateMemberLevel(metrics): "新手" | "穩定" | "持續" | "菁英" | "傳奇"`

- [ ] **Step 1: Write failing expiry tests**

Verify reminders at 7, 3, and 1 day; expiration changes status to expired, locks paid features, keeps records, and enqueues free Rich Menu binding.

- [ ] **Step 2: Run tests to verify failure**

Run: `npm test -- tests/membership/expiry.test.ts tests/membership/achievements.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement request-time normalization and daily cron**

Every member API normalizes expiration before authorization. Cron scans active memberships daily, sends reminders once per threshold, and expires due records.

- [ ] **Step 4: Implement level calculation**

Use completed days, streak, meal completion, and challenge completion; level never depends on payment amount.

- [ ] **Step 5: Run tests and build**

Run: `npm test -- tests/membership/expiry.test.ts tests/membership/achievements.test.ts && npm run build`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/lib/membership src/app/api/cron/membership-expiry vercel.json tests/membership
git commit -m "feat: add membership expiry and achievement levels"
```

---

### Task 9: 全站整合測試、部署與正式驗收

**Files:**
- Modify: `.env.example`
- Modify: `docs/ENVIRONMENT_VARIABLES.md`
- Modify: `docs/DEPLOYMENT_GUIDE.md`
- Create: `tests/integration/v10-membership-flow.test.ts`

**Interfaces:**
- Consumes all prior tasks
- Produces validated Production deployment and LINE publishing checklist

- [ ] **Step 1: Write end-to-end integration tests**

Cover free login, URL tampering rejection, admin activation to 399, quota change, member-menu selection, pause back to free, and `menu_299` remaining free.

- [ ] **Step 2: Run complete test suite**

Run: `npm test`
Expected: all tests PASS.

- [ ] **Step 3: Run TypeScript and Production build**

Run: `npx tsc --noEmit && npm run build`
Expected: zero errors.

- [ ] **Step 4: Update environment docs**

Document `LINE_LOGIN_CHANNEL_ID`, `NEXT_PUBLIC_LIFF_ID`, `MEMBER_SESSION_SECRET`, `LINE_RICH_MENU_FREE_ID`, `LINE_RICH_MENU_MEMBER_ID`, `CRON_SECRET`, and existing `LINE_CHANNEL_ACCESS_TOKEN`.

- [ ] **Step 5: Commit to main**

```bash
git add .env.example docs tests/integration/v10-membership-flow.test.ts
git commit -m "test: validate v10 commercial membership flow"
git push origin main
```

- [ ] **Step 6: Verify Vercel Production**

Confirm deployment status READY and HTTP 200 for `/`, `/member-login`, `/member`, `/admin`, and `/api/line/webhook` method behavior.

- [ ] **Step 7: Publish LINE assets**

Run `node --env-file=.env.vercel scripts/setup-rich-menus-v10.mjs`, verify both menu IDs, test new follow welcome Flex, activate one test member, confirm member menu and membership card.

- [ ] **Step 8: Record final acceptance evidence**

Capture commit SHA, Vercel deployment ID, tested LINE UID, menu IDs, and any remaining environment-only prerequisites without exposing secrets.
