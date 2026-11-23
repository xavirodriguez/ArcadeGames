# Vertical Shmup — Boss, waves, rewards and announcements

- **Date:** 2026-11-23
- **Status:** Implemented and covered by tests
- **Scope:** T2–T6 of the boss & graze completion mission

## Boss waves

`boss/bossWaves.ts` is the single predicate: `isShmupBossWave(wave)` is true for 1-based waves divisible by 5. Both consumers use it:

- `systems/ShmupSpawnSystem.ts` spawns the curated encounter (boss + two `armored` escorts) and stops continuous interval spawning for the whole boss wave.
- `EnemyArchetypes.ts` returns the `boss` visual archetype only on those waves, so wave 4/6/9 never shows a boss identity.

Wave-clear semantics are unchanged: a wave advances only when `activeEnemies.length === 0`, which for a boss wave means the boss **and** both escorts are gone. `shmup:wave_complete` carries the *new* wave number.

## Boss health and movement

| Property | Rule |
|----------|------|
| HP | `computeBossHp(wave)` = `250 + max(0, wave - 5) * 4` (wave 5 → 250, wave 10 → 270) |
| Separation | Bosses never reuse the trash-mob `ENEMY_HP` formula |
| Velocity | `Velocity.vy = 0`; the hover path owns placement |
| Entry | `EnemyPath.kind = "hover"`, smoothstep easing from entry Y to `WORLD_HEIGHT * 0.22` over 1.8 s |
| Hover | Vertical bob (amplitude 18, frequency 1.6 rad/s) + horizontal sway (amplitude 90, frequency 0.9 rad/s) |
| Determinism | All motion depends only on accumulated `path.elapsed` — no frame-time or hidden system state |
| Boundary | `bounce` with both axes stopped and clamped (`maxY = WORLD_HEIGHT * 0.5`): the boss cannot self-destruct at the bottom edge; normal enemies keep `destroy` |

## Attack phases

`boss/bossPhase.ts` resolves phases from the health ratio with strict thresholds (monotonic via `nextBossPhase`):

| Phase | HP ratio | Pattern |
|-------|----------|---------|
| 1 | `> 0.66` | `ring`, 8 bullets |
| 2 | `0.33 < ratio <= 0.66` | `spiral`, 8 bullets, `spinPerShot = π/8` |
| 3 | `<= 0.33` | `spiral`, 12 bullets, `spinPerShot = π/12` |

Exactly 66% enters phase 2; exactly 33% enters phase 3. Healing cannot regress the phase. `ShmupBossPhaseSystem` runs in `SystemPhase.Simulation` before `ShmupBulletPatternSystem`, holds no mutable state, and only replaces `BulletPattern.config` (resetting `BulletPattern.phase` to 0) when the phase actually changes. The phase lives in the serializable `BossPhase` component, so rollback restores the correct attack.

Spiral rotation is **per volley**, not per elapsed time (`BulletPatternSystem` calls `advanceBulletPatternPhase` once after each volley), keeping angle sequences frame-rate independent.

## Rewards and presentation

- Killing a boss grants `BOSS_KILL_BOMB_REWARD` (default 1) bomb up to `BOMB_STOCK_MAX` (default 5). The `ShmupEnemy.bombRewardGranted` flag prevents double payment across deferred removal/resimulation.
- `shmup:wave_complete` drives a presentation-only `ShmupWaveAnnouncement` resource (`wave`, `remaining`, `duration` = `WAVE_ANNOUNCEMENT_DURATION`, default 2 s). `ShmupWaveAnnouncementSystem` runs in `SystemPhase.Presentation` with `runsWhileFrozen = true`, deduplicates by wave number (the expired resource stays with `remaining = 0`), ignores events while `world.isReSimulating`, and never mutates gameplay state. The resource is deliberately not registered as a snapshot resource.
- An `IDrawAdapter` overlay is registered as `shmup_wave_announcement` foreground effect on both Canvas and Skia via `registerForegroundEffect?.`.

See `vertical-shmup-bomb-contract.md` and `vertical-shmup-graze-contract.md` for the bomb economy details.

## Files

- `boss/bossMath.ts`, `boss/bossWaves.ts`, `boss/bossPhase.ts`, `boss/bossPatterns.ts`
- `bombs/bombEconomy.ts`
- `EntityFactory.ts`, `EntityPool.ts`, `EnemyArchetypes.ts`, `types/ShmupTypes.ts`, `types/ShmupConfigSchema.ts`
- `systems/ShmupBossPhaseSystem.ts`, `systems/ShmupWaveAnnouncementSystem.ts`, `systems/ShmupSpawnSystem.ts`, `systems/EnemyPathSystem.ts`
- `presentation/ShmupWaveAnnouncement.ts`, `rendering/ShmupWaveAnnouncementForeground.ts`, `rendering/ShmupRenderer.ts`, `scenes/ShmupGameScene.ts`

## Tests

`__tests__/VerticalShmupBoss.test.ts`, `VerticalShmupBossPhase.test.ts`, `VerticalShmupBossWaves.test.ts`, `VerticalShmupProjectileTagging.test.ts`, `VerticalShmupBombRewards.test.ts`, `VerticalShmupWaveAnnouncement.test.ts`, `VerticalShmupSpiralPattern.test.ts`.
