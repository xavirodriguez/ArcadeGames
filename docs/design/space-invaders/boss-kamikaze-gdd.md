# Space Invaders: Boss Kamikaze Dives & Escalating Wave Design Document

**Author**: GameDesigner (Systems & Mechanics Architect)
**Status**: Living Specification
**Version**: 1.0.0
**Target Engine**: `@tiny-aster/core` (Entity Component System)
**Game Module**: `src/games/space-invaders/`

---

## 🎯 Design Pillars & Player Experience

1. **High-Stakes Escalation**: As invader counts thin out, formation speed accelerates and surviving units break formation to launch high-velocity kamikaze dives, transforming passive row clearing into active threat dodging.
2. **Boss Fury Mechanics**: Boss entities (`BossComponent`) enter enraged states when player chain kills occur or shields crumble, triggering homing counter-fire and aggressive dive trajectories.
3. **Deterministic Combat RNG**: All enemy dive targeting, boss attack patterns, bullet spawn offsets, and formation drops pull strictly from `world.gameplayRandom` to preserve netcode determinism and replay accuracy.
4. **XP Meta-Progression Integration**: Session performance directly feeds player XP gains to unlock counter-mutators (`shield_pulse`, `faster_bullets`, `extra_life`) in `MutatorRegistry.ts`.

---

## 🔄 Part 1: Core Gameplay Loop Document

```
     +-------------------------------------------------------------+
     |                 MOMENT-TO-MOMENT (0-30s)                    |
     |  Action: Lateral Traversal, Shield Cover, Kamikaze Dodge   |
     |  Feedback: Hit Flashes, Explosion Particles, Screen Shake   |
     |  Reward: Combo Multiplier Build & Row Clears                |
     +------------------------------+------------------------------+
                                    |
                                    v
     +-------------------------------------------------------------+
     |                   SESSION LOOP (5-30 mins)                  |
     |  Goal: Clear Invader Formations & Defeat Phase Bosses       |
     |  Tension: Speed Scaling (1 - remaining/total) + Dives       |
     |  Resolution: Wave Clear or Fleet Invasion (GameOver)        |
     +------------------------------+------------------------------+
                                    |
                                    v
     +-------------------------------------------------------------+
     |                LONG-TERM LOOP (META-PROGRESS)               |
     |  Progression: Earn XP for Boss Defeats & Score Thresholds   |
     |  Retention: Unlock Defenses (e.g. Shield Pulse, Extra Life) |
     +-------------------------------------------------------------+
```

### Moment-to-Moment (0–30 seconds)
- **Action**: Move laterally under shield cover, time upward shots between incoming invader bullets, and dodge sudden kamikaze dives when invaders break formation.
- **Feedback**: White hit flash (`hitFlashFrames = 4`), directional explosion particles, floating combo popups (`x2`, `x3`), and intense screen shake on shield breaches or player hits.
- **Reward**: Rapid score multiplication and satisfaction from intercepting diving invaders mid-flight.

### Session Loop (5–30 minutes)
- **Goal**: Clear 5 invader rows (55 invaders) and overcome phase boss encounters (`BossSystem`).
- **Tension**: Invader speed ramps up non-linearly from `INVADER_SPEED_BASE` (50 px/s) to `INVADER_SPEED_MAX` (400 px/s) as remaining invaders decrease. Below 60% remaining invaders, kamikaze dives trigger.
- **Resolution**: Wave clear applies `LEVEL_SPEED_MULTIPLIER` (1.1x) to subsequent waves; zero lives or invader descent reaching `SHIELD_START_Y` triggers Game Over.

### Long-Term Loop (Meta-Progression)
- **Progression**: Convert total score and wave clear achievements into XP via `MutatorService`.
- **Retention Hook**: Unlock beneficial mutators (`faster_bullets`, `extra_life`, `combo_head_start`, `shield_pulse`) to mitigate higher wave difficulty.

---

## 📊 Part 2: Economy Balance & Tuning Table

All baseline constants are grounded in `GAME_CONFIG` inside `src/games/space-invaders/types/SpaceInvadersTypes.ts`. Proposed extensions are explicitly marked.

| Variable Name | Base Value | Min Limit | Max Limit | Tuning Notes & Code Config Location |
| :--- | :--- | :--- | :--- | :--- |
| `PLAYER_SPEED` | `300` px/s | `150` | `600` | Ship lateral traversal speed. `GAME_CONFIG.PLAYER_SPEED` |
| `PLAYER_INITIAL_LIVES` | `3` | `1` | `5` | Starting player lives. `GAME_CONFIG.PLAYER_INITIAL_LIVES` |
| `PLAYER_SHOOT_COOLDOWN` | `500` ms | `100` | `1000` | Minimum firing interval. `GAME_CONFIG.PLAYER_SHOOT_COOLDOWN` |
| `PLAYER_BULLET_SPEED` | `500` px/s | `300` | `1000` | Upward bullet velocity. `GAME_CONFIG.PLAYER_BULLET_SPEED` |
| `ENEMY_BULLET_SPEED` | `250` px/s | `100` | `600` | Downward enemy projectile velocity. `GAME_CONFIG.ENEMY_BULLET_SPEED` |
| `ENEMY_FIRE_INTERVAL_MIN`| `1000` ms | `500` | `2000` | Minimum invader fire interval. `GAME_CONFIG.ENEMY_FIRE_INTERVAL_MIN` |
| `ENEMY_FIRE_INTERVAL_MAX`| `3000` ms | `1500` | `5000` | Maximum invader fire interval. `GAME_CONFIG.ENEMY_FIRE_INTERVAL_MAX` |
| `INVADER_SPEED_BASE` | `50` px/s | `20` | `150` | Initial formation speed. `GAME_CONFIG.INVADER_SPEED_BASE` |
| `INVADER_SPEED_MAX` | `400` px/s | `200` | `800` | Speed cap when 1 invader remains. `GAME_CONFIG.INVADER_SPEED_MAX` |
| `INVADER_DESCENT_STEP` | `20` px | `5` | `50` | Downward step when wall edge is hit. `GAME_CONFIG.INVADER_DESCENT_STEP` |
| `LEVEL_SPEED_MULTIPLIER` | `1.1` | `1.0` | `1.5` | Formation speed scaling factor per level clear. `GAME_CONFIG.LEVEL_SPEED_MULTIPLIER` |
| `COMBO_TIMEOUT` | `2000` ms | `1000` | `5000` | Window before combo resets. `GAME_CONFIG.COMBO_TIMEOUT` |
| `MAX_MULTIPLIER` | `10` | `3` | `20` | Multiplier cap = `1 + floor(combo / 5)`. `GAME_CONFIG.MAX_MULTIPLIER` |
| `KAMIKAZE_TRIGGER_RATIO`| `0.6` | `0.3` | `0.8` | Invader ratio threshold to enable dives. `KamikazeSystem` |
| `KAMIKAZE_SPAWN_COOLDOWN`| `5000` ms | `2000` | `10000` | Delay between kamikaze dive spawns. `KamikazeSystem` |
| `KAMIKAZE_SPEED_MULT` | `[PLACEHOLDER]` | `1.5` | `3.0` | Velocity multiplier for diving invaders. Proposed addition |
| `BOSS_FURY_KILL_CHAIN` | `5` | `3` | `10` | Chain kills required to trigger boss fury. `BossSystem` |

---

## 🚶 Part 3: Player Onboarding Flow

### Onboarding Checklist

- [ ] **Core Verb Introduction (First 30 seconds)**
  - Display movement controls (`A/D` or Left/Right Arrow) and firing control (`Space`). Touch overlays rendered on mobile.
- [ ] **First Success Guarantee (Wave 1 Start)**
  - Wave 1 formation moves at baseline speed (`INVADER_SPEED_BASE = 50`), allowing players to get comfortable with lateral aiming.
- [ ] **Safe Defensive Training**
  - Four protective shields (`SHIELD_COUNT = 4`, `SHIELD_SEGMENT_HP = 3`) absorb early erratic fire, providing a safe zone for strategy learning.
- [ ] **Kamikaze & Boss Introduction**
  - First kamikaze dive warning is accompanied by an audio request and visual flash on wave 2+.
- [ ] **Session Retention Gate**
  - Session end displays score achieved, XP earned, and clear progress toward Mutator unlocks (`faster_bullets`, `shield_pulse`).

---

## 🛠️ Part 4: Mechanic Specification (Repo-Aligned)

### Mechanic 1: Kamikaze Dive Trajectories (`KamikazeSystem`)

**Purpose**: Shift formation combat into dynamic dodging when invader counts fall below 60%.
**Player Fantasy**: High-octane interception of suicidal enemy dive-bombers.

#### ECS Input & Component State
- **Query**:
  ```typescript
  world.query("Kamikaze", "Transform", "Velocity")
  world.query("Player", "Transform")
  ```
- **Components**:
  - `KamikazeComponent`: `{ targetX: number, targetY: number, diving: boolean, returnX: number, returnY: number }`
  - `TransformComponent`: `{ x: number, y: number }`
  - `VelocityComponent`: `{ vx: number, vy: number }`

#### System Output Mutation
- Managed by `KamikazeSystem` in `src/games/space-invaders/systems/KamikazeSystem.ts`:
  ```typescript
  // Spawns dive when invaders.length < totalInvaders * 0.6
  // Updates dive trajectory using world.gameplayRandom for slight targeting variance:
  const rng = world.gameplayRandom;
  const spread = (rng.nextFloat() - 0.5) * 40; // Deterministic spread

  world.mutateComponent(kamikazeEntity, "Velocity", (v) => {
    const dx = (playerPos.x + spread) - transform.x;
    const dy = playerPos.y - transform.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    v.vx = (dx / dist) * (GAME_CONFIG.INVADER_SPEED_BASE * 2.5);
    v.vy = (dy / dist) * (GAME_CONFIG.INVADER_SPEED_BASE * 2.5);
  });
  ```

---

### Mechanic 2: Boss Fury & Counter-Fire (`BossSystem`)

**Purpose**: Boss entities react dynamically to player chain kills and shield destruction.
**Player Fantasy**: Fighting an adaptive boss that gets enraged by player aggression.

#### ECS State Mutation
- `BossComponent`: `{ fury?: number, furyDuration?: number, counterFirePending?: boolean }`
- Managed by `BossSystem` in `src/games/space-invaders/systems/BossSystem.ts`:
  - On `si:kill` event with `chain >= 5`: increase `fury` by +40 (cap 100), set `furyDuration = 3.0s`.
  - While enraged (`furyDuration > 0`): boss fire rate doubles, and bullet spreads widen.
  - On `entity:destroyed` (Shield segment): sets `counterFirePending = true` to launch revenge missile toward player position.

---

## ⚠️ Known Architecture Inconsistencies & Recommendations

### Combo System Duplication Notice
- Space Invaders previously maintained local combo variables in `GameStateComponent`. The game has been refactored to consume the generic `ComboSystem` and `ComboComponent` in `src/games/shared/arcade/`.
- Future updates to Space Invaders score multipliers must maintain strict usage of `ComboComponent` to prevent reintroducing duplicate state logic.

---

## ⚡ Meta-Progression & Mutator Integration

Hooks into `MutatorRegistry.ts` (`BENEFICIAL_MUTATORS`):

1. **`shield_pulse`** (XP Cost: 1000): Provides 3s invulnerability on session start to tank early kamikaze dives.
2. **`faster_bullets`** (XP Cost: 500): Increases bullet speed by 10%, making interception of diving invaders significantly easier.
3. **`extra_life`** (XP Cost: 800): Adds +1 life to buffer against surprise boss counter-fire.
