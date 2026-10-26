# Unified Combat Juice Consolidation & Evolution Roadmap

**Repository:** [xavirodriguez/ArcadeGames](https://github.com/xavirodriguez/ArcadeGames)  
**Document:** \`docs/JUICE_SWORD_COMBAT_EVOLUTION_ROADMAP.md\`  
**Updated:** 2026-10-26  
**Status:** Updated implementation plan; code changes are not part of this commit.  
**Baseline:** Source inspection of the current repository and the existing Hit&Run audit.

---

## 1. Executive decision

Consolidate the existing Juice/VFX mechanisms before introducing new combat abstractions or migrating more games.

The current codebase has reusable components already in place: \`Juice\`, \`JuiceOrchestrator\`, \`JUICE_CATALOG\`, \`HitStopSystem\`, \`GameplayFreeze\`, shared VFX helpers, and game-specific feedback systems. The immediate problem is not a lack of abstractions. It is that several existing mechanisms overlap, some do not connect to the scheduler that executes them, and game code mixes centralized profiles with direct writes.

**Implementation order:**

1. Establish one authoritative hit-stop/freeze contract and prove it freezes the intended simulation phases.
2. Audit the screen-shake fallback chain and choose a single effective output path per world.
3. Strengthen the existing Juice catalog's event typing and diagnostics without creating a parallel API.
4. Migrate Arkanoid as the first vertical pilot.
5. Migrate Pong and Space Invaders after auditing their current event semantics.
6. Fix Hit&Run against the existing audit instead of repeating that audit.
7. Migrate other games only when actual consumers and specific benefits are confirmed.
8. Revisit a broader melee/projectile lifecycle pipeline only if the consolidated system proves insufficient.

Do not implement a new \`CombatJuicePipeline\` as the first step. Treat it as a deferred design decision, not an assumed prerequisite.

## 2. Scope and non-goals

### In scope

- Unify the meaning and execution of hit-stop.
- Inventory hit-stop requests, freeze consumers, and system registrations.
- Document and rationalize the three fallback paths used by \`Juice.shake\`.
- Remove duplicated feedback writes where the catalog already provides the same effect.
- Type event names from the game-specific keys in \`JUICE_CATALOG\`.
- Prove the behavior with scheduler-level and game-level tests.
- Retain current game-specific effects where the shared catalog does not represent them yet.
- Preserve simulation/render separation and explicitly decide how hit-stop behaves under networking, rollback, pause, and reduced-motion settings.

### Out of scope for the initial phases

- A wholesale rewrite of \`Juice\` or \`JuiceOrchestrator\`.
- A global Juice singleton or a service registry introduced solely to avoid constructing a small stateless orchestrator.
- Migrating a game just because its ID appears in \`JUICE_CATALOG\`.
- Replacing all game-specific feedback in one large refactor.
- Implementing sword/fireball anticipation, full attack phases, or a new attack pipeline before the shared hit-stop and feedback contracts work.
- Claiming accessibility/determinism parity without testing the effects of simulation freezes.

## 3. Evidence and current-state inventory

Evidence labels in this document:

- **Verified in source:** directly supported by the inspected implementation.
- **Existing audit:** documented in an existing repository audit; confirm only the affected details before changing code.
- **Pending validation:** needs an executable test or a wider call-site/registration search before implementation.

### 3.1 Hit-stop has two disconnected mechanisms

**Verified in source:**

- [\`HitStopSystem.ts\`](../src/games/shared/rendering/HitStopSystem.ts) stores an active timer, priority, and cooldown in the VFX world state. \`requestHitStop\` mutates that state, and \`HitStopSystem.update\` decrements its timer.
- [\`JuiceOrchestrator.ts\`](../src/games/shared/rendering/JuiceOrchestrator.ts) calls \`requestHitStop\` when an effect profile requests \`hitStopMs\`.
- [\`Schedule.ts\`](../packages/core/src/ecs/Schedule.ts) determines whether gameplay phases are frozen by reading the \`GameplayFreeze\` resource. It does not consult \`isHitStopActive\` or the VFX hit-stop timer.
- [\`GameplayFreezeMixin.ts\`](../packages/core/src/runtime/GameplayFreezeMixin.ts) exposes the core operations for entering, querying, and exiting a gameplay freeze.
- [\`SpaceInvadersGameScene.ts\`](../src/games/space-invaders/scenes/SpaceInvadersGameScene.ts) registers \`HitStopSystem\`; registration coverage for all other games must be established before relying on its timer or cooldown behavior.
- Existing tests in [\`JuiceOrchestrator.test.ts\`](../src/games/shared/rendering/__tests__/JuiceOrchestrator.test.ts) verify the local VFX timer, but that alone does not prove the scheduler freezes gameplay.

**Consequence:** a catalog-driven request can update the VFX timer without freezing the phases controlled by \`Schedule\`. Elsewhere, systems directly write \`GameplayFreeze\`, bypassing the profile's hit-stop arbitration.

### 3.2 Inline and catalog-driven feedback are mixed

- **Arkanoid:** [\`ArkanoidCollisionSystem.ts\`](../src/games/arkanoid/systems/ArkanoidCollisionSystem.ts) writes \`GameplayFreeze\` directly, applies \`Juice.squash\`, creates particle emitters, and emits sound events in its collision/death paths. Its behavior must be mapped onto the correct catalog events before removing inline effects.
- **Pong:** [\`PongCollisionSystem.ts\`](../src/games/pong/systems/PongCollisionSystem.ts) writes \`GameplayFreeze\` directly and calls \`Juice.shake\` and \`Juice.squash\` for paddle collisions. The catalog already defines \`pong.paddle:hit\` with hit-stop and shake settings, but the consumer path must be wired and tested before duplicate writes are removed.
- **Space Invaders:** [\`SpaceInvadersCollisionSystem.ts\`](../src/games/space-invaders/systems/SpaceInvadersCollisionSystem.ts) uses direct freeze writes, \`Juice\` helpers, custom explosion logic, and \`JuiceOrchestrator\`. The catalog defines \`alien:destroyed\`, \`shield:degraded\`, and \`ufo:destroyed\` profiles. In the inspected code, \`onBossCombatHit\` calls the \`ufo:destroyed\` profile; verify whether that is semantically correct before migration. Do not treat an event name as proof that the event is being emitted at the correct lifecycle moment.

### 3.3 Hit&Run has a useful audit already

Use [\`docs/audit/2026-10-23-hitandrun-metal-slug-gap-analysis.md\`](audit/2026-10-23-hitandrun-metal-slug-gap-analysis.md) as the starting evidence instead of repeating the full audit.

That audit identifies, among other issues:

- No registered core \`ParticleSystem\` in the Hit&Run presentation registration path.
- A double-channel screen-shake write: \`HitRunWeaponSystem\` and \`HitRunFeedbackSystem\` can write both \`HitRunScreenShake\` and the core camera \`ScreenShake\` component.
- Hit-stop guards are not consistently observed by movement and collision paths.

[ \`HitRunFeedbackSystem.ts\`](../src/games/hitandrun/systems/HitRunFeedbackSystem.ts) already calls \`enterGameplayFreeze\` and queries \`getGameplayFreezeRemaining\`. That proves the helper is used in this system; it does **not** prove that every movement, collision, and game-rule system is actually stopped by the scheduler. Add an end-to-end test for the configured Hit&Run schedule.

### 3.4 \`Juice.shake\` has three fallback conventions

**Verified in source:** [\`Juice.ts\`](../packages/core/src/utils/Juice.ts) tries these targets in order:

1. The \`ScreenShake\` singleton.
2. The \`ScreenShake\` resource.
3. \`GameState.screenShake\`, used as a compatibility path by some games.

This is a compatibility cascade, not an instruction to write all three targets. The problem is that consumers use different contracts, and the units/consumption rules need to be documented. The first two paths assign the supplied duration directly; the \`GameState.screenShake\` branch converts durations greater than 10 by dividing by 1000. Confirm the intended units for each consumer before normalizing behavior.

### 3.5 Catalog typing and consumer coverage

- \`SupportedGameId\` is already a union, and \`JUICE_CATALOG\` already maps each supported game ID to its profiles.
- \`triggerEvent(gameId, eventName: string, ...)\` accepts any event string and silently returns if the profile is missing.
- The catalog includes several games for which the current search did not find \`triggerEvent\` call sites, including Flappy Bird, Frogger, Platformer, and Echo Runner. This is not evidence that those games have no feedback: direct \`Juice\` calls exist in at least some of them. Before migration decisions, verify with a repository-wide search for both \`triggerEvent\` and direct helpers.
- \`JuiceOrchestrator\` currently stores a world reference and has no significant per-instance state beyond that reference. Do not add a global instance cache solely to avoid constructing it at a call site.

## 4. Architectural decisions and invariants

### 4.1 One authoritative hit-stop duration

The scheduler already uses \`GameplayFreeze\`, so this roadmap selects it as the authoritative source for the **effective freeze duration**.

- \`requestHitStop\` remains the public request entry point for catalog-driven effects.
- It must arbitrate priority and cooldown, then apply an accepted finite request through the core gameplay-freeze API.
- \`VFXWorldState.hitStopTimer\` must no longer independently determine whether gameplay is frozen or how much freeze time remains. Remove it after all readers are migrated, or temporarily expose a derived compatibility value that reads the canonical resource.
- Preserve and test the intended priority policy: a higher-priority request may override an active lower-priority hit-stop; equal/lower requests are ignored while active; the 50 ms anti-chaining cooldown remains explicit unless tests or design review justify changing it.
- Define behavior when another system has installed an indefinite freeze, when the world is paused, or when a freeze was initiated directly rather than by Juice.
- Audit every \`HitStopSystem\` registration. Do not rely on an optional system to decrement a second active timer. Its remaining responsibility, if retained, should be limited to policy state such as cooldown; it must not compete with \`Schedule\` for timer ownership.
- Normalize units at the boundary: catalog fields named \`hitStopMs\` are milliseconds; the core freeze resource uses seconds.

The bridge should not write both timers and hope that they remain synchronized. Tests must verify the actual schedule behavior, not only the state of a timer.

### 4.2 Decide whether hit-stop is simulation-affecting or presentation-only

The current \`GameplayFreeze\` mechanism stops selected scheduler phases. Consequently, scaling that freeze by a local visual preference can change the number of simulation steps completed in a given wall-clock interval.

Before changing \`juiceLevel\` or reduced-motion behavior, explicitly decide:

- For single-player and local play, whether a profile-requested hit-stop is allowed to pause the game simulation.
- For networked/rollback play, whether a freeze is synchronized authoritative behavior or presentation-only feedback. A client-local visual preference must not silently change authoritative simulation timing.
- Whether \`juiceLevel\` scales only visual effects or also simulation-affecting hit-stop. Do not claim identical simulation hashes across configurations that deliberately execute different numbers of simulation ticks.
- Whether reduced-motion settings disable camera movement only, change hit-stop, or both. The resulting contract must be testable and documented.

**Default recommendation:** keep simulation-affecting freezes deterministic and explicit; do not let client-local Juice scaling silently alter authoritative simulation. If hit-stop needs to be purely cosmetic in online multiplayer, implement that policy at the presentation layer rather than freezing a non-authoritative subset of the simulation.

### 4.3 One effective screen-shake path per event

Do not remove compatibility targets blindly.

1. Inventory each producer, the drawer/system that reads its shake data, and the time unit expected by the reader.
2. Prefer the core camera \`ScreenShake\` component where the game is already using the core camera pipeline.
3. Keep a legacy fallback only while a verified consumer requires it.
4. An event should not write both a custom resource and the core component unless both paths are deliberately consumed and the visual result is explicitly tested. Where two channels are redundant, designate one authoritative channel and migrate the consumer before deleting the other.
5. Normalize duration units at a single boundary; add tests for legacy consumers before changing the conversion behavior.

### 4.4 Preserve the existing API; extend types instead of creating a parallel one

- Keep \`Juice\`, \`JuiceOrchestrator\`, and \`JUICE_CATALOG\` as the existing integration points.
- Derive event-name types from each catalog entry with a generic API, such as \`keyof typeof JUICE_CATALOG[G]\`, while preserving the declared \`SupportedGameId\` union.
- Use the catalog as the source of truth for valid game/event combinations; do not maintain a second hand-written event union.
- Make missing profiles visible during development through a diagnostic or typed failure path. Do not silently conceal invalid literals during normal development. Preserve intentional production behavior for dynamically supplied data where required.
- Continue to use the existing \`spawn\` implementation, including its juice-level clamping, reduced-stimulation behavior, and command-buffer handling while the world is updating. Audit these behaviors individually; do not rewrite them incidentally as part of event typing.
- Keep \`Juice.shake\` and \`Juice.squash\` for cases where they represent effects not yet covered by the catalog. Migrate an effect only when there is a semantically equivalent profile and a passing regression test.

## 5. Phased implementation roadmap

Each phase should be a small, reviewable change with a dedicated commit. Do not start a later migration while a prerequisite acceptance criterion is failing.

### Phase 0 — Evidence inventory and behavioral contract

**Goal:** turn the current evidence into a complete call-site and runtime map, with no intended gameplay change.

**Inspect:**

- Every write to \`GameplayFreeze\`, and every use of \`enterGameplayFreeze\`, \`exitGameplayFreeze\`, \`getGameplayFreezeRemaining\`, and \`isGameplayFrozen\`.
- Every read/write of \`hitStopTimer\`, \`hitStopCooldown\`, \`hitStopPriority\`, and every use of \`requestHitStop\` / \`isHitStopActive\`.
- Every \`HitStopSystem\` construction and registration, including phase, priority, group, and whether it can update through a freeze.
- Every \`Juice.shake\`, \`JuiceOrchestrator.triggerEvent\`, direct shake-resource write, and renderer/drawer reading those channels.
- The current time units for each shake duration and each freeze API.
- Existing tests for pauses, time scale, rollback/re-simulation, and lifecycle teardown.

**Deliverables:**

- A concise producer → contract → consumer matrix.
- A list of duplicate writes that may be removed only after a catalog event is wired.
- An explicit decision for local play, networked play, reduced motion, pause, and indefinite freeze behavior.
- A test baseline for current expected effects.

**Acceptance criteria:**

- Every active hit-stop mechanism is accounted for.
- Registration coverage and runtime readers are identified by repository-wide search.
- Existing behavior that must be preserved is recorded before implementation.
- No new registry, service locator, or replacement effects API is introduced.

### Phase 1 — Canonical gameplay freeze integration

**Goal:** ensure a catalog hit-stop request stops the phases that the core scheduler is designed to freeze.

**Primary files:**

- \`src/games/shared/rendering/HitStopSystem.ts\`
- \`src/games/shared/rendering/SharedVFXInternal.ts\`
- \`src/games/shared/rendering/JuiceOrchestrator.ts\`
- \`packages/core/src/runtime/GameplayFreezeMixin.ts\` (only if a core contract gap is proven)
- \`packages/core/src/ecs/Schedule.ts\` (only if the verified freeze semantics require a scheduler change)
- \`src/games/shared/rendering/__tests__/JuiceOrchestrator.test.ts\`
- Relevant core scheduler tests.

**Atomic steps:**

1. Implement hit-stop requests through the canonical \`GameplayFreeze\` resource.
2. Preserve the priority and cooldown policy without a second active duration timer.
3. Handle an existing indefinite freeze and direct freezes without extending or clearing them accidentally.
4. Decide and implement correct \`HitStopSystem\` registration/cooldown ownership based on Phase 0 findings.
5. Remove or derive the legacy \`hitStopTimer\` only after all consumers are migrated.
6. Keep effect spawning safe during \`world.isUpdating\`; do not bypass the existing command-buffer path.
7. Define networked and reduced-motion behavior before letting Juice configuration alter freeze duration.

**Required tests:**

- An accepted \`requestHitStop\` makes the scheduler skip the expected Input, Transform, Collision, and GameRules work while the freeze is active.
- Simulation resumes after the canonical duration expires.
- Higher-priority override, equal/lower rejection, and cooldown behavior match the documented policy.
- Existing indefinite pause is not accidentally converted into a timed hit-stop.
- No timer is decremented twice or left active after the canonical freeze ends.
- Re-simulation, time scale, and pause behavior remain correct.
- Tests verify systems actually do or do not run; checking only \`isHitStopActive\` is insufficient.

**Acceptance criterion:** there is one authoritative active freeze duration, and a catalog request has observable, tested scheduler behavior.

### Phase 2 — Screen-shake and \`Juice.shake\` contract audit

**Goal:** document the fallback cascade and prevent duplicate or unit-inconsistent shake behavior.

**Primary files:**

- \`packages/core/src/utils/Juice.ts\`
- \`src/games/shared/rendering/JuiceOrchestrator.ts\`
- Core \`ScreenShake\` component/system and relevant renderers
- \`src/games/hitandrun/systems/HitRunFeedbackSystem.ts\`
- \`src/games/hitandrun/weapons/HitRunWeaponSystem.ts\`
- Affected game-specific shake consumers.

**Atomic steps:**

1. Write a table of the singleton, resource, and GameState fallback consumers.
2. Determine whether the shake duration contract is milliseconds or seconds for each consumer; cover the current conditional conversion with tests.
3. Identify all renderers/drawers that read \`HitRunScreenShake\`, \`ScreenShake\`, or \`GameState.screenShake\`.
4. Decide the preferred channel for each game. Where both a custom resource and core camera component are written, document whether both are consumed.
5. Migrate a single game at a time to the chosen path. Do not delete compatibility fallbacks before the final consumer is migrated.
6. Keep effect intensity/duration clamping and accessibility behavior unless a test-backed decision explicitly changes it.

**Required tests:**

- A shake request produces the expected camera movement through the configured renderer path.
- Only the intended channel is active for a migrated event; no double shake is rendered.
- Duration units produce comparable real-time behavior across all supported fallback paths.
- Existing consumers that still use a fallback keep working until migrated.

**Acceptance criterion:** each migrated game has one documented, test-proven effective shake channel, and duration semantics are consistent at the API boundary.

### Phase 3 — Type the catalog event contract

**Goal:** detect invalid game/event combinations at compile time and surface unknown dynamic events during development.

**Primary file:** \`src/games/shared/rendering/JuiceOrchestrator.ts\`.

**Atomic steps:**

1. Retain the existing \`SupportedGameId\` union.
2. Preserve the catalog's per-game literal keys, using an appropriate \`satisfies\`/literal typing pattern if it fits the current TypeScript configuration.
3. Type \`triggerEvent\` generically so the accepted event name depends on the selected game ID.
4. Keep the context shape stable unless an actual consumer needs new fields.
5. Add a development diagnostic for unknown dynamically supplied profiles without introducing a second event registry.
6. Add type-level checks or compile-time fixtures for valid and invalid combinations.

**Acceptance criteria:**

- Existing valid calls compile unchanged or receive a small mechanical correction.
- An event from another game's catalog is rejected by TypeScript.
- An unknown literal cannot silently pass as a valid profile call.
- Runtime handling of untrusted/dynamic event names remains deliberate and documented.
- \`spawn\` clamping, reduced-stimulation behavior, and update-time command-buffer semantics are unchanged.

### Phase 4 — Arkanoid vertical pilot

**Goal:** migrate one concrete game path end-to-end, using the canonical freeze and shake contracts without replacing game-specific mechanics unnecessarily.

**Primary file:** \`src/games/arkanoid/systems/ArkanoidCollisionSystem.ts\`, plus the catalog, relevant VFX utilities, and focused tests.

**Atomic steps:**

1. Map non-lethal brick hit and brick destruction as distinct semantic events. Do not emit \`brick:shatter\` for every non-lethal hit.
2. Wire the existing \`arkanoid.brick:shatter\` profile to the correct destruction path, if its actual behavior matches the existing profile semantics.
3. If non-lethal brick hits need centralized feedback, introduce a separately named profile only after agreeing on its semantics and adding tests.
4. Replace direct freeze writes only for events now handled by the canonical profile. Avoid applying hit-stop twice from the same collision.
5. Retain \`Juice.squash\`, score popups, custom particle emitters, and SFX where the catalog does not yet express equivalent behavior.
6. Ensure the feedback is emitted once, and that visual/audio work is not duplicated during re-simulation.
7. Preserve combo logic, explosive AOE, brick score and count updates, and collision rules.

**Acceptance criteria:**

- A non-lethal hit has the intended feedback without incorrectly triggering a shatter profile.
- Brick destruction produces one hit-stop request, one intended shake path, expected particles and SFX, and correct score/combo behavior.
- The scheduler actually freezes the expected phases for the configured duration.
- No duplicate direct/profile hit-stop request remains for the same effect.
- Existing Arkanoid collision and gameplay tests pass.

**Why Arkanoid first:** its direct hit response and destruction path clearly demonstrate the fragmented implementation, and the catalog already has a brick-shatter profile to evaluate against real behavior.

### Phase 5 — Pong and Space Invaders migration

**Goal:** remove duplicated behavior while preserving each game's unique collision, explosion, and boss rules.

**Primary files:**

- \`src/games/pong/systems/PongCollisionSystem.ts\`
- \`src/games/space-invaders/systems/SpaceInvadersCollisionSystem.ts\`
- \`src/games/shared/rendering/JuiceOrchestrator.ts\`
- Relevant scene registration and tests.

**Pong steps:**

1. Verify that \`paddle:hit\` describes the actual ball-paddle contact effect and call the typed catalog event at that point.
2. Remove the direct \`GameplayFreeze\` write only after the catalog request is confirmed to drive the canonical freeze.
3. Keep squash/stretch and paddle recoil as game-specific effects unless the profile explicitly supports them.
4. Confirm ball velocity, spin, combo, particle direction, and audio are unchanged.

**Space Invaders steps:**

1. Verify the intended semantics and call timing for \`shield:degraded\`, \`alien:destroyed\`, and \`ufo:destroyed\`.
2. Correct the event mapping if a boss hit currently triggers a destruction profile; do not simply rename a key without tests.
3. Migrate one event path at a time and remove the direct freeze write only when a single catalog request owns that event's hit-stop.
4. Preserve boss HP rules, player invulnerability, score/lives, explosions, and existing SFX.
5. Confirm that \`HitStopSystem\` is registered and that its remaining policy state has a valid lifecycle.

**Acceptance criteria:**

- Each migrated collision event requests hit-stop only once.
- Catalog-driven freeze works in the actual game scene.
- The screen shake uses the selected single channel.
- Existing mechanics and tests remain intact.
- Boss hit versus boss destruction semantics are explicitly tested.

### Phase 6 — Hit&Run correction using the existing audit

**Goal:** make the existing feedback architecture effective end-to-end rather than re-auditing from scratch.

**Reference:** [\`docs/audit/2026-10-23-hitandrun-metal-slug-gap-analysis.md\`](audit/2026-10-23-hitandrun-metal-slug-gap-analysis.md).

**Primary files:** \`HitRunWeaponSystem.ts\`, \`HitRunFeedbackSystem.ts\`, the actual movement and collision systems, presentation registration, and the corresponding integration tests.

**Atomic steps:**

1. Verify each system's scheduled phase and whether it runs while \`GameplayFreeze\` is active.
2. Add a test that initiates the normal HitRun feedback path and asserts that movement and collision outcomes stop for the intended interval, then resume.
3. Consolidate the custom \`HitRunScreenShake\` resource and core camera \`ScreenShake\` component only after identifying all readers. Do not assume that writing both means both are rendered, or that writing one is sufficient for every drawer.
4. Register \`ParticleSystem\` if required by the actual effect components and validate the configured renderer path.
5. Reuse existing profiles/events and audit results instead of creating another combat feedback pipeline.
6. Preserve rollback/re-simulation guards for presentation side effects.

**Acceptance criteria:**

- Hit-stop prevents the intended movement/collision updates in the real Hit&Run schedule.
- Hit-stop duration expires and simulation resumes.
- A single effective screen-shake channel is rendered.
- Impact/explosion particles are visible through the registered presentation system.
- Existing Hit&Run audit findings are closed with tests or explicitly deferred with a reason.

### Phase 7 — Additional game integrations, evidence-gated

**Goal:** migrate only additional game consumers that gain a verified behavior from the shared contracts.

Candidate games include Asteroids, Geometry Wars, Flappy Bird, Frogger, Platformer, Echo Runner, Tower Defense, and others with relevant catalog profiles. Their inclusion in the catalog is not, by itself, a migration requirement.

**Atomic steps:**

1. Run repository-wide searches for catalog calls and direct \`Juice\`/freeze/shake writes.
2. For each candidate, identify the actual runtime path, game mode, system registration, event timing, and renderer.
3. Compare behavior with the current catalog profile.
4. Create a focused issue/commit only if there is a real consumer or duplication to fix.
5. Migrate one event family per commit, with regression tests.

**Acceptance criteria:**

- Every migrated event has at least one verified producer.
- The profile's semantics match that event's actual lifecycle point.
- No game is migrated solely because its ID exists in \`JUICE_CATALOG\`.
- No shared abstraction is expanded without a concrete use case.

### Phase 8 — Reassess melee/projectile lifecycle abstraction

**Goal:** revisit the original sword/fireball ambition after the shared primitives work reliably.

The initial proposal included a new \`CombatJuicePipeline\`, an attack-phase model, additional visual-transform components, and integration across Canvas and Skia. Defer the broad implementation until Phases 1–7 reveal whether existing events, the catalog, \`Juice\`, shared VFX, and sound recipes are insufficient.

**Decision gate:**

- List a concrete requirement that the existing architecture cannot represent cleanly.
- Demonstrate the requirement in one real sword or projectile attack.
- Compare the minimum extension to the existing catalog/event path against a new pipeline.
- Only add phase orchestration if it removes proven duplication or enables a required behavior; do not mirror hit-stop, shake, and sound ownership in the new abstraction.
- Keep gameplay hitboxes and deterministic world transforms independent from visual squash/stretch.
- Verify Canvas/Skia parity before expanding to more games.

**Acceptance criteria:**

- The decision to add or reject a separate pipeline is documented with code evidence.
- If added, it builds on existing effect APIs and has no second hit-stop or screen-shake authority.
- Attack presentation does not mutate collision geometry.
- The initial implementation covers a single representative attack end-to-end with tests before wider rollout.

## 6. Test guardrails

Use existing test conventions and add the smallest targeted suites needed for each phase. Proposed test names below are suggestions, not assertions that those files already exist.

### Hit-stop and scheduler

- Verify canonical freeze resource creation, duration units, expiration, and resumption.
- Verify which phases and systems run while frozen.
- Cover priority override, equal/lower rejection, cooldown, pause, time scale zero, and indefinite freezes.
- Verify that VFX hit-stop requests do not leave a detached timer active.
- Verify registration in each scene that uses catalog hit-stop.

### Screen shake

- Cover singleton, resource, and GameState fallback paths independently.
- Cover milliseconds-versus-seconds semantics and duration expiry.
- Verify which renderer consumes each channel.
- Verify a migrated hit renders one intended shake, not duplicated or missing movement.

### Catalog typing and runtime diagnostics

- Compile-time positive cases for valid game/event pairs.
- Compile-time negative cases for a valid event paired with the wrong game.
- Runtime test for an unknown dynamic event and its development diagnostic.
- Preserve existing \`spawn\` behavior under world updates, low-stimulation mode, and Juice level limits.

### Per-game regression tests

- Arkanoid: non-lethal hit versus brick shatter, combo/score, particles, SFX, freeze once.
- Pong: paddle collision physics, spin, recoil, particle direction, freeze once.
- Space Invaders: player hit, shield degradation, alien destruction, boss hit/death semantics, score/lives.
- Hit&Run: scheduler actually stops movement and collision outcomes while frozen; shake and particles use the intended paths.

### Determinism and networking

Do not assert snapshot parity between configurations that intentionally execute different numbers of simulation ticks due to different simulation-affecting hit-stop durations.

Instead:

- Verify visual-only settings do not mutate authoritative simulation state.
- Verify deterministic hit-stop policies produce the same results when peers receive the same authoritative events and configuration.
- Verify local accessibility preferences cannot silently alter server-authoritative simulation timing.
- Compare snapshots after equivalent logical simulation steps, while separately testing the expected wall-clock pause behavior.
- Keep presentation audio, particles, and shake suppressed or safely handled during re-simulation.

## 7. File and search checklist

Before changing a phase, refresh this inventory against the current branch:

- \`src/games/shared/rendering/HitStopSystem.ts\`
- \`src/games/shared/rendering/SharedVFXInternal.ts\`
- \`src/games/shared/rendering/JuiceOrchestrator.ts\`
- \`src/games/shared/rendering/SharedVFX.ts\`
- \`packages/core/src/runtime/GameplayFreezeMixin.ts\`
- \`packages/core/src/ecs/Schedule.ts\`
- \`packages/core/src/utils/Juice.ts\`
- \`src/games/arkanoid/systems/ArkanoidCollisionSystem.ts\`
- \`src/games/pong/systems/PongCollisionSystem.ts\`
- \`src/games/space-invaders/systems/SpaceInvadersCollisionSystem.ts\`
- \`src/games/hitandrun/systems/HitRunFeedbackSystem.ts\`
- \`src/games/hitandrun/weapons/HitRunWeaponSystem.ts\`
- \`docs/audit/2026-10-23-hitandrun-metal-slug-gap-analysis.md\`

Useful searches from the repository root:

- \`rg -n 'GameplayFreeze|enterGameplayFreeze|exitGameplayFreeze|getGameplayFreezeRemaining|isGameplayFrozen' src packages\`
- \`rg -n 'hitStopTimer|hitStopCooldown|hitStopPriority|requestHitStop|isHitStopActive|HitStopSystem' src packages\`
- \`rg -n 'Juice\\.shake|JuiceOrchestrator|triggerEvent\\(|HitRunScreenShake|screenShake|ScreenShake' src packages\`
- \`rg -n 'new JuiceOrchestrator|\\.spawn\\(|triggerEvent\\(' src/games\`

These searches are investigation steps, not proof that every relevant dynamic path can be found statically. Follow up with targeted tests and registration review.

## 8. Definition of done

The roadmap is complete only when all of the following hold:

- One authoritative active freeze duration drives the scheduler; no disconnected hit-stop timer claims to freeze gameplay.
- Priority, cooldown, pause, indefinite freeze, time-scale, and network behavior are documented and tested.
- \`Juice.shake\` fallback and unit semantics are documented; each migrated game renders through one intended channel.
- The catalog event API prevents invalid game/event pairs at compile time and makes missing dynamic profiles visible during development.
- Arkanoid is migrated vertically and its non-lethal hit/destruction semantics remain correct.
- Pong and Space Invaders no longer duplicate hit-stop requests for migrated events, and their lifecycle event mappings are verified.
- Hit&Run uses the existing audit as baseline; movement/collision freeze, shake, and particle registration are tested end-to-end.
- Additional games are integrated only with evidence of real consumers and a concrete benefit.
- Presentation effects remain rollback-safe; the determinism tests account for whether a feature changes simulation timing.
- Any future attack-phase pipeline is justified by a concrete gap and does not create duplicate ownership of existing effects.
- Relevant tests pass, and the repository's standard CI command is run before merging.

## 9. Open design decisions

These decisions must be resolved in Phase 0 rather than silently encoded in a new abstraction:

1. **Hit-stop semantics in multiplayer:** presentation-only freeze versus an explicitly synchronized authoritative simulation pause.
2. **Accessibility:** whether reduced motion changes only visuals or also simulation-affecting hit-stop, and how that choice is synchronized.
3. **Legacy shake fallbacks:** which games still require singleton/resource/GameState support, and the migration order.
4. **Missing catalog profiles:** development warning/error policy for dynamic events versus statically typed literals.
5. **Attack lifecycle:** whether a new pipeline is warranted after the existing catalog and effect helpers are consolidated.

The default implementation principle is **consolidate first, replace only when necessary**. Every phase must leave one clear owner for each effective behavior, a test proving that behavior, and no second API or timer introduced merely to work around the first.
