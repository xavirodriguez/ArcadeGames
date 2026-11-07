# Game Feel Architecture Ledger

**Purpose:** Evidence ledger for implementation facts that support or conflict with `docs/architecture/GAME_FEEL_ARCHITECTURE.md`.  
**Snapshot reviewed:** 2026-11-07  
**Rule:** This file is evidence, not normative policy. Re-check source before implementation; update a row when the code changes. `unknown` means not verified, not absent.

| Date | Area | Files and symbols | Status | Verified evidence / gap |
|---|---|---|---|---|
| 2026-11-07 | Event transport | `packages/core/src/events/EventBus.ts` (`EventBus.on`, `emit`, `emitDeferred`, `flushDeferred`); `src/games/asteroids/types/AsteroidRegistry.ts` (`AsteroidsEventRegistry`) | verified | EventBus provides typed immediate/deferred dispatch and subscription. The Asteroids registry composes `CoreEvents` and custom typed events such as `combat:hit` and `combat:death`. No durable event history, exactly-once delivery or rollback compensation contract was identified in the inspected EventBus API. |
| 2026-11-07 | Hit-stop time domain | `packages/core/src/ecs/Schedule.ts` (`update`); `packages/core/src/systems/TTLSystem.ts` (`update`); `packages/core/src/systems/JuiceSystem.ts` (`update`); `packages/core/src/systems/ScreenShakeSystem.ts` (`update`) | verified | During `GameplayFreeze`, Schedule skips ordinary Simulation systems but explicitly permits TTL, Juice and Particle systems; Presentation phase still runs. Schedule passes frame `deltaTime` (not scaled simulation delta) to Presentation systems and the special TTL/Juice/Particle systems. TTLSystem decrements `TTL.remaining` by that delta and declares `runsWhileFrozen = true`; therefore TTL-backed VFX progress and expiry continue during hit-stop. TTLSystem separately returns during explicit `IsPaused === true`. JuiceSystem and ScreenShakeSystem suppress their updates during resimulation. |
| 2026-11-07 | Temporal orchestration boundary | `src/games/shared/rendering/JuiceOrchestrator.ts` (`JUICE_CATALOG`, `triggerEvent`, `spawn`); `src/games/shared/rendering/HitStopSystem.ts` (`requestHitStop`, `HitStopSystem`); core `GameplayFreeze` | gap | Hit-stop is requested through `requestHitStop` and uses core `GameplayFreeze` as its active duration clock. However, current `JuiceOrchestrator.spawn` still combines hit-stop request, shake and creation of ECS `Transform`/`Render`/`TTL` presentation entities. Current `JUICE_CATALOG` mixes visual primitive/options with temporal hit-stop/shake fields. Runtime separation remains pending. |
| 2026-11-07 | Rollback boundary | `JuiceOrchestrator.spawn`; `JuiceSystem.update`; `ScreenShakeSystem.update`; `World.isReSimulating` | partial | Current JuiceOrchestrator replays authoritative hit-stop requests before returning early during resimulation; its shake and entity creation happen after that guard. JuiceSystem and ScreenShakeSystem also skip resimulation. A future independent VFX runtime must implement its own central guard at its public presentation side-effect boundary; it cannot rely on JuiceOrchestrator to suppress it. |
| 2026-11-07 | Prediction invalidation | `packages/core/src/events/EventBus.ts`; rollback/reconciliation APIs inspected for this contract pass | unknown | No EventBus-level confirmation/retraction contract or stable event-occurrence ID was verified. No general cancellation protocol for already emitted speculative VFX/audio was established. Contract policy: do not emit speculative VFX/audio before confirmation unless a stable-ID cancellation/reconciliation path is implemented and tested. |
| 2026-11-07 | Cross-channel coherence | `JuiceOrchestrator.JUICE_CATALOG`; `VFXEffectIR.ts`; game EventRegistry payloads | gap | Temporal and visual mappings are not yet separate, and the current catalog bundles primitive/tint/scale/TTL with hit-stop/shake. The target requires a gameplay-semantic severity/context shared by independent consumers and a cross-channel conformance test. No such conformance test was verified in this pass. |
| 2026-11-07 | Accessibility ownership | `JuiceOrchestrator.setJuiceLevel`; current VFX profile and runtime path | partial | Juice exposes a Juice-level/low-stimulation switch for temporal/presentation behavior. Ownership and coverage of a single application preference source for visual flashes, visual motion, density/contrast and audio adaptation have not been verified. |
| 2026-11-07 | Audio boundary | `packages/core/src/events/EventBus.ts` (`CoreEvents.PlaySFX`) | partial | `PlaySFX` exists in CoreEvents as a playback-shaped command payload. This is not a gameplay fact. The complete set of producers, consumers and rollback behavior for audio playback has not been inventoried in this ledger. |
| 2026-11-07 | VFX type dependency | `src/games/shared/rendering/VFXEffectIR.ts`; `JuiceOrchestrator.ts` | gap | VFXEffectIR imports `SharedVFXPrimitiveName` from JuiceOrchestrator. This reverses the intended ownership direction and should be removed when the VFX identity contract is extracted. No neutral contract module should be created without two independently owned consumers for each exported symbol. |
| 2026-11-07 | Rendering contract | `src/games/shared/rendering/DrawAdapter.ts`; `PixelFxProceduralVFX.ts`; `SharedVFX.ts` | partial | `IDrawAdapter`, CanvasDrawAdapter and SkiaDrawAdapter exist; procedural drawers are implemented against the adapter and registered through existing shared/game renderer paths. Registration tests are evidence of registration parity, not by themselves proof of visually equivalent raster output in live scenes. |
| 2026-11-07 | VFX capacity and pooling | Shared VFX spawn paths, active entity counts and representative scenes | unknown | No production per-frame spawn budget, active-effect cap, draw-cost budget or target-device performance baseline was verified during this documentation pass. No pooling decision is justified without measured allocation/GC or frame-time evidence. |
| 2026-11-07 | Asteroids explosion pilot candidate | `src/games/asteroids/systems/AsteroidCollisionSystem.ts` (`onRegister`, `spawnExplosionParticles`, `onCombatDeath`); `JuiceOrchestrator.JUICE_CATALOG.asteroids["rock:destroyed"]` | duplicate | The 2026-11-07 VFX ledger row records two requests for `pixelfx_explosion` on asteroid death and a redundant direct shake beside the catalog shake. This is a candidate for the first post-inventory pilot, not authorization to migrate before Phase 0 approval. |

## Interpretation rules

- `verified` means the stated source behavior was directly inspected in the reviewed branch.
- `partial` means only part of the contract or call graph was verified.
- `gap` means code directly contradicts the target responsibility boundary.
- `unknown` means no reliable evidence was collected; do not infer absence or support.
- A documentation decision does not prove runtime conformance.
- This ledger is a cross-layer supplement to `vfx-ledger.md` and `juice-consolidation-ledger.md`; it does not replace their per-effect or temporal-path records.

## Immediate audit order

1. Finish the effect/system inventory in `docs/agents/vfx-ledger.md` and obtain explicit Phase 0 approval.
2. Complete the Audio path inventory: all `PlaySFX` producers, playback consumers, voice limits and rollback suppression.
3. Inventory event confirmation and prediction semantics in multiplayer rollback, including whether any existing event occurrence identity can be reused.
4. Establish representative VFX capacity/performance baselines before selecting numeric budgets or introducing pools.
5. Verify visual and audio accessibility preference sources and current consumers.

No runtime implementation is authorized by this ledger alone.
