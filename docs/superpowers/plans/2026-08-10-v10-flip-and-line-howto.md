# V10 Flip and LINE How-To Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restore the V10 two-sided photo flip interaction and replace the six-card LINE how-to carousel with one concise guided Flex button card.

**Architecture:** Keep the existing V10 homepage and reusable StoryFlipCard interaction, but ensure the first intended visual uses distinct front/back image content and remains operable by hover/focus on desktop and tap on mobile. Keep LINE onboarding in the webhook/guide-flex boundary: `guide:how` returns one Flex bubble with three approved actions, `trial:ask` asks for confirmation, and existing members enter LIFF member login instead of onboarding.

**Tech Stack:** Next.js App Router, React, CSS Modules, LINE Messaging API Flex Messages/Postbacks, TypeScript, Vitest, Vercel.

## Global Constraints

- V10 is the only homepage version; do not replace it with a new visual direction.
- The first V10 flip item must have two sides/two visual states, not a static single image.
- Desktop supports hover/focus flip; mobile supports tap flip.
- LINE `如何開始` must return one primary Flex button card, not a six-card carousel.
- The three buttons are exactly: `開始 7 天免費體驗`, `先看看怎麼使用`, `我已經是會員`.
- Free trial asks for confirmation before onboarding and does not jump directly to a complex web page.
- Existing members go through LINE/LIFF identity recognition and member center without being forced through registration again.

---

### Task 1: Replace six-card how-to with one guided action card

**Files:**
- Modify: `src/lib/line/guide-flex.ts`
- Test: existing/new LINE Flex unit test under `tests/` matching project conventions

**Interfaces:**
- Produces: `howToUseFlexMessage()` returning one `bubble` Flex message.
- Consumes: existing postback keys `trial:ask`, `guide:how`; adds `member:login` and `guide:usage` handling in Task 2.

- [ ] Write a failing test asserting `howToUseFlexMessage().contents.type === "bubble"`, no carousel exists, and button labels equal the three approved labels.
- [ ] Run the focused test and verify it fails against the current six-card carousel.
- [ ] Replace `howToUseFlexMessage()` with a single bubble containing a short explanation and exactly three vertical buttons.
- [ ] Run the focused test and verify it passes.
- [ ] Commit with `fix(line): simplify how-to into one guided action card`.

### Task 2: Route the three how-to actions correctly

**Files:**
- Modify: `src/app/api/line/webhook/route.ts`
- Modify: `src/lib/line/guide-flex.ts`
- Test: webhook/LINE routing tests under `tests/`

**Interfaces:**
- `trial:ask` -> `trialAskFlexMessage()` confirmation.
- `guide:usage` -> one concise usage explanation plus the same guided action card, not six cards.
- `member:login` -> LIFF/member-login URI button generated from public base URL.

- [ ] Write failing tests for the three action routes.
- [ ] Verify tests fail before implementation.
- [ ] Add the postback/URI behavior while preserving `trial:start` onboarding confirmation flow.
- [ ] Verify existing-member action never calls `setOnboardingStep(..., "goal")`.
- [ ] Run focused tests and commit with `fix(line): route guided start actions by member intent`.

### Task 3: Restore the first V10 two-sided photo interaction

**Files:**
- Modify: `src/app/page.tsx` or the existing component that renders the first intended V10 flip visual.
- Modify: `src/components/story-flip.tsx` only if required for two-image support.
- Modify: corresponding CSS Module only if required.
- Test: homepage/component tests under `tests/`.

**Interfaces:**
- Consumes existing `StoryFlipCard` interaction behavior.
- Produces distinct front/back image props/content for the first V10 flip item.

- [ ] Write a failing component/source test asserting the first flip visual has distinct front and back visual content and is not rendered as one static image.
- [ ] Run focused test and verify failure.
- [ ] Implement minimal distinct front/back visual rendering while preserving the approved V10 layout and uploaded assets.
- [ ] Confirm desktop hover/focus and mobile tap both toggle the card without changing dimensions.
- [ ] Run focused tests and commit with `fix(v10): restore first two-sided photo flip`.

### Task 4: Regression verification and production deployment

**Files:**
- No feature files unless a regression fix is required.

**Interfaces:**
- Verifies Tasks 1–3 as one user flow.

- [ ] Run LINE Flex/webhook tests.
- [ ] Run homepage/flip tests.
- [ ] Run `npm run build` and require exit code 0.
- [ ] Push commits to `main` and wait for Vercel Production `READY`.
- [ ] Verify the production homepage returns HTTP 200 and contains the V10 content.
- [ ] Verify the production LINE webhook build contains the one-card how-to implementation.
- [ ] Report deployment only after Production is `READY`.
