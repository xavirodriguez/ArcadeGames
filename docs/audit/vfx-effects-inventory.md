# VFX Effects & Integration Inventory

**Audit date:** 2026-11-03  
**Audited ref:** `master` at `5e4e289d8e51802f9fc2c53850762d68e62798a0`

This inventory describes the post-#1044 default branch. Source code and merged tests are the evidence of implementation; old audit snapshots and PR descriptions are not current-state evidence.

## Shared runtime

| Capability | Canonical location | Current role | VFX 2.0 disposition |
|---|---|---|---|
| Draw adapter | `src/games/shared/rendering/DrawAdapter.ts` | Canvas/Skia drawing operations | Reuse `IDrawAdapter` |
| Shared drawers | `src/games/shared/rendering/SharedVFX.ts` | Shared visual primitives and registration | Reuse; check overlap before adding primitives |
| Procedural drawers | `src/games/shared/rendering/PixelFxProceduralVFX.ts` | Thirteen native procedural compositions | Reuse; no runtime PixelFX dependency |
| Orchestrator | `src/games/shared/rendering/JuiceOrchestrator.ts` | Spawn transient entities and map typed game events through `JUICE_CATALOG` | Preserve as dispatch/compatibility boundary |
| ECS lifecycle | `Transform`, `Render`, `TTL` | Position, draw data and expiry | Retain; no parallel lifecycle |
| Renderer registration | `SharedVFX.ts` and game Canvas/Skia bootstraps | Install shared and procedural drawers | Retain; parity tests cover procedural names |
| Sprite assets | `SPRITE_SHEET_CATALOG`, SpriteRegistry, SpriteAnimator | Existing sprite/animation pipeline | Keep separate from procedural Effect IR |
| Hit-stop | `HitStopSystem.ts`, core `GameplayFreeze` | Split VFX timer and core simulation freeze | Consolidation remains outstanding |

## Procedural effect ledger

All thirteen drawer definitions are present in `PixelFxProceduralVFX.ts`; Canvas and Skia registration tests assert the same thirteen-name contract.

| Effect ID | Candidate family | Known use / intent |
|---|---|---|
| `pixelfx_impact` | Combat | Player damage / asteroid impact |
| `pixelfx_slash` | Combat | Hit & Run melee hit |
| `pixelfx_explosion` | Combat | Asteroid destruction |
| `pixelfx_dust` | Traversal | Platformer landing |
| `pixelfx_pickup` | Interaction | Collectible feedback |
| `pixelfx_muzzle` | Combat | Successful weapon fire |
| `pixelfx_shield_crack` | Combat | Shield damage |
| `pixelfx_ink_burst` | Combat / Interaction | Death feedback, including Sumi-e presentation |
| `pixelfx_paddle_impact` | Combat | Pong paddle contact |
| `pixelfx_brick_shatter` | Combat | Arkanoid brick destruction |
| `pixelfx_flap_gust` | Traversal | Flappy Bird flap |
| `pixelfx_hop` | Traversal | Frogger hop |
| `pixelfx_phase_dash` | Traversal | Platformer dash |

Family labels above are semantic candidates for typed dispatch; they do not imply that all consumers have migrated to a shared Effect IR.

## Correctness and integration status

- **Rollback:** #1044 places the `world.isReSimulating` guard at the beginning of `JuiceOrchestrator.spawn()`, before hit-stop, shake and entity/component creation. A focused regression test covers no spawn and no hit-stop during resimulation.
- **Brick Shatter:** the drawer builds its rotated outline from four adapter line calls; the test expects 28 total lines (four outline edges plus 24 fragment edges).
- **Canvas/Skia:** procedural registration tests assert the same thirteen IDs and count for both renderers.
- **Allocations:** not benchmarked. `readEffectState` allocates a state object per draw and older impact/explosion code uses object-returning rotation helpers. Do not claim zero-allocation.
- **Sprite sheets:** the PixelFX manifest is candidate metadata. Asset registration and SpriteAnimator Canvas/Skia frame parity remain separate validation work; they are not the procedural drawer catalog.
- **Legacy consumers:** inline emitters and direct screen-shake/freeze writes remain in some games. Migrate only after verifying current call sites and gameplay event semantics.

## Time and hit-stop ownership

Transient effect lifetime is represented by ECS `TTL`. Simulation time is controlled by the core schedule; presentation time is a separate visual concern and must not mutate gameplay delta.

Hit-stop is not currently one unified route:
- `HitStopSystem` updates `VFXWorldState.hitStopTimer`, priority and cooldown.
- Core `Schedule.update()` freezes simulation using the `GameplayFreeze` resource.
- Hit & Run uses core `enterGameplayFreeze` / `getGameplayFreezeRemaining` helpers.
- `JuiceOrchestrator.spawn()` requests the separate VFX timer.

Do not add a third freeze mechanism. Consolidate the existing policy with the Juice/core-freeze work and verify the scheduler end to end before Combat integration treats `hitStopMs` as a simulation pause.

## Scope boundary

Foundation may define the typed semantic contract and profiles while preserving current orchestration, drawing and TTL ownership. Visual Lab is PR3. Family-specific game migrations are PR4–PR6. Sprite-sheet registration, broad legacy migrations, performance optimization without a baseline, and hit-stop consolidation are separate workstreams.
