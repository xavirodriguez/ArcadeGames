# Manual QA Checklist: Multi-Game Campaign End-to-End Pipeline

**Objective:** Verify that the multi-game campaign flow (`proofOfConceptStoryGraph` / `MultiGameStoryProofOfConcept` via `CampaignScreen`) operates smoothly, deterministically, and reliably across minigame transitions on target devices and emulators.

---

## Prerequisites
- App running in development or preview build on emulator/device (`pnpm start` or native client).
- Campaign storage slot initialized (`default_slot`).

---

## QA Test Scenarios

### 1. Full Campaign Walkthrough (End-to-End Execution)
- [ ] Load `CampaignScreen` with `proofOfConceptStoryGraph`.
- [ ] Play through the campaign sequentially without using debug skip options:
  - **Start Node** (Crisis at the station dialogue).
  - **Act 1 Intro Cutscene** (Orbital deployment).
  - **Act 1 Gameplay: Asteroids** (`act1_asteroids_gameplay`).
  - **Performance Evaluation Cutscene/Dialogue** (`cutscene_trans_to_spaceinvaders`).
  - **Act 2 Gameplay: Space Invaders** (`act2_spaceinvaders_gameplay`).
  - **Visual Transition Cutscene** (`cutscene_trans_to_asteroids_redux`).
  - **Act 3 Gameplay: Asteroids Redux** (`act3_asteroids_redux_gameplay`).
  - **Final Ending Cutscene** (`ending_flawless`, `ending_pyrrhic`, or `ending_survival`).
- [ ] Verify that the final screen displays the terminal ending node overlay (`isEndNode: true`) with the "Restart Campaign" action available.

### 2. Scene Switch Visual Parity & Zero Leak Inspection
- [ ] Observe minigame transitions (`switchGame`) between Asteroids and Space Invaders:
  - Confirm **no screen flickers**, black screen freezes, or unrendered white boxes occur during canvas teardown and re-initialization.
  - Confirm audio/loop teardown: previous game sounds/music stop immediately upon entering transition.
  - Confirm frame rate remains stable (no memory accumulation or duplicated entity loops from double instances).

### 3. Campaign Persistence (Save / Load State Integrity)
- [ ] In the middle of an active minigame phase (e.g. Act 2 Space Invaders), tap the **Save** toolbar button.
- [ ] Reload the app or tap the **Load** button (`handleSave`/`handleLoad`).
- [ ] Confirm that:
  - The correct minigame (`activeGameId`) and initial seed (`activeGameSeed`) are fully restored.
  - Narrative flags, variables (e.g. `asteroidLevelReached`, `spaceinvadersScore`), and current node ID (`currentNodeId`) match the exact state prior to saving.

### 4. Phase Replay & Ghost State Elimination
- [ ] Trigger a retry/replay of a failed or completed gameplay phase (or invoke checkpoint reload).
- [ ] Inspect narrative flags and dialogue options:
  - Confirm no leftover "ghost" state from failed runs (e.g. temporary flags or incorrect branching dialogues) persists into the retried attempt.
  - Confirm objective counters reset appropriately for the retried phase.

### 5. Seed Determinism vs. Seed Variability Verification
- [ ] **Deterministic Run (2-3 attempts):** Execute the full campaign using the same explicit seed (e.g., `seed = 123456`). Ensure exact player input choices produce identical modifier values, enemy wave compositions, and narrative outcomes.
- [ ] **Variability Run (1 attempt):** Execute the campaign with a different initial seed (e.g., `seed = 987654`). Confirm expected minigame layout/modifier adjustments vary while preserving narrative structural consistency.

### 6. Defect Logging Criteria
Log a bug immediately in the issue tracker if any of the following occur:
- **Crash / Exception:** Unhandled JS exception or native crash during `switchGame` or `submitGameplayResult`.
- **Console Warnings:** Any warning related to unmounted component state updates, unhandled promise rejections, or duplicate `EventBus` subscriptions.
- **Narrative Inconsistency:** Mismatch between `currentNodeId` in `StoryRuntime` and the UI scene/dialogue overlay presented to the user.
