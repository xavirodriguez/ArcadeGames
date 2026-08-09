# Game Design Document: retro-arcade Systems & Progression

**Author**: GameDesigner (Systems & Mechanics Architect)
**Status**: Living Document
**Version**: 1.0.0
**Last Updated**: October 2023
**Target Engine**: `@tiny-aster/core` (Entity Component System)

---

## 📜 Revision History & Changelog

| Version | Date | Author | Description of Changes |
| :--- | :--- | :--- | :--- |
| `1.0.0` | 2023-10-24 | GameDesigner | Initial specification of core gameplay loops, economy balance baseline, onboarding flows, beneficial mutator integration, and architectural combo unification proposal. |

---

## 🎯 Design Pillars & Systems Vision

1. **Deterministic Execution**: Every mechanic, bullet spawn, and AI pattern must execute identically across frame rates and platforms. All gameplay-affecting randomness is strictly isolated to `world.gameplayRandom` to support replayability and netcode prediction.
2. **Kinetic Game Feel (Juice)**: Fast-paced inputs must yield immediate visual, audio, and physical reactions (hit-flashes, screen-shaking, floating popup text).
3. **Session-to-Session Hooks**: A robust, persistent meta-progression XP economy bridges short, intense, 2-minute arcade sessions with long-term completionist and tuning progression.
4. **Modular Architecture**: Shared arcade behaviors (e.g., combos, particle effects, score multipliers) are codified as reusable ECS components and systems in shared gameplay directories (`src/games/shared/`) rather than monolithic per-game implementations.

---

## 🗺️ Part 1: Core Gameplay Loop Document

Here we outline the moment-to-moment, session, and long-term meta-loops across the retro-arcade catalog, with special focus on how they interface with the central `@tiny-aster/core` engine.

### Core Loop: Space Invaders

```
     +-------------------------------------------------------------+
     |                 MOMENT-TO-MOMENT (0-30s)                    |
     |  Action: Shoot Invaders, Dodge Bullet, Use Shields          |
     |  Feedback: Hit Flashes, Popups (e.g., x2), Screen Shake     |
     |  Reward: Score Gain & Combo Multiplier Increment            |
     +------------------------------+------------------------------+
                                    |
                                    v
     +-------------------------------------------------------------+
     |                   SESSION LOOP (5-30 mins)                  |
     |  Goal: Clear Invader Rows & Boss Waves                      |
     |  Tension: Speed Scaling (remaining/total) + Kamikaze Dives  |
     |  Resolution: Victory (all clear) or Defeat (GameOver)       |
     +------------------------------+------------------------------+
                                    |
                                    v
     +-------------------------------------------------------------+
     |                LONG-TERM LOOP (META-PROGRESS)               |
     |  Progression: Accumulate XP from Scores & Accomplishments   |
     |  Retention: Unlock & Apply Beneficial Mutators via XP       |
     +-------------------------------------------------------------+
```

#### Moment-to-Moment (0–30 seconds)
- **Action**: The player moves left/right and fires bullets to destroy incoming rows of invaders, while using protective shields to absorb enemy fire.
- **Feedback**: Destroying an invader triggers an immediate white hit flash (`hitFlashFrames = 4`), spawns colorful explosion particles using `world.gameplayRandom` velocities, requests screen shake upon taking damage, and displays a floating combo multiplier text popup (e.g. `x2`, `x3`) which floats upwards using the `Juice` easing system.
- **Reward**: Intrinsic satisfaction of clearing rows plus immediate score increments multiplied by the player's active combo multiplier.

#### Session Loop (5–30 minutes)
- **Goal**: Clear successive waves of invaders and defeat boss entities (`BossComponent`) to advance level progression (`level++`).
- **Tension**: Escalating difficulty. The invader formation's speed increases inversely to the remaining invaders: speed scale = `1 - (remaining / total)`. Boss phases trigger distinct kamikaze dive attacks (`KamikazeComponent`).
- **Resolution**: Level completion triggers the next wave with `LEVEL_SPEED_MULTIPLIER` applied, while player death or a mother-ship breach at `limit = SCREEN_HEIGHT - 100` triggers the Game Over state.

#### Long-Term Loop (Meta-Progression)
- **Progression**: Post-session scores and high-score candidates are converted directly to player Profile Experience points (`XP`).
- **Retention Hook**: Players accumulate persistent XP to purchase beneficial mutators from the `MutatorRegistry` (`faster_bullets`, `extra_life`, `combo_head_start`, `shield_pulse`), drastically shifting the baseline difficulty of their next play sessions.

---

### Core Loop: Asteroids

#### Moment-to-Moment (0–30 seconds)
- **Action**: Rotate ship, apply forward thrust, navigate wrap-around screen boundaries, and split large asteroids into smaller, faster shards.
- **Feedback**: Dynamic particle thruster exhaust, boundary wrap-around teleportation, explosive asteroid fractures, and critical-angle hyperspace jumps.
- **Reward**: High-risk trajectory adjustments and precision shooting to compile points while managing momentum/drift.

#### Session Loop (5–30 minutes)
- **Goal**: Clear the playfield of all asteroids and hostile UFOs.
- **Tension**: Drift momentum vs. increasing count of smaller, high-velocity asteroid shards; random incoming UFO target acquisition.
- **Resolution**: Level cleared when asteroid and UFO queries return 0 entities; Game Over when ship lives reach 0.

#### Long-Term Loop (Meta-Progression)
- **Progression**: XP gained from asteroid fractures and UFO takedowns.
- **Retention Hook**: Meta-purchased upgrades like `hyper_drift` (highly responsive thrusters with low friction) or `bouncing_bullets` (projectiles bounce on boundary walls instead of wrapping around).

---

### Core Loop: Flappy Bird

#### Moment-to-Moment (0–30 seconds)
- **Action**: Press Flap to exert vertical upward impulse, fighting gravity to thread the bird through narrow gaps in incoming obstacle pipes.
- **Feedback**: Immediate flapping bounce, near-miss score popups, and scrolling background adjustments.
- **Reward**: Pure focus and timing-based success as each pipe set is cleared.

#### Session Loop (5–30 minutes)
- **Goal**: Maximize pipe clear score without colliding with the ground or pipe segments.
- **Tension**: Constant gravity acceleration, unpredictable gap heights, and dwindling recovery windows.
- **Resolution**: Single-hit collision immediately initiates Game Over state.

#### Long-Term Loop (Meta-Progression)
- **Progression**: Earn XP per successfully cleared pipe gap and for near-miss maneuvers.
- **Retention Hook**: Unlock beneficial mutators like `heavy_gravity` (double gravity but stronger jumps) or cosmetic trails unlocked via level milestones.

---

### Core Loop: Pong

#### Moment-to-Moment (0–30 seconds)
- **Action**: Move paddle vertically to intercept and deflect a high-velocity bouncing ball, imparting vertical "spin" based on paddle movement on deflection.
- **Feedback**: Kinetic paddle impact sound requests, ball squish and stretch effects, hit flash animations.
- **Reward**: Bypassing the opponent's paddle defense to score a point.

#### Session Loop (5–30 minutes)
- **Goal**: Reach the maximum target score (`MAX_SCORE = 5`) before the opponent.
- **Tension**: Continuous ball velocity escalation (`BALL_ACCELERATION = 1.05`) with each successive paddle collision.
- **Resolution**: Reaching the score cap awards set victory and terminates the session.

#### Long-Term Loop (Meta-Progression)
- **Progression**: XP earned based on victory score margins and clean rally lengths.
- **Retention Hook**: Unlock modifiers like `ghost_ball` (making the ball invisible for 1 second after paddle deflection) to customize gameplay.

---

## 📊 Part 2: Economy Balance Spreadsheet Template

All numeric constants in the arcade engine must be grounded in actual code configurations and balanced systematically. The following tables outline the parameters, baseline limits, and meta-game pricing structures.

### Space Invaders & Core Game Balance Baseline

| Variable Name | Base Value | Min Limit | Max Limit | Tuning Notes & Code Config Location |
| :--- | :--- | :--- | :--- | :--- |
| `PLAYER_SPEED` | `300` px/s | `150` | `600` | Ship lateral traversal speed. `GAME_CONFIG.PLAYER_SPEED` |
| `PLAYER_INITIAL_LIVES` | `3` | `1` | `5` | Lives assigned at session start. `GAME_CONFIG.PLAYER_INITIAL_LIVES` |
| `PLAYER_SHOOT_COOLDOWN` | `500` ms | `100` | `1000` | Minimum firing interval. `GAME_CONFIG.PLAYER_SHOOT_COOLDOWN` |
| `PLAYER_BULLET_SPEED` | `500` px/s | `300` | `1000` | Upward bullet travel velocity. `GAME_CONFIG.PLAYER_BULLET_SPEED` |
| `ENEMY_BULLET_SPEED` | `250` px/s | `100` | `600` | Downward bullet velocity. `GAME_CONFIG.ENEMY_BULLET_SPEED` |
| `ENEMY_FIRE_INTERVAL_MIN`| `1000` ms | `500` | `2000` | Minimum delay between invader shots. `GAME_CONFIG.ENEMY_FIRE_INTERVAL_MIN` |
| `ENEMY_FIRE_INTERVAL_MAX`| `3000` ms | `1500` | `5000` | Maximum delay between invader shots. `GAME_CONFIG.ENEMY_FIRE_INTERVAL_MAX` |
| `INVADER_SPEED_BASE` | `50` px/s | `20` | `150` | Initial movement speed of the wave. `GAME_CONFIG.INVADER_SPEED_BASE` |
| `INVADER_SPEED_MAX` | `400` px/s | `200` | `800` | Formation speed when 1 invader remains. `GAME_CONFIG.INVADER_SPEED_MAX` |
| `INVADER_DESCENT_STEP` | `20` px | `5` | `50` | Downward descent distance on edge wall hit. `GAME_CONFIG.INVADER_DESCENT_STEP` |
| `LEVEL_SPEED_MULTIPLIER` | `1.1` | `1.0` | `1.5` | Formation speed scaling factor per level cleared. `GAME_CONFIG.LEVEL_SPEED_MULTIPLIER` |
| `SHIELD_SEGMENT_HP` | `3` | `1` | `10` | Durability of individual shield blocks. `GAME_CONFIG.SHIELD_SEGMENT_HP` |
| `COMBO_TIMEOUT` | `2000` ms | `1000` | `5000` | Grace period in ms before combo resets. `GAME_CONFIG.COMBO_TIMEOUT` |
| `MAX_MULTIPLIER` | `10` | `3` | `20` | Score multiplier cap = `1 + floor(combo / 5)`. `GAME_CONFIG.MAX_MULTIPLIER` |
| `PARTICLE_COUNT` | `8` | `0` | `24` | Burst particles spawned on invader death. `GAME_CONFIG.PARTICLE_COUNT` |

### Meta-Progression & XP Upgrade Economy

XP costs are designed around a curve where early-game upgrades can be achieved in 1–2 high-score sessions (~10–15 mins), while advanced upgrades require mastery over several play sessions.

| Mutator ID | Upgrade Name | XP Cost | Economy Rationale & Tuning Notes |
| :--- | :--- | :--- | :--- |
| `combo_head_start` | Combo Head Start | `300` XP | **Low-tier**: Immediate x2 multiplier; helps players maximize early-stage score multipliers. Good initial purchase. |
| `faster_bullets` | Faster Bullets | `500` XP | **Mid-tier**: 10% speed increase across all games. Decreases bullet travel time, directly increasing hit probability. |
| `extra_life` | Extra Life | `800` XP | **High-tier**: +1 starting life. Directly increases session duration and high score potential. |
| `shield_pulse` | Shield Pulse | `1000` XP | **Top-tier**: 3 seconds of absolute invulnerability at game start. Allows aggressive early positioning. |

---

## 🚶 Part 3: Player Onboarding Flow

To maximize player retention and minimize initial frustration, retro-arcade games implement the following onboarding flow:

### Onboarding Checklist & Progress Gates

- [ ] **Core Verb Introduction (First 30 seconds)**
  - Instantly display a clear overlay of the core controls (e.g., `A/D` or Left/Right Arrow to Move, `Space` to Shoot).
  - High-visibility mobile UI overlays are rendered if a touch device is detected.
- [ ] **First Success Guarantee (Safe Start)**
  - Initial invader rows move at baseline speed (`INVADER_SPEED_BASE = 50`), rendering them very slow-moving targets.
  - Enemy fire cooldowns start on their maximum interval, reducing projectile spam during the first 15 seconds.
- [ ] **Safe-Context Mechanic Training**
  - Shields (`SHIELD_COUNT = 4`) are positioned as massive protective walls absorbing early erratic fire.
  - Gives the player space to learn the lateral movement and bullet velocities in a safe zone before enemies descend.
- [ ] **The Session Hook (Retention Gate)**
  - On first game over, display the calculated Score and any High Score Achievements.
  - Render the **Passport Overlay** displaying XP progress. Explicitly state the progress made toward unlocking their first beneficial mutator (e.g., *"You earned 120 XP! Just 180 XP more to unlock Combo Head Start!"*).

---

## 🛠️ Part 4: Mechanic Specification (Repo-Aligned)

These specifications provide unambiguous guidelines for implementing core progression and unifying duplicate gameplay loops within `@tiny-aster/core`.

### Mechanic: XP-Based Meta-Progression Beneficial Mutators

**Purpose**: Drive session retention by allowing players to cash in accumulated XP for permanent or session-based modifiers.
**Player Fantasy**: Power fantasy. Transforming starting stats to bypass early-game friction.

#### 1. Mutator: `faster_bullets` (10% Speed Increase)
- **Input State**:
  - Read from active game configuration: `world.getResource<Config>("GameConfig")`
- **Output Mutation**:
  - When the game initializes, reduce over active mutators list:
    ```typescript
    const config = activeMutators.reduce((cfg, mutator) => mutator.apply(cfg), baseConfig);
    ```
  - Inside the individual mutator's configuration apply function (defined in `MutatorConfig.ts`):
    ```typescript
    apply: (cfg) => ({
      ...cfg,
      PLAYER_BULLET_SPEED: ((cfg.PLAYER_BULLET_SPEED as number) || 500) * 1.10,
      BULLET_SPEED: ((cfg.BULLET_SPEED as number) || 300) * 1.10
    })
    ```
- **Success Condition**: Player bullets across Asteroids and Space Invaders travel 10% faster on the screen, verified by checking entity velocity vectors.
- **Failure State**: Physics validation fails or bullet speed exceeds maximum safe limits (`1000`), handled gracefully by `PhysicsSafetySchema` which catches and rejects the configuration.

#### 2. Mutator: `extra_life` (Start with +1 Life)
- **Input State**:
  - Singleton read: `world.getSingleton("GameState")`
- **Output Mutation**:
  - In `SpaceInvadersGame.ts` or `AsteroidsGame.ts`, initialize the Game State component:
    ```typescript
    world.mutateSingleton("GameState", (gs) => {
      gs.lives = (this.config.PLAYER_INITIAL_LIVES || 3) + 1;
    });
    ```
- **Success Condition**: Player starts with 4 lives visible on the UI.
- **Failure State**: The player starts with the default 3 lives because the mutator was applied after the initial singleton instantiation.
- **Edge Cases**:
  - What if the game does not support lives (e.g. Pong)? The mutator ignores the game or does not mutate the state.

#### 3. Mutator: `combo_head_start` (Start with x2 Multiplier)
- **Input State**:
  - Singleton read: `world.getSingleton("GameState")`
- **Output Mutation**:
  - On game start:
    ```typescript
    world.mutateSingleton("GameState", (gs) => {
      gs.combo = 5; // Yields x2 multiplier since 1 + floor(5 / 5) = 2
      gs.multiplier = 2;
      gs.comboTimerRemaining = this.config.COMBO_TIMEOUT / 1000;
    });
    ```
- **Success Condition**: The very first hit scores double the base score value.
- **Failure State**: Combo timer expires instantly before the first shot lands due to a lack of cooldown initialization.

#### 4. Mutator: `shield_pulse` (3-Second Invulnerability)
- **Input State**:
  - Component query: `world.query("Player", "Health")`
- **Output Mutation**:
  - Locate the Player entity and mutate their starting health component:
    ```typescript
    const players = world.query("Player", "Health");
    for (const player of players) {
      world.mutateComponent(player, "Health", (h) => {
        h.invulnerableRemaining = 3000; // 3000ms
      });
    }
    ```
- **Success Condition**: Player can absorb damage for the first 3 seconds without losing life points.
- **Failure State**: Player takes damage immediately on frame 1 due to delay in system registration.

---

## 📁 Codebase Architecture and Shared Modules

The project separates logic into three distinct architectural layers to ensure a clean, decoupled, and maintainable codebase:

1. **Core Engine (`packages/core/`)**:
   - Platform-agnostic ECS engine internals (`World`, `Schedule`, `System`, `Entity`, `Component`).
   - Fundamental physical and mathematical modules (Physics query, collision detection, movement).
   - Core components like `Transform`, `Velocity`, `Render`, and `Health`.
   - Free from game-specific configurations or platform-dependent frameworks (React Native, Skia, Colyseus).

2. **Shared Gameplay Modules (`src/games/shared/`)**:
   - Reusable arcade mechanisms shared across retro titles to prevent duplication.
   - **Arcade (`src/games/shared/arcade/`)**: Unifies `ComboComponent` and `ComboSystem` (which was successfully migrated from core to shared), alongside generic `LootSystem` and `PowerUpSystem`.
   - **Combat (`src/games/shared/combat/`)**: Implements generic `CombatSystem` along with `DamageComponent` and `FactionComponent`.
   - **Spawn (`src/games/shared/spawn/`)**: Houses `SpawnDirectorSystem`, `SpawnDirectorComponent`, and `WaveMemberComponent` for sequential wave spawning.

3. **Game-Specific Submodules (`src/games/[game-name]/`)**:
   - Houses unique gameplay parameters, layout rendering, visual assets, scene workflows, and custom collision/interaction behaviors.
   - Core titles include **Space Invaders**, **Asteroids**, **Pong**, and **Flappy Bird**.

---

## ⚠️ Architectural Decoupling & Decisions

### 1. Unified Combo System
The local combo variables inside Space Invaders' `GameStateComponent` have been completely removed and deprecated. Both Space Invaders and Pong now leverage the shared `ComboSystem` and `ComboComponent` located at `src/games/shared/arcade/` as the single source of truth. All fallback routes and synchronizations in `SpaceInvadersCollisionSystem`, `MutatorRegistry`'s `combo_head_start` mutator, and `GameStateComponent` have been successfully cleaned up, ensuring an elegant and unified ECS design.

### 2. Extensible Combat System
The generic `CombatSystem` at `src/games/shared/combat/` processes health decrementing and hit/death events.
- **Space Invaders Pilot**: Employs `CombatSystem` for player and boss hits. Game-specific visual feedback, screen shake, and boss HP synchronization are triggered via event listeners responding to deferred `combat:hit` and `combat:death` events.
- **Asteroids Extension**: Integrates `CombatSystem` for player bullets hitting asteroids. Asteroid splitting/fragmentation and score incrementing are triggered via `combat:death` listeners, preserving custom physics/spawning while sharing the damage core.

### 3. Centralized Spawn Director
- **Space Invaders Migration**: Integrated `SpawnDirectorSystem` at `src/games/shared/spawn/` to drive normal levels and boss waves through sequential wave definitions. Game-specific state systems synchronize game levels directly from the director.
- **Asteroids Postponement (Decision)**: Asteroid spawning is intrinsically non-sequential, randomly projecting asteroids away from the center in wrap-around boundaries. Integrating `SpawnDirectorSystem`'s linear wave queue would add unnecessary overhead and require game-specific exceptions for proximity checks. Therefore, Asteroids retains its simple procedural wave spawner inside `AsteroidGameStateSystem.ts`, postponing a director migration.

### 4. Known Architecture Inconsistency & System Analysis (Fase 0 Audit)

#### Combo State Fragmentation
- **Space Invaders & Geometry Wars**: Fully leverage the shared `ComboComponent` and `ComboSystem` from `src/games/shared/arcade/`. In Space Invaders, legacy local fields `combo`, `multiplier`, and `comboTimerRemaining` in `GameStateComponent` are marked as `@deprecated`.
- **Pong**: Registers `ComboSystem` and `Combo` component but keeps local `comboMultiplier` legacy field inside its `PongState` component and defaults to `1` without real-time increment on hitting paddles.
- **Flappy Bird**: Strictly uses legacy `comboMultiplier` field inside its `FlappyBirdState` component (set to `2` during `"combo_head_start"` mutator), without registering or instantiating `ComboComponent` or `ComboSystem`.
- **Asteroids**: Does not implement or use combo/multipliers at all.

#### Pausa (Pause) & Score Freeze Architecture
- **Total Pause (`BaseGame.pause()`)**: Pauses the main game loop entirely, freezing everything including UI interactions, particles, and visual effect transitions.
- **Partial Pause (`IsPaused` Resource)**: Space Invaders and Asteroids set a World resource `"IsPaused"` to `true` during total pause, but no simulation systems query or respond to this resource.
- **Score Freeze (`gs.scoreFreezeRemaining`)**: Pong implements a graceful score freeze countdown inside its `PongGameStateSystem`. When active, it resets/locks ball velocity to zero and skips score check steps for 1.2s to support scoring celebration feedback.

#### Desambiguación de los 4 Sistemas de Mutador
The repository contains four distinct mutator systems with unique contracts:
1. **`BeneficialMutator` (`src/utils/MutatorRegistry.ts`)**: Applies a one-shot mutator effect directly to a `World` or `GameConfig` resource. Used for XP meta-progression shop upgrades (such as `"faster_bullets"`, `"extra_life"`).
2. **`Mutator` (`src/config/MutatorConfig.ts`)**: A pure function `apply: (config: Record<string, unknown>) => Record<string, unknown>` that modifies config parameters. It is validated against `PhysicsSafetySchema` (via Zod) to enforce physical limits.
3. **`MutatorService` (`src/services/MutatorService.ts`)**: Orchestrates selection and rotation of weekly mutators based on a session seed (`getWeeklyMutators`), acting as a selector rather than an engine-level mutator applier.
4. **`MutatorSystem` (`packages/core/src/systems/MutatorSystem.ts`)**: An ECS `System` that processes continuous, tick-by-tick mutations on active entities containing specific components (`{ componentType, mutate() }`).

#### StateMachineSystem Status
- The core provides `StateMachineSystem` and `StateMachineComponent`, but they have **no active production usage or tests** in any of the retro games. It is considered an unvalidated design option.

---

## ⚡ Elección de Mutadores en Vivo entre Waves

### Justificación de la Elección del Sistema de Mutación para Mutadores en Vivo
Para el diseño e implementación de la futura funcionalidad de **"Elegir un Mutador en Vivo entre Waves"**, se ha seleccionado de forma unánime y explícita el sistema **`BeneficialMutator` (definido en `src/utils/MutatorRegistry.ts`)**.

A continuación se detalla la justificación y los motivos técnicos por los cuales los otros tres sistemas quedan descartados para esta tarea:

1. **BeneficialMutator (`src/utils/MutatorRegistry.ts`) [SELECCIONADO]**:
   - **Mecánica de un solo disparo (One-shot)**: Posee la firma `apply: (world: World) => void`. Esto es perfecto para el momento en que un jugador escoge un mutador entre waves en vivo (por ejemplo, ganar instantáneamente +1 vida, recargar un escudo temporal de 3 segundos, u otorgar un combo inicial de inicio rápido).
   - **Determinismo y Rollback**: Al aplicarse directamente sobre el `World` (escribiendo en recursos o mutando componentes de entidades activas), el estado resultante queda capturado de forma automática por `WorldSnapshot`, permitiendo la correcta predicción del cliente, reconciliación del servidor y soporte de resimulación/rollback sin desincronizar.
   - **Extensibilidad en Runtime**: Puede ser invocado limpiamente en cualquier instante del ciclo de juego (por ejemplo, en un callback de transición de escena o al finalizar una wave), no estando restringido únicamente al arranque de sesión inicial.

2. **Mutator (`src/config/MutatorConfig.ts`) [DESCARTADO]**:
   - **Motivo**: Este sistema opera como una función pura sobre objetos de configuración planos (`apply: (cfg: Record<string, unknown>) => Record<string, unknown>`). Está diseñado para calibrar límites físicos estáticos globales (mediante Zod / `PhysicsSafetySchema`) antes de que se instancie el World. No tiene visibilidad ni acceso a las entidades ni recursos dinámicos del `World` en tiempo de ejecución de la partida, por lo que es inviable para mutaciones instantáneas o selectivas de gameplay.

3. **MutatorService (`src/services/MutatorService.ts`) [DESCARTADO]**:
   - **Motivo**: Actúa estrictamente como un selector y programador temporal de retos periódicos (ej. mutador semanal). No es un motor de ejecución, sino un orquestador para la rotación de semillas. No tiene el contrato necesario para aplicar cambios en vivo en el estado de una partida en curso.

4. **MutatorSystem (`packages/core/src/systems/MutatorSystem.ts`) [DESCARTADO]**:
   - **Motivo**: Es un `System` clásico de ECS que se ejecuta de manera continua en cada tick del loop (`update()`), mutando de manera persistente y por frames todos los componentes del tipo registrado. Su semántica no es la de "elegir y aplicar un mutador una sola vez", sino la de aplicar lógicas o fuerzas repetitivas a las entidades que poseen un determinado componente. Mantendrá su función exclusiva para simulación continua.

---

## 🔒 Determinism Constraint

To prevent desynchronizations and state variance, the following rules are strictly enforced:

1. **Strictly Forbidden**:
   - `Math.random()` anywhere in simulation systems.
2. **Mandatory Practice**:
   - Sourcing all simulation RNG from `world.gameplayRandom` (which is a seeded pseudorandom number generator):
     ```typescript
     const rng = world.gameplayRandom;
     const speedVariance = rng.nextFloat() * 50 - 25; // Safe and deterministic
     ```
   - Visual-only effects (such as particles or screen shakes) can utilize `world.renderRandom` safely without impacting the gameplay simulation path.
