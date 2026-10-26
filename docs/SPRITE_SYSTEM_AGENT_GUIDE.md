# Sprite System — Agent Knowledge Guide

> **Audience:** any AI agent (or human) that must add, fix, wire, or debug sprites in ArcadeGames.  
> **Scope:** shared `SpriteRegistry` pipeline + how it integrates with games + the parallel Hit&Run atlas path.  
> **Repo paths are relative to repository root.**  
> **Last aligned with branch:** `chore/sprite-readiness-audit` (2026-10).

---

## 1. Mental model (read this first)

A PNG under `assets/sprites/` is **not** a playable sprite. It becomes playable only when **all** of these exist:

| Step | What | Where |
|------|------|--------|
| 1 | File on disk (Metro-bundlable PNG) | `assets/sprites/...` |
| 2 | `SpriteSheetDef` + `require(...)` | `src/games/shared/sprites/SpriteRegistry.ts` |
| 3 | Registered in `SpriteRegistry.init()` | same file |
| 4 | Game calls `SpriteRegistry.init()` at boot | e.g. `TowerDefenseGame.ts`, `HitAndRunGame.ts` |
| 5 | Shape drawer that uses animator + `drawSpriteCanvas` / `drawSpriteSkia` | game `*Visuals.ts` or shared template |
| 6 | Shape registered on the renderer | `registerShape("shape_id", drawer)` |
| 7 | Entity has `Render.shape = "shape_id"` (or equivalent blueprint) | ECS / blueprint |

Until steps 2–6 exist, the asset is **art only**. Vector/procedural drawers often act as fallbacks while images load or if registration is missing.

There is a **second, independent pipeline** for Hit&Run samurai (atlas JSON + AnimationSystem). Do not mix the two without an explicit migration.

---

## 2. Core modules (shared pipeline)

Location: `src/games/shared/sprites/`

| File | Responsibility |
|------|----------------|
| `SpriteTypes.ts` | `SpriteFrameRect`, `SpriteAnimationDef`, `SpriteSheetDef`, `SpriteAnimatorComponent`, `SpriteImageSource` |
| `SpriteRegistry.ts` | `require` of PNGs, sheet defs, `register` / `get` / `has` / `init` |
| `SpriteAnimator.ts` | `createSpriteAnimator`, `updateSpriteAnimator`, `playAnimation`, `getCurrentFrameRect` |
| `SpriteDrawer.ts` | Canvas/Skia image caches, `preload*`, `drawSpriteCanvas`, `drawSpriteSkia`, `isCanvasSpriteReady`, `getSkiaImage` |
| `index.ts` | Re-exports the above |
| `LanceroSpriteVisuals.ts` | **Template** end-to-end shape drawers (Canvas) for a character sheet |
| `README.md` | Short human quick-start (keep in sync when APIs change) |
| `__tests__/SpriteRegistry.test.ts` | Registry smoke tests |

### 2.1 Types that matter

```ts
interface SpriteFrameRect { x: number; y: number; w: number; h: number }

interface SpriteAnimationDef {
  name: string;
  frames: SpriteFrameRect[];
  frameDuration: number; // seconds per frame
  loop: boolean;
}

interface SpriteSheetDef {
  id: string;
  imageSource: SpriteImageSource; // Metro require number, URI, or null
  frameWidth: number;   // logical size in world units (collision / fit)
  frameHeight: number;
  sourceMode?: "frames" | "full-image"; // default = frames
  anchor?: { x: number; y: number };    // default {0.5, 1} = feet
  animations: Record<string, SpriteAnimationDef>;
}

interface SpriteAnimatorComponent {
  sheetId: string;
  currentAnim: string;
  frameIndex: number;
  timer: number;
  flipX: boolean;
  scale: number;
  offsetX?: number;
  offsetY?: number;
}
```

- **`sourceMode: "full-image"`** — entire PNG is one static frame; `animations.idle.frames` is `[]`. Used for towers. Drawer fits the image into `frameWidth × frameHeight` preserving aspect.
- **`sourceMode` omitted / `"frames"`** — animation rows with measured rectangles. Used for characters and grid atlases (sea_dragon, ghost_galleon, lancero, oni_red).

### 2.2 Registry API

```ts
SpriteRegistry.register(def);
SpriteRegistry.get(id);   // SpriteSheetDef | undefined
SpriteRegistry.has(id);
SpriteRegistry.init();    // registers all built-in sheets
```

`init()` is **idempotent in practice** (re-register same ids) but must be called before any draw that uses a sheet. Games that use the shared pipeline call it in boot / `initializeRenderer` / entity init.

### 2.3 Animator API

```ts
const a = createSpriteAnimator("sea_dragon", "fly");
updateSpriteAnimator(a, dt);           // returns true when non-loop anim finishes
playAnimation(a, "death", true);       // force restart
getCurrentFrameRect(a);                // current source rect or null
```

Animator is a **plain object**, not an ECS component by default. Games either:

- Keep one shared animator per shape (static props, towers), or
- Store animators in a `WeakMap` keyed by world/entity (Lancero / SeaDragon pattern), or
- Attach equivalent fields on an ECS component and mirror the API.

### 2.4 Drawer API

```ts
// Returns false while loading or if sheet/frame missing → caller should keep vector fallback.
drawSpriteCanvas(ctx, animator, x, y, options?: { anchor?: "feet"|"center"; opacity?: number }): boolean
drawSpriteSkia(canvas, animator, x, y, paint?, options?): boolean

preloadSpriteSheetCanvas(sheetId): Promise<void>
preloadSpriteSheetSkia(sheetId): Promise<void>
isCanvasSpriteReady(sheetId): boolean
getSkiaImage(sheetId): SkImage | undefined
getSpriteLogicalSize(sheetId): { w, h } | null
```

Important behaviours:

- Separate caches for Canvas vs Skia; failed loads are remembered so retries do not spin forever without reset.
- Draw returns `false` until the image is in cache → **always** pair with a procedural silhouette/fallback so entities are never invisible while loading.
- Default anchor is **feet** (`y` at bottom of sprite). Override via sheet `anchor` or draw options.

---

## 3. Asset layout

```
assets/sprites/
  enemies/
    sea_dragon.png          # 640×192 grid atlas — READY
    ghost_galleon.png       # 640×192 grid atlas — READY (registry + Nautical)
    enemy2.png              # 924×539 — used as oni_red art
    lancero.png             # 1376×768 multi-row — provisional grid in registry
    kapa.png, kichisake-onna.png, qiongqi.png, enemy3.png  # same class, NOT registered
    several_enemies.png     # contact sheet — do not register as one runtime sheet
  towers/
    tower1.png, tower2.png  # full-image static props — READY
  samurai1.png, personaje1.png   # concept / unused by shared registry
  wip/*.jpg                 # never require from runtime code
```

**Metro rule:** only static `require("...png")` paths work in the bundle. Dynamic strings break. Wrap requires in `try/catch` so missing files become `null` instead of crashing the module graph (see `SpriteRegistry.ts`).

---

## 4. Currently registered sheets (`SpriteRegistry.init`)

| id | Mode | Logical frame | Notes |
|----|------|---------------|--------|
| `oni_red` | frames | 56×90 | Art path = `enemy2.png` (fallback `oni_red.png`) |
| `sea_dragon` | frames | 40×32 | SI Nautical; anims `fly` / `hit` / `death` |
| `ghost_galleon` | frames | 40×32 | SI Nautical; anims `sail` / `hit` / `death`; also bound to shape `"ufo"` |
| `lancero` | frames | 48×64 | Provisional cell 172×192; template for other 1376×768 sheets |
| `tower_basic_art` | full-image | 34×34 | TD basic tower |
| `tower_sniper_art` | full-image | 34×34 | TD sniper tower |

Helper used for row layouts:

```ts
function makeRowFrames(startX, startY, frameW, frameH, count, spacing = 96): SpriteFrameRect[]
```

For tight grid atlases (sea_dragon style), pass `spacing === frameW`.

---

## 5. How games wire sprites

### 5.1 Tower Defense (full-image props)

- Boot: `SpriteRegistry.init()` in `TowerDefenseGame.ts`.
- Drawers: `TowerDefenseCanvasVisuals.ts` / `TowerDefenseSkiaVisuals.ts`.
- Shared animators: `createSpriteAnimator("tower_basic_art")` (static idle).
- Pattern: try `drawSpriteCanvas` / Skia; if `false`, draw vector tower.

### 5.2 Space Invaders — Nautical mod (grid atlas + shape alias)

- Sheets: `sea_dragon`, `ghost_galleon`.
- Visual modules:
  - `src/games/space-invaders/rendering/SeaDragonVisuals.ts`
  - `src/games/space-invaders/rendering/GhostGalleonVisuals.ts`
- Registration: `NauticalMod.registerDrawers` registers both Canvas and Skia for:
  - `SEA_DRAGON_SHAPE` / `GHOST_GALLEON_SHAPE`
  - classic shape `"ufo"` → ghost galleon drawers (theme remap).
- Animators often live in a `WeakMap` per world; animation advanced from tick delta (`1/60` fixed step).
- Atlas builders (optional regenerate):  
  `scripts/sprites/build-sea-dragon-atlas.cjs`  
  `scripts/sprites/build-ghost-galleon-atlas.cjs`  
  shared helpers: `scripts/sprites/atlas-kit.cjs`

### 5.3 Hit&Run — shared registry path (lancero template)

- `HitAndRunGame.ts` calls `SpriteRegistry.init()` and `registerShape(LANCERO_SHAPE, drawLanceroSpriteCanvas)`.
- Template file: `src/games/shared/sprites/LanceroSpriteVisuals.ts`.
- Pattern to copy for `kapa` / `kichisake` / `qiongqi` / `enemy3`:
  1. Measure cells → `SpriteSheetDef` in registry.
  2. Clone Lancero drawers (or parameterize by sheet id).
  3. `registerShape` in the game that spawns that enemy.
  4. Blueprint / wave director sets `render.shape`.

### 5.4 Hit&Run — **separate** samurai pipeline (do not confuse)

**Not** driven by `SpriteRegistry`.

| Piece | Path |
|-------|------|
| PNG | `src/games/hitandrun/assets/samurai-enemy.png` |
| Atlas | `samurai-enemy.atlas.json` |
| Anim defs | `samurai-enemy.animations.json` + `SamuraiVisualAssets.ts` (`SAMURAI_ANIMATIONS`) |
| Systems | `SamuraiAnimationSystems.ts` |
| Decision | `samurai1.png` under `assets/sprites/` is **concept art only**; runtime stays on `samurai-enemy` until an explicit migration measures cells and rewires AnimationSystem |

Agent rule: if the task is “make Hit&Run player look like samurai1”, treat it as a **migration project**, not a one-line registry change.

---

## 6. End-to-end checklist: add a new character sprite

Use this sequence; skip steps only when intentionally static.

1. **Place PNG** under `assets/sprites/enemies/<name>.png` (or towers/). Prefer PNG, not JPG. Avoid `wip/`.

2. **Measure the sheet**
   - Open in an image editor; note total size, row count, cell size, padding/spacing.
   - Character sheets in this repo often ≈1376×768 with ~8 frames × 4–5 rows (idle/walk/attack/hurt/death).
   - Grid atlases like sea_dragon: 640×192, 40×32 cells, spacing = cell width.

3. **Add `require` + `SpriteSheetDef` in `SpriteRegistry.ts`**
   ```ts
   let fooSource: SpriteImageSource = null;
   try { fooSource = require("../../../../assets/sprites/enemies/foo.png"); } catch { fooSource = null; }

   const FOO: SpriteSheetDef = {
     id: "foo",
     imageSource: fooSource,
     frameWidth: 48,   // logical world size (tune vs collider)
     frameHeight: 64,
     anchor: { x: 0.5, y: 1 },
     animations: {
       idle:   { name: "idle",   frames: makeRowFrames(0, 0, CELL_W, CELL_H, 8, CELL_W), frameDuration: 0.12, loop: true },
       walk:   { name: "walk",   frames: makeRowFrames(0, CELL_H, CELL_W, CELL_H, 8, CELL_W), frameDuration: 0.09, loop: true },
       // ...
     },
   };
   ```
   Register inside `init()`: `this.register(FOO)`.

4. **Create or extend a Visuals module**
   - Prefer cloning `LanceroSpriteVisuals.ts` or `SeaDragonVisuals.ts`.
   - Export `FOO_SHAPE = "foo"`, Canvas drawer (and Skia if the game uses Skia).
   - Inside drawer: ensure registry init, get/create animator, `updateSpriteAnimator`, `drawSprite*`; on `false`, draw a mono silhouette.

5. **Register the shape** on the game’s renderer (`registerShape(FOO_SHAPE, drawFooCanvas)` and Skia twin if needed).

6. **Spawn path**: blueprint or wave system must set `Render.shape = "foo"` (and visibility). Registration of blueprints must happen **before** level generation (see Hit&Run tilemap/collectible lesson).

7. **Boot**: game already calls `SpriteRegistry.init()` or you add the call once.

8. **Verify**
   - Image appears (not only “turrets shoot invisible enemies”).
   - Loading: brief fallback then sprite is OK; permanent fallback ⇒ require path wrong or Metro miss.
   - Wrong frames ⇒ adjust `makeRowFrames` start/spacing/size.
   - Both backends if the game supports Canvas + Skia.

9. **Tests**: extend `SpriteRegistry.test.ts` for the new id; add drawer smoke if the game has visual tests.

---

## 7. Full-image static props (towers, props)

```ts
const PROP: SpriteSheetDef = {
  id: "my_prop",
  imageSource: propSource,
  frameWidth: 34,
  frameHeight: 34,
  sourceMode: "full-image",
  anchor: { x: 0.5, y: 0.5 },
  animations: {
    idle: { name: "idle", frames: [], frameDuration: 1, loop: true },
  },
};
```

Drawer uses whole image bounds; logical size is a fit box. One shared `createSpriteAnimator("my_prop")` is enough.

---

## 8. Debugging playbook

| Symptom | Likely cause | Action |
|---------|--------------|--------|
| Entity targeted / collides but invisible | Shape drawer missing or throws; registry not inited; image never loads | Register shape; wrap drawer in try/catch; call `SpriteRegistry.init()`; check `require` path |
| Permanent vector fallback | `imageSource` null (failed require) or load failure cached | Fix path; clear failed-load sets in drawer if hot-reloading; confirm PNG in Metro |
| Wrong crop / sliding frames | Bad `makeRowFrames` numbers | Re-measure sheet; set `spacing` = cell width for tight grids |
| Works on Canvas, black on native | Skia drawer not registered or Skia preload never called | Register Skia twin; call `preloadSpriteSheetSkia` / `getSkiaImage` |
| Blueprint warnings `tilemap` / collectibles | Unrelated to sprites but blocks spawns | Register blueprints **before** `generateAndInstantiatePlatformerLevel` |
| “oni_red” missing file | Historical rename | Registry already points at `enemy2.png`; keep id stable |
| samurai1 not showing in Hit&Run | Different pipeline | See §5.4 — not a registry issue |

**Never** leave entities without a fallback draw path. Invisible enemies with working AI is the most common failure mode in this codebase.

---

## 9. Parallel systems (do not unify casually)

| System | Used by | Entry points |
|--------|---------|--------------|
| Shared `SpriteRegistry` | TD towers, SI Nautical dragons/galleon, lancero template, oni_red | `src/games/shared/sprites/*` |
| Hit&Run samurai atlas | Hit&Run player / enemy art | `SamuraiVisualAssets.ts`, atlas JSON, AnimationSystem |
| Procedural / vector drawers | Most games as primary or fallback | `*CanvasVisuals.ts`, `*SkiaVisuals.ts`, mono placeholders |
| Echo Runner / Out Run pixel grids | Those games only | Own pixel modules + polish wave docs |

Aesthetic themes (ink-world, paper-dusk, etc.) may **disable** sprite draws and force vector looks — check theme flags in the drawer before assuming a bug.

---

## 10. Atlas generation scripts

```
scripts/sprites/
  atlas-kit.cjs
  build-sea-dragon-atlas.cjs
  build-ghost-galleon-atlas.cjs
```

Run from repo root with Node when regenerating procedural outline atlases. Character photo/paint sheets are usually hand-measured, not generated.

---

## 11. Agent decision tree

```
Is the task about Hit&Run samurai / samurai1?
  YES → read SamuraiVisualAssets + atlas JSON; do not only edit SpriteRegistry
  NO  → continue

Is the PNG already under assets/sprites and in SpriteRegistry.init()?
  NO  → add require + SpriteSheetDef + init() entry
  YES → continue

Does a ShapeDrawer exist that calls drawSpriteCanvas/Skia for this id?
  NO  → add Visuals module (clone Lancero or SeaDragon) + registerShape
  YES → continue

Does the entity’s Render.shape match the registered shape id?
  NO  → fix blueprint / spawner / mod alias
  YES → debug load path, frame rects, theme flags, backend parity
```

---

## 12. Reference implementations (copy these)

| Goal | Copy from |
|------|-----------|
| Character multi-row sheet + Canvas shape | `LanceroSpriteVisuals.ts` + `LANCERO` in `SpriteRegistry.ts` |
| Grid atlas + Canvas/Skia + mod registration | `SeaDragonVisuals.ts` + `NauticalMod.ts` |
| Bonus ship / shape alias | `GhostGalleonVisuals.ts` + `"ufo"` registers in NauticalMod |
| Static prop full-image | `TOWER_BASIC_ART` + TD Canvas/Skia tower drawers |
| Safe require | try/catch blocks at top of `SpriteRegistry.ts` |
| Fallback when image not ready | any TD tower drawer (`drawSprite*` then vector) |

---

## 13. Related docs

- `docs/SPRITE_READINESS_AUDIT.md` — inventory vs readiness (may lag code; trust registry + this guide).
- `src/games/shared/sprites/README.md` — short quick-start.
- `docs/ARCADE_SPRITE_POLISH_WAVE1.md` — polish that is often vector/pixel, not registry sheets.
- Space Invaders art bible notes referenced inside `SeaDragonVisuals.ts`.

---

## 14. Non-goals / hard rules for agents

1. Do **not** `require` files under `assets/sprites/wip/`.
2. Do **not** register contact sheets (`several_enemies.png`) as a single runtime sheet.
3. Do **not** replace Hit&Run `samurai-enemy` with `samurai1` without measuring cells and migrating AnimationSystem.
4. Do **not** remove vector fallbacks when adding sprites.
5. Prefer keeping stable **ids** (`oni_red`) even if the PNG filename changes.
6. Always register blueprints **before** procedural level generation.
7. Match Canvas and Skia registration when the game supports both backends.

---

*End of guide. When the registry or drawer API changes, update sections 2, 4, and 12 in the same PR.*
