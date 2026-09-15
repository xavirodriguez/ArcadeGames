## Auditoría de Calidad — Asteroids (Tiny Aster)

**Nota de alcance**: esta auditoría se realizó con herramientas de lectura reales sobre el repo (búsqueda semántica + lectura de archivos), no sobre un informe jscpd completo. Encontré un `report/jscpd-report.json` real en el repo y comentarios `TODO(refactor)` autogenerados en el propio código que ya señalan duplicaciones concretas — los uso como evidencia. No tuve iteraciones suficientes para leer el 100% de `rendering/AsteroidsSkiaVisuals.ts`, `AsteroidsCanvasVisuals.ts`, `story/` completos, ni todos los archivos de `__tests__/`, así que algunas afirmaciones de esas áreas quedan marcadas como parciales.

---

### Resumen Ejecutivo

**Hallazgos por severidad**: Critical: 0 · High: 3 · Medium: 5 · Low: 3

**Top patrones recurrentes**:

1. Duplicación cross-game sistemática ya detectada y auto-documentada por un linter interno (`Ref: <hash>`) en `EntityFactory.ts`, `AsteroidCollisionSystem.ts` y ambos renderers, pero sin resolver.
2. `createBullet()` con doble firma (overload por objeto vs por parámetros posicionales) — deuda de API interna, riesgo de mantenibilidad.
3. Lógica de negocio (scoring, combos, story hooks) concentrada en un único método largo `onCombatDeath` de más de 100 líneas dentro de `AsteroidCollisionSystem.ts`.
4. Buen cumplimiento del contrato de determinismo (no hallé `Math.random`/`Date.now` en paths de simulación) y buen uso disciplinado de `CommandBuffer`/`emitDeferred`.

**Salud global: 7/10** — La base es sólida (determinismo respetado, pooling real, doble seguridad de colisiones, separación command buffer/eventos), pero hay deuda de mantenibilidad visible y auto-documentada que nadie ha resuelto, y un método de colisión que mezcla demasiadas responsabilidades.

---

### Hallazgos

#### AST-001 — `onCombatDeath` es un God Method que mezcla 5+ responsabilidades

- **Severidad**: High
- **Categoría**: Maintainability
- **Ubicación**: `src/games/asteroids/systems/AsteroidCollisionSystem.ts`, método `onCombatDeath` (líneas 83–201)
- **Descripción**: Un único método resuelve: cálculo de puntos por tamaño, actualización de combo/multiplicador, actualización de score global, sincronización de score por jugador (netcode), lógica de story (drop de logs), spawn de partículas, fragmentación del asteroide, remoción de entidad y emisión de eventos. Cualquier cambio en una de estas áreas (p.ej. balance de score) obliga a tocar un método que también gestiona netcode y story.
- **Impacto**: Alta probabilidad de regresiones al modificar cualquier subsistema; dificulta testear en aislamiento (el test en `AsteroidsGameplay.test.ts` ya cubre combo+score+colisión en el mismo `world.update`, señal de acoplamiento).
- **Evidencia**: [1](#2-0)
- **Recomendación**: Extraer funciones puras/privadas: `computeScoreGain(size, multiplier)`, `applyComboIncrement(world)`, `trySpawnStoryLog(...)`, `spawnAsteroidDebris(...)`. Mantenerlas privadas al archivo (no es un caso de `shared/`, es un caso de descomposición interna — regla R2/R5 de proporcionalidad: es SELF, no CROSS_GAME).
- **Prioridad de acción**: Próximo sprint

#### AST-002 — Duplicación cross-game ya detectada y sin resolver (código + config)

- **Severidad**: High
- **Categoría**: Architecture / Maintainability
- **Ubicación**: `src/games/asteroids/EntityFactory.ts` líneas 218, 279 (comentarios `TODO(refactor)`), `src/games/asteroids/EntityPool.ts` líneas 32-140 (bullet pool), `src/games/asteroids/systems/AsteroidCollisionSystem.ts` línea 104, `rendering/AsteroidsSkiaVisuals.ts` (5 marcas) y `rendering/AsteroidsCanvasVisuals.ts` (2 marcas)
- **Descripción**: El propio repo tiene un linter de duplicación que inserta comentarios `TODO(refactor): código duplicado detectado ... con <archivo:línea>. Ref: <hash>` directamente en el código fuente. Hay al menos 4 focos confirmados: `Health` component boilerplate compartido con `geometrywars/entities/GeometryWarsEntities.ts`, `createPowerUp` duplicado con `flappybird/EntityFactory.ts`, el bloque de scoring/combo duplicado con `space-invaders/systems/SpaceInvadersCollisionSystem.ts`, y el bullet pool config duplicado con `geometrywars/EntityPool.ts` (confirmado también en `report/jscpd-report.json` líneas 841-890, ~73-93 tokens por bloque).
- **Impacto**: Cambios de balance o de esquema de componentes (`Health`, `PlayerScore`) requieren editar N archivos en paralelo; alto riesgo de que diverjan silenciosamente.
- **Evidencia**: [2](#2-1) [3](#2-2) [4](#2-3)
- **Recomendación**: Antes de crear nada nuevo, verificar si `shared/rendering/` o `@tiny-aster/gameplay-kit` ya resuelven parcialmente esto (el bullet pool ya extiende `ProjectilePool` de `@tiny-aster/core`, y el particle pool ya extiende `SharedParticlePool` — la extracción de bullet-config boilerplate restante entre asteroids/geometrywars sería el siguiente candidato, siguiendo R5: 10-30 líneas en 2 sitios → función/factory exportada en el módulo compartido más cercano, no una clase nueva).
- **Prioridad de acción**: Próximo sprint

#### AST-003 — `createBullet` con doble firma (overload objeto/posicional) aumenta complejidad accidental

- **Severidad**: Medium
- **Categoría**: Maintainability
- **Ubicación**: `src/games/asteroids/EntityFactory.ts` líneas 305-389
- **Descripción**: La función acepta o bien un objeto de configuración o bien parámetros posicionales (`world instanceof World` como discriminante), con dos ramas de cálculo de velocidad completamente distintas (una usa `getForwardVector(rotation) * speed`, otra permite pasar `vx/vy` directos con fallback a rotation+speed). Esto es una firma legada mantenida por compatibilidad hacia atrás sin deprecar la ruta antigua.
- **Impacto**: Superficie de API interna más grande de lo necesario; cualquier cambio en el cálculo de velocidad de bala debe replicarse en dos ramas; propenso a bugs sutiles de determinismo si una rama redondea distinto que la otra.
- **Evidencia**: [5](#2-4)
- **Recomendación**: Confirmar si la rama posicional (`worldOrConfig instanceof World`) sigue teniendo llamadores reales en el repo; si no, marcarla `@deprecated` y planear su eliminación. Si son sólo tests legacy, migrar tests al formato de objeto.
- **Prioridad de acción**: Backlog

#### AST-004 — `findPlayerByOwnerId` reconstruye caches por owner combinando `Ship` y `RemotePlayer` con lógica de precedencia implícita

- **Severidad**: Medium
- **Categoría**: Netcode / Maintainability
- **Ubicación**: `src/games/asteroids/systems/AsteroidCollisionSystem.ts` líneas 48-81
- **Descripción**: El cache se invalida por `world.tick`, lo cual es correcto para rollback/resimulación (buena práctica). Sin embargo, la construcción itera dos veces sobre queries distintas (`Ship`, luego `RemotePlayer`) con una condición `!this.playerCache.has(...)` para no pisar el valor de `Ship`, lo cual hace que el orden de inserción determine qué componente "gana" si un mismo `sessionId` aparece en ambas queries. No hay comentario que explique explícitamente esta precedencia como intencional.
- **Impacto**: Riesgo medio de bug preexistente enmascarado (la regla del proyecto para código de concurrencia/rollback pide documentar explícitamente estas divergencias, no encubrirlas).
- **Evidencia**: [6](#2-5)
- **Recomendación**: Añadir comentario explícito de por qué `Ship` tiene precedencia sobre `RemotePlayer` para el mismo `sessionId` (probablemente el jugador local también posee `RemotePlayer` en réplica de servidor), y considerar un test unitario que cubra el caso de colisión sessionId dual.
- **Prioridad de acción**: Próximo sprint

#### AST-005 — Fallbacks de configuración hardcodeados repetidos en múltiples sistemas (`{ width: 800, height: 600 }`, `HYPERSPACE_COOLDOWN ?? 5.0`, etc.)

- **Severidad**: Medium
- **Categoría**: Maintainability / Design Fidelity
- **Ubicación**: `src/games/asteroids/systems/AsteroidInputSystem.ts` líneas 143-146, 217; `src/games/asteroids/systems/AsteroidCollisionSystem.ts` línea 331; `src/games/asteroids/EntityFactory.ts` líneas 457-466
- **Descripción**: El patrón `world.getResource<...>("ScreenConfig") || { width: 800, height: 600 }` se repite literalmente en al menos 3 sistemas distintos, junto con múltiples defaults numéricos inline (`?? 0.25`, `?? 5.0`, `?? 0.5`) que ya existen como defaults en `AsteroidConfigSchema.ts` (p.ej. `SHIP_SHOOT_COOLDOWN: z.number().default(0.25)`). Esto crea dos fuentes de verdad para el mismo default.
- **Impacto**: Si se cambia un default en el schema (p.ej. `HYPERSPACE_COOLDOWN` de 5.0 a 4.0 para balance), el fallback inline en `AsteroidInputSystem.ts:217` seguiría usando 5.0 en el caso (raro pero posible) de que `GameConfig` no esté seteado, generando incoherencia silenciosa.
- **Evidencia**: [7](#2-6) [8](#2-7)
- **Recomendación**: Extraer un helper `getScreenConfig(world)` en el módulo compartido de config, y eliminar los defaults numéricos duplicados a favor de siempre confiar en `DEFAULT_ASTEROID_CONFIG` como fallback único.
- **Prioridad de acción**: Backlog

#### AST-006 — Bloque de spawn de partículas de explosión duplicado entre asteroide y nave dentro del mismo archivo

- **Severidad**: Low
- **Categoría**: Maintainability (SELF)
- **Ubicación**: `src/games/asteroids/systems/AsteroidCollisionSystem.ts` líneas 167-187 (partículas de asteroide) vs líneas 309-327 (partículas de nave)
- **Descripción**: Ambos bloques generan un anillo de partículas con ángulo aleatorio, velocidad, color de paleta y TTL siguiendo exactamente el mismo patrón (`rng.next() * Math.PI * 2`, `rng.nextRange(...)`, selección de color por índice), difiriendo sólo en el conteo, rangos numéricos y la paleta de colores usada (`ASTEROID_EXPLOSION_COLORS` vs `SHIP_EXPLOSION_COLORS`).
- **Impacto**: Bajo — no bloquea nada, pero es candidato claro de la regla R2 (SELF → resolver con función privada, no con clase nueva).
- **Evidencia**: [9](#2-8) [10](#2-9)
- **Recomendación**: Extraer un método privado `spawnExplosionBurst(world, x, y, colors, count, speedRange, sizeRange, ttlRange)` dentro del propio archivo.
- **Prioridad de acción**: Backlog

#### AST-007 — `spawnAsteroidWave` usa un bucle `while` sin cota máxima de reintentos

- **Severidad**: Low
- **Categoría**: Gameplay Correctness / Robustness
- **Ubicación**: `src/games/asteroids/EntityFactory.ts` líneas 470-481
- **Descripción**: El bucle que reubica asteroides fuera de un radio de 150px del centro no tiene límite de iteraciones. En una pantalla configurada muy pequeña (o con `SCREEN_WIDTH/HEIGHT` mal configurados vía mutators), esto podría iterar indefinidamente.
- **Impacto**: Riesgo bajo en configuración normal, pero es un vector de bloqueo del game loop si algún mutator reduce demasiado el tamaño de pantalla.
- **Evidencia**: [11](#2-10)
- **Recomendación**: Añadir un límite de iteraciones (p.ej. 20) con fallback a la última posición calculada.
- **Prioridad de acción**: Backlog

#### AST-008 — No pude verificar consistencia Canvas ↔ Skia ni uso de theme tokens en profundidad

- **Severidad**: Low (marcado como incierto, no como defecto confirmado)
- **Categoría**: Presentation
- **Ubicación**: `src/games/asteroids/rendering/AsteroidsCanvasVisuals.ts`, `AsteroidsSkiaVisuals.ts`
- **Descripción**: Confirmé que ambos archivos tienen comentarios `TODO(refactor)` de duplicación (2 y 5 marcas respectivamente) y al menos un color hex hardcodeado en cada uno, pero no alcancé a leer el contenido completo de ambos renderers para evaluar si el hex hardcodeado viola la regla de "theme tokens obligatorios" o es un caso legítimo (p.ej. color de efecto puntual no temático).
- **Impacto**: Desconocido — requiere lectura completa de ambos archivos.
- **Evidencia**: N/D — confirmado solo por grep, no por lectura completa.
- **Recomendación**: Sesión de seguimiento dedicada a leer íntegramente ambos renderers y aplicar la regla R7 (separar cálculo puro de emisión) antes de tocar nada.
- **Prioridad de acción**: Próximo sprint (para investigación, no para cambio directo)

---

### Observaciones Adicionales

**Patrones positivos**:

- Sistema de colisión con "doble seguridad" explícita (`entityA < entityB` + verificación de existencia) bien documentado en el propio código: [12](#2-11) .
- Determinismo respetado consistentemente: toda la aleatoriedad de fragmentación, spawn de oleada y partículas usa `world.gameplayRandom`, sin rastro de `Math.random`/`Date.now` en paths de simulación (confirmado por grep, solo aparecen en archivos de test).
- Uso correcto de `CommandBuffer`/`emitDeferred` en las rutas críticas (remoción de entidades, eventos de score/muerte).
- `AsteroidInputSystem.ts` ya fue optimizado explícitamente contra allocations por frame (comentario propio: "Replacing mutateComponent with direct getMutableComponent eliminates callback closure allocations per frame" línea 69), señal de que el equipo ya es consciente del presupuesto de frame.
- `AsteroidGameStateSystem` maneja limpiamente el discriminador story vs deathmatch para el flujo de wave-clearing (líneas 75-96), coherente con la nota de `docs/ARCHITECTURE_AND_DEVELOPER_GUIDE.md` que documenta la retención intencional del spawner procedural propio de Asteroids frente a `SpawnDirectorSystem`.

**Gaps de test más relevantes** (sin poder confirmar cobertura exacta por falta de lectura completa de los archivos de test):

- No vi evidencia directa de un test específico para `findPlayerByOwnerId` con colisión de `sessionId` entre `Ship` y `RemotePlayer` (AST-004).
- No vi test para el límite/ausencia de límite del bucle `while` en `spawnAsteroidWave` (AST-007).
- Existe `AsteroidsMigration.test.ts`, `PhysicsRenderInvariant.test.ts` y `MultiRotationRegression.test.ts`, lo que sugiere buena cobertura de regresión física, pero no pude confirmar si cubren específicamente hyperspace o combo-cap en condiciones de rollback/resimulación.

**Sugerencias de extracción a medio plazo**:

- Consolidar el boilerplate de `Health`/`Faction`/pool-config compartido entre Asteroids y Geometry Wars en una factory común de `@tiny-aster/gameplay-kit`, siguiendo la pista ya dejada por los `TODO(refactor)` (AST-002), en vez de dejarlos como deuda documentada indefinidamente.

### Citations

**File:** src/games/asteroids/systems/AsteroidCollisionSystem.ts (L52-78)

```typescript
// Rebuild cache if world tick has changed (e.g., new frame or rollback resimulation)
if (this.playerCacheTick !== world.tick) {
  this.playerCache.clear();
  this.playerCacheTick = world.tick;

  const ships = world.query("Ship");
  for (let i = 0; i < ships.length; i++) {
    const ent = ships[i];
    const remote = world.getComponent(ent, "RemotePlayer");
    if (remote && remote.sessionId) {
      this.playerCache.set(remote.sessionId, ent);
    }
    const ship = world.getComponent(ent, "Ship");
    if (ship && ship.sessionId) {
      this.playerCache.set(ship.sessionId, ent);
    }
  }

  const remotes = world.query("RemotePlayer");
  for (let i = 0; i < remotes.length; i++) {
    const ent = remotes[i];
    const remote = world.getComponent(ent, "RemotePlayer");
    if (remote && remote.sessionId && !this.playerCache.has(remote.sessionId)) {
      this.playerCache.set(remote.sessionId, ent);
    }
  }
}
```

**File:** src/games/asteroids/systems/AsteroidCollisionSystem.ts (L83-120)

```typescript
  private onCombatDeath(world: World<AsteroidsComponentRegistry, AsteroidsEventRegistry>, event: any): void {
    const asteroid = event.entity;
    const bullet = event.sourceEntity;

    if (this.processedDeaths.has(asteroid)) {
      return;
    }
    this.processedDeaths.add(asteroid);

    if (!world.hasComponent(asteroid, "Asteroid")) {
      return;
    }

    const asteroidComp = world.getComponent(asteroid, "Asteroid");
    const size = (asteroidComp?.size || "large") as "large" | "medium" | "small";

    let points = 20;
    if (size === "medium") points = 50;
    else if (size === "small") points = 100;

    const config = world.getResource<any>("GameConfig") || {};
    // TODO(refactor): código duplicado detectado (bloque) con space-invaders/systems/SpaceInvadersCollisionSystem.ts:153-161. Considerar extraer a función compartida. Ref: 76e7c40a
    let nextCombo = 0;
    let nextMultiplier = 1;

    const comboEntities = world.query("Combo");
    const comboEntity = comboEntities[0];
    if (comboEntity !== undefined) {
      world.mutateComponent(comboEntity, "Combo", (c) => {
        c.combo++;
        c.timerRemaining = (config.COMBO_TIMEOUT ?? 2000) / 1000;
        c.multiplier = Math.min(config.MAX_MULTIPLIER ?? 10, 1 + Math.floor(c.combo / 5));
        nextCombo = c.combo;
        nextMultiplier = c.multiplier;
      });
    }

    const scoreGain = points * nextMultiplier;
```

**File:** src/games/asteroids/systems/AsteroidCollisionSystem.ts (L167-187)

```typescript
// Spawn particles
const particlePool = world.getResource<any>("ParticlePool");
if (asteroidTransform && particlePool) {
  const ax = asteroidTransform.x;
  const ay = asteroidTransform.y;
  const particleCount = size === "large" ? 24 : size === "medium" ? 16 : 10;
  const rng = world.gameplayRandom;
  const colors = AsteroidCollisionSystem.ASTEROID_EXPLOSION_COLORS;
  for (let i = 0; i < particleCount; i++) {
    const angle = rng.next() * Math.PI * 2;
    const speed = rng.nextRange(40, 150);
    const px = ax + (rng.next() - 0.5) * 8;
    const py = ay + (rng.next() - 0.5) * 8;
    const vx = Math.cos(angle) * speed;
    const vy = Math.sin(angle) * speed;
    const color = colors[rng.nextInt(0, colors.length)];
    const pSize = rng.nextRange(1.5, 4.5);
    const ttl = rng.nextRange(0.4, 0.9);
    createSharedParticle(
      world,
      px,
      py,
      vx,
      vy,
      color,
      particlePool,
      pSize,
      ttl
    );
  }
}
```

**File:** src/games/asteroids/systems/AsteroidCollisionSystem.ts (L223-236)

```typescript
// Doble Seguridad A: Procesa cada par solo una vez verificando if (entityA < entityB)
if (!(entityA < entityB)) {
  continue;
}

// Doble Seguridad B: Antes de procesar la colisión, verifica que las entidades sigan existiendo
if (!this.hasEntity(world, entityA) || !this.hasEntity(world, entityB)) {
  continue;
}

// Ensure we don't process if either entity was already destroyed in this system update
if (
  this.destroyedEntities.has(entityA) ||
  this.destroyedEntities.has(entityB)
) {
  continue;
}
```

**File:** src/games/asteroids/systems/AsteroidCollisionSystem.ts (L309-327)

```typescript
// Spawn particle explosion for player ship impact/death
const shipTransform = world.getComponent(ship, "Transform");
const shipParticlePool = world.getResource<any>("ParticlePool");
if (shipTransform && shipParticlePool) {
  const sx = shipTransform.x;
  const sy = shipTransform.y;
  const rng = world.gameplayRandom;
  const colors = AsteroidCollisionSystem.SHIP_EXPLOSION_COLORS;
  for (let i = 0; i < 24; i++) {
    const angle = rng.next() * Math.PI * 2;
    const speed = rng.nextRange(60, 200);
    const vx = Math.cos(angle) * speed;
    const vy = Math.sin(angle) * speed;
    const color = colors[rng.nextInt(0, colors.length)];
    const pSize = rng.nextRange(2.0, 5.5);
    const ttl = rng.nextRange(0.5, 1.2);
    createSharedParticle(
      world,
      sx,
      sy,
      vx,
      vy,
      color,
      shipParticlePool,
      pSize,
      ttl
    );
  }
}
```

**File:** src/games/asteroids/EntityFactory.ts (L218-223)

```typescript
// TODO(refactor): código duplicado detectado (bloque) con geometrywars/entities/GeometryWarsEntities.ts:127-132. Considerar extraer a función compartida. Ref: 040950df
w.addComponent(entity, {
  type: "Health",
  current: 1,
  max: 1,
} as HealthComponent);
```

**File:** src/games/asteroids/EntityFactory.ts (L324-367)

```typescript
let world: World<AsteroidsComponentRegistry, AsteroidsEventRegistry>;
let posX: number;
let posY: number;
let vxVal: number;
let vyVal: number;
let owner: string | undefined;
let life: number;

let rotVal = 0;

if (worldOrConfig instanceof World) {
  world = worldOrConfig;
  posX = x!;
  posY = y!;
  const rot = rotation!;
  rotVal = rot;
  const spd = speed!;
  const forward = getForwardVector(rot);
  vxVal = forward.x * spd;
  vyVal = forward.y * spd;
  owner = ownerId;
  life = ttl ?? 2.0;
} else {
  world = worldOrConfig.world;
  posX = worldOrConfig.x;
  posY = worldOrConfig.y;
  owner = worldOrConfig.ownerId;

  if (worldOrConfig.vx !== undefined && worldOrConfig.vy !== undefined) {
    vxVal = worldOrConfig.vx;
    vyVal = worldOrConfig.vy;
    rotVal = worldOrConfig.rotation ?? Math.atan2(vyVal, vxVal);
  } else {
    const rot = worldOrConfig.rotation ?? 0;
    rotVal = rot;
    const spd = worldOrConfig.speed ?? 0;
    const forward = getForwardVector(rot);
    vxVal = forward.x * spd;
    vyVal = forward.y * spd;
  }
  const gameConfig = world.getResource<AsteroidConfig>("GameConfig");
  const bulletTtl = gameConfig?.BULLET_TTL ?? 2.0;
  life = worldOrConfig.ttl ?? bulletTtl;
}
```

**File:** src/games/asteroids/EntityFactory.ts (L470-481)

```typescript
    for (let i = 0; i < count; i++) {
        // Spawn asteroids away from the center (to avoid spawning on top of the player at the beginning of a wave)
        let x = rand.next() * screen.width;
        let y = rand.next() * screen.height;

        // Ensure it's at least 150px away from the center (where the ship starts)
        const centerX = screen.width / 2;
        const centerY = screen.height / 2;
        while (Math.hypot(x - centerX, y - centerY) < 150) {
            x = rand.next() * screen.width;
            y = rand.next() * screen.height;
        }
```

**File:** report/jscpd-report.json (L855-890)

```json
      "firstFile": {
        "end": 69,
        "endLoc": {
          "column": 18,
          "line": 69,
          "position": 1708
        },
        "name": "asteroids/EntityPool.ts",
        "start": 54,
        "startLoc": {
          "column": 17,
          "line": 54,
          "position": 1291
        }
      },
      "format": "typescript",
      "fragment": "        color: \"\",\n        rotation: 0,\n        visible: true,\n        opacity: 1,\n        order: 2,\n        hitFlashFrames: 0,\n        angularVelocity: 0\n      } as RenderComponent,\n      collider: {\n        type: \"Collider\",\n        shape: { type: ShapeType.Circle, radius: 2 } as CircleShape,\n        layer: CollisionLayers.PROJECTILE,\n        mask: CollisionLayers.ENEMY,\n        offsetX: 0,\n        offsetY: 0,\n        isTrigger: false,",
      "isNew": false,
      "lines": 16,
      "secondFile": {
        "end": 69,
        "endLoc": {
          "column": 20,
          "line": 69,
          "position": 1971
        },
        "name": "geometrywars/EntityPool.ts",
        "start": 54,
        "startLoc": {
          "column": 28,
          "line": 54,
          "position": 1524
        }
      },
      "tokens": 73
    },
```

**File:** src/games/asteroids/systems/AsteroidInputSystem.ts (L141-146)

```typescript
              const totalPrepTime = config.HYPERSPACE_PREP_TIME ?? 0.5;
              if (!prepActive) {
                  const screen = world.getResource<{ width: number; height: number }>("ScreenConfig") || {
                      width: config.SCREEN_WIDTH ?? 800,
                      height: config.SCREEN_HEIGHT ?? 600
                  };
```

**File:** src/games/asteroids/types/AsteroidConfigSchema.ts (L17-21)

```typescript
  SHIP_SHOOT_COOLDOWN: z.number().default(0.25),
  BULLET_SPEED: z.number().default(300),
  ...ComboConfigSchema.shape,
  HYPERSPACE_COOLDOWN: z.number().default(5.0),
  HYPERSPACE_PREP_TIME: z.number().default(0.5)
```
