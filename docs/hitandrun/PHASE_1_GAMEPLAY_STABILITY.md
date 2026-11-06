# Hit & Run — Phase 1 Gameplay Stability

This change set consolidates the five Phase 1 workstreams into one reviewable implementation.

## PR1 — Input combat separation
- Keyboard melee actions (F/J/E/left Shift) feed `attackHeld`.
- Keyboard ranged actions (C/X/Control) feed `fireHeld`.
- Touch MELEE continues to use the melee pulse path; touch FIRE writes only the ranged action.
- Aim resolution no longer writes fire state as a side effect.

## PR2 — Enemy lifecycle integrity
- Removed the timer-based force wipe after a wave script is exhausted.
- Valid enemies remain alive until defeated through the combat pipeline.
- Cleanup is limited to structurally invalid enemy entities.

## PR3 — Hit reaction and momentum
- Belt movement does not apply player steering or jump input during HitReaction lock.
- Existing physical velocity is preserved during the lock.
- The enemy stagger post-pass no longer zeros Velocity; the enemy FSM impact lock remains responsible for suppressing AI steering.

## PR4 — Player death and recovery
- HitRunDeathFlowSystem now listens to lethal `combat:death` events and recognizes the belt player by BeltInput/player faction.
- The existing `PlayerDied` event remains supported.
- HitRunScoreSystem ignores player deaths, preventing score/combo inflation.

## PR5 — Regression coverage
- Added focused tests for valid enemy persistence, invalid enemy cleanup, player hitstun momentum, enemy stagger momentum, death-event bridging, and score filtering.

## Deliberate scope boundaries
Weapon pickups, POW registration, score popup rendering, wave snapshot state, banner ownership, boss/victory progression, and actor-local hit-stop remain outside this stabilization phase.
