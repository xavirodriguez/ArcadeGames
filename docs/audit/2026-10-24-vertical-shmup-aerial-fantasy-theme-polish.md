# Vertical Shmup — Aerial Fantasy Theme Polish

**Date:** 2026-10-24  
**Scope:** implementation audit and actionable art-direction acceptance criteria for src/games/vertical-shmup/.

## Current implementation (verified in source)

The theme foundation already exists on master; this is not a greenfield visual system.

- rendering/ShmupColorTokens.ts defines the core aerial-fantasy palette.
- rendering/ShmupVisualHelpers.ts defines four biome profiles (archipelago, gardens, temples, storm) and deterministic cloud/island/particle placement.
- Canvas and Skia renderers both register shmup_starfield, player, enemy and bullet drawers.
- Enemy drawing context currently infers the visual archetype from movement path and render size. This couples gameplay behaviour to art direction.
- EntityFactory.ts:createEnemy adds ShmupEnemy with score only; no explicit visual archetype is stored on the entity.
- World dimensions are configured as 720 × 1280 in config/vertical-shmup.json. Visual helpers should use this configured coordinate system and avoid hard-coded 480 × 854 assumptions.

## Recommended next implementation

### 1. Decouple enemy identity from movement

Introduce a strict visual archetype (scout, interceptor, armored, support, boss) on the enemy component or a dedicated visual component. Assign it explicitly at creation/spawn time. Keep EnemyPath.kind exclusively for movement (straight, sine, arc).

Acceptance:
- Changing an enemy's path does not change its silhouette.
- Existing enemies retain their current movement, HP, score, collision radius, and fire pattern.
- Entity pools and deferred command-buffer creation remain correct.
- Unknown or missing archetype values have a documented safe fallback.

### 2. Make the biome progression legible

Retain the four current biomes, but ensure each has one unmistakable visual motif:
- Archipelago: ivory clouds, jade islands, pink petals.
- Gardens: richer greens, gold pollen, hanging vines.
- Temples: slate architecture, gold ornaments, sparse runes.
- Crystal Storm: dark blue-gray sky, restrained cyan crystals, reduced ambient brightness.

Use the existing BIOMES palette profiles as the source of truth. Avoid defining duplicate hex values in Canvas and Skia files.

Acceptance:
- Biome selection changes only presentation, not simulation.
- Transition boundaries are deterministic and tied to the existing wave state.
- Ambient particles remain visually distinct from hostile bullets.

### 3. Preserve gameplay readability

Rendering priority from highest to lowest:
1. Player hitbox location and player silhouette.
2. Hostile bullets and warning telegraphs.
3. Enemy silhouettes and boss vulnerable core.
4. Player shots and pickups.
5. Background landmarks and ambient particles.

Guidelines:
- Keep high-contrast architecture near the outer flanks where practical.
- Do not let cloud highlights or cascades resemble vertical projectiles.
- Reduce ambient opacity/density before reducing hostile-projectile contrast.
- Keep effects short and bounded; never let explosion particles conceal incoming bullets.

### 4. Canvas/Skia parity

Treat the Canvas and Skia drawers as two implementations of one art direction. Shared tokens and pure geometry descriptors should define shape dimensions and color choices; platform-specific code should only translate those descriptors into drawing calls.

Acceptance:
- Same logical dimensions, layer order, archetype silhouette, and palette in both renderers.
- Any unsupported Skia effect has an explicit documented fallback rather than silently changing the design.
- Avoid per-frame allocation of static geometry where profiling shows it matters.

## Validation checklist

- [ ] Run existing vertical-shmup tests before and after changes.
- [ ] Run TypeScript, lint, and relevant CI commands.
- [ ] Capture the opening scene and a later wave with multiple enemies and bullets.
- [ ] Verify the player, enemy silhouettes, bullets, and pickups remain distinguishable over all four biomes.
- [ ] Compare Canvas and Skia captures at the same logical viewport.
- [ ] Confirm visual-only changes do not alter seeded simulation results or gameplay parameters.
- [ ] Record commands and actual outcomes; do not claim visual validation without real captures.

## Explicit non-goals for the first polish pass

- No gameplay rebalance.
- No new rendering dependencies.
- No ECS entities for decorative clouds, islands, or ambient particles.
- No wholesale rewrite of the renderers.
- No claim that static inspection proves runtime or visual correctness.


## Implementation update — `feat/vertical-shmup-theme-polish`

### Enemy archetypes

- Added `ShmupEnemyArchetype` to the `ShmupEnemy` component: `scout`, `interceptor`, `armored`, `support`, `boss`.
- `createEnemy` now stores an explicit archetype; direct factory callers default safely to `scout`.
- Added the pure `selectShmupEnemyArchetype(wave, spawnIndex)` selector. Wave and spawn slot select the silhouette; movement path still controls only movement.
- Spawn squads and the initial scene now pass archetypes explicitly. A boss is reserved for slot zero of waves divisible by four after wave one.
- The visual context reads the stored archetype and no longer infers identity from `EnemyPath.kind` or sprite size.

### Biome background pass

- Extended the shared `BIOMES` profiles with atmosphere style, light source position/color/radius, cloud opacity, and landform style.
- Canvas and Skia now render biome-specific light rays or storm lightning, opacity-controlled cloud layers, distinct lush/ruin/crystal island silhouettes, and matching particle motifs.
- All decoration remains derived from existing world time, wave, and deterministic parallax data. No gameplay RNG is used for visual effects.

### Validation status

- Added `VerticalShmupTheme.test.ts` for path/archetype independence, deterministic archetype selection, four-biome selection, and bounded parallax decoration counts.
- These tests and TypeScript/lint checks have **not yet been executed** in this environment. A local clone was blocked by unavailable DNS/network access; the CI result must be checked on the pull request before treating the changes as validated.
- No in-game screenshots or Canvas/Skia visual comparison have been captured, so rendering parity is a code-level intent, not a visually verified result.
