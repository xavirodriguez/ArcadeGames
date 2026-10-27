# Presentation System — Agent Knowledge Guide  
### (Sprites **or** procedural rendering for every game)

> **Audience:** any AI agent (or human) that must add, fix, wire, or debug visuals in ArcadeGames.  
> **Core rule:** every game that lives in this system **must** be able to present entities via **sprites** and/or **procedural rendering**. Neither path is exclusive; the shared contract is `ShapeDrawer` + `registerShape`.  
> **Repo paths are relative to repository root.**  
> **Aligned with:** `docs/sprite-system-agent-guide` / registry work on `chore/sprite-readiness-audit` (2026-10).

---

## 0. Architecture contract (read this first)

### 0.1 What every game shares

All games use the same ECS presentation surface from `@tiny-aster/core`:

```ts
// packages/core/src/rendering/Renderer.ts
interface Renderer<TRegistry, TContext> {
  readonly type: string; // "canvas" | "skia" | ...
  render(world, ctx, interpolation?): void;
  registerShape(name: string, drawer: ShapeDrawer<TContext, TRegistry>): void;
  registerBackgroundEffect(name: string, drawer: EffectDrawer<...>): void;
}

interface ShapeDrawer<TContext, TRegistry> {
  draw(context: TContext, world: World<TRegistry>, entity: number): void;
}
```

- Entities carry a `Render` component with a **`shape` string** (e.g. `"invader"`, `"tower_basic"`, `"lancero"`).
- At boot, the game's `initializeRenderer(renderer)` registers one `ShapeDrawer` per shape **per backend** (Canvas and/or Skia).
- **How** the drawer paints is an implementation detail of the game (or a shared module). The engine does not care whether the pixels come from a PNG atlas or from `path` / `fillRect` math.

### 0.2 Two first-class presentation strategies

| Strategy | Meaning | Typical modules |
|----------|---------|-----------------|
| **Procedural** | Geometry, silhouettes, neon, pixel grids, particles drawn with API calls (Canvas 2D or Skia). No image asset required at runtime. | `*CanvasVisuals.ts`, `*SkiaVisuals.ts`, `ProceduralShapeUtils.ts`, Echo/OutRun pixel modules |
| **Sprites** | Bitmap frames from PNG sheets (or local atlases), driven by animator + drawer. | `src/games/shared/sprites/*`, game-local atlas (Hit&Run samurai), optional game-local pixel blit |

**Rules for agents:**

1. **Every game may use either strategy** for any shape. Prefer the one that matches art direction and asset readiness.
2. **Hybrid is the production default when a sheet exists:** try the sprite; if load fails or sheet is missing, draw procedural. Never leave an entity with no draw path.
3. **Simulation is independent of presentation.** Colliders, AI, and scoring must not depend on whether the drawer used a PNG or a vector path.
4. **Both backends matter.** If a game supports Canvas and Skia, register drawers for both (parity), whether procedural or sprite-based.
5. **Themes can override.** Some themes force procedural (e.g. paper-dusk / ink) even when a sprite sheet is registered — check theme flags inside the drawer.

### 0.3 Mental model: "playable visual"

An entity is **visually playable** when:

1. Something sets `Render.shape = "<id>"` (blueprint, spawner, or mod).
2. `initializeRenderer` registered a drawer for that shape on the active backend.
3. The drawer always produces pixels (sprite **or** procedural fallback).

A PNG under `assets/sprites/` alone is **not** enough. A pure procedural drawer with no PNG is a complete, valid solution.

---

## 1. Where presentation code lives

```
packages/core/src/rendering/     # Renderer, ShapeDrawer contracts
src/games/shared/
  sprites/                       # Shared sprite pipeline (optional tool)
  rendering/                     # Shared procedural helpers, VFX, tilemaps
src/games/<game>/
  *Game.ts                       # initializeRenderer → registerShape(...)
  rendering/*CanvasVisuals.ts    # Procedural and/or sprite-backed drawers
  rendering/*SkiaVisuals.ts
  mods/                          # Optional theme packs that swap drawers
assets/sprites/                  # Optional bitmap sheets for the shared pipeline
```

Games in the repo today (all subject to the dual-strategy rule):

`arkanoid`, `asteroids`, `centipede`, `echorunner`, `flappybird`, `frogger`, `galaxian`, `geometrywars`, `hitandrun`, `outrun`, `platformer`, `pong`, `racing`, `space-invaders`, `tower-defense`, `vertical-shmup`, …

Most ship **procedural-first**. A subset already wires the shared sprite registry (TD towers, SI Nautical, Hit&Run lancero template). Echo Runner / Out Run use **local pixel grids** (procedural-style bitmaps, not `SpriteRegistry`).

---

## 2. Procedural rendering (baseline for every game)

### 2.1 Pattern

```ts
// In <Game>.ts initializeRenderer:
if (renderer.type === "canvas") {
  renderer.registerShape("enemy", drawEnemyCanvas);
} else if (renderer.type === "skia") {
  renderer.registerShape("enemy", drawEnemySkia);
}

// In *CanvasVisuals.ts:
export const drawEnemyCanvas: ShapeDrawer = {
  draw(ctx, world, entity) {
    const transform = world.getComponent(entity, "Transform");
    const render = world.getComponent(entity, "Render");
    if (!transform || !render?.visible) return;
    // pure Canvas path / fill / gradient — no require()
    ctx.save();
    ctx.translate(transform.x, transform.y);
    // ... silhouette, accents, squash, facing ...
    ctx.restore();
  }
};
```

### 2.2 Shared procedural helpers

| Module | Role |
|--------|------|
| `src/games/shared/rendering/ProceduralShapeUtils.ts` | Deterministic silhouettes, grid displacement, pure math shared by Canvas/Skia |
| `src/games/shared/rendering/renderingUtils.ts` | Common draw helpers over ECS components |
| `src/games/shared/rendering/SharedVFX.ts` | Cross-game VFX shapes (shockwave, thruster, etc.) |
| `src/games/shared/rendering/CanvasNeonUtils.ts` | Neon / glow primitives |
| Game `*Palette.ts` / theme packs | Colours and tokens; keep simulation free of palette imports when possible |

### 2.3 When to stay procedural

- No finished sheet yet (most of `assets/sprites/enemies/*` historically).
- Strong vector / neon / ink art direction (Geometry Wars, many SI themes, Asteroids).
- Deterministic tiny pixel art defined in code (Echo Runner frames, Out Run cars) without Metro image deps.
- CI / headless: procedural drawers never depend on image load.

### 2.4 Mono / diagnostic placeholders

Hit&Run uses monochrome procedural shapes (`HitRunPlaceholderVisuals.ts`) for tilemap / collectibles so missing blueprints still show *something*. Prefer this over invisible entities while assets or registry entries are unfinished.

---

## 3. Shared sprite pipeline (optional tool, available to all games)

Location: `src/games/shared/sprites/`

Any game **may** adopt this pipeline for any shape. It is not reserved for Tower Defense or Space Invaders.

| File | Responsibility |
|------|----------------|
| `SpriteTypes.ts` | `SpriteFrameRect`, `SpriteAnimationDef`, `SpriteSheetDef`, `SpriteAnimatorComponent` |
| `SpriteRegistry.ts` | `require` of PNGs, sheet defs, `register` / `get` / `has` / `init` |
| `SpriteAnimator.ts` | `createSpriteAnimator`, `updateSpriteAnimator`, `playAnimation`, `getCurrentFrameRect` |
| `SpriteDrawer.ts` | Canvas/Skia caches, preload, `drawSpriteCanvas`, `drawSpriteSkia` |
| `LanceroSpriteVisuals.ts` | **Template** ShapeDrawers that bridge registry → `registerShape` |
| `index.ts` | Re-exports |

### 3.1 Types

```ts
interface SpriteSheetDef {
  id: string;
  imageSource: SpriteImageSource; // Metro require number | URI | null
  frameWidth: number;             // logical world size
  frameHeight: number;
  sourceMode?: "frames" | "full-image";
  anchor?: { x: number; y: number }; // default feet {0.5, 1}
  animations: Record<string, SpriteAnimationDef>;
}
```

- **`sourceMode: "full-image"`** — whole PNG is one static frame (`frames: []`). Towers use this.
- **`"frames"` (default)** — measured rectangles per animation row. Characters and grid atlases.

### 3.2 Registry API

```ts
SpriteRegistry.init();           // call once at game boot if any sheet is used
SpriteRegistry.get(id);
SpriteRegistry.has(id);
SpriteRegistry.register(def);    // usually only inside init()
```

Wrap every `require("...png")` in `try/catch` so a missing file yields `null` instead of breaking the module graph.

### 3.3 Animator + drawer API

```ts
const a = createSpriteAnimator("sea_dragon", "fly");
updateSpriteAnimator(a, dt);     // true when non-loop anim finishes
playAnimation(a, "death", true);

// Returns false while loading or if sheet missing → caller must procedural-fallback
drawSpriteCanvas(ctx, a, x, y, options?): boolean
drawSpriteSkia(canvas, a, x, y, paint?, options?): boolean
```

### 3.4 Sheets registered in `SpriteRegistry.init()` today

| id | Mode | Notes |
|----|------|--------|
| `oni_red` | frames | Art = `enemy2.png` (id kept stable) |
| `sea_dragon` | frames | SI Nautical |
| `ghost_galleon` | frames | SI Nautical; also bound to shape `"ufo"` |
| `lancero` | frames | Provisional grid; template for other 1376×768 sheets |
| `tower_basic_art` / `tower_sniper_art` | full-image | TD |

### 3.5 Hybrid ShapeDrawer pattern (recommended)

```ts
export const drawFooCanvas: ShapeDrawer = {
  draw(ctx, world, entity) {
    const transform = world.getComponent(entity, "Transform");
    const render = world.getComponent(entity, "Render");
    if (!transform || !render?.visible) return;

    if (!SpriteRegistry.has("foo")) SpriteRegistry.init();
    const animator = getOrCreateAnimator(world, entity, "foo");
    updateSpriteAnimator(animator, dtFromTick);

    const drawn = drawSpriteCanvas(ctx, animator, transform.x, transform.y, {
      opacity: render.opacity,
    });
    if (!drawn) {
      drawFooProceduralFallback(ctx, transform, render); // always implement this
    }
  },
};
```

---

## 4. Game-local sprite-like paths (still valid)

Not everything bitmap goes through `SpriteRegistry`. These remain legitimate under the dual-strategy rule:

| Path | Used by | Notes |
|------|---------|--------|
| Hit&Run samurai atlas | Hit&Run | `samurai-enemy.png` + `.atlas.json` + AnimationSystem — **not** shared registry. `assets/sprites/samurai1.png` is concept art only until an explicit migration. |
| Echo Runner pixel frames | Echo Runner | Code-defined grids in `EchoRunnerPixelArt.ts`; Canvas/Skia blit |
| Out Run pixel vehicles | Out Run | `OutrunPixelSprites.ts`; controlled low-res grids |

Agent rule: if the task mentions these assets, open their local modules first; do not assume `SpriteRegistry` is involved.

---

## 5. How games wire presentation today (map)

| Game | Dominant strategy | Sprite / bitmap notes |
|------|-------------------|------------------------|
| Tower Defense | Procedural creeps + **sprite towers** | `tower_*_art` full-image; hybrid drawers |
| Space Invaders | Procedural invaders + **Nautical sprite ships** | `sea_dragon` / `ghost_galleon` via mod `registerDrawers` |
| Hit&Run | Procedural + **local samurai atlas** + lancero template | Shared registry optional for new enemies |
| Echo Runner | Procedural + local pixel art | No shared registry required |
| Out Run | Road projection + local pixel cars | No shared registry required |
| Asteroids, Geometry Wars, Pong, Arkanoid, Centipede, Galaxian, Flappy, Frogger, … | Procedural / neon / vector | Free to adopt shared sprites later via hybrid drawers |

**Implication for agents:** when asked to "add sprites to game X", implement hybrid drawers and registry entries **without** removing procedural paths. When asked to "fix missing art", a solid procedural drawer is an acceptable complete fix.

---

## 6. Asset layout (optional bitmaps)

```
assets/sprites/
  enemies/     # character & ship sheets (many not yet in registry)
  towers/      # TD full-image props (ready)
  wip/         # never require from runtime
```

Metro only accepts **static** `require("...png")`. Dynamic paths break. Prefer PNG over JPG for runtime.

Until a sheet is measured and registered **and** a ShapeDrawer uses it, it is art inventory only — the game must still look correct procedurally.

---

## 7. End-to-end checklists

### 7.1 Add or improve **procedural** presentation for a shape

1. Implement `drawXCanvas` / `drawXSkia` (pure geometry or local pixel grid).
2. `registerShape("x", drawer)` for each backend in `initializeRenderer`.
3. Ensure blueprints / spawners set `Render.shape = "x"`.
4. Keep draw deterministic where the game cares about replay / tests.
5. Optional: share math via `ProceduralShapeUtils`.

### 7.2 Add **sprite** presentation for a shape (any game)

1. Place PNG under `assets/sprites/...` (or reuse existing).
2. Measure cells → `SpriteSheetDef` + `require` in `SpriteRegistry.ts` → `init()`.
3. Call `SpriteRegistry.init()` from the game's boot path if not already.
4. ShapeDrawer: animator + `drawSprite*`; **always** procedural fallback.
5. `registerShape` on Canvas and Skia as needed.
6. Spawn path sets `Render.shape` to the registered id (or mod alias).
7. Verify: visible while loading (fallback), then sprite; no permanent invisibility.

### 7.3 Theme / mod swap

Mods (e.g. Nautical, Asteroids visual packs) call `registerDrawers` to **replace or alias** shapes. Prefer aliasing classic ids (`"ufo"` → ghost galleon) so gameplay blueprints stay stable.

---

## 8. Debugging playbook

| Symptom | Likely cause | Action |
|---------|--------------|--------|
| Entity collides / is targeted but invisible | No `registerShape`, drawer throws, or both sprite and fallback failed | Register shape; try/catch; implement procedural fallback |
| Permanent vector look though PNG exists | Sheet not in registry, `init()` not called, failed `require`, or theme disables sprites | Fix path + init; check theme flags |
| Wrong crop / sliding frames | Bad `makeRowFrames` | Re-measure; spacing = cell width on tight grids |
| Canvas OK, native blank | Skia drawer missing or Skia preload never runs | Register Skia twin; preload |
| Blueprint warnings block spawns | Unrelated to pixels but stops entities existing | Register blueprints **before** level generation |
| samurai1 not in Hit&Run | Different pipeline | §4 — migration, not a one-line registry change |

**Hard rule:** never ship a shape with no draw path. Invisible-but-alive entities are the most common visual defect in this codebase.

---

## 9. Agent decision tree

```
Does the task change what the player *sees* for an entity?
  │
  ├─ Art direction is vector / neon / ink / no sheet ready
  │    → Implement or fix procedural ShapeDrawer(s); register both backends
  │
  ├─ Finished PNG sheet exists (or is being authored)
  │    → SpriteSheetDef + hybrid ShapeDrawer (sprite then procedural fallback)
  │
  ├─ Hit&Run samurai / samurai1 / local atlas
  │    → Open SamuraiVisualAssets + atlas JSON; do not only edit SpriteRegistry
  │
  └─ Echo / Out Run pixel frames
       → Open that game's Pixel* modules; keep simulation untouched
```

```
Is the PNG already in SpriteRegistry.init()?
  NO → add require + def + init entry (if choosing shared pipeline)
  YES → does a ShapeDrawer call drawSprite* for this shape id?
          NO → add hybrid drawer + registerShape
          YES → fix load path, frames, theme, or backend parity
```

---

## 10. Reference implementations

| Goal | Copy from |
|------|-----------|
| Pure procedural entity | Geometry Wars / Asteroids / Centipede `*CanvasVisuals` + matching Skia |
| Hybrid tower (sprite + vector) | `TowerDefenseCanvasVisuals` / Skia tower drawers |
| Grid atlas + mod registration | `SeaDragonVisuals.ts` + `NauticalMod.ts` |
| Shape alias under a theme | `GhostGalleonVisuals` + `"ufo"` in NauticalMod |
| Character sheet template | `LanceroSpriteVisuals.ts` + `LANCERO` in `SpriteRegistry` |
| Safe image require | try/catch blocks in `SpriteRegistry.ts` |
| Diagnostic mono shapes | `HitRunPlaceholderVisuals.ts` |
| Shared procedural math | `ProceduralShapeUtils.ts` |

---

## 11. Atlas scripts (optional)

```
scripts/sprites/
  atlas-kit.cjs
  build-sea-dragon-atlas.cjs
  build-ghost-galleon-atlas.cjs
```

Use when regenerating outline atlases. Hand-painted multi-row characters are measured manually into `makeRowFrames`.

---

## 12. Related docs

- `docs/SPRITE_READINESS_AUDIT.md` — inventory of `assets/sprites` vs registry (may lag; trust code).
- `src/games/shared/sprites/README.md` — short sprite quick-start.
- `docs/ARCADE_SPRITE_POLISH_WAVE1.md` — polish often procedural/pixel, not registry sheets.
- `packages/core/src/rendering/Renderer.ts` — authoritative ShapeDrawer contract.

---

## 13. Non-goals / hard rules for agents

1. **Do not treat sprites as mandatory** for a game to be "complete." Procedural presentation is first-class.
2. **Do not remove procedural fallbacks** when wiring a sheet.
3. **Do not** `require` `assets/sprites/wip/*`.
4. **Do not** register contact sheets (`several_enemies.png`) as a single runtime sheet.
5. **Do not** replace Hit&Run `samurai-enemy` with `samurai1` without measuring cells and migrating AnimationSystem.
6. Prefer stable **shape ids** and stable **sheet ids** even when filenames change (`oni_red` → `enemy2.png`).
7. Register blueprints **before** procedural level generation.
8. Match Canvas and Skia registration when the game supports both.
9. Keep simulation / collision independent of whether the drawer used a bitmap.

---

*End of guide. When the Renderer contract or shared sprite API changes, update sections 0, 2, and 3 in the same PR.*

## 8. Shared metadata contract and validation

- The canonical platform-independent sheet metadata is `SpriteSheetDefinition` in `packages/core/src/assets/SpriteSheetDefinition.ts`, exported by `@tiny-aster/core`. The shared registry re-exports compatibility aliases from `SpriteTypes.ts`; do not create another local copy of the sheet/frame/clip interfaces.
- Every entry in `SPRITE_SHEET_CATALOG` declares both `assetPath` (repository-relative path for build-time tooling) and `imageSource` (runtime platform handle). Keep both aligned when replacing an image.
- Run `pnpm run sprites:validate` to check PNG files, image dimensions, frame bounds, duplicate ids, anchors, animation frame durations, and source-mode rules. The same command runs in CI. It validates the shared catalogue and the canonical metadata exported by Hit&Run. Hit&Run still drives its existing ECS animator with frame indices; its validation metadata is derived from that single animation declaration.
- Hit&Run now declares its clips once in `HIT_RUN_CHARACTER_ANIMATION_DEFINITIONS` using source rectangles and seconds-per-frame. `HIT_RUN_CHARACTER_ANIMATIONS` is a tested compatibility adapter for the existing index-based ECS `AnimationSystem`; keep the playback behavior unchanged until the broader animator migration is ready. All three Hit&Run atlases derive their validation metadata from the same canonical clips.\n- The canonical metadata refactor does not merge `AnimatorComponent` and `SpriteAnimatorComponent` playback state. They have different runtime semantics today; migrating that playback API remains a separate, compatibility-sensitive task.


### Shared destination layout

All three sprite draw paths — `packages/renderer-canvas/src/CanvasSpriteDrawer.ts`, `packages/renderer-skia/src/SkiaSpriteDrawer.ts` and `src/games/shared/sprites/SpriteDrawer.ts` — use `calculateSpriteDestinationRect` from `@tiny-aster/core`. Keep anchoring math in this pure helper rather than duplicating destination offsets per backend. Loading and image decoding remain backend-specific because Canvas and Skia consume different image objects.
