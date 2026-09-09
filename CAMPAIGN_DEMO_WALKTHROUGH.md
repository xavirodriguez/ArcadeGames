# Campaign Demo Walkthrough

This document provides a step-by-step walkthrough to reproduce and verify the multi-game Campaign Mode narrative progression, branching choices, domain modifier resolution, and meta-progression rewards.

---

## 🚀 Setup & Launch

1. Install dependencies and start the app:
   ```bash
   pnpm install
   pnpm start
   ```
2. On the main menu, select **"STORY CAMPAIGN"**.

---

## ⚔️ Path 1: Heroic Route (Flawless Victory)

1. **Act 1 - Orbital Deployment:**
   - Read the introductory dialogue with AI ODYSSEY 7.
   - Launch Act 1: **Asteroids** (`poc-asteroids-1`).
   - Achieve 1,000+ points or destroy 3 asteroid waves without taking fatal damage.
   - The outcome rule evaluates `asteroidsPerfect: true`, setting flag `heroicEntry = true`.

2. **Tactical Choice:**
   - On the tactical bridge node (`narrative_bridge_choice`), select **"Intercept Flotilla (Space Invaders)"**.
   - Flag `route_space_invaders = true` is recorded.

3. **Act 2 - Space Invaders:**
   - Active encounter: `poc-space-invaders-1`.
   - Modifier rule check: because `heroicEntry == true`, `MiniGameModifierResolver` applies `extraLives: 0` (high difficulty).
   - Defeat 2 invader waves. Outcome rule evaluates `spaceinvadersScore >= 2000`, setting `reinforcementsReceived = true`.

4. **Act 3 Climax & Terminal Ending:**
   - Proceed to Act 3 Climax: **Asteroids Redux** (`poc-asteroids-redux-1`).
   - Clear the final sector.
   - Branch evaluator routes to `ending_flawless` (`isEndNode = true`).
   - `MetaProgressionService` records run completion for `ending_flawless` and unlocks modifier `"hyper_drift"`.

---

## 🛡️ Path 2: Support Route (Pyrrhic Victory)

1. **Act 1 - Assisted Deployment:**
   - Complete Act 1: **Asteroids** with assisted performance (`heroicEntry = false`).

2. **Tactical Choice:**
   - On the tactical choice node, select **"Navigate Debris Channel (Flappy Bird)"**.
   - Flag `route_flappy_bird = true` is recorded.

3. **Act 2 - Flappy Bird:**
   - Active encounter: `poc-flappybird-1`.
   - Modifier rule check: because `heroicEntry == false`, `MiniGameModifierResolver` applies tactical assist buffs (`thrustAssist: true`).
   - Pass 10 debris pipe structures.

4. **Act 3 Climax & Terminal Ending:**
   - Proceed to Act 3 Climax: **Space Invaders Redux** (`poc-spaceinvaders-redux-1`).
   - Repel the final fleet.
   - Branch evaluator routes to `ending_pyrrhic` (`isEndNode = true`).
   - `MetaProgressionService` records run completion for `ending_pyrrhic` and unlocks modifier `"shield_pulse"`.

---

## ✅ Verification Checklist

- [x] **Pipeline Unification:** `CampaignScreen` submits gameplay results exclusively through `ArcadeOrchestrator.submitResult()`.
- [x] **Encounter Resolution:** `MiniGameEncounterRegistry` resolves encounters dynamically without hardcoded gameId `if/else` checks.
- [x] **Domain Modifiers:** Narrative flags (`heroicEntry`) translate to minigame domain modifiers (`extraLives`, `navigationAssist`).
- [x] **Real Telemetry:** `BaseGame.getMiniGameResult()` constructs real scores, durations, and metrics without heuristics.
- [x] **Localization:** Dialogue, cutscenes, and choices pass through `getLocalizedText()` using `src/locales/en.ts` and `es.ts`.
- [x] **Accessibility:** All UI buttons contain `accessibilityRole="button"`, `accessibilityLabel`, and `accessibilityHint`.
- [x] **Cutscene Rendering:** `type: "cutscene"` nodes display speaker names and italicized dialogue lines.
- [x] **Checkpoint Restoration:** Retry after failure invokes `StoryRuntime.forkAt(checkpointId)` to eliminate ghost state.
