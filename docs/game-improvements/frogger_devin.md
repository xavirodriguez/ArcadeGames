I have sufficient context to complete the audit now.

## Resumen Ejecutivo

**Hallazgos por severidad**: Critical: 2 | High: 5 | Medium: 6 | Low: 4

**Top problemas / patrones recurrentes**:

1. Colisión con vehículos usa matemática manual con márgenes fijos (`±10px`) en lugar del `CollisionSystem2D`/`Collider2D` ya registrado en la entidad, duplicando lógica y siendo inconsistente con el resto del motor.
2. `FroggerLogCarrySystem` hace `world.query("Log", "Transform", "Velocity")` completo cada frame y recorre todos los logs por cada frogger (barato con 1 jugador, pero no escalable a multiplayer/rollback sin costo).
3. Theme incorrecto: `createThemeFromGameAccents("asteroids")` en `FroggerGame.ts` — casi seguro un copy-paste error, viola "theme tokens" al usar acentos de otro juego.
4. Spawn layouts totalmente hardcodeados en `onInitializeEntities` (coordenadas, velocidades, longitudes) — no data-driven, dificulta iteración de diseño/nivel.
5. Colores hex hardcodeados en `FroggerCanvasVisuals.ts`/`FroggerSkiaVisuals.ts` en vez de theme tokens, contradiciendo el principio "no colores hex hardcodeados".

**Salud global: 6/10.** El core gameplay (grid movement, log carry, drown/drift, goals, lives) está funcionalmente completo y con tests dirigidos a casos críticos (drown, invulnerabilidad, lily pad snap). Sin embargo, hay violaciones claras de boundary/consistencia arquitectónica (colisión manual vs ECS, theme equivocado), falta de determinismo explícito documentado (no hay random usado, lo cual es correcto, pero tampoco hay verificación de rollback), y spawn no data-driven que compromete mantenibilidad.

---

## Hallazgos

### FRG-001 — Colisión con vehículos reimplementada manualmente, ignorando `CollisionSystem2D`

- **Severidad**: High
- **Categoría**: Architecture / Gameplay Correctness
- **Ubicación**: `src/games/frogger/systems/FroggerGameStateSystem.ts`, líneas 44-67
- **Descripción**: A pesar de que `CollisionSystem2D` está registrado en la fase `Collision` [1](#0-0) , y de que frogger/vehículos tienen `Collider2D` + `withCollisionEvents()` [2](#0-1) , `FroggerGameStateSystem` calcula manualmente el bounding box con un margen fijo `±10` en vez de usar eventos de colisión del ECS.
- **Impacto**: Duplicación de lógica de colisión, dos fuentes de verdad para "impacto", riesgo de comportamiento inconsistente entre lo detectado por `Collider2D` (usado en LogCarry para radio) y lo detectado aquí manualmente. Esto ya causó bugs documentados (ver doc de mejoras, hallazgo #5).
- **Evidencia**: [3](#0-2)
- **Recomendación**: Consolidar en `CollisionSystem2D` (usando capas `PLAYER`/`ENEMY` ya definidas) y consumir `CollisionEvents` en lugar de recalcular geometría a mano.
- **Prioridad**: Próximo sprint

### FRG-002 — Theme incorrecto: `createThemeFromGameAccents("asteroids")` en Frogger

- **Severidad**: High
- **Categoría**: Presentation / Maintainability
- **Ubicación**: `src/games/frogger/FroggerGame.ts`, línea 59
- **Descripción**: El constructor de `FroggerGame` pasa el string `"asteroids"` como key de acentos de tema en lugar de `"frogger"`.
- **Impacto**: Posible inconsistencia visual (paleta de Asteroids aplicada a UI de Frogger), además de violar el principio de theme tokens correctamente derivados por juego.
- **Evidencia**: [4](#0-3)
- **Recomendación**: Verificar si existe un accent registrado para `"frogger"`; si no, crearlo y corregir la llamada. Si es intencional, documentarlo explícitamente con un comentario.
- **Prioridad**: Inmediata (fácil de corregir, riesgo de regresión visual visible al usuario)

### FRG-003 — Colores hex hardcodeados en todos los drawers de render (Canvas y Skia)

- **Severidad**: Medium
- **Categoría**: Presentation / Maintainability
- **Ubicación**: `src/games/frogger/rendering/FroggerCanvasVisuals.ts` y `FroggerSkiaVisuals.ts` (todo el archivo)
- **Descripción**: Todos los colores (`#39FF14`, `#00F3FF`, `#FF2A6D`, `#8B5A2B`, etc.) están hardcodeados directamente en los drawers, sin pasar por theme tokens.
- **Impacto**: Viola explícitamente el principio "Theme tokens (no colores hex hardcodeados)" del proyecto; impide re-skinning consistente y theming dinámico (dark/light, accesibilidad).
- **Evidencia**: [5](#0-4)
- **Recomendación**: Extraer paleta a theme tokens específicos de Frogger y resolverlos vía el sistema de theming existente (ver `createThemeFromGameAccents`).
- **Prioridad**: Backlog (no bloqueante, pero acumula deuda)

### FRG-004 — Spawn layouts completamente hardcodeados en `onInitializeEntities`

- **Severidad**: Medium
- **Categoría**: Maintainability / Design Fidelity
- **Ubicación**: `src/games/frogger/FroggerGame.ts`, líneas 136-221
- **Descripción**: Coordenadas x, velocidades, longitudes y direcciones de cada log/vehículo por fila están escritas inline como arrays literales, en vez de una estructura data-driven (JSON/config por nivel).
- **Impacto**: Dificulta ajustar dificultad/ritmo (uno de los objetivos de auditoría de fidelidad de diseño), imposibilita progresión de nivel real (no hay escalado de velocidad por nivel más allá de `TRAFFIC_SPEED_MULTIPLIER` global), y complica testing de layouts alternativos.
- **Evidencia**: [6](#0-5)
- **Recomendación**: Mover a una tabla de configuración por nivel (`LevelLayoutSchema`) consumida por `spawnRowEntities`.
- **Prioridad**: Próximo sprint

### FRG-005 — No hay escalado de dificultad al subir de nivel

- **Severidad**: Medium
- **Categoría**: Design Fidelity / Gameplay Correctness
- **Ubicación**: `src/games/frogger/systems/FroggerGameStateSystem.ts`, líneas 112-128 (progresión de nivel)
- **Descripción**: Al completar un nivel (`state.level += 1`), no se ajusta `TRAFFIC_SPEED_MULTIPLIER`, `RIVER_SPEED_MULTIPLIER` ni el layout de logs/vehículos — sólo se resetean lily pads y se suma bono.
- **Impacto**: Contradice la fidelidad clásica de Frogger, donde el ritmo aumenta con el nivel; la experiencia se vuelve monótona en niveles avanzados.
- **Evidencia**: [7](#0-6)
- **Recomendación**: Escalar `TRAFFIC_SPEED_MULTIPLIER`/`RIVER_SPEED_MULTIPLIER` en `world.setResource("GameConfig", ...)` al incrementar `state.level`, o reconfigurar velocidades de logs/vehículos activos.
- **Prioridad**: Backlog

### FRG-006 — `FroggerLogCarrySystem` y `FroggerGameStateSystem` acoplados vía duplicación de estado de invulnerabilidad

- **Severidad**: Medium
- **Categoría**: Architecture / Maintainability
- **Ubicación**: `src/games/frogger/systems/FroggerLogCarrySystem.ts`, líneas 17-21 y `FroggerGameStateSystem.ts`, líneas 29-42
- **Descripción**: Ambos sistemas leen/verifican `frogger.invulnerableRemaining` **y** `health.invulnerableRemaining` de forma redundante e idéntica, pero solo `FroggerGameStateSystem` decrementa esos timers. `FroggerLogCarrySystem` solo lee.
- **Impacto**: Doble fuente de verdad para invulnerabilidad (`Frogger.invulnerableRemaining` vs `Health.invulnerableRemaining`), riesgo de desincronía si un sistema actualiza uno y no el otro; dificulta razonar sobre el sistema más crítico (`LogCarrySystem`).
- **Evidencia**: [8](#0-7)
- **Recomendación**: Consolidar a una única fuente de verdad de invulnerabilidad (idealmente `Health.invulnerableRemaining`, ya que existe como componente genérico core) y extraer un helper compartido `isEntityInvulnerable(world, entity)`.
- **Prioridad**: Próximo sprint

### FRG-007 — Orden de sistemas: `FroggerLogCarrySystem` corre después de `CollisionSystem2D` pero antes de `FroggerGameStateSystem`

- **Severidad**: Low
- **Categoría**: Architecture
- **Ubicación**: `src/games/frogger/FroggerGame.ts`, líneas 104-109
- **Descripción**: El orden es `FroggerInputSystem → MovementSystem → BoundarySystem → CollisionSystem2D → FroggerLogCarrySystem → FroggerGameStateSystem`. La muerte por drift/drown se decide en `LogCarrySystem` (fase Simulation) y la muerte por vehículo en `GameStateSystem` (fase GameRules), en el mismo tick pero en sistemas separados con lógica de invulnerabilidad duplicada (ver FRG-006).
- **Impacto**: No es incorrecto per se, pero refleja acoplamiento implícito de orden de ejecución entre 3 sistemas distintos para resolver "¿está vivo el frogger?", lo cual complica mantenibilidad y razonamiento sobre determinismo/rollback (todo el orden debe preservarse exactamente igual en resimulation).
- **Evidencia**: [9](#0-8)
- **Recomendación**: Documentar explícitamente la dependencia de orden entre estos tres sistemas (comentario en el código) o considerar consolidar la lógica de "resolución de muerte" en un solo sistema de la fase `GameRules`.
- **Prioridad**: Backlog

### FRG-008 — `frogRadius` fallback hardcodeado en `FroggerLogCarrySystem` duplica cálculo de `EntityFactory`

- **Severidad**: Low
- **Categoría**: Maintainability
- **Ubicación**: `src/games/frogger/systems/FroggerLogCarrySystem.ts`, línea 40, vs `EntityFactory.ts`, línea 26
- **Descripción**: `(config.GRID_SIZE - 12) / 2` aparece duplicado literalmente en ambos archivos como fallback/definición del radio del collider de frogger.
- **Impacto**: Si se cambia el tamaño del collider en un lugar, es fácil olvidar el otro, generando overlap incorrecto en `LogCarrySystem` (el sistema más crítico auditado).
- **Evidencia**: [10](#0-9)
- **Recomendación**: Extraer constante compartida o depender siempre del `Collider2D` component sin fallback duplicado (el fallback solo debería usarse si el collider realmente falta, lo cual sería un bug en sí).
- **Prioridad**: Backlog

### FRG-009 — Falta de test específico para "múltiples logs en la misma fila" y edge case de borde de log

- **Severidad**: Low (gap de test, no bug confirmado)
- **Categoría**: Gameplay Correctness / Maintainability
- **Ubicación**: `src/games/frogger/__tests__/FroggerGame.test.ts` (cobertura general)
- **Descripción**: El bucle `for` en `FroggerLogCarrySystem` (líneas 48-72) hace `break` en el primer log que cumple `overlap >= overlapNeeded`, pero no hay test que valide el comportamiento cuando dos logs en la misma fila se solapan parcialmente entre sí (edge case improbable pero posible con spawns dinámicos) o cuando el frogger está justo en el límite (`overlap === overlapNeeded`).
- **Evidencia**: [11](#0-10)
- **Recomendación**: Agregar tests de boundary-value para `overlapRatio` (exactamente en el umbral) y para turtles que "se hunden" (no se encontró lógica de hundimiento de turtles en el código revisado — ver FRG-010).
- **Prioridad**: Backlog

### FRG-010 — Ausencia de mecánica "turtle que se hunde" pese a estar mencionada en el GDD del prompt

- **Severidad**: Low (posiblemente fuera de alcance, no confirmable con el contexto disponible)
- **Categoría**: Design Fidelity
- **Ubicación**: `src/games/frogger/types/FroggerTypes.ts` — `LogComponent.logType: "log" | "turtle"` [12](#0-11)
- **Descripción**: El componente distingue `logType` pero no hay ningún campo de "diving"/estado de inmersión de turtles ni lógica en `FroggerLogCarrySystem` que trate turtles distinto a logs (ambos se tratan idénticamente en el bucle de overlap).
- **Impacto**: Si el diseño clásico de Frogger requiere que las turtles se sumerjan periódicamente (mecánica clásica del arcade original), esta feature no está implementada; solo es cosmético (`logType` afecta color/render, no comportamiento).
- **Evidencia**: [13](#0-12)
- **Recomendación**: Confirmar contra el GDD.md si "hundimiento de turtle" es un requisito; si lo es, es un gap de Critical/High (afecta corrección de gameplay), si no, ignorar este hallazgo.
- **Prioridad**: Backlog (pendiente de confirmación con GDD, no verificable con el contexto entregado)

### FRG-011 — `getMutableComponent` usado sin verificación de retorno consistente en varios puntos

- **Severidad**: Low
- **Categoría**: Maintainability
- **Ubicación**: `src/games/frogger/systems/FroggerLogCarrySystem.ts`, líneas 12-15; `FroggerGameStateSystem.ts`, líneas 19-27
- **Descripción**: Ambos sistemas obtienen múltiples `getMutableComponent` seguidos y solo verifican `!frogger || !transform` de forma conjunta, mezclando lectura mutable innecesaria en rutas donde a veces solo se lee (p.ej. `transform` es mutado condicionalmente, pero se obtiene mutable siempre).
- **Impacto**: Riesgo de marcar componentes como "dirty"/mutados innecesariamente en cada frame incluso cuando no cambian, lo que puede afectar sistemas de snapshot/diffing para netcode si estos dependen de flags de mutación reales vs solicitados.
- **Evidencia**: [14](#0-13)
- **Recomendación**: Usar `getComponent` (lectura) cuando no se garantiza mutación, y solo pasar a `getMutableComponent`/`mutateComponent` en la rama que efectivamente escribe.
- **Prioridad**: Backlog

### FRG-012 — `respawnTimer` es estado de instancia del sistema, no del ECS/World — riesgo en netcode/rollback

- **Severidad**: Critical
- **Categoría**: Netcode / Determinism
- **Ubicación**: `src/games/frogger/systems/FroggerGameStateSystem.ts`, línea 7 (`private respawnTimer: number = 0`) y su uso en líneas 144-165
- **Descripción**: `respawnTimer` vive como campo privado de la instancia de `FroggerGameStateSystem`, no como parte de un componente ECS ni de un resource serializable del `World`. Esto rompe el principio de "Snapshots / rollback para netcode": el estado de simulación completo debe residir en el `World` para poder tomar snapshot/restaurar consistentemente.
- **Impacto**: En un escenario de rollback (resimulation para netcode), restaurar un snapshot del `World` no restauraría `respawnTimer`, causando desincronización entre el estado "oficial" del juego y el temporizador de respawn real tras un rollback. También afecta guardado/restauración de partida y determinismo estricto si se serializa solo el `World`.
- **Evidencia**: [15](#0-14)
- **Recomendación**: Mover `respawnTimer` a un campo del componente `FroggerState` (o `Frogger`) para que forme parte del estado serializable del `World`, eliminando el estado mutable fuera del ECS.
- **Prioridad**: Inmediata

### FRG-013 — `spawnBlueprint` no captura fallo de blueprint faltante

- **Severidad**: Low
- **Categoría**: Maintainability
- **Ubicación**: `src/games/frogger/FroggerGame.ts`, líneas 72-82
- **Descripción**: Si `this.blueprints.get(name)` devuelve `undefined`, el método silenciosamente retorna una entidad vacía sin componentes, sin logging ni error.
- **Impacto**: Bugs de configuración de blueprints (typo en nombre) fallarían silenciosamente, produciendo entidades "fantasma" sin componentes que podrían pasar queries `world.query(...)` inadvertidamente si alguna query no filtra por todos los componentes esperados.
- **Evidencia**: [16](#0-15)
- **Recomendación**: Lanzar error o loggear warning si `bp` es `undefined`.
- **Prioridad**: Backlog

### FRG-014 — Falta de verificación de que `initializeRenderer` cumple boundary (uso de `require` dinámico en `FroggerGame.ts`)

- **Severidad**: Medium
- **Categoría**: Architecture
- **Ubicación**: `src/games/frogger/FroggerGame.ts`, líneas 287-325
- **Descripción**: `FroggerGame` (que se asume parte de la capa de simulación/juego) importa dinámicamente vía `require()` los módulos de rendering Canvas/Skia dentro de `initializeRenderer`. Aunque técnicamente son imports lazy dentro de un método explícito de inicialización de renderer (no en el core), mezclar `require` dinámico con imports ES module estáticos del resto del archivo es inconsistente y dificulta el tree-shaking/bundling, además de acoplar `FroggerGame` directamente a ambos backends de render en vez de mantener eso completamente en una capa de presentación separada inyectada externamente.
- **Impacto**: Acopla la clase de juego (que además contiene toda la lógica de simulación: `onRegisterSystems`, `onInitializeEntities`) a detalles de implementación de rendering, contradiciendo "Separación clara entre simulación (estado) y presentación".
- **Evidencia**: [17](#0-16)
- **Recomendación**: Extraer `initializeRenderer` a un módulo de presentación separado (`FroggerPresentation.ts`) inyectado/registrado externamente, no como método de la clase de simulación del juego.
- **Prioridad**: Próximo sprint

---

## Observaciones Adicionales

**Patrones positivos**:

- No se detectó ningún uso de `Math.random`/`Date.now` en `src/games/frogger/`, cumpliendo estrictamente el principio de determinismo (aunque tampoco hay uso explícito de `world.gameplayRandom`, lo cual es coherente si Frogger no requiere aleatoriedad de gameplay).
- Tests existentes cubren bien casos clave: drowning sin log, invulnerabilidad post-respawn, snap a lily pad, wrapping de vehículos, y mutators (`fast_traffic`) — ver [18](#0-17) .
- El manejo de edge de flanco de input (`isUpPressed = moveUp && !input.prevMoveUp`) en `FroggerInputSystem` está bien resuelto y ya documentado como corrección de un bug histórico de "sticky lock" (ver `docs/game-improvements/2026-09-14-frogger-improvement-analysis.md`, hallazgo #1).
- El uso de `EntityBuilder` + `blueprints.register` para logs/vehículos/lily pads sigue un patrón consistente y reutilizable.

**Gaps de tests más relevantes**:

- No hay test para "drift" (deriva fuera de pantalla sobre un log) — solo se cubre drowning, no el caso de `transform.x + frogRadius < 0` en `FroggerLogCarrySystem` líneas 83-87.
- No hay test para colisión por vehículo (`vehicle` death reason) en `FroggerGameStateSystem`.
- No hay test que verifique comportamiento tras un `game.stop()` + nueva instancia o `resetGameOverState` para fugas de estado entre partidas (relevante dado el hallazgo FRG-012 sobre `respawnTimer` como estado de instancia).
- No hay test de "doble ocupación" de lily pad (dos frogs intentando ocupar el mismo pad simultáneamente — aunque el juego es single-player, esto podría ser relevante si se soporta multiplayer vía `isMultiplayer` flag visto en el constructor).

**Sugerencias de mejora**:

- Extraer lógica de "overlap de AABB/circle vs box" (usada tanto en `FroggerLogCarrySystem` como potencialmente reusable para colisión de vehículos) a un helper compartido, similar a `findMatchingEntityInTriggersOrCollisions` usado en `PlatformCarrySystem` del core [19](#0-18) . Esto también resolvería FRG-001 aprovechando patrones ya existentes en el core.
- Migrar spawn layouts a data-driven (FRG-004) permitiría reusar la misma infraestructura para escalado de nivel (FRG-005).
- El contexto disponible no incluye el archivo `GDD.md` de Frogger ni `FroggerConfigSchema` completo de mutators (`MutatorConfig.ts`), por lo que **no puedo confirmar con certeza** si la ausencia de mecánica de "turtle hundiéndose" (FRG-010) es una desviación real del diseño o si nunca formó parte del alcance.

### Citations

**File:** src/games/frogger/FroggerGame.ts (L53-62)

```typescript
  constructor(config: { isMultiplayer?: boolean; seed?: number; gameOptions?: Record<string, unknown>; audio?: any } = {}) {
    const seed = (config.gameOptions?.seed as number) || config.seed;
    super({
      pauseKey: DEFAULT_FROGGER_CONFIG.KEYS.PAUSE,
      restartKey: DEFAULT_FROGGER_CONFIG.KEYS.RESTART,
      isMultiplayer: config.isMultiplayer,
      theme: createThemeFromGameAccents("asteroids"),
      gameOptions: { ...config.gameOptions, seed },
      audio: config.audio || new WebAudioPlayer()
    });
```

**File:** src/games/frogger/FroggerGame.ts (L72-82)

```typescript
  private spawnBlueprint<K extends keyof FroggerBlueprintMap>(
    name: K,
    args: Parameters<FroggerBlueprintMap[K]["spawn"]>[2]
  ): number {
    const entity = this.world.createEntity();
    const bp = this.blueprints.get(name as string);
    if (bp) {
      bp.spawn(this.world, entity, args);
    }
    return entity;
  }
```

**File:** src/games/frogger/FroggerGame.ts (L104-109)

```typescript
this.world.addSystem(new FroggerInputSystem(), {
  phase: SystemPhase.Simulation,
});
this.world.addSystem(new MovementSystem() as System<FroggerComponentRegistry>, {
  phase: SystemPhase.Simulation,
});
this.world.addSystem(new BoundarySystem() as System<FroggerComponentRegistry>, {
  phase: SystemPhase.Simulation,
});
this.world.addSystem(
  new CollisionSystem2D() as System<FroggerComponentRegistry>,
  { phase: SystemPhase.Collision }
);
this.world.addSystem(new FroggerLogCarrySystem(), {
  phase: SystemPhase.Simulation,
});
this.world.addSystem(this.gameStateSystem, { phase: SystemPhase.GameRules });
```

**File:** src/games/frogger/FroggerGame.ts (L149-180)

```typescript
// Spawn River Logs & Turtles (rows 1..5)
// Row 1: Fast Turtles (left)
this.spawnRowEntities("log", 1, config, [
  { x: 100, speed: 120, dir: -1, length: 2, type: "turtle" },
  { x: 350, speed: 120, dir: -1, length: 2, type: "turtle" },
  { x: 600, speed: 120, dir: -1, length: 2, type: "turtle" },
]);

// Row 2: Medium Logs (right)
this.spawnRowEntities("log", 2, config, [
  { x: 150, speed: 90, dir: 1, length: 3, type: "log" },
  { x: 500, speed: 90, dir: 1, length: 3, type: "log" },
]);

// Row 3: Long Logs (right, fast)
this.spawnRowEntities("log", 3, config, [
  { x: 200, speed: 150, dir: 1, length: 4, type: "log" },
  { x: 650, speed: 150, dir: 1, length: 4, type: "log" },
]);

// Row 4: Turtles (left)
this.spawnRowEntities("log", 4, config, [
  { x: 120, speed: 80, dir: -1, length: 3, type: "turtle" },
  { x: 420, speed: 80, dir: -1, length: 3, type: "turtle" },
  { x: 700, speed: 80, dir: -1, length: 3, type: "turtle" },
]);

// Row 5: Medium Logs (right)
this.spawnRowEntities("log", 5, config, [
  { x: 100, speed: 110, dir: 1, length: 3, type: "log" },
  { x: 450, speed: 110, dir: 1, length: 3, type: "log" },
]);
```

**File:** src/games/frogger/FroggerGame.ts (L287-306)

```typescript
  public initializeRenderer(renderer: Renderer<any, any>): void {
    if (renderer.type === "canvas") {
      const {
        drawFroggerCanvas,
        drawCarCanvas,
        drawTruckCanvas,
        drawLogCanvas,
        drawTurtleCanvas,
        drawLilyPadCanvas,
        froggerBackgroundCanvasEffect,
      } = require("./rendering/FroggerCanvasVisuals");

      renderer.registerShape("frogger", drawFroggerCanvas);
      renderer.registerShape("car", drawCarCanvas);
      renderer.registerShape("truck", drawTruckCanvas);
      renderer.registerShape("log", drawLogCanvas);
      renderer.registerShape("turtle", drawTurtleCanvas);
      renderer.registerShape("lily_pad", drawLilyPadCanvas);
      renderer.registerBackgroundEffect("froggerBackground", froggerBackgroundCanvasEffect);
    } else if (renderer.type === "skia") {
```

**File:** src/games/frogger/EntityFactory.ts (L77-82)

```typescript
        .withCollider({
          shape: { type: ShapeType.Box, width, height } as BoxShape,
          layer: CollisionLayers.ENEMY,
          mask: CollisionLayers.PLAYER,
        })
        .withCollisionEvents();
```

**File:** src/games/frogger/systems/FroggerGameStateSystem.ts (L6-12)

```typescript
  private game: BaseGame<any, any, any, any, any>;
  private respawnTimer: number = 0;

  constructor(game: BaseGame<any, any, any, any, any>) {
    super();
    this.game = game;
  }
```

**File:** src/games/frogger/systems/FroggerGameStateSystem.ts (L52-64)

```typescript
        if (vehicle && vTransform && vehicle.laneY === frogger.gridY) {
          const vWidth = vehicle.vehicleType === "truck" ? config.GRID_SIZE * 2 : config.GRID_SIZE * 1.2;
          const leftEdge = vTransform.x - vWidth / 2;
          const rightEdge = vTransform.x + vWidth / 2;

          if (transform.x >= leftEdge - 10 && transform.x <= rightEdge + 10) {
            frogger.isAlive = false;
            const eventBus = world.getEventBus();
            if (eventBus) {
              eventBus.emit("frogger:died", { reason: "vehicle", gridX: frogger.gridX, gridY: frogger.gridY });
            }
            break;
          }
```

**File:** src/games/frogger/systems/FroggerGameStateSystem.ts (L112-128)

```typescript
// Check if level is completed (all lily pads occupied)
if (state.occupiedLilyPads >= state.totalLilyPads) {
  state.level += 1;
  state.score += config.LEVEL_BONUS;
  state.occupiedLilyPads = 0;

  // Reset all lily pads
  for (let i = 0; i < lilyPads.length; i++) {
    world.mutateComponent(lilyPads[i], "GoalLilyPad", (p) => {
      p.occupied = false;
    });
  }

  if (eventBus) {
    eventBus.emit("frogger:level_cleared", {
      level: state.level,
      score: state.score,
    });
  }
}
```

**File:** src/games/frogger/rendering/FroggerCanvasVisuals.ts (L22-24)

```typescript
ctx.fillStyle = isInvuln ? "#A3FF80" : "#39FF14"; // Light neon green when invulnerable
ctx.shadowColor = "#39FF14";
ctx.shadowBlur = isInvuln ? 12 : 8;
```

**File:** src/games/frogger/systems/FroggerLogCarrySystem.ts (L12-15)

```typescript
const frogger = world.getMutableComponent(froggerEntity, "Frogger");
const transform = world.getMutableComponent(froggerEntity, "Transform");

if (!frogger || !transform || !frogger.isAlive) return;
```

**File:** src/games/frogger/systems/FroggerLogCarrySystem.ts (L17-21)

```typescript
// Check invulnerability
const health = world.getComponent(froggerEntity, "Health");
const isInvulnerable =
  (frogger.invulnerableRemaining !== undefined &&
    frogger.invulnerableRemaining > 0) ||
  (health !== undefined &&
    health.invulnerableRemaining !== undefined &&
    health.invulnerableRemaining > 0);
```

**File:** src/games/frogger/systems/FroggerLogCarrySystem.ts (L40-44)

```typescript
let frogRadius = (config.GRID_SIZE - 12) / 2;
const collider = world.getComponent(froggerEntity, "Collider2D");
if (collider && collider.shape && "radius" in collider.shape) {
  frogRadius = collider.shape.radius;
}
```

**File:** src/games/frogger/systems/FroggerLogCarrySystem.ts (L48-72)

```typescript
for (let i = 0; i < logEntities.length; i++) {
  const e = logEntities[i];
  const log = world.getComponent(e, "Log");
  const logTransform = world.getComponent(e, "Transform");
  const logVel = world.getComponent(e, "Velocity");

  if (log && logTransform && logVel && log.laneY === frogger.gridY) {
    const logWidth = config.GRID_SIZE * log.length;
    const halfWidth = logWidth / 2;
    const left = logTransform.x - halfWidth;
    const right = logTransform.x + halfWidth;

    const frogLeft = froggerX - frogRadius;
    const frogRight = froggerX + frogRadius;

    const overlap = Math.min(frogRight, right) - Math.max(frogLeft, left);
    const overlapNeeded = Math.min(logWidth, frogRadius * 2) * overlapRatio;

    if (overlap >= overlapNeeded) {
      ridingLogEntity = e;
      ridingLogVx = logVel.vx;
      break;
    }
  }
}
```

**File:** src/games/frogger/types/FroggerTypes.ts (L24-31)

```typescript
export interface LogComponent extends Component {
  type: "Log";
  laneY: number;
  speed: number;
  direction: number; // 1 (right) or -1 (left)
  length: number;
  logType: "log" | "turtle";
}
```

**File:** src/games/frogger/**tests**/FroggerGame.test.ts (L115-178)

```typescript
it("causes drowning death when in river rows without standing on a log", () => {
  const world = game.getWorld();
  const froggerEntity = world.query("Frogger", "Transform")[0];

  // Position Frogger in Row 1 at an x where there is no log/turtle and zero invulnerability
  world.mutateComponent(froggerEntity, "Frogger", (f) => {
    f.gridY = 1;
    f.isAlive = true;
    f.invulnerableRemaining = 0;
  });
  world.mutateComponent(froggerEntity, "Health", (h) => {
    h.invulnerableRemaining = 0;
  });
  world.mutateComponent(froggerEntity, "Transform", (t: any) => {
    t.x = 780; // Far right where no turtle is
    t.y = 1 * 40 + 20;
  });

  game.update(0.016);

  const frogger = world.getComponent(froggerEntity, "Frogger");
  expect(frogger?.isAlive).toBe(false);

  // Update to allow respawn timer to trigger life deduction
  game.update(0.6);
  const state = game.getGameState();
  expect(state.lives).toBe(2);
});

it("grants invulnerability post-respawn preventing immediate consecutive deaths", () => {
  const world = game.getWorld();
  const froggerEntity = world.query("Frogger", "Transform")[0];

  // Give 0 invulnerability and trigger death on row 1 (drowning)
  world.mutateComponent(froggerEntity, "Frogger", (f) => {
    f.gridY = 1;
    f.isAlive = true;
    f.invulnerableRemaining = 0;
  });
  world.mutateComponent(froggerEntity, "Health", (h) => {
    h.invulnerableRemaining = 0;
  });
  world.mutateComponent(froggerEntity, "Transform", (t: any) => {
    t.x = 780;
    t.y = 1 * 40 + 20;
  });

  game.update(0.016); // Trigger death
  game.update(0.6); // Complete respawn timer (0.5s) -> respawn frogger at start

  let frogger = world.getComponent(froggerEntity, "Frogger");
  expect(frogger?.isAlive).toBe(true);
  expect(frogger?.invulnerableRemaining).toBeGreaterThan(0);

  // Place frogger in dangerous road location while invulnerable
  world.mutateComponent(froggerEntity, "Frogger", (f) => {
    f.gridY = 7;
  });

  game.update(0.1); // Update while invulnerable

  frogger = world.getComponent(froggerEntity, "Frogger");
  expect(frogger?.isAlive).toBe(true); // Protected by invulnerability!
});
```

**File:** packages/core/src/physics/systems/PlatformCarrySystem.ts (L107-113)

```typescript
const matched = findMatchingEntityInTriggersOrCollisions(
  world,
  charEntity,
  (contactEntity) => {
    if (
      world.hasEntity(contactEntity) &&
      world.hasComponent(contactEntity, "MovingPlatform")
    ) {
      const platVel = world.getComponent(contactEntity, "Velocity")!;
      return charVel.vy >= platVel.vy;
    }
    return false;
  }
);
```
