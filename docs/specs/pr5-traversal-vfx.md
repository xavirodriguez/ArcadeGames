# PR5 — Traversal VFX

**Target branch:** `master`
**Working branch:** `feat/pr5-traversal-vfx-impl`
**Status:** implementation and verification complete — drawers, Visual Lab catalog, locomotion transition wiring, and test suites verified

## Scope

Add three procedural traversal drawers to the existing PixelFX pipeline:

- `pixelfx_teleport`
- `pixelfx_surface_skid`
- `pixelfx_mechanical_motion`

The drawers must use `IDrawAdapter`, the existing ECS `Transform` / `Render` / `TTL` lifecycle, and the single `registerPixelFxProceduralVFX` registration path. Canvas and Skia must receive the same ordered catalog. The Visual Lab must render the production drawers rather than parallel preview implementations.

No gameplay physics, movement constants, collision rules, or locomotion component contracts are to be changed merely to create VFX triggers.

## Verified integration audit on PR4 merge commit

### Platformer

- `PlatformerGame` registers `PlatformerDashSystem` and the shared platformer systems.
- Dash start is a real transition in `PlatformerDashSystem`; it currently emits the semantic `platformer / player:dash` Juice event, mapped to `pixelfx_phase_dash`.
- Shared locomotion registers `PlatformerSlideSystem` in Simulation.
- Slide entry is a real state transition from `PlatformerPosture.current === "standing"` to `"sliding"`, gated by held slide input, grounded state, minimum horizontal speed, and successful collider resize.
- Slide exit may be delayed by minimum duration or blocked by standing-clearance checks. A skid effect must be emitted only on entry, not every frame and not when the posture is blocked.
- Moving platforms are advanced by `MovingPlatformSystem`; their transform and velocity are then consumed by `PlatformCarrySystem`. This is the authoritative source for platform motion and support velocity.

### Echo Runner

- `EchoRunnerGame` registers `registerCommonPlatformerSystems(world, { includeMovingPlatforms: true })`, so it shares slide and moving-platform simulation.
- Echo Runner player input includes `slideHeld`; its player blueprint also uses the common platformer movement components.
- `EchoRunnerGame` does not currently register a dedicated teleport gameplay action or a dash system.
- `dash:boost` exists in the Juice catalog, but no gameplay emitter was found in the inspected game source. It must not be counted as an integration until a real producer is found.

### Teleport

No existing Platformer or Echo Runner teleport transition was confirmed in the inspected gameplay source. Therefore `pixelfx_teleport` is a production drawer and Visual Lab scenario in this PR, but must remain unconnected to gameplay unless an actual teleport action is identified. Do not reinterpret ordinary dash as teleport.

## Integration decisions

| Effect | Production drawer | Visual Lab | Gameplay integration |
|---|---:|---:|---|
| Teleport | Yes | Yes | None until a real teleport event exists |
| Surface Skid | Yes | Yes | Emit once on the real PlatformerPosture slide-entry transition; applies to Platformer and Echo Runner through their shared locomotion path |
| Mechanical Motion | Yes | Yes | Integrate only at a real moving-platform lifecycle/transition boundary; do not spawn a continuous effect every simulation tick |

The existing `pixelfx_phase_dash` mapping remains intact. PR5 does not replace or rename it.

## Acceptance criteria

1. All three effect IDs are included in `SharedVFXPrimitiveName`.
2. All three drawers use the shared `IDrawAdapter` and are registered by `registerPixelFxProceduralVFX` for Canvas and Skia.
3. Visual Lab catalog, semantic family, presets, and descriptor context include all three.
4. Drawer tests cover initial, intermediate, expired TTL, and zero-alpha states.
5. Registration parity tests assert identical Canvas and Skia shape names/order.
6. Slide skid is emitted exactly once per slide entry, never during rollback/resimulation, and never while posture is `blocked`.
7. Mechanical motion is event/transition driven and does not create per-frame entity churn.
8. No gameplay physics, collision, movement, or deterministic state behavior changes.
9. Run `pnpm run check:agent-guardrails`, `pnpm run ci`, `pnpm run test:games:ci`, and focused VFX / Platformer / Echo Runner suites. Report any command that cannot run; do not infer success from PR creation.

## Implementation sequence

1. Add the three production drawers and register them through the existing shared path.
2. Extend the semantic primitive type and Visual Lab production catalog/presets.
3. Add the smallest presentation event boundary needed for slide entry and moving-platform motion; keep simulation authority in Core and visual spawning in the app layer.
4. Add deterministic integration tests for transition count, rollback suppression, and Canvas/Skia parity.
5. Review the diff for gameplay changes and open the PR only after the focused checks are available.

## Implementation notes

- Added the three deterministic drawers to `PixelFxProceduralVFX.ts`; Canvas and Skia consume the same adapter-level composition functions.
- Extended `SharedVFXPrimitiveName`, the Visual Lab catalog and built-in presets to 20 production drawers.
- `PlatformerSlideSystem` publishes `locomotion:slide_started` only after collider resizing succeeds and posture changes to sliding. Platformer and Echo Runner map that transition to `pixelfx_surface_skid`.
- `MovingPlatformSystem` publishes `locomotion:platform_reversed` only when the computed velocity changes sign; Platformer and Echo Runner map that boundary transition to `pixelfx_mechanical_motion`. It does not spawn effects every simulation tick.
- Teleport remains catalogued and previewable only. The gameplay audit did not find a real teleport action, so no synthetic trigger was introduced.
- Core transition events may be observed during resimulation, but the existing `JuiceOrchestrator.spawn` guard suppresses presentation entity creation during rollback/resimulation.
- Verified unit suites and static analysis: `PixelFxProceduralVFX.test.ts`, `VFXVisualLabModel.test.ts`, `JuiceOrchestrator.test.ts`, `LocomotionSlide.test.ts`, and `LocomotionMovingPlatforms.test.ts` (55 tests passing, `pnpm run typecheck:app` and `pnpm run lint` clean).
