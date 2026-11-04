# PR4 — Combat VFX

## Scope and implementation status

PR4 extends the existing procedural VFX contract. It does not add a parallel renderer registry, a second effect lifetime system, or presentation-owned gameplay rules.

| Primitive | Gameplay source | Integration |
| --- | --- | --- |
| `pixelfx_ricochet` | Asteroids `BoundarySystem` bounce of a `Bullet` with `Boundary.mode === "bounce"` | `boundary:bounce` event → `AsteroidCollisionSystem` → `JuiceOrchestrator` |
| `pixelfx_charge` | Hit & Run `hr_charge` FSM `Anticipation → Charge` | `spawnHitRunChargeCue` on Charge entry |
| `pixelfx_shield_pulse` | Vertical Shmup explicit `Shield` charge absorbs incoming damage | `CombatSystem` → `combat:shield_absorbed` → `ShmupCollisionSystem` |
| `pixelfx_target_warning` | Hit & Run telegraphed attack FSM enters `Anticipation` | `enterAnticipationState` → `JuiceOrchestrator` |

## Gameplay contracts

### Asteroids — projectile ricochet

- The existing `bouncing_bullets` mutator enables `BULLET_BOUNDARY_BEHAVIOR: "bounce"` for player projectiles.
- `BoundarySystem` emits `boundary:bounce` only after an actual velocity reflection; clamp-only boundary contacts do not emit it.
- `AsteroidCollisionSystem` filters the event to entities carrying `Bullet` and spawns `pixelfx_ricochet` at the clamped contact position. X and Y reflections use distinct effect orientations.
- Each bullet is limited to three reflections. The remaining count is stored on its `Bullet` component, decremented by the authoritative bounce event, and reset when the pooled projectile is reused; the third reflection reclaims the projectile.
- The bounce counter advances during rollback resimulation, while only the VFX is suppressed. The existing TTL remains an independent lifetime bound.

### Vertical Shmup — explicit shield

- The player starts with one shield charge, independently of `Health.invulnerableRemaining`.
- `CombatSystem` ignores dead targets and temporary invulnerability first, then consumes an available `Shield` charge before mutating health or marking the target `Dead`.
- Absorption sets the shield recharge timer to six seconds and emits `combat:shield_absorbed`; it does not emit `combat:hit` and does not apply damage.
- `ShmupCollisionSystem` recharges the charge after the timer and renders `pixelfx_shield_pulse` from the absorption event.
- Once the charge is depleted, subsequent hits follow the existing health and invulnerability path until the shield recharges.

### Hit & Run — charge and warning

- `enterAnticipationState` emits `pixelfx_target_warning` at the real telegraphed attack transition.
- `hr_charge` emits `pixelfx_charge` when its FSM enters `Charge`; ordinary melee attacks do not receive the charge cue.
- The shared helper delegates transient entity creation and resimulation suppression to `JuiceOrchestrator`.

## Rendering and Visual Lab

- All four drawers use the existing `IDrawAdapter` and ECS `TTL` progress contract.
- `registerPixelFxProceduralVFX` registers the same ordered drawer catalog for Canvas and Skia through `SharedVFX`.
- Visual Lab uses production drawer functions and includes reproducible presets `ricochet-neon`, `charge-neon`, `shield-pulse-sumi`, and `target-warning-neon`.
- Preset seeds are stable metadata; these deterministic drawers do not consume gameplay RNG.

## Validation

Focused coverage includes:
- CombatSystem absorbs a lethal hit using a shield charge before health/death resolution.
- Asteroids emits a ricochet effect only when a real projectile reflects from a boundary.
- Existing VFX drawer tests validate Canvas/Skia catalog parity, TTL expiry, and Visual Lab preset round-trips.
- Existing Hit & Run state-machine tests validate warning and charge cue creation at the corresponding transitions.

CI results and Visual Lab review remain the final validation source; no passing result is claimed until the PR checks complete.