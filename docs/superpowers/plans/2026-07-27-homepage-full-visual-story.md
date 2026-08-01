# Homepage Full Visual Story Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the fitness-kaka homepage from a mostly text-card page into a complete image-and-copy commercial story while preserving the approved Day 1–Day 7 carousel.

**Architecture:** Keep the existing Next.js App Router homepage and backend unchanged. Add focused presentational components and project-bound image assets, then compose them in `page.tsx`; keep all styling in the existing CSS Module so responsive and scroll-reveal behavior remains consistent.

**Tech Stack:** Next.js 15, React 19, TypeScript, CSS Modules, `next/image`, Vitest.

## Global Constraints

- Preserve `/images/hero-kaka-original.webp` as the homepage hero.
- Preserve the complete manual Day 1–Day 7 carousel and its seven menu images.
- Do not change LINE, payment, member, API, or database behavior.
- Use real visual assets or intentionally built UI previews; do not substitute empty gradient cards.
- Every major section must combine explanatory copy with a meaningful visual.
- Desktop, tablet, and mobile layouts must remain usable.
- Scroll animation must respect `prefers-reduced-motion`.

---

### Task 1: Lock the complete homepage requirement in tests

**Files:**
- Modify: `tests/homepage/content.test.ts`

**Interfaces:**
- Consumes: homepage source files and public image filenames.
- Produces: regression checks for all requested visual story sections.

- [ ] **Step 1: Write failing tests**

Add assertions for:

```ts
expect(page).toContain("<PainStory");
expect(page).toContain("<ThreeStepJourney");
expect(page).toContain("<FeatureStory");
expect(page).toContain("<RoadmapStory");
expect(page).toContain("<MemberDashboardPreview");
expect(page).toContain("<CoachClosing");
```

Read each component source and assert the required image paths and content labels exist.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/homepage/content.test.ts`

Expected: FAIL because the six components do not exist.

- [ ] **Step 3: Keep the failing test output as the baseline**

Do not modify production code until the failure is confirmed.

### Task 2: Create and validate visual assets

**Files:**
- Create: `public/images/story-real-life.webp`
- Create: `public/images/story-photo-analysis.webp`
- Create: `public/images/story-roadmap.webp`
- Create: `public/images/story-coach-support.webp`

**Interfaces:**
- Consumes: approved purple-blue fitness brand direction.
- Produces: optimized, project-local image assets referenced by homepage components.

- [ ] **Step 1: Generate four coordinated images**

Use natural Taiwanese/Asian meal-tracking lifestyle photography with purple-blue UI light accents, no embedded text, no logos, and generous crop-safe composition.

- [ ] **Step 2: Inspect every image**

Confirm human anatomy, food realism, crop safety, no accidental text, and consistent lighting.

- [ ] **Step 3: Save selected assets under `public/images`**

Verify each file is readable and reasonably sized for a production website.

### Task 3: Build visual story components

**Files:**
- Create: `src/app/HomeVisualStories.tsx`
- Modify: `src/app/page.tsx`
- Modify: `src/app/page.module.css`

**Interfaces:**
- Consumes: four story image assets and existing CSS tokens.
- Produces: `PainStory`, `ThreeStepJourney`, `FeatureStory`, `RoadmapStory`, `MemberDashboardPreview`, and `CoachClosing`.

- [ ] **Step 1: Implement the six focused components**

Each component must have one job:

- `PainStory`: real-life friction plus the LINE-photo turning point.
- `ThreeStepJourney`: photo → editable analysis → next action.
- `FeatureStory`: five approved capabilities using alternating visual layouts.
- `RoadmapStory`: Day 1, 3, 7, 14, 21, 30 with stage outcomes.
- `MemberDashboardPreview`: a complete phone dashboard with energy ring, macros, water, exercise, weight trend, and today’s task.
- `CoachClosing`: coach image plus a specific supportive recommendation.

- [ ] **Step 2: Replace old text-only sections in `page.tsx`**

Mount the new components and remove duplicated old markup while preserving section IDs used by navigation.

- [ ] **Step 3: Add responsive CSS**

Use alternating image/text compositions, a sticky or layered phone preview where appropriate, strong visible focus states, and reduced-motion handling.

- [ ] **Step 4: Run focused tests**

Run: `npm test -- tests/homepage/content.test.ts`

Expected: PASS.

### Task 4: Verify the complete deployable site

**Files:**
- Modify only if verification finds a defect.

**Interfaces:**
- Consumes: completed homepage.
- Produces: a buildable project and clean v6 archive.

- [ ] **Step 1: Run all tests**

Run: `npm test`

Expected: all tests pass with zero failures.

- [ ] **Step 2: Run production build**

Run: `npm run build`

Expected: exit code 0 and all routes generated.

- [ ] **Step 3: Inspect homepage composition**

Use available browser or screenshots at desktop and mobile widths. If the environment cannot launch a browser, report that limitation and validate source, assets, dimensions, test output, and production build without claiming visual browser inspection.

- [ ] **Step 4: Create a single-level deployment archive**

The ZIP root must directly contain `package.json`, `src`, `public`, and `vercel.json`; it must not contain a nested same-name project folder.

- [ ] **Step 5: Save the v6 deliverable**

Persist the final ZIP and provide it as the only version to deploy.
