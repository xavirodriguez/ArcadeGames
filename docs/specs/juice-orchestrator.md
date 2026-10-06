# Specification: Shared Game Feel Orchestrator ("Juice Orchestrator")

## 1. Overview & Objective

The **Juice Orchestrator** provides a unified visual effects orchestration layer built on top of `src/games/shared/rendering/SharedVFX.ts`. It reduces game-feel handling across all 9 minigames (**pong**, **asteroids**, **space-invaders**, **arkanoid**, **flappybird**, **frogger**, **geometry-wars**, **platformer**, **echo-runner**) to a high-level API with 6–7 semantic primitives while establishing global accessibility, hit-stop concurrency control, parameter tinting/scaling, and flow-based momentum feedback.

---

## 2. Architecture & Data Flow

```
+-----------------------------------------------------------------------------------+
|                                 Gameplay System                                   |
|   (e.g., EnemyCollisionSystem, PlayerDeathSystem, KineticAccumulatorSystem)       |
+-----------------------------------------------------------------------------------+
                                          |
                                          | juice.triggerEvent(gameId, event, params)
                                          | OR juice.spawn(effect, params)
                                          v
+-----------------------------------------------------------------------------------+
|                                JuiceOrchestrator                                  |
|  - Consults game JuiceMap (event -> { primitive, tint, scale, intensity, priority })|
|  - Evaluates global JuiceLevel (0% to 150%) & Low-Stimulation Accessibility Mode  |
|  - Manages Hit-Stop Concurrency & Priority Matrix                                 |
|  - Controls Screen Shake & Flash Overrides                                        |
+-----------------------------------------------------------------------------------+
                                          |
                                          | Spawns TTL visual entities & mutates VFXWorldState
                                          v
+-----------------------------------------------------------------------------------+
|                   VFXWorldState / SharedVFX Draw Adapters                         |
|  - Extended state: { hitStopTimer, hitStopPriority, kineticCharge, juiceLevel }   |
|  - Drawers: CanvasDrawAdapter & SkiaDrawAdapter with parameter tinting & scale     |
+-----------------------------------------------------------------------------------+
```

---

## 3. Core Functional Requirements

### 3.1 High-Level `juice.spawn` API
A single-line API for spawning visual primitives without manual entity instantiation or TTL component configuration:
```typescript
juice.spawn("shockwave", {
  x: 150,
  y: 200,
  tint: "#ff0055",
  scale: 1.5,
  intensity: 1.0,
  ttl: 0.4
});
```

### 3.2 Extended Shared World State (`VFXWorldState`)
`VFXWorldState` in `SharedVFXInternal.ts` is extended with:
- `hitStopTimer: number`: Active hit-stop pause timer (seconds).
- `hitStopPriority: number`: Priority level of currently active hit-stop.
- `hitStopCooldown: number`: Cooldown timer preventing rapid hit-stop chaining.
- `kineticCharge: number`: Flow energy accumulator level (0.0 to 1.0).
- `juiceLevel: number`: Global game-feel multiplier (0.0 to 1.5, default 1.0).
- `lowStimulationMode: boolean`: Accessibility toggle disabling screen shake, high-contrast hit flashes, and intense CRT glitching.

### 3.3 Hit-Stop Concurrency Control & Priority Hierarchy
Hit-stops freeze gameplay simulation briefly to emphasize impact. The orchestrator strictly enforces hit-stop concurrency:
- **Never sum durations**: Two overlapping hit-stops never add up their time.
- **Priority Override**: A higher-priority hit-stop cancels and replaces any lower-priority hit-stop. Equal or lower priority hit-stops are ignored during active hit-stops or cooldowns.
- **Priority Hierarchy**:
  1. `CRITICAL (30)`: Player death, major damage taken, game over.
  2. `HIGH (20)`: Boss / Elite enemy destruction, combo max threshold.
  3. `NORMAL (10)`: Standard enemy death, power-up pickup.
  4. `LOW (5)`: Minor bullet impact, grazing.

### 3.4 Semantic Mapping Table (`JuiceMap`)
Declarative mapping table per minigame: `gameId -> event -> JuiceProfile`.

| Game ID | Gameplay Event | Primitive / VFX | Tint Role / Hex | Scale / Intensity | Notes |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Pong** | `ball:rally` | `warp_lines` | `#00f3ff` (Cyan) | Dynamic with rally length | Kinetic flow accumulation |
| **Asteroids** | `rock:destroyed` | `shockwave` + `floating_text` | `#ffaa00` (Solar) | Scale: 1.2 | Score pop & expansion wave |
| **Space Invaders** | `shield:degraded` | `hologram_glitch` | `#39ff14` (Phosphor Green) | Tinted glitch | Shield structural decay |
| **Arkanoid** | `brick:shatter` | `shockwave` | `#ff0055` (Neon Magenta) | Scale: 0.8 | Brick shatter impulse |
| **Flappy Bird** | `pipe:passed` | `floating_text` | `#ffff00` (Yellow) | Scale: 1.0 | Score increment pop |
| **Frogger** | `goal:reached` | `shield_bubble` | `#00f3ff` (Cyan) | Scale: 1.4 | Safe zone aura |
| **Geometry Wars** | `enemy:destroyed` | `shockwave` + `comet_trail` | `#ff00ff` (Magenta) | Scale: 1.5, Intensity: 1.2 | High kinetic explosion |
| **Platformer** | `player:damage` | `screen_border_glow` | `#ff0000` (Red) | Red border pulse | Hazard impact |
| **Echo Runner** | `echo:ghost` | `hologram_glitch` | `#00f3ff` (Cyan) | Scale: 1.0 | Rival ghost proximity |

### 3.5 Parameter Injection (`tint` and `scale`)
All rendering drawers (`ShapeDrawer`, `EffectDrawer`) accept optional `tint` (HEX / RGB color overriding default palette) and `scale` (scaling primitive dimensions). This avoids duplicating drawers while allowing game-specific art directions.

### 3.6 Global `JuiceLevel` & Low-Stimulation Accessibility Mode
- **JuiceLevel (0% - 150%)**: Multiplies particle count, shake intensity/duration, and visual size.
- **Low Stimulation Mode (`JuiceLevel = 0` / Accessibility Toggle)**:
  - Screen shake intensity forced to `0`.
  - Hit flashes (`hitFlashFrames`) forced to `0`.
  - CRT glitch shudder disabled.
  - Flashes converted to muted opacity pulses.
  - Zero modification required in individual game physics or logic.

### 3.7 Shared Kinetic Accumulation (`KineticAccumulatorSystem`)
The kinetic energy system tracks player flow (rally streaks, high speed, near-misses, destroy sprees). When `kineticCharge` increases:
- `0.3+`: Subtle lateral `warp_lines` begin spawning in background.
- `0.7+`: Muted `screen_border_glow` pulses with flow color.
- `1.0`: Burst available state; firing weapons or activating abilities triggers peak juice feedback.

---

## 4. Replay Determinism & Performance Constraints

1. **RNG Isolation**: Effect spawning uses non-gameplay random generators (`world.renderRandom` or deterministic visual seed streams) to ensure zero consumption of `world.gameplayRandom`.
2. **Zero-Cost Idle**: When `JuiceLevel = 0` or no active VFX entities exist, systems immediately return without iterating entities or performing allocations.
3. **Canvas & Skia Parity**: Every new or parameterized drawer is implemented for both HTML5 Canvas 2D and React Native Skia contexts.
