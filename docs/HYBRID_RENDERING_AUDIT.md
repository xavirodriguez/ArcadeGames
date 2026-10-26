# Hybrid rendering audit (sprites + procedural)

- **Date:** 2026-10-26
- **Base branch / commit:** `master` @ `1c4c16d61610b59c424795c907c80ce8b6b3e732` (includes `docs/SPRITE_SYSTEM_AGENT_GUIDE.md` via PR #919)
- **Definition of hybrid:** a gameplay-relevant `ShapeDrawer` **attempts bitmap presentation** (shared `SpriteRegistry` / `drawSprite*`, local atlas PNG, or equivalent) and, if the bitmap is missing or still loading, **always** draws a **procedural fallback** in the same drawer path. Simulation must not depend on which path painted. Both Canvas and Skia should be registered when the game supports both backends.

**Not hybrid:** pure procedural-only shapes; PNG on disk with no drawer; sprite attempt with **no** fallback (invisible risk); code-defined pixel grids used as the *only* path (classified as procedural / local pixel technique, not PNG+procedural hybrid).

---

## Summary table

| Game | Status | Bitmap path | Procedural path | Hybrid shapes (examples) | Gaps |
|------|--------|-------------|-----------------|--------------------------|------|
| `tower-defense` | **Parcial** | SpriteRegistry `tower_basic_art` / `tower_sniper_art` | Yes — all towers & creeps have vector drawers | `tower_basic`, `tower_sniper` (Canvas + Skia; theme can force procedural) | Creeps (`creep_*`), `tower_rapid`, `tower_frost` procedural-only; no creep sheets wired |
| `space-invaders` | **Parcial** | SpriteRegistry `sea_dragon`, `ghost_galleon` via NauticalMod | Yes — core invaders/player/bullets procedural | `sea_dragon`, `ghost_galleon` (+ alias `ufo`) with fallbacks Canvas+Skia | Default shapes (`invader`, `player_ship`, `boss`, …) never try sprites |
| `hitandrun` | **Parcial** | Registry `lancero`; local `samurai-enemy.png` atlas infra; mono placeholders | Yes — player/enemies/bullets procedural; samurai shape = procedural fallback drawer | `lancero` Canvas: sprite → ellipse fallback | `lancero` **Skia has no procedural fallback** (early return); most enemies procedural-only; samurai atlas systems exist but registered shape is procedural-only |
| `echorunner` | **Solo procedural** (local pixel grids) | Experimental `oni_red` animator + `SpriteRegistry.init()`; **draw path uses `EchoRunnerPixelArt`** | Yes — all registered shapes | — | No hybrid PNG+fallback on player/enemies; pixel-in-code is primary |
| `outrun` | **Solo procedural** (local pixel grids) | `OutrunPixelSprites.ts` (code grids) | Yes — road, HUD, vehicles via Canvas/Skia visuals | — | Intentional low-res grids, not SpriteRegistry hybrid |
| `arkanoid` | **Solo procedural** | none | Yes — Canvas + Skia | — | No sprite pipeline |
| `asteroids` | **Solo procedural** | none | Yes — + visual mods | — | Neon/vector art direction |
| `centipede` | **Solo procedural** | none | Yes — Canvas + Skia | — | No sprite pipeline |
| `flappybird` | **Solo procedural** | none | Yes — Canvas + Skia | — | No sprite pipeline |
| `frogger` | **Solo procedural** | none | Yes — Canvas + Skia | — | No sprite pipeline |
| `galaxian` | **Solo procedural** | none | Yes — Canvas + Skia | — | No sprite pipeline |
| `geometrywars` | **Solo procedural** | none | Yes — Canvas + Skia | — | Neon art direction (hybrid optional) |
| `platformer` | **Solo procedural** | none | Yes — shared tilemap + entity drawers | — | No sprite pipeline |
| `pong` | **Solo procedural** | none | Yes — Canvas + Skia | — | No sprite pipeline |
| `racing` | **Solo procedural** | none | Yes — Canvas + Skia cars/track | — | No sprite pipeline |
| `vertical-shmup` | **Solo procedural** | none | Yes — via `initializeShmupRenderer` + SharedVFX | — | No sprite pipeline |

---

## Counts

| Status | Count | Games |
|--------|------:|-------|
| Híbrido (completo en shapes jugables principales) | **0** | — |
| **Parcial** | **3** | `tower-defense`, `space-invaders`, `hitandrun` |
| **Solo procedural** | **13** | `arkanoid`, `asteroids`, `centipede`, `echorunner`, `flappybird`, `frogger`, `galaxian`, `geometrywars`, `outrun`, `platformer`, `pong`, `racing`, `vertical-shmup` |
| Solo sprite sin fallback | **0** games overall; **1 shape defect** | `lancero` Skia drawer in Hit&Run |
| N/A / shell | **0** | all listed games register shapes |

---

## Per-game findings

### `tower-defense`
- **Status:** Parcial  
- **Evidence:**  
  - `TowerDefenseGame.ts` — `SpriteRegistry.init()`; registers `tower_basic` / `tower_sniper` and all `creep_*`.  
  - `TowerDefenseCanvasVisuals.ts` / `TowerDefenseSkiaVisuals.ts` — `drawTowerBasic` / `drawTowerSniper`: `drawSprite*` then `if (!spriteDrawn) drawTowerBase(...)`.  
  - `tower_rapid` / `tower_frost` and all creeps: procedural only.  
- **Hybrid today:** basic + sniper towers (both backends); paper-dusk theme disables sprite path on purpose.  
- **Remains procedural-only:** creeps, rapid, frost, projectiles.  
- **Risks:** Historical “invisible creeps” if a future sprite path is added without fallback (current creeps are safe procedural).  
- **Next steps:**  
  1. Wire `oni_red` / enemy sheets to creep shapes with hybrid drawers.  
  2. Optional full-image or frames for rapid/frost towers.  
  3. Keep theme gate that forces procedural.

### `space-invaders`
- **Status:** Parcial  
- **Evidence:**  
  - `SpaceInvadersGame.ts` — procedural drawers for `player_ship`, `invader`, `boss`, bullets, shields; mods call `registerDrawers`.  
  - `SeaDragonVisuals.ts` / `GhostGalleonVisuals.ts` — sprite when ready, else `draw*Fallback*`.  
  - `NauticalMod.ts` — registers sea dragon + ghost galleon + `"ufo"` alias.  
- **Hybrid today:** Nautical bonus/ship shapes only.  
- **Remains procedural-only:** default invaders, player, boss, bullets.  
- **Risks:** Low for default mode; Nautical is correctly hybrid.  
- **Next steps:**  
  1. Optional hybrid invader sheets if art ships.  
  2. Ensure bonus-ship spawners set `render.shape` to nautical ids when mod active.

### `hitandrun`
- **Status:** Parcial  
- **Evidence:**  
  - `HitAndRunGame.ts` `registerHitRunRenderers` — procedural enemies/player; `LANCERO_SHAPE` → `drawLanceroSpriteCanvas`; `samurai` → `drawHitRunSamuraiFallback`.  
  - `LanceroSpriteVisuals.ts` — Canvas: ready → sprite else ellipse fallback; **Skia: no image → `return` (no fallback)**.  
  - `SamuraiVisualAssets.ts` + `SamuraiAnimationSystems.ts` — atlas frame mapping; registered drawer is procedural.  
  - `HitRunPlaceholderVisuals.ts` — mono tilemap/fragment/core.  
- **Hybrid today:** `lancero` on Canvas only (full hybrid).  
- **Remains procedural-only:** player, popcorn, wall_trooper, hopper, charger, elite, bullets; samurai presentation path.  
- **Risks:** Skia lancero invisible while loading/missing; lancero may never spawn if waves don’t set `shape = "lancero"`.  
- **Next steps:**  
  1. **P0:** Add Skia procedural fallback mirroring Canvas ellipse.  
  2. Spawn path for lancero in waves if desired.  
  3. Clone lancero hybrid for kapa / kichisake / qiongqi / enemy3 after measuring sheets.  
  4. Optionally merge samurai atlas draw into the registered shape with fallback (true hybrid).

### `echorunner`
- **Status:** Solo procedural (local pixel grids)  
- **Evidence:** `EchoRunnerCanvasVisuals.ts` `drawEchoPlayer` uses `getEchoRunnerSpriteFrame` / `EchoRunnerPixelArt`; `EchoRunnerSpriteSystem` attaches `oni_red` animator but player drawer does not call `drawSprite*`. `SpriteRegistry.init()` at boot is preparatory.  
- **Next steps:** Either document pixel grids as final art, or hybridize player with `oni_red` + keep pixel fallback.

### `outrun`
- **Status:** Solo procedural (local pixel grids)  
- **Evidence:** `OutrunPixelSprites.ts` + Canvas/Skia visuals rasterize authored grids; no SpriteRegistry.  
- **Next steps:** None required for hybrid unless product wants PNG cars; treat as intentional technique (P2).

### `arkanoid` / `asteroids` / `centipede` / `flappybird` / `frogger` / `galaxian` / `geometrywars` / `platformer` / `pong` / `racing` / `vertical-shmup`
- **Status:** Solo procedural  
- **Evidence:** `initializeRenderer` registers Canvas/Skia (or manager) drawers only; `rg` finds no `SpriteRegistry` / `drawSprite*` / game-local PNG atlas for entities.  
- **Notes:** Geometry Wars / Asteroids lean neon-vector by design. Vertical-shmup delegates to shared shmup renderer + VFX.  
- **Next steps:** Adopt hybrid only when sheets exist; clone TD tower or Lancero pattern.

---

## Games still missing hybrid (explicit list)

Games **without** a complete hybrid presentation system (no full coverage of main gameplay shapes):

### P0 — Fix defects / finish partial hybrid where assets or risk exist
1. **`hitandrun`** — Skia `lancero` lacks fallback; expand hybrid to real enemy spawns; optional samurai atlas-in-drawer.  
2. **`tower-defense`** — Creeps still procedural-only while enemy PNGs exist under `assets/sprites/enemies/` (`enemy2`/`oni_red`, etc.). Highest user-visible gap historically (invisible creeps when drawers failed).

### P1 — Partial games / assets on disk
3. **`space-invaders`** — Hybrid only under Nautical mod; core invaders remain procedural (acceptable until invader sheets are productized).  
4. **`echorunner`** — Decide: keep pixel-in-code **or** wire `oni_red` with pixel fallback (true hybrid).

### P2 — Procedural-first by art direction (hybrid optional)
5. `geometrywars`, `asteroids`, `galaxian`, `centipede`, `flappybird`, `frogger`, `arkanoid`, `pong`  
6. `outrun`, `racing` (projection / track games; pixel grids already a technique in Out Run)  
7. `platformer`, `vertical-shmup`

**None** of the 16 games is fully hybrid across all primary shapes. **Three** are partial. **Thirteen** are procedural-only (two of which use local code pixel grids).

---

## Method notes

Searches run from repo root on `master` @ `1c4c16d`:

```bash
rg -n "SpriteRegistry|drawSpriteCanvas|drawSpriteSkia|createSpriteAnimator" src/games --glob '*.ts'
rg -n "registerShape|initializeRenderer" src/games/*/*Game.ts
rg -n "PixelArt|PixelSprites|samurai-enemy" src/games --glob '*.ts'
```

Manual reads: TD tower drawers, SI SeaDragon/GhostGalleon, Hit&Run `registerHitRunRenderers` + `LanceroSpriteVisuals`, EchoRunner player drawer, OutrunPixelSprites, sample procedural games’ `initializeRenderer`.

**Limitations:** Did not execute games in browser; spawn-rate of `lancero` / nautical shapes not verified at runtime; theme packs may disable sprites (TD paper-dusk) — counted as intentional override inside hybrid drawers. `shared/` is not a game.

**Reference:** `docs/SPRITE_SYSTEM_AGENT_GUIDE.md` (presentation contract: sprites **or** procedural for every game; hybrid recommended when a sheet exists).
