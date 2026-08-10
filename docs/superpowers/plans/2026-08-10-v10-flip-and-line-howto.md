# V10 Flip and LINE Consultation Implementation Plan

**Goal:** Restore the approved V10 two-photo flip interaction and make every new LINE follower enter a human nutrition-consultation conversation immediately.

**Latest decision (2026-08-10):** The former six-card tutorial and the later one-card/three-button Flex proposal are both cancelled. `如何開始／怎麼用` returns concise text and immediately asks the user what they want to improve. Flex remains reserved for plan comparison, nutrition results, 30-day challenges, upgrades, achievements, and reports.

## Constraints

- V10 is the only homepage baseline. Do not replace the layout, approved images, welcome image, or Rich Menu.
- Follow sends the approved welcome content and the consultation opening in the same reply.
- Never ask whether this is the user's first visit.
- Both numbered choices `①～⑥` and natural language must be understood.
- Food images are analysed immediately; storage still requires explicit confirmation.
- The first hero flip has two distinct approved image assets with equal dimensions.
- Desktop supports hover/focus; mobile supports tap.

## Task 1 — Consultation copy and intent tests

- [ ] Add failing tests for the exact consultation opening and absence of tutorial Flex.
- [ ] Add failing tests for six numbered choices and representative natural-language phrases.
- [ ] Implement the shared consultation opening and intent classifier.
- [ ] Extend goal onboarding to accept numbers and natural phrases.
- [ ] Run focused tests.

## Task 2 — Follow and how-to routing

- [ ] Add failing webhook tests for `follow`, typed `怎麼用`, and `guide:how`.
- [ ] Follow with the approved welcome image plus consultation text.
- [ ] Route typed/postback how-to directly to the same consultation text.
- [ ] Preserve existing members and never restart completed onboarding.
- [ ] Run focused tests.

## Task 3 — Restore first V10 two-photo flip

- [ ] Add a failing homepage test requiring distinct front/back image assets.
- [ ] Implement the flip without changing the approved V10 layout.
- [ ] Verify equal dimensions, desktop hover/focus, mobile tap, and reduced motion.
- [ ] Check later flip galleries still work and retain their images.

## Task 4 — Member access and regression verification

- [ ] Verify member login routes through LIFF identity to member centre.
- [ ] Run LINE, intent, meal-photo, homepage, and flip tests.
- [ ] Run the full test suite and `npm run build`.
- [ ] Commit and push to `main` only after verification.
- [ ] Wait for Vercel Production `READY`, then verify HTTP 200 and V10 markers.
