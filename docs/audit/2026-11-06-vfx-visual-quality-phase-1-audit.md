# VFX Visual Quality Audit — Phase 1

**Date:** 2026-11-06  
**Repository:** `xavirodriguez/ArcadeGames`  
**Audited ref:** `master` at `8f9e6f137c5f08fa69030a60363d3bb09b699e11`  
**Scope:** production VFX drawers, registration, semantic profiles, Visual Lab coverage, game-event routing, renderer abstraction, deterministic lifecycle, and visual-quality evidence.  
**Status:** source audit complete; runtime visual review and executable validation remain pending.

> This is the current Phase 1 baseline. It supersedes the catalog counts and registration assertions in the 2026-11-03 inventory where they conflict with the 2026-11-06 source. Older audit documents remain historical evidence, not the current source of truth.

---

## 1. Executive summary

ArcadeGames has a substantial VFX foundation. The current architecture already provides:

- One shared `IDrawAdapter` boundary for Canvas 2D and React Native Skia.
- A shared procedural PixelFX drawer module.
- A semantic event catalog (`JUICE_CATALOG`) for nine games.
- A typed Effect IR with combat, traversal, interaction, and temporal contexts.
- Two visual profiles: `arcade-neon` and `sumi-e`.
- A Visual Lab that previews production drawer functions and supplies reproducible presets.
- ECS `Render` + `TTL` lifecycle and deterministic, stateless procedural drawers.

The main Phase 1 conclusion is not that the repository lacks a VFX system. It has several mature pieces, but the inventory and authoring/inspection surfaces have not kept pace with production additions.

### Highest-priority finding

**P0 — procedural registry, test contract, and Visual Lab catalog disagree.**

At the audited `master` commit:

- `registerPixelFxProceduralVFX` registers **29** procedural drawers.
- `PixelFxProceduralVFX.test.ts` still asserts **27** registrations for Canvas and Skia.
- The test's expected arrays omit `pixelfx_hitstun` and `pixelfx_stagger`.
- `VFX_LAB_EFFECTS` also contains **27** entries and omits those same two production drawers.
- `SharedVFXPrimitiveName` and the drawer registration include both effects.

This is a source-level mismatch. The registration test is expected to fail when executed against this source; this audit did not execute Jest, typecheck, or CI.

### Other important findings

1. The Visual Lab has 27 of 29 procedural effects and 24 built-in presets. Six registered effects have no preset: Impact is represented, but the missing preset list is `hitstun`, `stagger`, `slash`, `explosion`, `dust`, and `flap_gust`. The Lab can still select these effects if present in its catalog; the two new reaction effects cannot be selected at all.
2. The Effect IR carries a combat `material` field, but the current semantic color resolver is family-based. Material is not yet a first-class visual-profile dimension.
3. The draw adapter intentionally exposes a compact primitive set (circles, rectangles, lines, arcs, text and glow). Richer contours, filled paths, gradients, brush textures and noise-based edge treatment must be composed elsewhere or implemented in renderer-specific paths.
4. The current evidence proves registration parity and shared drawer reuse, not pixel-level Canvas/Skia visual equivalence.
5. The Sumi-e Juice vocabulary contains eight semantic names, but its fallback table maps them to existing classic drawers. These names must not be counted as eight dedicated Sumi-e procedural compositions.
6. Sprite-sheet PixelFX remains a separate candidate pipeline; its manifest entries are not evidence of production-ready sheet registration or animation parity.

---

## 2. Evidence model and limits

Findings use the following labels:

- **Verified in source:** directly confirmed in the audited `master` files.
- **Verified contract:** asserted by source plus corresponding tests/specifications; runtime behavior may still require execution.
- **Pending visual review:** source inspection cannot establish the perceived quality of a rendered effect.
- **Pending runtime validation:** requires running the repository toolchain or game.

This phase inspected source, registration functions, tests, the Visual Lab model, and relevant architecture documents. It did not render screenshots, execute Jest, run typecheck, benchmark devices, or inspect the game in motion. Consequently, no subjective visual score is assigned to an effect based only on its function name or implementation.

---

## 3. Current production inventory

### 3.1 Procedural PixelFX drawers

Canonical implementation: `src/games/shared/rendering/PixelFxProceduralVFX.ts`  
Canonical registration: `registerPixelFxProceduralVFX`  
Shared registration path: `src/games/shared/rendering/SharedVFX.ts`

| # | Effect ID | Family | Primary visual intent | Visual Lab |
|---:|---|---|---|---|
| 1 | `pixelfx_impact` | Combat | Contact flash / impact response | Yes |
| 2 | `pixelfx_hitstun` | Combat | Compact hitstun core and radial ticks | **Missing** |
| 3 | `pixelfx_stagger` | Combat | Broken stability ring / shearing segments | **Missing** |
| 4 | `pixelfx_slash` | Combat | Directional melee cut | Yes |
| 5 | `pixelfx_explosion` | Combat | Radial explosive burst and fragments | Yes |
| 6 | `pixelfx_dust` | Traversal | Ground-contact dust | Yes |
| 7 | `pixelfx_pickup` | Interaction | Collection / reward burst | Yes |
| 8 | `pixelfx_muzzle` | Combat | Weapon discharge | Yes |
| 9 | `pixelfx_shield_crack` | Combat | Shield fracture | Yes |
| 10 | `pixelfx_ink_burst` | Combat / interaction | Ink-based burst | Yes |
| 11 | `pixelfx_paddle_impact` | Combat | Paddle / ball contact | Yes |
| 12 | `pixelfx_brick_shatter` | Combat | Rectangular destructible fracture | Yes |
| 13 | `pixelfx_flap_gust` | Traversal | Short impulse / flap gust | Yes |
| 14 | `pixelfx_hop` | Traversal | Grid-hop movement cue | Yes |
| 15 | `pixelfx_phase_dash` | Traversal | Dash / phase displacement | Yes |
| 16 | `pixelfx_ricochet` | Combat | Direction change after impact | Yes |
| 17 | `pixelfx_charge` | Combat | Energy accumulation and release | Yes |
| 18 | `pixelfx_shield_pulse` | Combat | Shield activation / pulse | Yes |
| 19 | `pixelfx_parry` | Combat | Deflection clash and counter-burst | Yes |
| 20 | `pixelfx_perfect_block` | Combat | High-quality guard confirmation | Yes |
| 21 | `pixelfx_critical_hit` | Combat | High-intensity critical contact | Yes |
| 22 | `pixelfx_projectile_deflection` | Combat | Incoming-to-outgoing trajectory | Yes |
| 23 | `pixelfx_guard_break` | Combat | Guard fracture / break | Yes |
| 24 | `pixelfx_armor_break` | Combat | Armor plate separation | Yes |
| 25 | `pixelfx_combo_finisher` | Combat | Multi-beat terminal attack | Yes |
| 26 | `pixelfx_target_warning` | Combat | Target / danger telegraph | Yes |
| 27 | `pixelfx_teleport` | Traversal | Departure / arrival transition | Yes |
| 28 | `pixelfx_surface_skid` | Traversal | Directional surface friction cue | Yes |
| 29 | `pixelfx_mechanical_motion` | Traversal | Mechanical reversal / motion | Yes |

**Counts:** 29 production drawers registered; 27 exposed in the Visual Lab; 24 built-in presets.

The family labels above are the current Visual Lab classifications. They are useful for catalog navigation, but do not yet constitute a complete art-direction taxonomy.

### 3.2 Classic shared shape drawers

Canonical registration: `registerSharedVFXAssets` in `SharedVFX.ts`.

| Shape ID | Visual role | Notes |
|---|---|---|
| `shield_bubble` | Shield shell / protection | Classic shared drawer |
| `shockwave` | Radial impact / destruction | Classic shared drawer |
| `thruster_flame` | Propulsion / exhaust | Classic shared drawer |
| `laser_beam` | Directed energy | Classic shared drawer |
| `singularity` | Vortex / gravitational pull | Classic shared drawer |
| `comet_trail` | Motion trail | Classic shared drawer |
| `hologram_glitch` | Digital interference | Classic shared drawer |
| `floating_text` | Score / reward / status text | Classic shared drawer |

The same eight shape IDs are registered in the Canvas and Skia branches. This is a registration-level contract, not a visual parity result.

### 3.3 Background and full-screen effects

The same shared registration function also registers seven background effects:

- `diffuse_milky_way`
- `drifting_nebula`
- `starfield`
- `distant_space_station`
- `distant_asteroid_belt`
- `ringing_planet`
- `screen_border_glow`

These are not transient entity drawers and should be tracked separately from the 29 procedural PixelFX effects and eight classic shape drawers. `warp_lines` is present in the Juice primitive type/catalog but is not in the eight-shape registration list shown in `registerSharedVFXAssets`; its concrete producer/consumer and registration path require a targeted trace before it is counted as a registered shape.

### 3.4 Sumi-e vocabulary

`SumiEJuice.ts` defines eight names:

- `ink_splash`
- `ink_bleed`
- `brush_stroke`
- `dry_brush_trail`
- `seal_stamp`
- `mist_layer`
- `water_ripple`
- `floating_kanji`

The current `SUMI_E_FALLBACK_SHAPE` maps these to `shockwave`, `comet_trail`, `floating_text`, or `shield_bubble`. The vocabulary is a theme-aware semantic layer, not evidence of eight independent registered shape drawers. The Sumi-e background and ambient particle systems are separate visual systems and should be reviewed in their own pass.

### 3.5 Sprite-sheet effects

The PixelFX sprite-sheet manifest is a separate asset path from procedural drawers. Its entries are still candidates until the PNG/JSON sheets are registered in `SPRITE_SHEET_CATALOG`, validated by the sprite pipeline, and checked for frame/anchor parity in Canvas and Skia. Do not add these entries to the procedural-drawer count.

---

## 4. Registration, authoring and inspection consistency

| Surface | Current count | Source of truth | Finding |
|---|---:|---|---|
| Procedural drawer functions | 29 | `PixelFxProceduralVFX.ts` | Production source |
| Procedural renderer registration | 29 | `registerPixelFxProceduralVFX` | Includes Hitstun and Stagger |
| Registration test expected names | 27 | `PixelFxProceduralVFX.test.ts` | Omits Hitstun and Stagger |
| Visual Lab browser | 27 | `VFXVisualLabModel.ts` | Omits Hitstun and Stagger |
| Visual Lab presets | 24 | `VFX_LAB_PRESETS` | No dedicated presets for six effects |
| Classic shared shape registration | 8 | `SharedVFX.ts` | Canvas/Skia lists match |
| Background effects | 7 | `SharedVFX.ts` | Separate registration category |
| Sumi-e semantic names | 8 | `SumiEJuice.ts` | Fallback mappings, not dedicated drawers |

### P0.1 — Registration test is stale

The production registration list includes `pixelfx_hitstun` and `pixelfx_stagger`, but both Canvas and Skia assertions still expect exactly 27 entries and omit those IDs.

**Required action in Phase 2:** derive the expected list from one canonical exported catalog or update the test to assert the complete 29-name contract. Prefer a single source of truth over maintaining three handwritten lists.

### P1.1 — Visual Lab is not a complete production browser

The Visual Lab's static catalog imports and lists 27 drawers. It cannot select the two new reaction drawers even though production registers them.

**Required action in Phase 2:** expose Hitstun and Stagger in the browser, add reproducible presets, and assert catalog-to-registration equality in tests.

### P1.2 — Preset coverage is uneven

The preset catalog has 24 entries for 29 drawers. Six drawers have no dedicated preset: `hitstun`, `stagger`, `slash`, `explosion`, `dust`, and `flap_gust`. Pickup has both Neon and Sumi-e presets, so preset count is not expected to equal drawer count; nevertheless every production drawer should have at least one baseline scenario.

---

## 5. Architecture findings that affect visual quality

### 5.1 Rendering boundary

**Verified in source:** `IDrawAdapter` provides:

- `fillCircle`, `strokeCircle`
- `fillRect`, `strokeRect`
- `drawLine`, `drawArc`
- `drawText`
- `drawGlow`
- `save` / `restore`

Both Canvas and Skia implement this interface, and PixelFX registration wraps the same drawer function for each renderer.

**Quality implication:** the abstraction makes renderer reuse practical, but its primitive vocabulary is deliberately low-level. It has no first-class filled path/polygon, variable-width contour, gradient, texture/noise field, clipping mask, or brush-stroke operation. Effects needing those features must approximate them through primitive composition or use a specialized rendering path. This is an architectural ceiling to evaluate, not an automatic reason to expand the adapter.

### 5.2 Semantic IR and visual profiles

`VFXEffectIR.ts` defines four semantic families:

- Combat
- Traversal
- Interaction
- Temporal

It defines two visual profiles:

- `arcade-neon`
- `sumi-e`

Combat context already carries optional material information (`metal`, `stone`, `wood`, `energy`, `organic`). However, `resolveVFXSemanticColor` currently resolves by family/profile; material is not part of the semantic token set or profile resolution path.

**Quality implication:** the type system can carry material intent, but the current profile contract does not yet guarantee a distinct material response. Phase 2 should decide whether material affects palette, contour, fragmentation, timing, or only selected effects. Do not add material tokens without demonstrating a consumer.

### 5.3 Temporal composition

The procedural module uses the existing TTL-derived progress contract. The repository also has temporal sampler utilities and tests for staged charge, shield pulse, ricochet, parry, perfect block, critical hit, projectile deflection, guard break, armor break, and combo finisher.

**Quality implication:** there is already a temporal-composition foundation. Avoid adding another animation clock or scheduler. The next audit should compare the temporal silhouette of each effect at start, peak, and dissipation rather than merely counting curves or drawer calls.

### 5.4 Determinism and lifecycle

- Procedural drawers read `Render`, `TTL`, and `Transform` and draw from current component state.
- Transient lifetime is represented by ECS TTL.
- `JuiceOrchestrator.spawn` requests authoritative hit-stop before suppressing presentation output during re-simulation.
- No new particle engine or VFX lifetime manager is needed for the proposed quality pass.

The source contains allocation-bearing helpers such as `readEffectState`, which returns a state object for each drawer invocation. This is a profiling candidate, not proof of a frame-time problem. Do not refactor it before measuring representative scenes.

---

## 6. Game integration coverage

`JUICE_CATALOG` contains typed event maps for nine games:

| Game | Event count | Example procedural effects | Audit focus |
|---|---:|---|---|
| Pong | 3 | Paddle Impact | Contact orientation, impact readability |
| Asteroids | 3 | Explosion | Projectile/ship/rock feedback distinction |
| Space Invaders | 3 | Classic shared effects | Shield degradation vs destruction semantics |
| Arkanoid | 4 | Brick Shatter | Brick hit vs destruction; bounce response |
| Flappy Bird | 3 | Flap Gust | Short impulse readability |
| Frogger | 3 | Hop | Grid-step timing and landing clarity |
| Geometry Wars | 3 | Classic shared effects | Bespoke feedback overlap with shared effects |
| Platformer | 6 | Impact, Phase Dash, Surface Skid, Mechanical Motion | Locomotion state and surface-specific feedback |
| Echo Runner | 5 | Surface Skid, Mechanical Motion, classic trails | Echo/dash semantics and profile fit |

**Total:** 33 typed catalog events across nine game IDs.

This table describes the event catalog, not proof that every event is triggered in a live scene or visually reviewed. A game/effect integration should only be considered complete when the following are all evidenced:

1. A real gameplay transition emits the semantic event.
2. The event resolves to the intended profile/effect.
3. The owning game registers the shared drawers.
4. Canvas and Skia render the effect.
5. A focused test covers the event-to-effect mapping.
6. A Visual Lab or reproducible in-game scenario exists for visual review.

### Hit & Run

Hit & Run now has a distinct combat feedback path and Sumi-e theme integration. The latest merged Hitstun/Stagger work adds two dedicated reaction drawers and their feedback wiring. The Sumi-e background/ambient path belongs to Hit & Run; do not apply that profile globally to games with a different visual identity.

The Visual Lab omission of Hitstun/Stagger is especially relevant here because these two effects cannot currently be inspected through the shared visual workbench.

---

## 7. Visual quality audit matrix

A source-only audit cannot honestly assign a final quality score. The following matrix defines the review criteria to apply to each effect in the Visual Lab and in representative game scenes.

| Dimension | Review question | Evidence to capture |
|---|---|---|
| Silhouette | Is the effect recognizable in a single frame at gameplay scale? | Peak and thumbnail captures |
| Composition | Is there a clear focal point, hierarchy and negative space? | Full-frame capture on light and dark backgrounds |
| Temporal arc | Are anticipation, peak and dissipation distinct and intentional? | 0%, 25%, 50%, 75%, 95% TTL samples |
| Material | Does the shape communicate energy, metal, stone, wood or organic matter where relevant? | Same event with at least two material contexts |
| Directionality | Does it reinforce the actual impact/velocity/trajectory? | Rotated and mirrored scenarios |
| Contrast | Does it remain legible over the real game background and sprites? | In-game scene capture |
| Style coherence | Does the profile feel native to the game's art direction? | Arcade-Neon and Sumi-e comparison where appropriate |
| Renderer parity | Do Canvas and Skia preserve shape, order, alpha and timing? | Matched-size side-by-side captures |
| Motion/accessibility | Is intensity readable without excessive flash, shake or clutter? | Reduced-stimulation scenario |
| Performance | Is cost bounded under simultaneous effects? | Frame-time and allocation profile |

### Required capture protocol

For each selected effect:

- Use the same seed, dimensions, rotation, profile, background and normalized progress in both renderers.
- Capture at `0.00`, `0.25`, `0.50`, `0.75`, and `0.95` progress.
- Capture at gameplay scale as well as enlarged inspection scale.
- Include a light and a dark background.
- Include at least one real in-game context for effects with a confirmed consumer.
- Record differences as either acceptable rasterization variation or a semantic/layout defect.

No visual score should be published until these captures exist.

---

## 8. Prioritized findings

| ID | Priority | Finding | Impact | Next action |
|---|---|---|---|---|
| VQ-01 | P0 | 29 production drawers vs 27 registration-test expectations | Test contract is stale and likely fails | Reconcile one canonical registry and tests |
| VQ-02 | P1 | Visual Lab omits Hitstun and Stagger | Two live combat effects cannot be inspected | Add both effects and presets |
| VQ-03 | P1 | Six effects lack dedicated baseline presets | Incomplete repeatable visual coverage | Add one deterministic preset per drawer |
| VQ-04 | P1 | Material context is not resolved by visual profiles | Material intent is carried but not rendered semantically | Decide/validate material response contract |
| VQ-05 | P1 | Adapter has no path/brush/gradient primitives | Organic contours and textured materials require workarounds | Prototype only the missing primitive(s) needed by the visual slice |
| VQ-06 | P1 | No evidence of pixel-level Canvas/Skia comparison | Registration parity can hide rendering differences | Add matched screenshot fixtures and review protocol |
| VQ-07 | P2 | 33 catalog events are not equivalent to 33 verified runtime integrations | Risk of claiming integrations based on catalog presence | Trace event producers and scene registration per game |
| VQ-08 | P2 | Sumi-e semantic vocabulary falls back to classic drawers | Names can imply dedicated artwork that does not exist | Keep vocabulary/fallback status explicit; review dedicated drawers only if justified |
| VQ-09 | P2 | Sprite-sheet catalog remains candidate-only | Asset quality path is not production-validated | Keep separate until assets and animation parity are verified |
| VQ-10 | P2 | Allocation-bearing state/geometry helpers exist | Potential cost at high effect density | Profile before optimization |

---

## 9. Recommended Phase 2 entry criteria

Do not start by rewriting all 29 effects. First close the catalog integrity gap and then select a small, representative vertical slice.

### Gate A — catalog integrity

- One authoritative list of registered procedural IDs.
- Canvas and Skia registration tests assert that exact same list.
- Visual Lab catalog covers all production drawers.
- Every production drawer has at least one deterministic baseline preset.
- Tests assert equality among production registry, Visual Lab catalog and expected test fixture.

### Gate B — visual slice selection

Use six effects that exercise different shape and timing requirements:

1. `pixelfx_impact` — compact contact / flash.
2. `pixelfx_hitstun` — brief interruption cue.
3. `pixelfx_stagger` — loss of stability / segmented geometry.
4. `pixelfx_guard_break` — radial fracture.
5. `pixelfx_armor_break` — multi-piece material separation.
6. `pixelfx_ricochet` — directional trajectory and deflection.

Review them in Arcade-Neon and Sumi-e only where each game's visual profile calls for it. Do not force a universal aesthetic.

### Gate C — visual evidence

- Matched Canvas/Skia captures at five timeline samples.
- Light/dark and in-game backgrounds.
- Review notes for silhouette, hierarchy, timing, contrast and style.
- Performance baseline under isolated and burst conditions.

---

## 10. Files inspected

Core production:
- `src/games/shared/rendering/PixelFxProceduralVFX.ts`
- `src/games/shared/rendering/SharedVFX.ts`
- `src/games/shared/rendering/SharedVFXInternal.ts`
- `src/games/shared/rendering/DrawAdapter.ts`
- `src/games/shared/rendering/JuiceOrchestrator.ts`
- `src/games/shared/rendering/VFXEffectIR.ts`
- `src/games/shared/rendering/VFXVisualLabModel.ts`
- `src/games/shared/rendering/registerSharedJuiceSystems.ts`
- `src/games/shared/rendering/sumi-e/SumiEJuice.ts`
- `src/app/vfx-lab/index.tsx`

Tests:
- `src/games/shared/rendering/__tests__/PixelFxProceduralVFX.test.ts`
- `src/games/shared/rendering/__tests__/PixelFxCombatVFX.test.ts`
- `src/games/shared/rendering/__tests__/VFXVisualLabModel.test.ts`

Historical/reference documents:
- `docs/audit/vfx-effects-inventory.md`
- `docs/audit/vfx-architecture-audit.md`
- `docs/specs/vfx-architecture-2.0-decisions.md`
- `docs/specs/vfx-visual-lab-mvp.md`
- `docs/JUICE_SWORD_COMBAT_EVOLUTION_ROADMAP.md`

---

## 11. Phase 1 exit status

- [x] Refresh audit against current `master`.
- [x] Reconcile procedural drawer source and registration count.
- [x] Compare production registration with Visual Lab catalog.
- [x] Inventory classic shared shape and background registrations.
- [x] Separate Sumi-e vocabulary from dedicated drawer count.
- [x] Record semantic/profile and adapter constraints.
- [x] Define a reproducible visual review protocol.
- [x] Prioritize concrete follow-up work.
- [ ] Execute registration/Jest tests.
- [ ] Capture and inspect Canvas/Skia renders.
- [ ] Profile representative high-density scenes.

**Phase 1 result:** the source inventory and quality-review plan are documented. The phase is complete as a source audit, but the visual-validation sub-gate remains open until the app can be rendered and measured.
