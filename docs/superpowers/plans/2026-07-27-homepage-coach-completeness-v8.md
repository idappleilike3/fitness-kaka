# Homepage Coach Completeness v8 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the homepage from a calorie-photo demo into a complete, credible fitness and fat-loss coaching story.

**Architecture:** Keep the existing Next.js homepage and visual language. Add focused content components inside `HomeVisualStories.tsx`, mount them in the customer journey, and use deterministic HTML/CSS for readable device data while lifestyle images carry emotion and context.

**Tech Stack:** Next.js 15, React 19, TypeScript, CSS Modules, Vitest, Next Image.

## Global Constraints

- Preserve the approved Kaka coach identity and purple-blue health HUD style.
- Do not deploy or change external services.
- Never promise a guaranteed weight-loss outcome.
- Label nutrition recognition as an estimate that users confirm.
- Label dashboard numbers as examples calculated differently for each user.
- Keep long Traditional Chinese copy in HTML, not generated inside images.

---

### Task 1: Lock v8 content requirements

**Files:**
- Modify: `tests/homepage/content.test.ts`

- [ ] Add tests for personalization, safe rate, nutrition scope, meal swaps, exercise, plateau handling, coaching scenarios, and estimate labels.
- [ ] Run `npm test -- tests/homepage/content.test.ts` and confirm the new assertions fail.

### Task 2: Build complete coaching sections

**Files:**
- Modify: `src/app/HomeVisualStories.tsx`
- Modify: `src/app/page.tsx`

- [ ] Add a personal assessment and goal-calculation section.
- [ ] Add meal substitution, three exercise modes, plateau logic, and concrete coaching scenarios.
- [ ] Enrich nutrition tracking and safety copy without medical promises.
- [ ] Run the focused test until it passes.

### Task 3: Give every section a distinct visual narrative

**Files:**
- Modify: `src/app/page.module.css`
- Modify: `public/images/story-*.webp`

- [ ] Use varied layouts rather than repeating white cards.
- [ ] Keep device content readable as HTML/CSS.
- [ ] Validate image anatomy, varied pose/expression, crop, and mobile behavior.

### Task 4: Verify and package

**Files:**
- Create: `fitness-kaka-fullsite-v8-2026-07-27.zip`

- [ ] Run all tests.
- [ ] Run the production build.
- [ ] Start the production server and verify homepage and image HTTP responses.
- [ ] Package only required project files with deployable files at the ZIP root.
- [ ] Inspect ZIP structure and save the final file.
