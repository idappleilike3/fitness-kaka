# LINE Welcome Questionnaire Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Send a warm welcome and immediately start a four-choice LINE questionnaire for every genuinely new fitness-kaka member, then continue through the existing body profile and return personalized targets.

**Architecture:** Keep the existing `members.onboarding_step` state machine and `member_profiles` persistence. Move the goal question to the first step, map the four customer-facing answers to the existing nutrition goal values, and reuse the established LINE quick-reply/postback contract for every button-driven answer.

**Tech Stack:** Next.js, TypeScript, LINE Messaging API, Supabase, Vitest

## Global Constraints

- Preserve the v10 website and existing paid-member onboarding escape behavior.
- A follow event for a new member must include the welcome introduction and the first question in the same LINE reply.
- The first question must offer: 減脂瘦身、控制飲食、增肌塑形、改善健康.
- Questionnaire completion must continue to calculate BMI, BMR, TDEE, calories, and protein through the existing profile completion service.

---

### Task 1: Goal-first questionnaire state machine

**Files:**
- Modify: `tests/onboarding/parse.test.ts`
- Modify: `src/services/onboarding.ts`
- Modify: `src/lib/line/messages.ts`
- Modify: `src/repositories/members.ts`

**Interfaces:**
- Consumes: existing `onboarding:<step>:<value>` postback format and `patchProfile(memberId, patch)`.
- Produces: `startOnboardingPrompt()` with goal quick replies and a state sequence from `goal` through `freq`.

- [ ] **Step 1: Write failing tests for the first prompt, four goal choices, and goal mapping.**
- [ ] **Step 2: Run `npm test -- tests/onboarding/parse.test.ts tests/line/messages.test.ts` and verify the new assertions fail for the missing behavior.**
- [ ] **Step 3: Implement the minimal goal-first state sequence, labels, mappings, and new-member default.**
- [ ] **Step 4: Re-run the focused tests and verify they pass.**

### Task 2: Follow event automatically begins the questionnaire

**Files:**
- Modify: `tests/services/line-router.test.ts`
- Modify: `src/services/line-router.ts`
- Modify: `src/lib/line/messages.ts`

**Interfaces:**
- Consumes: `continueOnboardingPrompt(member.onboarding_step)` and the existing `replyOnboarding` LINE reply helper.
- Produces: one welcome-plus-question response for a new follow event, while returning members with `onboarding_step = null` receive a welcome without being re-enrolled.

- [ ] **Step 1: Write a failing route test proving a new follow receives the welcome introduction and first goal quick replies.**
- [ ] **Step 2: Run the focused route test and verify it fails because the current flow starts with sex / generic welcome.**
- [ ] **Step 3: Implement the welcome copy and follow routing change.**
- [ ] **Step 4: Re-run the route test and related LINE tests.**

### Task 3: Regression verification and deployment

**Files:**
- Modify: `docs/LINE_FLOW_SPEC.md`

**Interfaces:**
- Consumes: project test and build scripts.
- Produces: verified GitHub `main` update that triggers the connected Vercel production deployment.

- [ ] **Step 1: Update the LINE flow documentation to match the shipped order and four-choice first question.**
- [ ] **Step 2: Run the complete test suite and record exact pass/fail counts.**
- [ ] **Step 3: Run the production build and confirm exit code 0.**
- [ ] **Step 4: Inspect the complete Git diff and commit only the intended questionnaire plus already-approved pending v10 changes.**
- [ ] **Step 5: Push `main`, then verify the remote commit and deployment status.**
