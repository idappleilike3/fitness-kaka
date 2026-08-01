# Fitness Kaka Admin Operations v9 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Protect the fitness-kaka admin area with one owner password and provide practical member, payment, subscription, challenge, meal, and quota operations.

**Architecture:** Use an HttpOnly signed admin session cookie verified by server-only helpers. Keep Supabase service-role access exclusively in admin API routes. Record every manual payment or subscription mutation in a dedicated audit table and expose aggregated operational data through the member list endpoint.

**Tech Stack:** Next.js 15 App Router, TypeScript, Supabase/Postgres, Vitest, Vercel

## Global Constraints

- Keep the existing production project binding `fitness-kaka`.
- Never send `ADMIN_PASSPHRASE` or `SUPABASE_SERVICE_ROLE_KEY` to the browser.
- State-changing admin routes require a valid session and trusted same-origin request.
- All manual payment and subscription changes create an audit record.
- The admin interface must remain usable on mobile.

---

### Task 1: Secure admin session

**Files:**
- Modify: `tests/admin/grant-plan.test.ts`
- Modify: `src/lib/admin/auth.ts`
- Modify: `src/app/api/admin/session/route.ts`

**Interfaces:**
- Produces: `hasAdminSession(req)`, `createAdminSessionToken(passphrase)`, `verifyAdminPassphrase(input)`, `adminSessionCookie(token)`

- [ ] Write tests proving a request without a cookie is denied, a correctly signed cookie is accepted, and a wrong password is rejected.
- [ ] Run `npm test -- tests/admin/grant-plan.test.ts` and confirm the new tests fail for the missing protection.
- [ ] Implement constant-time password comparison and an HMAC-signed, expiring HttpOnly cookie.
- [ ] Implement session login/logout responses without exposing the password.
- [ ] Run `npm test -- tests/admin/grant-plan.test.ts` and confirm all tests pass.

### Task 2: Member operations and audit model

**Files:**
- Create: `tests/admin/member-operations.test.ts`
- Create: `src/lib/admin/member-operations.ts`
- Create: `supabase/migrations/004_admin_operations.sql`
- Create: `src/app/api/admin/member-action/route.ts`

**Interfaces:**
- Produces: validated actions `pause`, `resume`, `extend`, and `record_payment`; normalized amount and extension values.

- [ ] Write failing tests for valid and invalid operation inputs.
- [ ] Run the focused test and confirm it fails because the operation parser does not exist.
- [ ] Implement validation helpers and the protected mutation route.
- [ ] Add an append-only `admin_operation_logs` table with indexes and operation metadata.
- [ ] Run the focused test and confirm it passes.

### Task 3: Operational member overview

**Files:**
- Modify: `src/lib/admin/member-presentation.ts`
- Modify: `src/app/api/admin/members/route.ts`
- Modify: `tests/admin/member-presentation.test.ts`

**Interfaces:**
- Produces member cards containing current plan, grant history, payment history, challenge progress, today's meal count, and today's quota usage.

- [ ] Write a failing presentation test for the new operational fields and safe defaults.
- [ ] Run the focused test and confirm the expected failure.
- [ ] Query and combine payment, challenge, meal, quota, and operation history.
- [ ] Run the focused test and confirm it passes.

### Task 4: Password gate and mobile operations UI

**Files:**
- Modify: `src/app/admin/page.tsx`

**Interfaces:**
- Consumes the session, members, grant-plan, and member-action APIs.

- [ ] Add a password login state that does not request members until authenticated.
- [ ] Add logout, responsive member cards, plan controls, payment recording, pause/resume/extend controls, and operational summaries.
- [ ] Remove the obsolete public-access warning.
- [ ] Run TypeScript build verification.

### Task 5: Verification and production deployment

**Files:**
- Modify: `docs/ADMIN.md`
- Modify: `fitness-kaka-fullsite-v9-2026-07-28.zip`

**Interfaces:**
- Requires Vercel environment variable `ADMIN_PASSPHRASE` and the new Supabase migration.

- [ ] Update the owner operation guide and environment requirements.
- [ ] Run `npm test` and `npm run build`.
- [ ] Rebuild the downloadable v9 archive from the verified source.
- [ ] Deploy to the existing `fitness-kaka` production project.
- [ ] Verify the production homepage, new story image URLs, LINE purchase CTA, `/admin` password gate, and unauthorized admin API response.
