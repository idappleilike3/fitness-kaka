# LINE Formal Welcome Image Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the generated LINE follow card with the user-approved 1024×1536 welcome image and three working actions.

**Architecture:** Store the approved image as an immutable public asset and reference it directly from the existing Flex welcome builder. Keep follow-event routing unchanged; only the Flex presentation and action destinations change.

**Tech Stack:** Next.js 15, TypeScript, LINE Messaging API Flex Message, Vitest.

## Global Constraints

- Maintain V10 only; do not restore V9 assets or code.
- Use the uploaded approved image without regenerating or redesigning it.
- Display the complete 2:3 image without cropping.
- Provide exactly three actions labelled `免費開始`, `看方案`, and `如何開始`.
- Preserve the existing follow-event member initialization flow.

---

### Task 1: Lock the welcome Flex contract

**Files:**
- Create: `tests/line/welcome-flex.test.ts`
- Modify: `src/lib/line/welcome-flex.ts`
- Create: `public/images/line-welcome-final.png`

**Interfaces:**
- Consumes: `welcomeFlexMessage(): LINE Flex message object`
- Produces: A Flex bubble with the approved static hero and three actions.

- [x] **Step 1: Write the failing test**

Assert the hero URL ends in `/images/line-welcome-final.png?v=1`, uses `2:3` with `fit`, and the footer exposes exactly the three approved labels with the LIFF, plans, and help actions.

- [x] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/line/welcome-flex.test.ts`

Expected: FAIL because the current Flex uses the generated `/api/line/assets/welcome-card` hero, `4:5` crop, and `如何使用` label.

- [x] **Step 3: Add the approved asset and minimal Flex change**

Copy the byte-identical uploaded PNG to `public/images/line-welcome-final.png`. Update only hero presentation and footer actions in `welcomeFlexMessage()`.

- [x] **Step 4: Verify targeted behavior**

Run: `npm test -- tests/line/welcome-flex.test.ts`

Expected: PASS.

- [x] **Step 5: Verify the release**

Run: `npm test && npm run build`

Expected: all tests and the production build pass. Confirm the copied asset checksum matches the upload before publishing `main`.
