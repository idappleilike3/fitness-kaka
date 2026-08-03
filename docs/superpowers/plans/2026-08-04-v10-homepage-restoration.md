# Fitness Kaka v10 Homepage Restoration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restore the approved v10 visual foundation and turn the homepage into a warm, nutrition-led 7-day trial journey without regressing existing commercial features.

**Architecture:** Keep the existing Next.js App Router homepage and its established story components. Change only homepage composition, theme CSS, directly related copy/tests, and the deployment note; preserve services, APIs, database, admin, payment, and LINE publishing logic.

**Tech Stack:** Next.js 15, React 19, TypeScript, CSS Modules, Vitest, Next Image

## Global Constraints

- Continue the existing v10 commercial version; do not rebuild from an older page.
- Use the existing persisted v10 homepage imagery; do not replace the approved woman/coach artwork.
- Fitness Kaka LINE OA fallback must be `https://lin.ee/5rxQDpa`.
- The homepage trial offer must say `7 天免費體驗` consistently.
- Desktop imagery remains aligned; mobile layout is one column.
- Motion must respect `prefers-reduced-motion`.
- Do not modify unrelated services, APIs, admin, payment, database, or LINE publishing files.

---

### Task 1: Protect the v10 homepage contract

**Files:**
- Modify: `tests/homepage/content.test.ts`

**Interfaces:**
- Consumes: homepage source files as UTF-8 text.
- Produces: regression coverage for the correct LINE URL, member login, 7-day trial, nutrition guidance, and v10 visual composition.

- [ ] Add failing assertions for the corrected Fitness Kaka LINE URL, visible member login, `7 天免費體驗`, a three-step trial preview, and no legacy 14-day offer.
- [ ] Run `npm test -- tests/homepage/content.test.ts` and confirm failures identify the missing homepage contract.

### Task 2: Restore and improve homepage composition

**Files:**
- Modify: `src/app/page.tsx`
- Modify: `src/app/HomePlansSection.tsx`

**Interfaces:**
- Consumes: `HomeVisualStories`, `SevenDayMenu`, `HomePlansSection`, and persisted `/public/images` assets.
- Produces: the visitor journey from healthy weight-loss promise to 7-day trial, nutrition guidance, 30-day roadmap, plans, and member login.

- [ ] Correct the fallback LINE OA URL and add visible login/trial actions.
- [ ] Rewrite the hero around healthy fat loss, adequate nutrition, and coach companionship.
- [ ] Add an explicit three-step 7-day trial preview using existing imagery and semantic markup.
- [ ] Change the free plan presentation from an indefinite free tier to a 7-day trial without changing paid-plan pricing.
- [ ] Run the focused homepage test and confirm it passes.

### Task 3: Apply the warm v10 visual system and motion

**Files:**
- Modify: `src/app/globals.css`
- Modify: `src/app/page.module.css`

**Interfaces:**
- Consumes: existing class names and responsive structure.
- Produces: pink-purple-white brand tokens, rounded glass cards, subtle ambient motion, readable mobile typography, and reduced-motion safety.

- [ ] Replace the homepage's cyan/black emphasis with warm pink-purple brand tokens while retaining accessible contrast.
- [ ] Style the hero, navigation, trial preview, cards, and CTAs as a coherent v10 commercial page.
- [ ] Add restrained floating/glow/image motion and hover feedback; disable it for reduced-motion users.
- [ ] Confirm desktop and mobile rules keep imagery aligned and mobile content in one column.

### Task 4: Verify and document

**Files:**
- Create: `deploy/v10-homepage-restoration-20260804.md`

**Interfaces:**
- Consumes: implemented homepage and repository scripts.
- Produces: source/target/verification record for handoff and deployment.

- [ ] Run the focused homepage tests.
- [ ] Run the full Vitest suite.
- [ ] Run `npm run build`.
- [ ] Inspect `git diff --check`, `git status --short`, and the exact changed-file list.
- [ ] Record commands, outcomes, scope, and manual production/LINE checks still required.
- [ ] Commit only the scoped files to `main`, push, then verify Vercel production and public routes before claiming deployment success.
