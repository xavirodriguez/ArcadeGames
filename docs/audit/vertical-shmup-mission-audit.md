# Vertical Shmup — Mission audit (boss & graze completion)

- **Date:** 2026-11-23
- **Branch:** `feat/shmup-boss-and-graze`
- **Base commit:** `5bb7b3303` (`master`)
- **Scope:** tasks T1–T7 (spiral phase, boss behavior, boss phases, boss-wave unification, bomb rewards, wave announcements, regression coverage).

## 1. Baseline

| Item | Value |
| --- | --- |
| Local branch | created from `master` at `5bb7b3303` (remote branch existed but pointed at the same commit: zero diff) |
| Working tree before work | clean except untracked `dist-e2e/` (left untouched) |
| Vertical Shmup suite | 10 suites / 44 tests passing |
| Focused command | `cd src/games/vertical-shmup && npx jest --config jest.config.cjs` |

## 2. Architecture inventory

| Area | File / symbol |
| --- | --- |
| Game entry | `src/games/vertical-shmup/VerticalShmupGame.ts:15` (`VerticalShmupGame`) |
| Scene & system order | `src/games/vertical-shmup/scenes/ShmupGameScene.ts:81-102` |
| Singleton gameplay state | `src/games/vertical-shmup/types/ShmupTypes.ts:33` (`ShmupGameState`) |
| Component registry | `src/games/vertical-shmup/types/ShmupTypes.ts:47` (`ShmupComponentRegistry`) |
| Event registry | `src/games/vertical-shmup/types/ShmupTypes.ts:5-13` (`ShmupEventRegistry`) |
| Config schema | `src/games/vertical-shmup/types/ShmupConfigSchema.ts` |
| Config values | `src/games/vertical-shmup/config/vertical-shmup.json` |
| Enemy creation / archetype / HP | `src/games/vertical-shmup/EntityFactory.ts:66-181` (`createEnemy`) |
| Wave & continuous spawn | `src/games/vertical-shmup/systems/ShmupSpawnSystem.ts` |
| Enemy movement | `src/games/vertical-shmup/systems/EnemyPathSystem.ts` |
| Bullet patterns (pure) | `src/games/shared/BulletPatternSystem.ts:12-28` |
| Bullet pattern system | `src/games/vertical-shmup/systems/BulletPatternSystem.ts` |
| Graze geometry | `src/games/vertical-shmup/graze/grazeMath.ts` |
| Graze credits | `src/games/vertical-shmup/systems/ShmupGrazeSystem.ts` |
| Bombs | `src/games/vertical-shmup/systems/ShmupBombSystem.ts` |
| Kill / damage resolution | `src/games/vertical-shmup/systems/ShmupCollisionSystem.ts` |
| Bullet pools (projectiles) | `src/games/vertical-shmup/EntityPool.ts:1-46` |
| HUD | `src/app/vertical-shmup/index.tsx:132-215` |
| Renderer wiring | `src/games/vertical-shmup/rendering/ShmupRenderer.ts` |
| Presentation resources pattern | `src/games/vertical-shmup/juice/ShmupJuiceHelpers.ts:77-110` (`ShmupDamageVignette`) |
| Foreground overlay hook | `packages/core/src/rendering/Renderer.ts:33`; implemented in `packages/renderer-canvas/src/CanvasRenderer.ts:428` and `packages/renderer-skia/src/SkiaRenderer.ts:187` |
| Rollback | `packages/core/src/network/RollbackSimulation.ts:40-135`; resources only snapshotted when explicit (`packages/core/src/snapshots/SnapshotResourceState.ts:64`) |

## 3. Observed behavior (answers to the audit questions)

1. **Shot interval.** `ShmupBulletPatternSystem` decrements `cooldownRemaining` by `deltaTime` and refills it with `1 / ratePerSec` after each volley (`src/games/vertical-shmup/systems/BulletPatternSystem.ts:20-45`). Pattern rates are authored in `EntityFactory.ts:83-90`.
2. **Angular phase.** `tickBulletPattern` advances `phase` by `deltaTime * ratePerSec * 2π` (`src/games/shared/BulletPatternSystem.ts:24-28`). Spiral bullets add that phase to a ring (`:17`). The phase is therefore **time-driven**, not shot-driven.
3. **Enemy HP.** Every enemy, boss included, receives `ENEMY_HP + floor((wave - 1) / 3)` (`EntityFactory.ts:153-155`). With `ENEMY_HP = 1` a boss has 2 HP at wave 5.
4. **Boss differentiation.** Only `ShmupEnemy.archetype === "boss"` plus render size/collider (`EntityFactory.ts:93-94,154`) and bomb damage routing (`ShmupBombSystem.ts:65`). No dedicated HP, movement, phase or boundary policy.
5. **Enemy movement.** `EnemyPathSystem` mutates `Transform.x` for `sine`/`arc` while `PhysicsIntegrateSystem` moves `y` from `Velocity` (`EnemyPathSystem.ts:13-22`). Boss uses `kind: "sine"` with velocity `ENEMY_SPEED * 0.4`.
6. **World limits.** Player uses `bounce`+clamp (`EntityFactory.ts:49-61`). Enemies (boss included) use `Boundary.mode = "destroy"` (`EntityFactory.ts:166-174`), so a boss that reaches the bottom is reclaimed silently.
7. **Wave advancement.** `ShmupSpawnSystem` advances when `activeEnemies.length === 0` (`ShmupSpawnSystem.ts:16-20`), then spawns the next wave. Continuous interval spawns keep running while any enemy exists (`:52-70`), **including during a boss fight**.
8. **Graze accounting.** `ShmupGrazeSystem` keeps a private `Set<number>` of already-grazed bullets (`ShmupGrazeSystem.ts:17`), increments `ShmupGameState.grazeCount` and score (`:58-60`). The set is system state, not snapshot state.
9. **Bombs.** Stock lives in `ShmupGameState.bombsRemaining`; spent in `ShmupBombSystem.detonate` (`ShmupBombSystem.ts:86-89`). There is no way to gain bombs: no max, no graze reward, no boss reward.
10. **Wave presentation.** Only the React HUD shows `WAVE nn` (`src/app/vertical-shmup/index.tsx:176-182`) and a boss panel (`:193-210`). No in-canvas announcement.

## 4. Reproducible issues

### 4.1 Spiral revolution drift (T1)

`phase` grows with elapsed time * shot rate, so between two volleys the orientation advances by `dt * ratePerSec * 2π` (≈0.8 rad per 1/60 s at `ratePerSec = 0.8`), not by a fixed per-shot step. Changing the frame rate changes the emitted angle sequence.

### 4.2 Boss is a normal enemy with a bigger sprite (T2/T3)

- HP formula shared with trash mobs (`EntityFactory.ts:153`).
- `sine` flight plus downward velocity: no hover, and `Boundary.destroy` removes it at the bottom edge.
- Continuous spawning is not suspended during a boss.
- Attack pattern never changes with remaining HP.

### 4.3 Boss wave identity split (T4)

`ShmupSpawnSystem.ts:34` uses `nextWave % 5 === 0`; `EnemyArchetypes.ts:20` uses `safeWave % 4 === 0`. Waves 4, 8, 12… can receive a boss *visual* archetype without a boss encounter, and wave 5/10 bosses are created with the default `scout` visual parameter.

### 4.4 Graze/bomb systems never see pooled projectiles (root cause for T5)

`EntityPool.ts:9` tags pooled projectiles as `EnemyBullet` / `PlayerBullet`, while every consumer queries `ShmupEnemyBullet` / `ShmupPlayerBullet` (`ShmupGrazeSystem.ts:34`, `ShmupBombSystem.ts:54`). Verified with a throwaway probe test:

```
[["EnemyBullet",true,1],["ShmupEnemyBullet",false,0],["ShmupPlayerBullet",false,0],["PlayerBullet",false,1]]
```

Consequence: in real gameplay grazes never increment and bombs never clear bullets, even though the existing contract tests pass because they hand-build `ShmupEnemyBullet` entities. This must be fixed before graze rewards are meaningful.

### 4.5 No way to earn bombs (T5)

`BOMB_STOCK_INITIAL` is the only stock source; no `BOMB_STOCK_MAX`, no graze threshold, no boss reward.

### 4.6 No wave announcement (T6)

No event-driven presentation resource or overlay exists. `shmup:wave_complete` is emitted (`ShmupSpawnSystem.ts:27`) but consumed only by audio.

## 5. Task dependencies

```
T1 (spiral phase) ─────────────► T3 (boss phase 2/3 use spiral)
T4 (boss wave predicate) ──────► T2 (boss spawn path) ──► T3, T5 (boss kill reward)
T5 graze reward ───────────────► requires pooled-bullet tagging fix (§4.4)
T6 announcement ───────────────► independent (presentation overlay)
T7 folds all of the above into coverage + docs
```

## 6. Regression risks

| Risk | Mitigation |
| --- | --- |
| `tickBulletPattern` is shared (`src/games/shared`) | Audited: only `ShmupBulletPatternSystem` consumes it; `computeBulletPatternAngles` stays untouched for non-spiral kinds |
| Boss hover adds a new `EnemyPath.kind` | `kind` is typed as a closed union used by `EnemyPathSystem` and read-only visual context; normal kinds unchanged |
| Boss HP jumps 2 → 250 | Balance justified in §7.2; player DPS ≈ 8.3/s, so ≈30 s duel; bombs contribute `BOMB_BOSS_DAMAGE` |
| Boundary policy change | Only boss entities receive the clamp policy; normal enemies keep `destroy` |
| Pausing spawns during boss | The early return happens after wave-clear handling and before `spawnTimer` mutation |
| Bomb economy caps | Centralized pure helpers, capped at `BOMB_STOCK_MAX`; rewards lost when already at cap (documented) |
| Announcement side effects during rollback | Resource is presentation-only (never registered as snapshot resource); handler ignores `world.isReSimulating` |
| Existing React HUD | Untouched; canvas overlay is additive |
| `as any` guardrail regression | No new casts planned; baseline guardrail run recorded separately |

## 7. Implementation plan

1. **T1** — pure semantics: `spinPerShot` in `BulletPatternConfig`, `tickBulletPattern` only ticks cooldown, `advancePatternPhase` advances once per emitted volley; system advances after firing. Tests: per-shot delta, accumulation, frame-rate independence, reset, entity-order independence.
2. **T2** — `boss/bossMath.ts` (`computeBossHp`), config keys `BOSS_HP_BASE = 250`, `BOSS_HP_SCALING_START_WAVE = 5`, `BOSS_HP_PER_EXTRA_WAVE = 4`; hover path kind with deterministic entry easing + bob; boss clamp boundary; spawn system early-return while a boss is alive.
3. **T3** — `boss/bossPhase.ts` pure `resolveBossPhase(hp, maxHp)` with strict thresholds (`> 66 %`, `> 33 %`, else) and monotonic `nextBossPhase`; per-phase patterns in `boss/bossPatterns.ts`; `ShmupBossPhaseSystem` rewrites `BulletPattern.config` only on phase change.
4. **T4** — `boss/bossWaves.ts` single predicate `isShmupBossWave` used by spawn system and archetype selection; wave-clear rule unchanged (`activeEnemies.length === 0`).
5. **T5 (prerequisite fix)** — tag pooled shmup projectiles with the declared `ShmupEnemyBullet`/`ShmupPlayerBullet` component names; keep graze credits per bullet via a component flag rather than system state.
6. **T5** — `bombs/bombEconomy.ts` pure helpers (`grazeBombRewards`, `grantBombs`, `resolveBombStockMax`), config keys `BOMB_STOCK_MAX = 5`, `GRAZE_BOMB_THRESHOLD = 40`, `BOSS_KILL_BOMB_REWARD = 1`; graze threshold reward in `ShmupGrazeSystem`; boss kill reward in `ShmupCollisionSystem`; rewards execute during resimulation (gameplay state) with presentation suppressed.
7. **T6** — `presentation/ShmupWaveAnnouncement.ts` (state, pure alpha, draw via `IDrawAdapter`, canvas/skia foreground drawers) + `ShmupWaveAnnouncementSystem` (Presentation) subscribing to `shmup:wave_complete`, deduplicating by wave, ignoring resimulation; registered through `registerForegroundEffect` on both backends; config `WAVE_ANNOUNCEMENT_DURATION = 2`.
8. **T7** — tests per task, docs (`vertical-shmup-boss-and-waves.md`, bomb/graze contract updates), mission report.

## 8. Decisions taken during implementation

- **Shot-driven spin** is defined per volley (one volley = one "shot" of `bulletCount` bullets), because `phase` is applied to the whole ring. Default `spinPerShot` for spiral is `2π / bulletCount`; boss spirals use explicit smaller values.
- **Boss HP** is 250 at wave 5 with `+4` per extra wave, matching the proposed reference. `createBossHp` lives in a pure module so future difficulty curves can replace the formula without touching the factory.
- **Hover** reuses the existing `EnemyPath` component instead of adding a second movement system; the boss velocity is zero and the path system owns its position.
- **Boss boundary** uses `bounce` with both axes stopped (`bounceX/Y = false`) and clamped, so the boss can never be reclaimed by a boundary event.
- **Graze reward** is derived from `floor(grazeCount / 40)` differences, so thresholds cannot be paid twice and no extra counter state is needed.
- **Wave announcement** stays in world-resource presentation land; `shmup:wave_complete` keeps its current semantics (no Story/StoryDirector bridge).
