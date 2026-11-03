# VFX Effects & Integration Inventory

**Audit date:** 2026-11-03
**Audited ref:** `master` at `0df1f73d49394695ee2eefed6e61e4d4953cbbb4`

This inventory distinguishes code observed on master from effects described only in specifications or open PRs. A PR description is not treated as proof of integration.

## Shared primitives and runtime

| Capability | Canonical location | Current role | VFX 2.0 disposition |
|---|---|---|---|
| Draw adapter | `src/games/shared/rendering/DrawAdapter.ts` | Canvas/Skia drawing operations | Reuse as the only effect drawing boundary |
| Shared drawers | `src/games/shared/rendering/SharedVFX.ts` | Existing shockwave, shield, thruster, beam, vortex, trail, hologram, text and background effects | Reuse; inventory overlaps before adding new shapes |
| Procedural PixelFX drawers | `src/games/shared/rendering/PixelFxProceduralVFX.ts` | Impact, slash, explosion on audited master source | Reconcile source vs test/spec and open PRs |
| Orchestrator | `src/games/shared/rendering/JuiceOrchestrator.ts` | Spawn transient ECS entities and map game events through `JUICE_CATALOG` | Retain as runtime integration point; centralize rollback guard |
| ECS lifecycle | `Render`, `Transform`, `TTL` | Own transform, draw data and expiry | Retain; no parallel effect lifetime manager |
| Hit-stop | `HitStopSystem.ts` + core `GameplayFreeze` | Priority/cooldown and simulation freeze | Retain canonical route; no second freeze clock |
| Sprite sheets | `SPRITE_SHEET_CATALOG`, SpriteRegistry, SpriteAnimator | Existing asset/animation path | PixelFX integration remains optional and build-time |

## Procedural effect ledger

### Present in the audited master drawer implementation

| Effect ID | Family candidate | Known consumer from spec/source | Status |
|---|---|---|---|
| `pixelfx_impact` | Combat | Platformer player damage | Drawer present; integration documented |
| `pixelfx_slash` | Combat | Hit & Run melee hit | Drawer present; integration documented |
| `pixelfx_explosion` | Combat | Asteroids asteroid destruction | Drawer present; integration documented |

### Documented in the procedural pilot spec / closed PR #1036, but not present in the audited master drawer source

| Effect ID | Family candidate | Intended trigger / consumer | Status |
|---|---|---|---|
| `pixelfx_dust` | Traversal | Platformer committed landing edge | Spec and test reference exist; implementation not in fetched master drawer source |
| `pixelfx_pickup` | Interaction | Platformer `CollectiblePickedUp` | Spec and test reference exist; implementation not in fetched master drawer source |
| `pixelfx_muzzle` | Combat | Asteroids successful weapon fire | Spec and test reference exist; implementation not in fetched master drawer source |
| `pixelfx_shield_crack` | Combat | Asteroids typed `combat:hit` filtered to `Ship` | Spec and test reference exist; implementation not in fetched master drawer source |
| `pixelfx_ink_burst` | Combat / Interaction | Hit & Run `combat:death`, Sumi-e tint | Spec and test reference exist; implementation not in fetched master drawer source |

### Described by open PR #1040 and #1041

| Effect ID | Family candidate | Intended trigger / consumer | Status |
|---|---|---|---|
| `pixelfx_paddle_impact` | Combat | Pong paddle contact | Open PR claim; not verified on master |
| `pixelfx_brick_shatter` | Combat | Arkanoid brick destruction | Open PR claim; not verified on master |
| `pixelfx_flap_gust` | Traversal | Flappy Bird successful flap | Open PR claim; not verified on master |
| `pixelfx_hop` | Traversal | Frogger successful grid hop | Open PR claim; not verified on master |
| `pixelfx_phase_dash` | Traversal | Platformer dash start | Open PR claim; not verified on master |

**PR overlap:** #1040 and #1041 describe the same five new gameplay-specific compositions. #1041 additionally claims to restore the five missing drawers from the previous batch, for thirteen total. A head-diff/commit comparison is required before merging either. Do not count both PRs as separate effects or deliveries.

## Sprite-sheet PixelFX candidate ledger

The merged sprite-sheet layer under `src/games/shared/pixelfx/` is separate from procedural effects.

| Manifest ID | Upstream source ID | Existing fallback | Manifest status |
|---|---|---|---|
| `pfx-impact-spark` | `impacts/hit-flash` | `shockwave` | Candidate; export fixture documented |
| `pfx-explosion-small` | `explosions/cartoon-pow` | `shockwave` | Candidate; export fixture documented |
| `pfx-muzzle` | `projectiles/cannon-shot` | `thruster_flame` | Candidate; needs exact export verification |
| `pfx-dust-land` | `impacts/heavy-landing` | `comet_trail` | Candidate; needs exact export verification |
| `pfx-pickup` | `pickups/collect-burst` | `floating_text` | Candidate; needs exact export verification |
| `pfx-debris` | `explosions/dirt-explosion` | `shockwave` | Candidate; needs exact export verification |
| `pfx-slash` | `melee/sword-slash` | `hologram_glitch` | Candidate; needs exact export verification |
| `pfx-block` | `impacts/blunt-hit` | `shield_bubble` | Candidate; needs exact export verification |

The catalog itself labels these entries as candidates. Do not assume the sheets are registered or production-ready. The integration audit records these blockers: register PNG/JSON in `SPRITE_SHEET_CATALOG`, run `sprites:validate`, prove SpriteAnimator frame/anchor parity on Canvas and Skia, and review Sumi-e artwork before Hit & Run adopts sheets.

## Existing per-game event catalog

`JUICE_CATALOG` currently defines typed event maps for Pong, Asteroids, Space Invaders, Arkanoid, Flappy Bird, Frogger, Geometry Wars, Platformer and Echo Runner. Profiles bind event keys to existing primitive names and scalar parameters (tint, scale, TTL, hit-stop, shake, text).

This is a useful semantic event layer, but not yet the VFX 2.0 visual-profile model. A semantic profile should resolve concepts such as impact, energy, warning, surface, water and temporal distortion to palette/style tokens without making each drawer maintain a separate theme configuration.

## Cross-game assignment from the VFX 2.0 plan

| Game | Intended VFX 2.0 families | Integration evidence / gap |
|---|---|---|
| Asteroids | Ricochet, Charge, Shield Pulse, Magnetism | Existing explosion, muzzle and shield-crack work; new semantic event mappings and magnetism trigger need verification |
| Platformer | Surface Skid, Teleport, Mechanical Motion, Time Distortion, Water Splash | Existing impact/landing/pickup/dash work; locomotion and environmental event contracts need audit |
| Hit & Run | Target Warning, Ricochet, Charge | Existing slash/ink burst; warning/charge events and Sumi-e profile need verification |
| Vertical Shmup | Target Warning, Shield Pulse, Charge, Ricochet | No confirmed PixelFX procedural consumer in the inspected evidence; inspect its own renderer/bootstrap before integration |
| Frogger | Water Splash, Surface Skid | Hop effect is described by open PR; water/surface events need verification |
| Arkanoid | Ricochet, Mechanical Motion | Brick shatter is described by open PR; existing brick/bounce feedback includes legacy paths |
| Echo Runner | Teleport, Time Distortion, Surface Skid | Existing Juice catalog events are echo/dash/hit; new traversal/time event contracts need verification |

## Legacy and duplicate feedback routes to re-check

The 2026-10-27 game-feel inventory records the following candidates. They should be revalidated against current source before migration:

- Arkanoid collision callbacks directly mutate hit-flash/freeze/squash state and create inline spark emitters.
- Pong collision handling directly applies hit-stop/shake/squash and creates inline hit particles; rollback guards need explicit review.
- Asteroids still has direct Juice helper paths for fire/death and direct shake on asteroid break.
- Space Invaders constructs `JuiceOrchestrator` inside collision handling and has duplicate shake paths.
- Hit & Run writes screen-shake state to both a game-specific resource and the core camera component.
- Geometry Wars contains bespoke shockwave/particle behavior alongside orchestrated effects.

These are integration-hardening work items, not a mandate to migrate all feedback into the new IR. Preserve specialized gameplay feedback where it is genuinely game-specific.

## Counting rule

For VFX Architecture 2.0 reporting:

- Count a drawer only when its implementation is present and registered in both Canvas and Skia.
- Count an effect integration only when a real gameplay event invokes it.
- Count a game as integrated only when event mapping, profile, both renderer registrations, integration test and Visual Lab reference scenario exist.
- Count sprite-sheet PixelFX separately from procedural drawers.
- Never count duplicate PR descriptions as separate delivered work.


---

## Repository reconciliation — 2026-11-03 follow-up

The merge graph confirms #1040 and #1041 are both merged; #1041 is the final integration pass. #1042 (CI repair) and #1043 (initial audit) are also merged. The previous sections that described #1040/#1041 as open, unverified, or duplicate pending work are superseded.

### Current procedural drawer catalog on post-merge master

All thirteen procedural drawers are present in `PixelFxProceduralVFX.ts` and listed in `JuiceOrchestrator.SharedVFXPrimitiveName`:

1. `pixelfx_impact`
2. `pixelfx_slash`
3. `pixelfx_explosion`
4. `pixelfx_dust`
5. `pixelfx_pickup`
6. `pixelfx_muzzle`
7. `pixelfx_shield_crack`
8. `pixelfx_ink_burst`
9. `pixelfx_paddle_impact`
10. `pixelfx_brick_shatter`
11. `pixelfx_flap_gust`
12. `pixelfx_hop`
13. `pixelfx_phase_dash`

Canvas and Skia registration tests both assert the same thirteen-shape sequence. The five game-specific additions are integrated through their game event/catalog paths and renderer bootstrap registrations as described by the merged PRs. The initial audit's three-vs-eight drawer discrepancy is withdrawn.

### Remaining verified issues

- `JuiceOrchestrator.spawn` has no central `world.isReSimulating` early return. Per-caller guards exist for the newly added gameplay triggers, but the generic public spawn API is not safe by itself. A central guard and regression test are included in the follow-up patch.
- The current Brick Shatter drawer uses `drawLine` for its rotated outline, while the current test still asserts `strokeRect`. The follow-up patch changes the assertion to 28 draw-line calls.
- The older impact/explosion path still has object-returning helpers and the shared state reader allocates a state object per draw. Profile before optimizing; do not represent this as zero-allocation.

### PixelFX sprite-sheet path — separate status

The sprite-sheet integration scaffold is merged, but the manifest remains explicitly marked as candidates. The integration audit still lists PNG/JSON registration in `SPRITE_SHEET_CATALOG`, sprite validation, Canvas/Skia SpriteAnimator frame synchronization, and Sumi-e art review as outstanding. These are not the same deliverables as the thirteen procedural drawers and must be tracked independently.


### Additional inventory correction — hit-stop is split

Do not interpret the existing `HitStopSystem` as already connected to the core scheduler. It owns a priority/cooldown timer in `VFXWorldState`; core simulation freeze is driven by the separate `GameplayFreeze` resource. Hit & Run uses the core helper directly, while `JuiceOrchestrator` currently calls `requestHitStop` on the VFX timer. The previous inventory shorthand suggesting one unified route is superseded. Treat this as a cross-cutting integration gap; do not create a third path, and do not rely on VFX profile hit-stop until the two existing mechanisms are reconciled and tested end-to-end.
