# Locomotion v1 — Testing Strategy and Verification Log

**Status:** implementation in progress; jump-input and centralized jump-resolution tests have been added but not executed in this environment.

## 1. Verification principles

- Test behavior, not merely component presence or compilation.
- Use fixed simulation ticks and explicit input sequences.
- Assert exact state at transition boundaries (especially timer expiry, jump consumption, and collider posture).
- Keep core unit tests platform-agnostic.
- Add gameplay integration tests for Platformer and Echo Runner because they share registration.
- Compare independent worlds and snapshot/restore replays using the repository's existing snapshot hash facilities.

## 2. Test layers

### Unit tests

| Area | Required assertions |
|---|---|
| Horizontal movement | acceleration ramp, target speed, independent deceleration, direction reversal, no near-zero oscillation, inherited velocity preservation |
| Jump controller | impulse, variable height, coyote final valid tick, first invalid tick, buffer final valid tick, single consumption, air-control behavior |
| Gravity | rise/fall/apex multipliers, max fall speed, no duplicate gravity application |
| Slide | entry threshold, reduced collider, friction/steering, min/max duration, cancel/exit rules |
| Clearance | stand-up succeeds in open space; remains crouched under a blocking ceiling; no positional teleport |
| Surface | material lookup, friction/grip, slope scale, slide eligibility |
| Slope contact | normalized normal, gravity tangent, uphill/downhill response, no ground separation from small numeric error |
| Velocity transfer | run-to-jump, slide-to-jump, landing, slope-to-jump and non-zero surface velocity |

### Integration tests

- Same input frame sequence in two independent worlds yields identical component state and snapshot hash.
- Simulate to N, snapshot, continue to M; restore N and replay remaining inputs; final hash and relevant components match.
- Landing with a buffered jump triggers exactly once at the documented tick boundary.
- Running-to-jump and sliding-to-jump preserve tangential/world velocity according to the documented policy.
- Standing collider restoration is blocked by a ceiling.
- Material transitions update contact data without resetting velocity.
- Shared Platformer and Echo Runner smoke tests remain green.

## 3. Locomotion Lab acceptance scenarios

| Zone | Scenario | Observable pass condition |
|---|---|---|
| A — Basic movement | accelerate, release, reverse | smooth acceleration and braking with configurable rates |
| B — Jump | coyote, buffer, variable height | reproducible jump arcs and exact tick-window behavior |
| C — Slide | tunnels and low ceilings | reduced collider fits; standing restoration waits for clearance |
| D — Materials | Stone/Ice/Mud/Sand/Metal | each material produces its configured response |
| E — Slopes | ascending/descending inclines | stable contact normal, tangent acceleration and retained momentum |
| F — Combined | run, slide, slope, jump, land | uninterrupted velocity transfer across modes and surfaces |

Debug overlays should reuse existing debug rendering facilities and expose collider, contact normal, velocity, acceleration, material, mode and tick timers.

## 4. Commands to run

The exact package scripts must be confirmed from the current workspace before implementation. At minimum, run the focused core platformer test file and the relevant gameplay integration tests, then run repository typecheck/lint/test commands for affected packages.

Do not report a test as passing unless the command was actually executed against the implementation branch.

## 5. Verification log

### Increment 1 — ECS-backed jump edge history

- Added `previousJumpHeld?: boolean` to `PlatformerInputComponent`.
- Removed the system-instance `Map<Entity, boolean>` from `PlatformerInputSystem`.
- Added `src/games/shared/systems/__tests__/PlatformerInputSystem.test.ts`, covering press, held-across-system-recreation, and release edges.
- Snapshot inclusion is provided by the existing generic component serializer; no serializer-specific change was required.
- Test execution: **not verified**. The GitHub connector permits repository edits and inspection but does not provide a local checkout/test runner in this session.

### Increment 2 — Single jump-resolution authority

- Added `PlatformerJumpSystem` for grounded/coyote jumps, buffered landing jumps, multi-jump consumption and short-hop release clamping.
- Reduced `PlatformerCoyoteSystem` to coyote/buffer timer advancement; it no longer applies impulses.
- Registered the new resolver after the timer system in the shared Platformer/Echo Runner system registry.
- Added `packages/core/tests/PlatformerJumpSystem.test.ts` for grounded jump/short-hop, coyote/buffer, and double-jump exhaustion.
- Updated the Echo Runner system-schedule snapshot for the newly registered shared jump system.
- Test execution: **not verified**; the GitHub connector cannot run the repository's pnpm/Jest toolchain.
- Remaining Locomotion v1 scope includes richer controller profiles, slide/clearance, slopes/contact normals, surface materials, momentum transfer, integration/replay coverage and the Locomotion Lab.

- Broader locomotion functionality: not implemented or claimed complete.


### Increment 3 — Physics contacts and surface materials (B3)

- Added PhysicsMaterial, PhysicsContact and PhysicsContactState ECS contracts, with material definitions authored on Tilemap and selected by TileDefinition.materialId.
- TileCollisionSystem now publishes axis-aligned contact normals/points for wall, ceiling and ground resolution, resolved material data, and surface velocity. It clears stale contact state before each collision pass.
- Added support for both Collider2D AABBs and Collider box shapes so Platformer and Echo Runner use the same tile contact producer.
- PlatformerMovementSystem applies grounded traction (including braking), static/dynamic friction and conveyor-relative horizontal velocity only when a resolved material contact exists. Material restitution affects landing response.
- PlatformerJumpSystem consumes resolved grounded contact while retaining the legacy ground-state path for carrier/platform compatibility.
- Added starter material presets and ADR-003.
- Added focused tests for ground contact publication, conveyor velocity, restitution, material movement response, stale-contact clearing and legacy Collider compatibility.
- Determinism test: two independent worlds with identical tilemap/material/input state must produce identical AoS snapshot hashes after the same fixed collision step.
- Test execution: pending final GitHub Actions; not run locally in this session.

## 5. Known B3 limits

- Tile contacts remain axis-aligned; stable slope normals and walkable-angle policy are B4.
- Generic CollisionSystem2D manifolds are not yet merged into PhysicsContactState; B3 publishes tilemap contacts.
- Static/dynamic friction coefficients are converted to horizontal acceleration using fall gravity (default 980 units/s²). Values require per-game calibration.


### Increment 4 — stable slope contacts (B4)

- Added TileSlopeDefinition and a line-segment surface solver in TileCollisionSystem.
- Added normalized normal/tangent calculation, AABB support-radius resolution, tangential velocity projection, jump-away detection, walkable-angle policy and slope friction.
- Steep slopes remain contacts but are not grounded; walkable angle defaults to 50° and can be configured per tile.
- Added ascending and descending ramp, steep-slope, no-slip-at-rest and fixed-step snapshot-hash tests.
- Test execution: pending GitHub Actions; no local test run is claimed.


### Increment 5 — slide posture and clearance (B2)

- Added PlatformerPosture and slideHeld input state.
- Added PlatformerSlideSystem before horizontal movement in the shared Platformer/Echo Runner schedule.
- Collider resizing supports both Collider2D AABBs and Collider box shapes and preserves the foot anchor.
- Clearance checks tilemap solids and enabled non-trigger box/AABB colliders with compatible masks; blocked posture retries standing without moving the character through geometry.
- Slide steering/friction use the optional LocomotionProfile.slide data; presets now provide tuned starting values.
- Added tests for entry speed, collider resizing, foot preservation, minimum/maximum timing, blocked/retry, non-trigger solid clearance, slide friction and legacy opt-in behavior.
- Test execution: pending GitHub Actions; no local test run is claimed.


### Increment 6 — moving-platform support (B5)

- Added tests for fixed-step platform advancement, passenger displacement, published contact surface velocity, horizontal/vertical velocity inheritance on landing, actual jump-resolution momentum preservation, edge-exit momentum, legacy opt-out behavior and zero-duration safety.
- Updated TileCollisionSystem to retain only live MovingPlatform contacts across its per-tick contact reset. Contact-aware passengers are carried by support-velocity rebasing and the single PhysicsIntegrate pass; PhysicsIntegrateSystem explicitly skips directly-authored MovingPlatform transforms.
- System schedule order: MovingPlatformSystem → locomotion/jump systems → PlatformCarrySystem → PhysicsIntegrateSystem.
- Test execution: pending GitHub Actions; no local test run is claimed.


- B5 jump regression now exercises the real PlatformerJumpSystem → PlatformCarrySystem sequence. Jump resolution temporarily includes the full vertical support impulse; carry detachment removes the full support component and reapplies only preserveMomentum.
