# Locomotion V1 — PR2: Momentum & Surface Mastery

## Scope

PR2 turns the existing Locomotion Campaign templates into physical skill checks. It reuses the production `PlatformerMovementSystem`, `PlatformerGravitySystem`, `PlatformerJumpSystem`, `TileCollisionSystem`, `PhysicsContactState`, and the existing `momentum` profile. No parallel controller or ECS subsystem is introduced.

## Momentum route

`momentum-01` now contains:

1. A ground approach long enough to build speed under the momentum profile.
2. A three-tile ascending ramp authored with the existing slope tile (tile 6).
3. A raised launch deck and a genuine three-tile gap. The gap is empty across rows 8–12, so there is no hidden floor that can make an otherwise failed jump appear successful.
4. A raised landing deck only three tiles wide.
5. A lower exit route with a spike immediately beyond the raised deck. The player must manage landing speed, brake, and jump again instead of simply holding right through the whole segment.

The `momentum` profile remains the only campaign profile. Its passive deceleration, active braking, turn acceleration, air steering and drag continue to be tuned in the shared profile definition. The platformer action schema exposes `brake`. The game screen maps `B` to active braking on web and provides a held BRAKE touch button on mobile; both feed the existing `PlatformerInput.brake` field.

## Surface mastery route

`surface-mastery-01` is a mandatory material sequence:

- Normal ground → six tiles of ice → normal ground.
- Elastic tile 7 is a normal solid tile bound to the existing `elastic` PhysicsMaterial preset (`restitution: 0.82`); the material, not a second tile-level bounce coefficient, owns the rebound.
- The player drops two tile rows from the runway onto the elastic pad. A three-tile floating one-way platform sits one row above the pad; the two-tile pad provides a wider landing window for momentum-speed entry.
- The rebound must carry the collider upward through the one-way platform; it then lands on that platform while descending. There is no solid floor beneath the one-way span.
- Normal exit ground after the platform.

Tile 3 keeps its legacy bounce behavior. Tile 7 is a distinct elastic material variant, avoiding an implicit behavior change to existing maps.

## Geometry and stitching invariants

The campaign remains a 24×14 segment grammar with aligned entry/exit points at `(0, 11)` and `(23, 11)`. The campaign test checks:

- Every template's dimensions against its declared bounds.
- Required slope, gap, landing, spike, ice, normal, elastic and one-way tile placement.
- No supporting tiles under the momentum gap or beneath the one-way landing.
- Entry/exit seam coordinate equality and a non-empty floor tile at each seam.
- The deterministic plan order and seam invariants for seeds 1, 42 and 41873.

## Automated physics coverage

The existing fixed-step integration suite is extended to compare:

- Momentum coasting against responsive coasting.
- Active braking against passive coasting from the same accelerated state.
- A run-up jump across a real three-tile gap against a stationary jump from the same launch point.
- The campaign's exact elastic-pad → one-way-platform geometry, including rising pass-through and descending landing.

The existing integration scenarios continue to cover slope-to-jump momentum transfer, ice-to-normal contact changes, elastic restitution, one-way traversal from below followed by landing, and moving-platform inheritance. The snapshot/replay suite continues to verify identical state hashes for identical fixed input streams and snapshot restoration.

## Verification commands

Run the focused suites first:

```bash
pnpm exec jest --runInBand packages/core/tests/LocomotionIntegrationScenarios.test.ts
pnpm exec jest --runInBand packages/core/tests/LocomotionDeterminismReplay.test.ts
pnpm exec jest --runInBand src/games/platformer/__tests__/LocomotionCampaign.test.ts
pnpm run typecheck:core
pnpm run typecheck:app
```

Then run the repository CI/test workflow. A test is not considered passing until the command or CI check has actually executed against this PR branch.

## Acceptance criteria

- Releasing input retains materially more speed under the momentum profile than under the responsive profile.
- The platformer exposes a held `brake` action, including touch input.
- Active brake shortens the stopping distance relative to passive coasting.
- Direction reversal decelerates before changing the sign of horizontal velocity.
- A run-up jump crosses the authored gap; a stationary jump from the same launch point does not.
- Slope traversal and jump preserve the existing tangent/world momentum policy.
- Ice changes traction/friction without resetting velocity at the material boundary.
- The elastic tile resolves through the elastic material preset.
- The player can pass upward through the one-way platform and land on it from above.
- Active braking is reachable from the web keyboard (`B`) and the mobile touch control.
- The route remains structurally valid and seams remain connected for multiple deterministic seeds.
