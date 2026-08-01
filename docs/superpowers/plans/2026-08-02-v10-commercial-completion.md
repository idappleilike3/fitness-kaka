# Fitness Kaka v10 Commercial Completion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete and deploy the remaining Fitness Kaka v10 commercial workflows with real database, OpenAI, LINE, admin, and scheduled-engagement integration.

**Architecture:** Preserve the existing Next.js 15 App Router, Supabase repositories, LINE webhook, and NewebPay flow. Add focused menu-generation, delivery, challenge-operations, and status interfaces; external calls retain deterministic fallbacks and write operational errors for administrators.

**Tech Stack:** Next.js 15, React 19, TypeScript, Supabase, OpenAI, LINE Messaging API, Vitest, Vercel.

## Global Constraints

- AI persona is always a warm older-sister fitness and fat-loss coach.
- Never blame, shame, comment on appearance, guess weight, or manufacture anxiety.
- Acknowledge emotion, analyze, give one achievable action, and end with encouragement.
- Sales recommendations are need-triggered, throttled, and stop when the member opts out.
- 299 produces a personalized Day 1–Day 7 menu from body targets, preferences, restrictions, budget, eating context, and activity.
- 399 provides morning, noon, and evening companionship.
- 799 provides 30-day challenge tasks plus companionship and administrator intervention lists.
- Deployment target is `https://fitness-kaka.vercel.app`.

---

### Task 1: Repair baseline regressions

**Files:** `src/services/meal-flow.ts`, `src/services/coach-chat.ts`, `src/lib/admin/auth.ts`, relevant tests.

- [ ] Add or correct tests for quota refund propagation, isolated sales-profile failures, and request-based admin authentication.
- [ ] Run focused tests and verify the intended failures.
- [ ] Implement minimal fixes and run the full test and type-check baseline.

### Task 2: OpenAI personalized menu with safe fallback

**Files:** `src/lib/menu/ai-generator.ts`, `src/lib/menu/generator.ts`, `src/app/api/menu-order/route.ts`, `tests/menu/ai-generator.test.ts`.

- [ ] Test schema validation, forbidden-food rejection, target tolerance, and deterministic fallback.
- [ ] Implement structured OpenAI generation using all questionnaire and body-target inputs.
- [ ] Persist generation source and Chinese operational failure reason without blocking the paid member.

### Task 3: Admin menu editing, preview, and confirmed LINE delivery

**Files:** menu repository, admin menu route, LINE Flex builder, admin page, migration, tests.

- [ ] Test single-meal edits, preview payload, explicit confirmation, delivery status, and audit log.
- [ ] Implement authenticated edit/preview/send actions and member Flex delivery.
- [ ] Add admin controls and preserve member-visible updates.

### Task 4: 399/799 operations and system status

**Files:** challenge repository/routes, engagement policy/cron, admin page/status routes, migration, tests.

- [ ] Test three daily 399 windows, 799 day-specific tasks, challenge batches, intervention lists, and Chinese status reasons.
- [ ] Implement database-backed challenge enrollment/task progress and admin operations.
- [ ] Add OpenAI, LINE, Supabase, cron, payment, and recent-error status panels.

### Task 5: Full verification and production deployment

**Files:** status/deployment docs and Vercel configuration.

- [ ] Run the full Vitest suite, `tsc --noEmit`, and `next build`.
- [ ] Apply required Supabase migration through configured production access.
- [ ] Deploy the linked Vercel project to production and verify health, homepage, admin login surface, menu page, and cron authorization behavior.
- [ ] Record exact deployed URL, deployment identifier, tests, and any external credential blocker.
