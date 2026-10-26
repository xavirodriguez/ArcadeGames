# Hit&Run debug counters: metric contract and baseline

The debug overlay now reports four per-tick counters:

| Counter | Meaning | Limitation |
| --- | --- | --- |
| `bullets/tick` | Player and enemy projectile spawn attempts, including reuse from a pool. | Spawn churn, not a count of JavaScript heap allocations. |
| `enemies/tick` | Enemy-pool acquisition attempts, including recycled enemies. | Does not imply a new ECS entity was created. |
| `events/tick` | Emissions observed for the curated combat, wave, game-over, pickup, player-death, and sound-event names in `HitRunDebugMetrics.ts`. | Not a count of every event emitted by EventBus; deferred events are observed when the bus flushes them. |
| `ECS structure changes/tick` | Difference in `World.structureVersion` sampled at the presentation phase. | Counts ECS structural changes, not V8 allocations; deferred command-buffer changes may be visible in the following sample. |

## Baseline

The previous overlay read `HitRunAllocsPerTick`, but repository search found no writer for that resource. Its displayed default of `0` was therefore an uninstrumented placeholder, not a valid allocation baseline.

A trustworthy in-game average/peak has **not been observed in this code-only review** because no browser gameplay session or profiler capture was available. Record the four displayed values during a fresh run, then during a representative combat wave. Do not label `ECS structure changes/tick` as heap allocations.
