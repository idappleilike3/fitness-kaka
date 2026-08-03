# 健身卡卡 v10 霓虹互動首頁與卡卡機器人 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 將健身卡卡 v10 首頁升級為具備霓虹格紋、3D 浮動、三種餐點情境切換與免費規則式卡卡問答機器人的響應式網站。

**Architecture:** 將純資料規則與 React 視覺元件分離：`kaka-chat-rules.ts` 負責可獨立測試的回答配對，`KakaChatbot.tsx` 負責聊天狀態與聲音，`PointerEffects.tsx` 負責漸進增強的游標視差，`MealScenarioSwitcher.tsx` 負責三情境內容。首頁伺服器元件只組裝功能，既有商業與營養區塊不改變資料流程。

**Tech Stack:** Next.js 15 App Router、React 19、TypeScript、CSS Modules、Vitest、Web Audio API。

## Global Constraints

- 使用既有卡卡教練與餐點素材，不生成或替換人物。
- 自由輸入只在瀏覽器端規則比對，不呼叫 OpenAI 或其他付費 API。
- 健身卡卡 LINE 固定為 `https://lin.ee/5rxQDpa`。
- 桌機支援 5～7 度 3D 傾斜；觸控與 `prefers-reduced-motion` 必須安全降級。
- 不修改金流、會員資料庫、後台或 LINE OA 發布設定。

---

### Task 1: 規則式回答引擎

**Files:**
- Create: `src/app/kaka-chat-rules.ts`
- Create: `tests/homepage/kaka-chat-rules.test.ts`

**Interfaces:**
- Produces: `matchKakaAnswer(input: string): KakaReply` 與 `KAKA_SUGGESTIONS`。

- [ ] **Step 1: Write failing tests** for exact suggestion IDs, synonym matching, medical safety routing, unknown input fallback, and literal LINE URL.
- [ ] **Step 2: Run** `npm test -- tests/homepage/kaka-chat-rules.test.ts` and verify missing-module failure.
- [ ] **Step 3: Implement** normalized keyword scoring with medical precedence and fixed replies; keep all results local constants.
- [ ] **Step 4: Re-run** the focused test and verify all cases pass.

### Task 2: 三情境餐點切換

**Files:**
- Create: `src/app/MealScenarioSwitcher.tsx`
- Modify: `src/app/HomeVisualStories.tsx`
- Modify: `src/app/page.module.css`
- Create: `tests/homepage/meal-scenarios.test.ts`

**Interfaces:**
- Produces: `<MealScenarioSwitcher />` with tabs for `dining`, `convenience`, and `home`.

- [ ] **Step 1: Write failing tests** that render the component and verify tab selection changes image alt text, menu, calories, protein, and guidance.
- [ ] **Step 2: Run** the focused scenario test and verify it fails because the component is absent.
- [ ] **Step 3: Implement** the client component using existing images and replace the static `mealWorkbench` in `MealFlexStory`.
- [ ] **Step 4: Re-run** the focused test and verify all scenario behavior passes.

### Task 3: 卡卡問答視窗與免費提示音

**Files:**
- Create: `src/app/KakaChatbot.tsx`
- Modify: `src/app/page.tsx`
- Modify: `src/app/page.module.css`
- Create: `tests/homepage/kaka-chatbot.test.ts`

**Interfaces:**
- Consumes: `matchKakaAnswer` and `KAKA_SUGGESTIONS` from Task 1.
- Produces: `<KakaChatbot lineUrl: string />`.

- [ ] **Step 1: Write failing tests** for opening, preset selection, free-text submission, thinking state, follow-ups, mute toggle, medical/unknown LINE escalation, and absence of network calls.
- [ ] **Step 2: Run** the focused chatbot test and verify missing-component failure.
- [ ] **Step 3: Implement** accessible chat state, timeout cleanup, localStorage sound preference, optional Web Audio chime, and fixed LINE action.
- [ ] **Step 4: Re-run** the focused test and verify all chatbot behavior passes.

### Task 4: 霓虹格紋與游標 3D 視差

**Files:**
- Create: `src/app/PointerEffects.tsx`
- Modify: `src/app/page.tsx`
- Modify: `src/app/page.module.css`
- Create: `tests/homepage/pointer-effects.test.ts`

**Interfaces:**
- Produces: `<PointerEffects />` which writes `--pointer-x`, `--pointer-y`, `--tilt-x`, and `--tilt-y` only on fine-pointer devices.

- [ ] **Step 1: Write failing tests** for pointer variable updates, reset on leave, reduced-motion bypass, and no touch-only behavior.
- [ ] **Step 2: Run** the focused effects test and verify missing-component failure.
- [ ] **Step 3: Implement** one requestAnimationFrame-driven document listener and `[data-tilt]` card handling with cleanup.
- [ ] **Step 4: Add** the perspective grid, scanning glow, glass panels, image overlays, focus styles, touch breakpoints, and reduced-motion rules.
- [ ] **Step 5: Re-run** the focused test and verify behavior passes.

### Task 5: 首頁整合與回歸驗收

**Files:**
- Modify: `tests/homepage/content.test.ts`
- Modify: `deploy/v10-homepage-restoration-20260804.md`

**Interfaces:**
- Consumes: all components above.
- Produces: a buildable and deployable homepage with documented evidence.

- [ ] **Step 1: Update homepage behavior tests** to cover mounted components, image-backed copy, three scenarios, sound controls, LINE routing, and no paid chatbot path.
- [ ] **Step 2: Run** all homepage tests and fix only failures caused by this feature.
- [ ] **Step 3: Run** `npm run build` and capture the exit result.
- [ ] **Step 4: Start production server** and inspect desktop/mobile layout, images, tabs, chat, keyboard focus, sound toggle, and console errors in a browser.
- [ ] **Step 5: Run** `npm test`, document unrelated pre-existing failures separately, and review `git diff --check` plus scoped diff.
- [ ] **Step 6: Commit** only the approved homepage, tests, and documentation changes to `main` before deployment handoff.
