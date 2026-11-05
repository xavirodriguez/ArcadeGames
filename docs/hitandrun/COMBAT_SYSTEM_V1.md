# Hit & Run — Combat System V1

## Scope

V1 consolidates incoming damage rules for melee hitboxes, ordinary collision-based weapons, throws and the special attack. It reuses the existing ECS, `combat:hit` / `combat:death` events, `HitRunFeedbackSystem`, and `JuiceOrchestrator`.

The system deliberately keeps attack execution in the existing systems:
- `HitRunMeleeSystem` owns melee phases and hitbox lifetime.
- `ComboMeleeSystem` owns jab → jab → finisher sequencing, throws and the special.
- `HitRunCombatSystem` owns collision-driven weapon damage.
- `HitRunCombatDefenseSystem` advances defense recovery.
- `resolveHitRunDamage` is the shared deterministic damage/defense rule used by all those attack paths.

## Guard

The belt player receives a `CombatDefense` component with 60 guard points by default. Hold **V** on keyboard or the **GUARD** touch action to guard.

Guard only blocks attacks arriving from the direction the defender faces. A successful block consumes `incomingDamage × guardCostMultiplier` guard points and prevents health damage. When the remaining guard cannot pay the full cost, guard breaks, the unabsorbed damage reaches health, and guard regeneration is disabled for the break duration.

Defaults:
- Capacity: 60
- Cost multiplier: 1.25
- Regeneration: 18 points/second
- Regeneration delay after blocking: 0.65 seconds
- Guard-break duration: 0.9 seconds

## Armor

Armor is optional durability attached through the same `CombatDefense` component. It absorbs the configured fraction of each incoming hit, limited by remaining armor points. The remainder reaches Health. Armor is not automatically restored; it reaches zero and emits the armor-break semantic transition.

Initial enemy archetypes:
- Wall: 2 armor
- Elite: 6 armor
- Samurai: 3 armor

Armor absorption defaults to 50%. These values are data-driven in `HitRunEnemyArchetypes.ts`; archetypes without armor retain ordinary health-only damage.

## Combo finisher

The existing `ComboMeleeSystem` jab chain remains authoritative. The third attack step uses damage category `combo-finisher`, so its finisher VFX is tied to the actual chain transition, not merely to a lethal hit. A lethal ordinary melee hit retains the existing finisher feedback as a fallback.

## Events and presentation

The damage result is carried through `combat:hit` with:
- actual health damage after defense,
- remaining health,
- `guardBroken`, `armorBroken` and `blocked` flags,
- semantic category (`guard-break`, `armor-break`, `combo-finisher`, or the original attack category).

The feedback consumer can show a shield pulse on a complete block and distinct Guard Break / Armor Break effects on their actual transitions. Guard and armor can both break from one hit; both effects are emitted.

Presentation remains skipped during rollback re-simulation. Guard regeneration, break timers, and combo windows use simulation delta time; no wall-clock timers or random values are introduced.

## Extending defense to another entity

Attach a component when spawning the entity:

```ts
world.addComponent(entity, createHitRunCombatDefense({
  guard: 40,
  maxGuard: 40,
  armor: 5,
  maxArmor: 5,
  armorAbsorption: 0.5
}));
```

For a custom player/enemy guard input, set `guardHeld` on its `BeltInput` or `PlatformerInput` component. The guard is directional and requires source and target transforms to be available.

## Impact response (V1.1)

Resolved `combat:hit` events also carry attack-specific knockback magnitudes, armor absorption metadata and optional hitstun/stagger overrides. `HitRunHurtSystem` is the single owner of hit reaction application:

- **Hitstun:** short simulation-time control lock; player and enemy durations are configured independently (defaults: player 0.12 s, enemy 0.14 s).
- **Stagger:** additional stability-break window reserved for heavy attack categories (finisher, throw, special), explicit attack overrides, or enemy health damage at/above the 2.5-point poise threshold. Defaults: 0.42 s for heavy attacks and 0.32 s for threshold-breaking enemy hits.
- **Knockback:** horizontal and elevation impulses are applied once from the resolved impact event. Melee, throw and special attack systems no longer also write the victim velocity directly.
- **Enemy interruption:** active enemy melee hitboxes are removed when stagger interrupts the attack. Hit&Run FSM callbacks are suspended while hitstun/stagger remains, and `HitRunStaggerSystem` enforces zero horizontal velocity after AI steering.
- **Hit-stop:** continues to use the engine's canonical `GameplayFreeze`; category profiles now distinguish bullets, shotgun, explosive, melee, finisher, throw, special, guard break and armor break. Durations remain capped and are requested only by resolved impact events. The core primitive is a short global gameplay freeze, not actor-local time dilation; true per-entity hit-stop would require a core scheduler capability and is deliberately not reimplemented inside Hit&Run.
- **Guard feedback:** complete blocks, guard break and guard recovery have separate semantic transitions. Recovery is emitted when the simulation-time break timer reaches zero.
- **Armor feedback:** armor contact is distinct from guard block. A non-breaking armor hit emits a ricochet cue; depletion emits the Armor Break effect. Armor-only hits do not apply health-hit stun or knockback.

The shared damage resolver reports `armorHit` and `armorAbsorbed`; `blocked` now means a successful guard block only. This prevents armor absorption from being misrepresented as a shield block.

## Validation boundaries

Focused tests cover frontal/rear guard behavior, guard break and spillover, armor absorption semantics, legacy damage, blocked-hit reaction suppression, enemy-specific hitstun, attack-scaled stagger, knockback, and guard/armor presentation. CI and E2E results must be checked on the PR before merge; in-game balance and Canvas/Skia parity still require playtesting.
