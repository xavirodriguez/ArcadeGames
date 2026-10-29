# Sprite readiness audit (`assets/sprites`)

Branch: `chore/sprite-readiness-audit` (from `master`)  
Date: 2026-10-26  

## How the system works

Pipeline for a sprite to **work in-game**:

1. **File on disk** under `assets/sprites/...` (Metro-bundlable PNG).
2. **`SpriteSheetDef` in `SpriteRegistry.ts`**
   - `require(...)` of the PNG
   - either measured `frames` rows **or** `sourceMode: "full-image"` for static props
3. **`SpriteRegistry.init()`** registers the def (already called from Tower Defense boot).
4. **Game wiring**
   - `createSpriteAnimator("id")` + `drawSpriteCanvas` / Skia drawer, **or**
   - game-specific drawer that uses the sheet (e.g. Sea Dragon).
5. Optional: dedicated atlas builder under `scripts/sprites/` for grid atlases.

Until (2)+(3)+(4) exist, a PNG is only an **art asset**, not a playable sprite.

---

## Inventory vs readiness

| Asset path | Size (px) | In `SpriteRegistry`? | Used by a game drawer/blueprint? | Status |
|---|---|---|---|---|
| `sprites/enemies/sea_dragon.png` | 640×192 | **Yes** (`sea_dragon`) | **Yes** — Space Invaders Nautical mod | **Ready** |
| `sprites/towers/tower1.png` | 1168×784 | **Yes** as `tower_basic_art` (full-image) | **Yes** — TD Canvas/Skia basic tower | **Ready** (static prop) |
| `sprites/towers/tower2.png` | 1168×784 | **Yes** as `tower_sniper_art` (full-image) | **Yes** — TD sniper tower | **Ready** (static prop) |
| `sprites/enemies/ghost_galleon.png` | 640×192 | **No** | **No** (only generator script) | **Not ready** — atlas exists, no registry entry / drawer |
| `sprites/enemies/enemy2.png` | 924×539 | **No** | **No** | **Not ready** — sheet on disk only |
| `sprites/enemies/enemy3.png` | 1376×768 | **No** | **No** | **Not ready** |
| `sprites/enemies/kapa.png` | 1376×768 | **No** | **No** | **Not ready** |
| `sprites/enemies/kichisake-onna.png` | 1376×768 | **Yes** (`echorunner_kuchisake_onna`) | **Yes** — Echo Runner player (Canvas + Skia, pixel fallback) | **Ready** — measured source rectangles; contact-sheet labels excluded |
| `sprites/enemies/lancero.png` | 1376×768 | **No** | **No** | **Not ready** |
| `sprites/enemies/qiongqi.png` | 1376×768 | **No** | **No** | **Not ready** |
| `sprites/enemies/several_enemies.png` | 1408×768 | **No** | **No** | **Not ready** — likely contact sheet / multi-char |
| `sprites/personaje1.png` | 1376×768 | **No** | **No** | **Not ready** — not wired to any player |
| `sprites/samurai1.png` | 1408×768 | **No** | **No** | **Not ready** — Hit&Run uses `samurai-enemy.png` + atlas JSON instead |
| `sprites/wip/*.jpg` | (WIP) | **No** | **No** | **WIP only** — not for runtime |
| `ship.png` / `favicon` / `icon` / `splash` | app chrome | N/A | Expo shell | **App icons**, not game sprites |

### Ghost entry in registry

`SpriteRegistry` also defines **`oni_red`** pointing at `assets/sprites/enemies/oni_red.png`, but **that file is missing** (404 on master).  
`enemy2.png` is **924×539** — same dimensions documented for the Oni sheet. Likely the art was renamed/copied to `enemy2.png` without updating the registry path.

---

## What is actually working today

| Game | Sprite path | Notes |
|---|---|---|
| **Tower Defense** | `tower1` / `tower2` via `tower_basic_art` / `tower_sniper_art` | Full-image static; vector drawers remain as fallback if image fails |
| **Space Invaders (Nautical)** | `sea_dragon` | Grid atlas + Canvas/Skia drawers in `SeaDragonVisuals.ts` |
| **Hit&Run** | `src/games/hitandrun/assets/samurai-enemy.png` (+ sumi-e theme atlases) | **Separate** pipeline from `assets/sprites/samurai1.png` |

Except for the entries explicitly marked ready above, the remaining sheets under `assets/sprites/enemies/` and `personaje1` / `samurai1` are **not playable** yet.

---

## Gaps to close (priority)

### P0 — Fix broken / almost-ready

1. **`oni_red` path**  
   - Either rename/copy `enemy2.png` → `oni_red.png`, or point `ONI_RED.imageSource` at `enemy2.png`.  
   - Confirm frame rects in `makeRowFrames` still match the sheet.

2. **`ghost_galleon`**  
   - PNG atlas already matches the sea_dragon layout (640×192).  
   - Add `SpriteSheetDef` (rows sail/hit/death per `build-ghost-galleon-atlas.cjs`).  
   - Register in `init()` + Nautical drawers (mirror Sea Dragon).

### P1 — Character sheets (need frame measurement)

These look like full multi-row animation sheets (~1376×768), **not** registered:

- `enemy3`, `kapa`, `kichisake-onna`, `lancero`, `qiongqi`, `personaje1`, `samurai1`

Per-sheet work:

1. Measure rows (idle/walk/attack/…) and cell size.  
2. Add `SpriteSheetDef` with real `frames`.  
3. `SpriteRegistry.init()` + animator on the target game (Hit&Run enemies, player, etc.).  
4. Do **not** use `full-image` for these — that would draw the whole sheet as one sprite.

### P2 — Contact / multi

- `several_enemies.png` — treat as **source art / contact sheet**, not a single runtime sheet, unless sliced into per-enemy atlases.

### P3 — WIP

- `wip/enemies.jpg`, `wip/tower_*.jpg` — keep out of Metro requires until promoted to PNG + registry.

---

## Suggested next commits on this branch

1. Point `oni_red` at `enemy2.png` (or add `oni_red.png` symlink/copy) and verify Hit&Run / any Oni consumer.  
2. Register `ghost_galleon` like `sea_dragon` and hook Nautical bonus ship.  
3. One enemy sheet end-to-end (e.g. `lancero` or `kapa`) as the template for the rest.  
4. Decide whether `samurai1.png` replaces or stays parallel to `samurai-enemy` atlas.

---

## Checklist: “sprite preparado para funcionar”

- [ ] PNG under `assets/sprites/...` (not only `wip/`)  
- [ ] `require` succeeds in `SpriteRegistry`  
- [ ] `SpriteSheetDef` with correct frames **or** `full-image`  
- [ ] Registered in `SpriteRegistry.init()`  
- [ ] Game calls `createSpriteAnimator` / custom drawer  
- [ ] Fallback vector/shape still OK if load fails  
- [ ] Optional: unit test (see `SeaDragonSprite.test.ts`)

**Currently complete for files in your tree:** `sea_dragon`, `tower1`, `tower2` only.  
**Almost:** `ghost_galleon` (file+script, no registry).  
**Broken reference:** `oni_red` (registry without file; likely `enemy2`).  
**Not prepared:** all other enemy/character sheets + `samurai1` / `personaje1` + WIP JPGs.
