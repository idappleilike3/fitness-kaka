# Human Image Replies Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Kaka respond naturally to every LINE image and reserve meal quota for confirmed food or drink images only.

**Architecture:** Add one structured vision interpretation service that returns a discriminated image category, a human reply, and optional meal nutrition. Route all LINE images through a single orchestration function that replies immediately for non-food images and reuses the existing pending-meal preview flow for food.

**Tech Stack:** Next.js, TypeScript, OpenAI Chat Completions, Zod, LINE Messaging API, Vitest, Supabase repositories

## Global Constraints

- Replies are Traditional Chinese, warm, natural, and 1–3 sentences before any meal analysis.
- Only `food` images consume image meal quota.
- Person images must not judge appearance, body shape, health, or sensitive traits.
- Non-food and unknown images never create pending meals.
- Use one OpenAI vision request per image.

---

### Task 1: Structured image interpretation

**Files:**
- Create: `src/lib/openai/image-understanding.ts`
- Modify: `src/types/index.ts`
- Test: `tests/openai/image-understanding.test.ts`

**Interfaces:**
- Produces: `understandImage(buffer: Buffer, mime: string): Promise<ImageUnderstandingResult>`
- `ImageUnderstandingResult` contains `kind`, `reply`, optional `meal`, token usage, and model.

- [ ] Write schema and prompt tests that require all supported categories, human-reply safety rules, and optional meal nutrition.
- [ ] Run `npx vitest run tests/openai/image-understanding.test.ts` and confirm failure because the module does not exist.
- [ ] Implement the Zod schema, safety-focused prompt, and OpenAI call.
- [ ] Re-run the targeted test and confirm it passes.

### Task 2: Quota-safe image flow

**Files:**
- Modify: `src/services/meal-flow.ts`
- Test: `tests/services/meal-flow.test.ts`

**Interfaces:**
- Consumes: `understandImage` from Task 1.
- Produces: existing `handleImageMeal(...)` with new category-aware behavior.

- [ ] Add failing tests proving non-food replies without `tryConsume` or `createPending`, and food replies naturally before the existing meal preview.
- [ ] Run `npx vitest run tests/services/meal-flow.test.ts` and confirm the new assertions fail for the old always-meal behavior.
- [ ] Interpret before quota consumption; reply directly for non-food; for food consume once, log usage, create pending meal, and send two ordered LINE messages.
- [ ] Preserve refund behavior for failures after quota consumption.
- [ ] Re-run the targeted test and confirm it passes.

### Task 3: LINE routing and regression verification

**Files:**
- Modify: `tests/services/line-router.test.ts`

**Interfaces:**
- Verifies the existing image route downloads content once and calls category-aware `handleImageMeal` once.

- [ ] Add the image routing regression test and run it.
- [ ] Run all Vitest tests with `npm test -- --run` and record any pre-existing failures separately.
- [ ] Run `npm run build` and require exit code 0.
- [ ] Review `git diff`, commit only this feature, update remote `main`, and verify the Vercel production deployment is `READY`.
