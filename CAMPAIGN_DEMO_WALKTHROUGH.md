# Campaign Mode Demo Walkthrough

This guide details step-by-step instructions for testing and validating Campaign Mode across both tactical paths.

---

## 🚀 Setup & Execution

1. **Install dependencies & start development server:**
   ```bash
   pnpm install
   pnpm start
   ```

2. **Run story graph validation:**
   ```bash
   pnpm run validate:story
   ```

---

## 🛤️ Path 1: Heroic Tactical Route

1. **Select Campaign Mode** on main menu.
2. **Read Intro Dialogue**: AI Odyssey 7 reports sector threat.
3. **Play Act 1 (Asteroids)**:
   - Perform clean clearance without losing lives (`heroicEntry = true`).
4. **Dialogue Choice**: Select **"Intercept Flota de Invasores (Space Invaders)"**.
5. **Play Act 2 (Space Invaders)**:
   - Notice `⚔️ HEROIC MODE ACTIVE` badge. Space Invaders runs without extra lives buffer (`extraLives: 0`).
6. **Complete Objective**: Repel 2 invader waves.
7. **Play Act 3 (Asteroids Climax)**:
   - Defeat final sector.
8. **Ending**: Receive **Ending: Flawless Victory** (`ending_flawless`).
9. **Metaprogression**: Verify run completion recorded and `hyper_drift` mutator reward unlocked.

---

## 🛤️ Path 2: Support / Tactical Assist Route

1. **Select Campaign Mode** on main menu.
2. **Read Intro Dialogue**: AI Odyssey 7 reports sector threat.
3. **Play Act 1 (Asteroids)**:
   - Fail or take heavy damage (`heroicEntry = false`).
4. **Dialogue Choice**: Select **"Navegar Canal de Escombros (Flappy Bird)"**.
5. **Play Act 2 (Flappy Bird)**:
   - Notice `🛡️ TACTICAL ASSIST ACTIVE` badge and navigation buff applied.
6. **Complete Objective**: Navigate through 10 debris pipe obstacles.
7. **Play Act 3 (Space Invaders Climax)**:
   - Repel final heavy fleet.
8. **Ending**: Receive **Ending: Pyrrhic Victory** (`ending_pyrrhic`).

---

## ✅ Verification Checklist

- [x] Story campaign pipeline uses single `ArcadeOrchestrator.submitResult()` entrypoint.
- [x] Narrative flags correctly compute and pass modifiers into `switchGame()`.
- [x] All buttons have accessibility labels, roles, and hints.
- [x] Cutscenes display dialogue queue lines without blank screens.
- [x] Save and Load operate cleanly across story runtime and metaprogression.
- [x] Retry restores checkpoint state via `runtime.forkAt(checkpointId)`.
