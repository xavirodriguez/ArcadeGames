# Auditoría de Estructura Interna — Vertical Shmup (1942)

**Fecha:** 2026-10-23  
**Commit auditado:** `e383d626` (`Merge pull request #855 from xavirodriguez/feat/asteroids-visual-mods`)  
**Alcance:** `src/games/vertical-shmup/`, `src/app/vertical-shmup/`, hooks de integración y puntos de contacto con `@tiny-aster/core` / `@tiny-aster/gameplay-kit`.  
**Método:** revisión estática + pruebas Jest temporales de sondeo (eliminadas al terminar). **No se modificó código fuente.**  
**Entorno:** Node `v24.21.0`, pnpm `10.30.3`. `git status` limpio antes del análisis; después, el único cambio es este informe sin seguimiento.

---

## 0. Cómo leer este documento

Este informe está pensado como **artefacto de revisión y de evolución**, no como una lista de opiniones. Cada hallazgo incluye:

- **Evidencia**: archivo y línea, o salida de un sondeo ejecutado.
- **Impacto**: qué ve el jugador o qué invariante se rompe.
- **Reproducción**: cómo comprobarlo.
- **Fix recomendado**: cambio mínimo y, cuando aplica, alternativa arquitectónica.
- **Criterios de aceptación**: condiciones verificables para cerrar el hallazgo.

La prioridad sigue este criterio:

| Prioridad | Significado |
|---|---|
| **P0** | Impide jugar de principio a fin o rompe el contrato básico del motor. Debe corregirse antes que cualquier otra cosa. |
| **P1** | Rompe el bucle de juego, el determinismo o la integridad de snapshots. |
| **P2** | Deuda relevante de jugabilidad, rendimiento, configuración o game feel. |
| **P3** | Mantenibilidad, higiene, documentación, accesibilidad y pulido. |

---

## 1. Resumen ejecutivo

### 1.1 Veredicto

El módulo es un **prototipo visual bien intencionado pero no jugable end-to-end**. La composición ECS es razonable y reutiliza sistemas del core, pero hay tres defectos P0 independientes que, combinados, dejan la partida sin movimiento visible, sin disparos que alcancen objetivos y sin daño:

1. **Falta `HierarchySystem`**: `worldX`/`worldY` se quedan congelados en el punto de aparición. El render y las colisiones usan coordenadas de mundo, así que todo se dibuja y colisiona en posiciones estáticas.
2. **El renderer usa un viewport de `800×600`** porque `GameConfig` no expone las claves que `resolveViewportDimensions` espera. El mundo es `480×854`; el resultado se escala a `0.6` y se recorta por debajo de `y=600`, dejando fuera al jugador que aparece en `y=754`.
3. **El teclado envía un payload plano** (`{ moveX, moveY, shoot }`) que `VerticalShmupGame.setInputState` ignora, porque solo lee `axes` y `actions`. En web, WASD/flechas/Espacio no hacen nada.

La cadena causal es:

```text
Sin HierarchySystem
  └─ worldX/worldY congelados
       ├─ Render dibuja en posiciones de aparición
       ├─ CollisionSystem2D compara posiciones de aparición
       └─ Balas y enemigos nunca se encuentran → score 0, daño 0

GameConfig con claves UPPER_SNAKE
  └─ resolveViewportDimensions → 800×600
       └─ scale 0.6 + clip en y=600
            └─ jugador en y=754 fuera de pantalla; 30% inferior recortado

Teclado con payload plano
  └─ setInputState no lee moveX/moveY/shoot
       └─ velocidad 0, sin disparo
```

### 1.2 Scorecard

| Dimensión | Nota | Comentario |
|---|---:|---|
| Jugabilidad end-to-end | **1/10** | Bloqueada por P0-01/02/03. |
| Arquitectura ECS | **6/10** | Buena composición y fases, pero falta la fase Transform. |
| Determinismo | **4/10** | `Math.random()` y `Set` en componentes rompen replay/snapshots. |
| Render | **5/10** | Visuales cuidados; viewport roto y paridad Canvas/Skia incompleta. |
| Entrada | **3/10** | Touch encarrilado; teclado inerte; contrato ambigüo. |
| Configuración | **4/10** | Zod correcto, pero contrato de claves y carga duplicada. |
| Tests | **3/10** | 7 tests verdes, pero no cubren nada de lo que falla. |
| Integración con la app | **4/10** | HUD funciona; sin pausa, game over ni reinicio. |
| Calidad de código | **5/10** | Módulo pequeño y legible; 3 errores ESLint y superficie muerta. |
| **Global** | **3.5/10** | Base prometedora; hoy no es un juego terminado. |

### 1.3 Hallazgos principales

| ID | Hallazgo | Prioridad |
|---|---|---|
| P0-01 | Falta `HierarchySystem`; `worldX`/`worldY` congelados. | P0 |
| P0-02 | Viewport `800×600` contra mundo `480×854`; recorte y escalado. | P0 |
| P0-03 | El teclado envía un payload que `setInputState` ignora. | P0 |
| P1-01 | La muerte no termina la partida: VFX repetidos, jugador sigue disparando, sin `game:over`. | P1 |
| P1-02 | Varios impactos en el mismo tick saltan la invulnerabilidad (3→1). | P1 |
| P1-03 | Sin pausa, game over ni reinicio en la UI; `pauseKey`/`restartKey` sin binding. | P1 |
| P1-04 | `Math.random()` en la creación de enemigos rompe el determinismo. | P1 |
| P1-05 | `Set<string>` dentro de un componente rompe snapshots, hash y clone-on-write en dev. | P1 |
| P2-01 | Los cuerpos enemigos no tienen `Damage`; embestir es inofensivo. | P2 |
| P2-02 | Contrato de config: claves, unidades, claves muertas y carga duplicada. | P2 |
| P2-03 | Mutadores (`extra_life`, `shmup_speed`) no integrados. | P2 |
| P2-04 | Oleadas: parte del escuadrón aparece fuera del boundary y se destruye al instante. | P2 |
| P2-05 | Game feel/rendimiento: shake inerte, sin partículas, hit flash no renderizado, starfield con allocations. | P2 |
| P2-06 | Higiene de entrada y capas de colisión. | P2 |
| P3-01 | Código muerto, imports sin usar, casts y superficie de tipos. | P3 |
| P3-02 | Eventos huérfanos y `NetworkController` sin uso. | P3 |
| P3-03 | Cobertura de tests insuficiente y claim falso de determinismo en la bitácora. | P3 |
| P3-04 | UX/accesibilidad: carga en blanco, vidas con emoji, sin overlays. | P3 |

---

## 2. Alcance y método

### 2.1 Alcance

Se revisaron 25 archivos del módulo (~1.605 líneas) y la capa de app/hook:

```text
src/games/vertical-shmup/
├── VerticalShmupGame.ts              (80)
├── EntityFactory.ts                  (150)
├── EntityPool.ts                     (38)
├── index.ts                          (5)
├── jest.config.cjs                   (17)
├── config/vertical-shmup.json        (27)
├── scenes/ShmupGameScene.ts          (72)
├── systems/
│   ├── BulletPatternSystem.ts        (28)
│   ├── EnemyPathSystem.ts            (22)
│   ├── ScrollSystem.ts               (25)
│   ├── ShmupCollisionSystem.ts       (67)
│   ├── ShmupInputSystem.ts           (93)
│   └── ShmupSpawnSystem.ts           (61)
├── types/
│   ├── ShmupConfigSchema.ts          (37)
│   └── ShmupTypes.ts                 (19)
├── rendering/
│   ├── ShmupCanvasVisuals.ts         (211)
│   ├── ShmupRenderer.ts              (35)
│   ├── ShmupSkiaVisuals.ts           (212)
│   └── ShmupVisualHelpers.ts         (132)
└── __tests__/                        (157 en 3 suites)

src/app/vertical-shmup/index.tsx       (108)
src/app/vertical-shmup/_layout.tsx     (9)
src/hooks/useVerticalShmupGame.ts      (18)
src/hooks/useKeyboardControls.ts       (166, compartido)
```

También se leyeron los puntos de integración relevantes:

- `packages/core/src/ecs/World.ts`, `Schedule.ts`, `ComponentCloner.ts`.
- `packages/core/src/systems/HierarchySystem.ts`.
- `packages/core/src/rendering/RendererUtils.ts`, `Camera2D.ts`.
- `packages/renderer-canvas/src/CanvasRenderer.ts` y `packages/renderer-skia/src/SkiaRenderer.ts`.
- `packages/core/src/physics/collision/CollisionSystems.ts`, `packages/core/src/physics/systems/BoundarySystem.ts`.
- `packages/gameplay-kit/src/combat/systems/CombatSystem.ts`, `packages/core/src/utils/ProjectilePool.ts`.
- `packages/core/src/utils/Juice.ts`, `packages/core/src/systems/ScreenShakeSystem.ts`, `src/games/shared/rendering/SharedVFX.ts`.
- `src/utils/MutatorRegistry.ts`, `src/games/shared/configHelper.ts`.
- `packages/react-native/src/hooks/useGame.ts`.

### 2.2 Comandos ejecutados

```bash
# Suite del módulo
pnpm exec jest --config "$PWD/src/games/vertical-shmup/jest.config.cjs" \
  --rootDir "$PWD" --runInBand --forceExit \
  --testPathPattern "vertical-shmup/__tests__"

# Lint del módulo y de la pantalla
pnpm exec eslint src/games/vertical-shmup src/app/vertical-shmup --no-color

# Typecheck del proyecto
pnpm exec tsc -p tsconfig.json --noEmit

# Guard de patrones
pnpm exec tsx scripts/check-game-patterns.ts

# Duplicación (ratchet global)
pnpm run check:duplication
```

Resultados baseline:

| Comando | Resultado |
|---|---|
| Jest del módulo | **3 suites / 7 tests, todos pasan** (≈20 s). |
| ESLint | **3 errores** en el módulo (ver P3-01). |
| `tsc --noEmit` | Shmup limpio; solo 2 errores preexistentes y ajenos en `src/app/index.tsx` (`/galaxian`, `/centipede`). |
| `check-game-patterns` | Pasa. No detecta `Math.random` (solo vigila unlock/lock). |
| `check:duplication` | **Falla a nivel repo**: 1.12% vs baseline 0.98% (+182 líneas). No se atribuye con certeza a este módulo; requiere revisión aparte. |

### 2.3 Limitaciones

- **No se ejecutó una sesión gráfica automatizada** (navegador/dispositivo). Los hallazgos de render se validaron con sondeos headless y con el cálculo explícito del pipeline de `CanvasRenderer`.
- Los sondeos Jest fueron **temporales** y se eliminaron; los números del Anexo A son salidas reales de esos sondeos.
- El análisis es estático en todo lo que no se pudo instrumentar sin modificar fuente. Se indica cuándo un hallazgo es derivado y cuándo es observado.

---

## 3. Mapa del módulo

### 3.1 Capas

```text
┌──────────────────────────────────────────────────────────────┐
│ App / React Native                                            │
│ src/app/vertical-shmup/index.tsx                              │
│   - estado "started"                                          │
│   - useVerticalShmupGame → useGame                             │
│   - useKeyboardControls (payload plano)                        │
│   - TouchInputState + joystick + botón                        │
│   - CanvasRenderer + HUD                                      │
└───────────────────────────┬──────────────────────────────────┘
                            │ setInputState / world resources
┌───────────────────────────▼──────────────────────────────────┐
│ Juego / Composición                                           │
│ VerticalShmupGame extends BaseGame                            │
│   - carga config, audio, renderer, red (sin uso)              │
│   - onRegisterSystems → ShmupGameScene.onEnter                │
└───────────────────────────┬──────────────────────────────────┘
                            │ Scene
┌───────────────────────────▼──────────────────────────────────┐
│ Escena / ECS                                                  │
│ ShmupGameScene                                                │
│   - crea ShmupGameState, jugador, cámara                      │
│   - registra 15 sistemas                                      │
│   - siembra 6 enemigos iniciales                              │
├──────────────────────────────────────────────────────────────┤
│ Entidades                                                     │
│ createPlayer / createEnemy / createPlayerBullet /             │
│ createEnemyBullet (EntityFactory + EntityPool)                │
├──────────────────────────────────────────────────────────────┤
│ Sistemas                                                      │
│ Input, Movement, EnemyPath, Spawn, Scroll, Boundary, TTL,     │
│ Spatial, Collision, Combat, BulletPattern, CollisionRules,    │
│ Camera, Juice, RenderUpdate                                  │
├──────────────────────────────────────────────────────────────┤
│ Render                                                        │
│ ShmupRenderer → CanvasVisuals / SkiaVisuals + Helpers         │
└──────────────────────────────────────────────────────────────┘
```

### 3.2 Responsabilidades por archivo

| Archivo | Responsabilidad | Observación |
|---|---|---|
| `VerticalShmupGame.ts` | Ciclo de vida, config, input bridge, renderer. | Carga config dos veces; `setInputState` incompleto; `NetworkController` sin uso. |
| `scenes/ShmupGameScene.ts` | Composition root: estado, jugador, cámara, sistemas. | **No registra `HierarchySystem`**; orden de registro confuso. |
| `EntityFactory.ts` | Fábricas de jugador, enemigo y balas. | `Math.random()`; salud hardcodeada; enemigo sin `Damage`; imports muertos. |
| `EntityPool.ts` | Pools de balas. | Capa de bala enemiga semánticamente incorrecta. |
| `systems/ShmupInputSystem.ts` | Lee input canónico/touch, mueve, dispara, invulnerabilidad. | `InputState` muerto; `Set`; clamps sin `dirty`. |
| `systems/ShmupCollisionSystem.ts` | Muerte de enemigos, score, daño de jugador, game over. | Suscripción con estado; VFX repetidos; sin evento `game:over`. |
| `systems/ShmupSpawnSystem.ts` | Oleadas y spawn por intervalo. | Escuadrón parcialmente fuera del boundary; lectura de singleton antes de mutar. |
| `systems/BulletPatternSystem.ts` | Disparo enemigo (aimed/spread/ring). | Allocations por tick; sin guard de game over. |
| `systems/EnemyPathSystem.ts` | Trayectorias sine/arc. | Solo modifica X; semántica de "arc" discutible. |
| `systems/ScrollSystem.ts` | Scroll de fondo y reset de cámara. | Reset de cámara redundante con la escena. |
| `types/ShmupTypes.ts` | Registro de componentes y eventos. | `Set` en componente; registro sobredimensionado. |
| `types/ShmupConfigSchema.ts` | Esquema Zod. | Claves UPPER_SNAKE; `COUNTDOWN`/`KEY_*` muertas; unidades mezcladas. |
| `config/vertical-shmup.json` | Valores por defecto. | Duplica defaults del esquema. |
| `rendering/*` | Visuales Canvas/Skia y helpers. | Allocations; `0.016` hardcodeado; sin paridad de glow. |
| `__tests__/*` | 7 tests. | Cubren init, oleada, invulnerabilidad básica, boundary y registro de shapes. |

### 3.3 Dependencias

- **Core**: ECS, `BaseGame`, `Scene`, sistemas estándar, renderer contracts, `TouchInputState`, `Juice`.
- **Gameplay Kit**: `CombatSystem`, `CollisionLayers`, `ProjectilePool` config, `DamageComponent`.
- **Shared del repo**: `configHelper`, `componentBuilders`, `SharedVFX`, `BulletPatternSystem`, `getGameplayColor`, `colors`.
- **App**: `useGame`, `CanvasRenderer`, `GameLayoutShell`, controles touch.

No hay imports de UI dentro de `src/games/vertical-shmup`, lo cual respeta la separación para un eventual servidor headless.

---

## 4. Flujo de ejecución

### 4.1 Arranque

```text
VerticalShmupScreen
  └─ useState(started=false)
       └─ "START MISSION" → started=true
            └─ useVerticalShmupGame(true)
                 └─ useGame(VerticalShmupGame, ...)
                      ├─ new VerticalShmupGame(config)
                      │    ├─ ConfigService.load("vertical-shmup", schema, rawConfig ?? JSON)
                      │    └─ super(...) → BaseGame constructor
                      ├─ game.init()
                      │    ├─ registerInternalResources()
                      │    ├─ registerEventBusListeners()
                      │    └─ onRegisterSystems()
                      │         ├─ loadAndMutateConfig(gameId, schema, configRaw, gameOptions)
                      │         ├─ setResource("GameConfig", config)
                      │         ├─ setResource("IsHeadless", ...)
                      │         ├─ NetworkManager.registerGame(...)
                      │         └─ new ShmupGameScene(...).onEnter()
                      │              ├─ setResource GameConfig/Pools
                      │              ├─ crea ShmupGameState
                      │              ├─ crea jugador en (240, 754)
                      │              ├─ setResource("ScreenConfig", 480×854)
                      │              ├─ crea cámara bloqueada en (0,0)
                      │              ├─ registerSystems()
                      │              └─ siembra 6 enemigos con gameplayRandom
                      └─ game.start()
```

### 4.2 Orden real de sistemas

El orden se agrupa por `SystemPhase` y, dentro de cada fase, por prioridad e inserción. La tabla siguiente refleja el orden efectivo, no el orden textual del archivo:

| # | Sistema | Fase | Lee | Escribe | Nota |
|---:|---|---|---|---|---|
| 1 | `ShmupInputSystem` | Simulation | `Input`, `Transform`, `Velocity`, `Health`, `TouchInputState` | `Velocity`, `Input`, `Health` | Clamps sin `dirty`. |
| 2 | `MovementSystem` | Simulation | `Transform`, `Velocity` | `Transform` | Marca `dirty=true`. |
| 3 | `EnemyPathSystem` | Simulation | `EnemyPath`, `Transform` | `Transform.x`, `dirty` | Solo X. |
| 4 | `ShmupSpawnSystem` | Simulation | `ShmupGameState`, `ShmupEnemy` | `ShmupGameState`, nuevas entidades | Command buffer. |
| 5 | `ScrollSystem` | Simulation | `ShmupGameState`, `Camera2D` | `scrollDistance`, cámara | Reset redundante. |
| 6 | `BoundarySystem` | Simulation | `Boundary`, `Transform` | `Transform`, reclaim | Usa coordenadas locales. |
| 7 | `TTLSystem` | Simulation | `TTL` | reclaim | Balas/partículas. |
| 8 | `ShmupBulletPatternSystem` | Simulation | `ShmupEnemy`, `Transform`, `BulletPattern` | `BulletPattern`, balas | Registrado después de Combat en el código, pero corre antes por fase. |
| 9 | `SpatialPartitioningSystem` | Collision | `Transform`, `Collider` | índice espacial | Usa `worldX/worldY`. |
| 10 | `CollisionSystem2D` | Collision | `Collider`, `Transform` | `CollisionEvents` | Usa `worldX/worldY`. |
| 11 | `CombatSystem` | Collision | `Damage`, `Health`, `Faction` | `Health`, `Dead`, eventos | Aplica daño antes del evento diferido. |
| 12 | `ShmupCollisionSystem` | GameRules | `ShmupEnemy`, `ShmupPlayer`, `Health` | score, VFX, `isGameOver` | Sin `game:over`; VFX repetido. |
| 13 | `Camera2DSystem` | Presentation | `Camera2D` | cámara | Cámara bloqueada. |
| 14 | `JuiceSystem` | Presentation | `Juice`, `VisualOffset`, `Render` | animaciones | Shake no aplicado. |
| 15 | `RenderUpdateSystem` | Presentation | `Render`, `Transform` | render state | — |
| — | **`HierarchySystem`** | **Transform** | `Transform` | `worldX/worldY` | **AUSENTE**. |

**Observación de legibilidad:** `ShmupBulletPatternSystem` se registra después de `CombatSystem`, pero como pertenece a `Simulation` corre antes de `Collision`. El orden textual no refleja el orden real; conviene registrar los sistemas en orden de fase para evitar futuros errores.

### 4.3 Pipeline de un tick

```text
Input.canónico/touch
  → ShmupInputSystem: velocity + cooldown + clamps
  → MovementSystem: x += vx·dt; y += vy·dt; dirty=true
  → EnemyPathSystem: x = f(t); dirty=true
  → SpawnSystem: crea enemigos (command buffer)
  → ScrollSystem: scrollDistance; cámara a 0
  → BoundarySystem: reclaim/clamp por x/y local
  → TTLSystem: reclaim por tiempo
  → BulletPatternSystem: crea balas enemigas
  → [Transform Phase]  ← AQUÍ DEBERÍA CORRER HierarchySystem
  → SpatialPartitioning: indexa por worldX/worldY
  → CollisionSystem2D: compara worldX/worldY
  → CombatSystem: aplica Damage/Health; emite combat:hit diferido
  → ShmupCollisionSystem: score, VFX, isGameOver
  → Camera2D / Juice / RenderUpdate
  → flushDeferred() + commandBuffer.flush()
```

### 4.4 El eslabón perdido: fase Transform

`HierarchySystem` es el único sistema que sincroniza `worldX/worldY` a partir de `x/y` para entidades sin padre:

```ts
// packages/core/src/systems/HierarchySystem.ts:30-68
public override update(world, _deltaTime): void {
  ...
  if (isDirty) {
    world.mutateComponent(entity, "Transform", mutTransform => {
      ...
      } else {
        this.setToLocal(mutTransform); // worldX = x; worldY = y
      }
      mutTransform.dirty = false;
    });
  }
}
```

Nueve de los diez juegos del repo lo registran en `SystemPhase.Transform` (Asteroids, Space Invaders, Pong, Arkanoid, Frogger, Flappy Bird, Geometry Wars, Racing, Tower Defense). **Vertical Shmup es la excepción.** El detalle está en P0-01.

---

## 5. Contratos de datos

### 5.1 Configuración (`ShmupConfig`)

| Clave | Default | Unidad | Uso | Problema |
|---|---:|---|---|---|
| `WORLD_WIDTH` | 480 | px | Mundo, boundaries, spawns | No es `worldWidth`; el renderer no la ve. |
| `WORLD_HEIGHT` | 854 | px | Mundo, boundaries, spawns | No es `worldHeight`. |
| `PLAYER_SPEED` | 300 | px/s | Velocidad del jugador | — |
| `PLAYER_SIZE` | 22 | px | Render y márgenes | — |
| `PLAYER_COLLIDER_RADIUS` | 12 | px | Collider | — |
| `PLAYER_SHOOT_COOLDOWN` | 120 | **ms** | Cadencia | Se divide entre 1000 en el sistema. |
| `PLAYER_BULLET_SPEED` | 650 | px/s | Bala | — |
| `PLAYER_BULLET_SIZE` | 4 | px | Render/collider | — |
| `PLAYER_BULLET_TTL` | 2 | **s** | TTL | — |
| `ENEMY_SPEED` | 90 | px/s | Enemigo | — |
| `ENEMY_SIZE` | 24 | px | Render | — |
| `ENEMY_COLLIDER_RADIUS` | 12 | px | Collider | — |
| `ENEMY_HP` | 1 | HP | Salud | — |
| `ENEMY_SCORE` | 100 | puntos | Score | — |
| `ENEMY_BULLET_SPEED` | 220 | px/s | Bala enemiga | Fallback en código: 250. |
| `ENEMY_BULLET_SIZE` | 4 | px | Render | Visual Skia usa fallback 5. |
| `ENEMY_BULLET_TTL` | 5 | s | TTL | — |
| `SPAWN_INTERVAL` | 0.8 | s | Spawn continuo | — |
| `SCROLL_SPEED` | 80 | px/s | Fondo | — |
| `OFFSCREEN_MARGIN` | 80 | px | Boundaries | — |
| `MUZZLE_FLASH_FRAMES` | 3 | frames | Juice | — |
| `RETROCOIL_PX` | 10 | px | Juice | — |
| `STAR_COUNT` | 80 | unidades | Fondo | Allocations por frame. |
| `STAR_SPEED` | 35 | px/s | Fondo | — |
| `COUNTDOWN` | 2 | s | **Sin uso** | Clave muerta. |
| `KEY_LEFT/RIGHT/UP/DOWN/SHOOT` | Arrows/Space | string | **Sin uso** | Claves muertas. |

**Contrato roto con el core:** `resolveViewportDimensions` espera `worldWidth`, `worldHeight`, `viewportWidth`, `viewportHeight` (camelCase). `ShmupConfig` solo publica UPPER_SNAKE. `Camera2DSystem` sí cae a `ScreenConfig`, pero el renderer no. Ver P0-02.

### 5.2 Componentes propios

| Componente | Campos | Serialización | Nota |
|---|---|---|---|
| `ShmupPlayer` | `type` | OK | Tag. |
| `ShmupEnemy` | `score` | OK | — |
| `ShmupPlayerBullet` | `type` | OK | Pool. |
| `ShmupEnemyBullet` | `type` | OK | Pool. |
| `EnemyPath` | `kind`, `elapsed`, `duration`, `speed`, `amplitude`, `frequency`, `originX`, `originY` | OK | — |
| `BulletPattern` | `config`, `cooldownRemaining`, `phase` | OK | `config` es objeto plano. |
| `ShmupGameState` | `score`, `wave`, `lives`, `scrollDistance`, `isGameOver`, `spawnTimer` | OK | Singleton. |
| `Input` | `axes`, **`actions: Set<string>`**, `shootCooldownRemaining` | **ROTO** | `ComponentCloner` no clona `Set`; ver P1-05. |

### 5.3 Recursos

| Recurso | Productor | Consumidor | Nota |
|---|---|---|---|
| `GameConfig` | `ShmupGameScene.onEnter` / `VerticalShmupGame.onRegisterSystems` | Fábricas, sistemas, renderer | Claves inconsistentes. |
| `ScreenConfig` | `ShmupGameScene.onEnter` | Renderer, cámara | 480×854. |
| `PlayerBulletPool` | `ShmupGameScene.onEnter` | `ShmupInputSystem` | — |
| `EnemyBulletPool` | `ShmupGameScene.onEnter` | `BulletPatternSystem` | — |
| `TouchInputState` | `src/app/vertical-shmup/index.tsx` | `ShmupInputSystem` | Correcto. |
| `IsPaused` | `BaseGame.pause` | Sistemas | Nunca se setea desde la UI del shmup. |
| `IsHeadless` | `VerticalShmupGame` | — | — |
| `ParticlePool` | **Nadie** | `SharedVFX` | Sin partículas. |
| `ScreenShake` | **Nadie** | `Juice.shake` | Sin shake. |

### 5.4 Eventos

| Evento | Emisor | Consumidor | Estado |
|---|---|---|---|
| `combat:hit` | `CombatSystem` (deferred) | `ShmupCollisionSystem` | Funciona, pero llega tarde (P1-02). |
| `combat:death` | `CombatSystem` | Nadie | Ignorado. |
| `shmup:kill` | `ShmupCollisionSystem` | Nadie | Huérfano. |
| `shmup:wave_complete` | `ShmupSpawnSystem` | Nadie | Huérfano. |
| `game:over` | **Nadie** | `BaseGame` (kernel) | Nunca se emite; el kernel no transiciona. |
| `PlaySFX` | Varios | `BaseGame` | Funciona. |

### 5.5 Entrada

Contrato real de `VerticalShmupGame.setInputState`:

```ts
// src/games/vertical-shmup/VerticalShmupGame.ts:38-45
public setInputState(input: Partial<ShmupInputState>): void {
  const player = this.world.query("ShmupPlayer", "Input")[0];
  if (player === undefined) return;
  this.world.mutateComponent(player, "Input", i => {
    if (input.axes) i.axes = { ...i.axes, ...input.axes };
    if (input.actions) i.actions = input.actions;
  });
}
```

`ShmupInputState` exige `axes` y `actions: Set<string>`. El hook de teclado envía `{ moveX, moveY, shoot }`, que no encaja. La pantalla hace dos llamadas: `handleInput(patch as never)` (que internamente vuelve a llamar a `setInputState` con el payload plano, sin efecto) y luego una llamada canónica manual. Ver P0-03.

---

## 6. Hallazgos priorizados

### P0-01 — Falta `HierarchySystem`: `worldX`/`worldY` quedan congelados

| Campo | Valor |
|---|---|
| **Severidad** | P0 |
| **Tipo** | Integración ECS / fase Transform |
| **Archivos** | `src/games/vertical-shmup/scenes/ShmupGameScene.ts:55-71`; `packages/core/src/systems/HierarchySystem.ts:30-68`; `packages/renderer-canvas/src/CanvasRenderer.ts:469-470`; `packages/core/src/physics/collision/CollisionSystems.ts:193-198`; `packages/core/src/systems/SpatialPartitioningSystem.ts:34` |
| **Estado** | Confirmado con sondeo headless |

**Evidencia**

`ShmupGameScene.registerSystems()` registra 15 sistemas, pero no `HierarchySystem`. El renderer dibuja con:

```ts
// CanvasRenderer.ts:469-470
const x = transform.worldX ?? transform.x;
const y = transform.worldY ?? transform.y;
```

Y la colisión usa:

```ts
// CollisionSystems.ts:193-198
(transA.worldX ?? transA.x) + (colA.offsetX ?? 0),
(transA.worldY ?? transA.y) + (colA.offsetY ?? 0),
```

Como `worldX/worldY` se inicializan al spawn y nadie los vuelve a escribir, quedan fijos. Sondeo tras 30 ticks con input canónico (`moveX=1`, `moveY=-1`):

```text
PROBE player x 240 -> 390   worldX 240
PROBE y       754 -> 604   worldY 754
PROBE enemy   x 162.32     worldX 126.32
PROBE enemy   y 216.5      worldY 80
PROBE bullet  y 92.83      worldY 732
```

La coordenada local avanza; la de mundo no. El enemigo se dibuja en `y=80` aunque su `y` local sea `216.5`; la bala se dibuja en `y=732` aunque su `y` local sea `92.8`.

**Impacto**

- **Render**: enemigos, jugador y balas aparecen congelados en sus posiciones de aparición.
- **Colisión**: `SpatialPartitioningSystem` y `CollisionSystem2D` comparan posiciones de aparición. Las balas del jugador nunca alcanzan a los enemigos y las balas enemigas nunca alcanzan al jugador.
- **Jugabilidad**: el score se queda en 0 y el jugador no recibe daño. En el sondeo, 60 ticks de disparo continuo produjeron 8 balas, 0 puntos y 7 enemigos.
- **Efecto secundario observable**: `BoundarySystem` sí usa `x/y` locales, así que los enemigos desaparecen al salir por abajo y `ShmupSpawnSystem` avanza de oleada automáticamente. El juego "progresa" sin que el jugador pueda intervenir.

**Reproducción**

```ts
const game = new VerticalShmupGame();
await game.init();
game.start();
game.update(1 / 60);

const world = game.getWorld();
const player = world.query("ShmupPlayer")[0]!;
const before = world.getComponent(player, "Transform")!;

game.setInputState({ axes: { moveX: 1, moveY: -1 }, actions: new Set(["shoot"]) });
for (let i = 0; i < 30; i++) game.update(1 / 60);

const after = world.getComponent(player, "Transform")!;
// after.x !== before.x, pero after.worldX === before.worldX
```

**Causa raíz**

`HierarchySystem` es el único sistema que hace `worldX = x` para entidades sin padre. Al no registrarse, la fase `Transform` queda vacía. El `dirty=true` que escribe `MovementSystem` nunca se consume.

**Fix recomendado**

1. Registrar el sistema en la fase correcta:

```ts
import { HierarchySystem } from "@tiny-aster/core";

this.world.addSystem(new HierarchySystem(), { phase: SystemPhase.Transform });
```

2. **Disciplina de `dirty`**: cualquier escritura directa a `Transform.x/y` debe marcar `dirty = true`. Hoy `ShmupInputSystem` hace clamping en `:56-70` sin marcarlo. Añadir `transform.dirty = true` tras el clamp (o mutar con un helper que lo haga).
3. Revisar `BoundarySystem` y cualquier knockback futuro: si mueven `x/y` sin `dirty`, el mundo no se sincroniza hasta el siguiente tick con velocidad.

**Criterios de aceptación**

- [ ] Tras un tick con `dirty=true`, `worldX === x` y `worldY === y` (epsilon `1e-6`).
- [ ] El jugador se mueve a la derecha 30 ticks: `worldX` sigue a `x`.
- [ ] Una bala del jugador reduce `worldY` tick a tick.
- [ ] Un enemigo aumenta `worldY` tick a tick.
- [ ] Una bala que solapa un enemigo le resta salud y, al morir, incrementa el score.
- [ ] Prueba manual: enemigos visibles desplazándose hacia abajo; jugador visible y controlable.

---

### P0-02 — Viewport `800×600` contra un mundo `480×854`

| Campo | Valor |
|---|---|
| **Severidad** | P0 |
| **Tipo** | Contrato de configuración / render |
| **Archivos** | `src/games/vertical-shmup/types/ShmupConfigSchema.ts:3-34`; `src/games/vertical-shmup/scenes/ShmupGameScene.ts:32-33`; `packages/core/src/rendering/RendererUtils.ts:53-59`; `packages/renderer-canvas/src/CanvasRenderer.ts:304-318` |
| **Estado** | Confirmado con sondeo headless y cálculo del pipeline |

**Evidencia**

`ShmupGameScene` publica:

```ts
this.world.setResource("ScreenConfig", { width: 480, height: 854 });
```

Pero `GameConfig` solo tiene `WORLD_WIDTH: 480` y `WORLD_HEIGHT: 854`. `resolveViewportDimensions` busca `worldWidth/worldHeight`:

```ts
const viewportWidth = gameConfig?.viewportWidth
  ?? (gameConfig?.worldWidth && gameConfig.worldWidth < 2000 ? gameConfig.worldWidth : 800);
const viewportHeight = gameConfig?.viewportHeight
  ?? (gameConfig?.worldHeight && gameConfig.worldHeight < 2000 ? gameConfig.worldHeight : 600);
```

Sondeo:

```text
PROBE viewport {"viewportWidth":800,"viewportHeight":600}
      screen   {"width":480,"height":854}
```

Cálculo en `CanvasRenderer`:

```text
scale   = min(480 / 800, 854 / 600) = min(0.6, 1.4233) = 0.6
offsetX = (480 - 800 * 0.6) / 2 = 0
offsetY = (854 - 600 * 0.6) / 2 = 247
clip    = rect(0, 0, 800, 600) escalado a 480×360, en y=247..607
```

Consecuencias:

- El mundo se dibuja a **288×360 px lógicos** dentro de un canvas de **480×854**; sobran 192 px a la derecha y 247 px arriba/abajo.
- El clip termina en `y=600` (mundo). El jugador aparece en `y = 854 - 100 = 754`, fuera del área visible; solo se vería si sube.
- El 30% inferior del mundo (`y=600..854`) queda recortado: enemigos, balas y jugador pueden desaparecer aunque su lógica siga activa.
- El fondo estrellado llena solo `480×854` unidades, pero el viewport de 800 de ancho deja una franja negra a la derecha.

**Impacto**

El juego se ve "encogido" y descentrado, con una franja negra lateral y la parte inferior inaccesible. El jugador empieza fuera de cámara. Es un defecto visible en la primera pantalla de juego.

**Reproducción**

```ts
const game = new VerticalShmupGame();
await game.init();
const world = game.getWorld();
resolveViewportDimensions(world.getResource("GameConfig"));
// → { viewportWidth: 800, viewportHeight: 600 }
world.getResource("ScreenConfig");
// → { width: 480, height: 854 }
```

**Causa raíz**

Dos contratos distintos para el tamaño del mundo: el juego usa UPPER_SNAKE y el core camelCase. `ScreenConfig` no se usa como fallback en `resolveViewportDimensions`.

**Fix recomendado**

**Corto plazo (local, bajo riesgo):** publicar alias camelCase en el recurso `GameConfig`:

```ts
const renderConfig = {
  ...this.config,
  worldWidth: this.config.WORLD_WIDTH,
  worldHeight: this.config.WORLD_HEIGHT,
  viewportWidth: this.config.WORLD_WIDTH,
  viewportHeight: this.config.WORLD_HEIGHT,
};
this.world.setResource("GameConfig", renderConfig);
```

**Medio plazo (core, más robusto):** que `resolveViewportDimensions` acepte también `ScreenConfig` y/o las claves UPPER_SNAKE. Así otros juegos con configuraciones legacy no vuelven a tropezar:

```ts
resolveViewportDimensions(gameConfig, screenConfig)
// prioridad: viewportWidth/Height → worldWidth/Height → WORLD_WIDTH/HEIGHT → ScreenConfig → 800×600
```

Cualquiera de las dos opciones debe ir acompañada de un test de regresión.

**Criterios de aceptación**

- [ ] `resolveViewportDimensions(GameConfig)` devuelve `{ viewportWidth: 480, viewportHeight: 854 }`.
- [ ] `ScreenConfig` y el viewport efectivo coinciden.
- [ ] Prueba manual: el campo de juego ocupa el canvas completo, sin franjas negras laterales.
- [ ] El jugador en `y=754` es visible al iniciar.
- [ ] El fondo estrellado cubre todo el canvas.
- [ ] Test de regresión que falle con `800×600` y pase con `480×854`.

---

### P0-03 — El teclado envía un payload que `setInputState` ignora

| Campo | Valor |
|---|---|
| **Severidad** | P0 |
| **Tipo** | Contrato de entrada / integración React |
| **Archivos** | `src/hooks/useKeyboardControls.ts:66-90,125-131`; `src/games/vertical-shmup/VerticalShmupGame.ts:38-45`; `src/app/vertical-shmup/index.tsx:29-39` |
| **Estado** | Confirmado por código y sondeo canónico |

**Evidencia**

`useKeyboardControls` construye un payload plano:

```ts
const fullPayload = {
  rotateLeft, rotateRight, moveLeft, moveRight, moveUp, moveDown,
  thrust, shoot, hyperspace, flap, glide, p1Left, p1Right,
  p1Launch, p1Up, p1Down, p2Up, p2Down, moveX, moveY, boost, brake,
};
...
game.setInputState(inputPayload);
```

`VerticalShmupGame.setInputState` solo lee `input.axes` e `input.actions`:

```ts
if (input.axes) i.axes = { ...i.axes, ...input.axes };
if (input.actions) i.actions = input.actions;
```

El payload `{ moveX: 1, moveY: -1, shoot: true }` no tiene `axes` ni `actions`, así que la llamada es un no-op. El sondeo con input canónico confirmó que el resto del sistema sí funciona cuando recibe el formato correcto: velocidad `(300, -300)` y balas creadas.

La pantalla además hace una llamada duplicada:

```ts
const setInput = useCallback((patch) => {
  handleInput(patch as never);          // vuelve a llamar setInputState con payload plano
  game.setInputState({                  // esta sí funciona
    axes: { moveX: patch.moveX ?? 0, moveY: patch.moveY ?? 0 },
    actions: patch.shoot ? new Set(["shoot"]) : new Set(),
  });
}, [game, handleInput]);
```

`handleInput` de `useGame` llama a `game.setInputState(input)` si existe (`packages/react-native/src/hooks/useGame.ts:201-210`). Es decir, la primera llamada es un no-op y la segunda es la que mantiene vivo el touch. El teclado solo ejecuta la primera (sin el adaptador de la pantalla).

**Impacto**

En web, WASD/flechas/Espacio no mueven ni disparan. El jugador solo puede usar touch (si la plataforma lo permite), y aun así el movimiento no se ve por P0-01. La instrucción de la pantalla ("WASD / arrows: move · Space: fire continuously") es falsa.

**Reproducción**

```ts
game.setInputState({ moveX: 1, moveY: -1, shoot: true } as never);
game.update(1 / 60);
// Velocity: { vx: 0, vy: 0 }; sin balas

game.setInputState({ axes: { moveX: 1, moveY: -1 }, actions: new Set(["shoot"]) });
game.update(1 / 60);
// Velocity: { vx: 300, vy: -300 }; 1 bala
```

**Causa raíz**

El hook compartido usa un contrato legacy "flat" que otros juegos interpretan en sus propios `setInputState`. Vertical Shmup adoptó el contrato canónico `axes/actions` sin adaptar el hook ni la pantalla. El cast `patch as never` oculta el desajuste al compilador.

**Fix recomendado**

**Opción A (mínima):** adaptador en la pantalla, usando el tercer parámetro `onInput` que el hook ya ofrece:

```ts
useKeyboardControls(game, isReady, (payload) => {
  if (!game) return;
  const axes: { moveX?: number; moveY?: number } = {};
  if (typeof payload.moveX === "number") axes.moveX = payload.moveX;
  if (typeof payload.moveY === "number") axes.moveY = payload.moveY;
  if (Object.keys(axes).length > 0) game.setInputState({ axes });
  if (typeof payload.shoot === "boolean") {
    game.setInputState({ actions: payload.shoot ? new Set(["shoot"]) : new Set() });
  }
});
```

**Opción B (robusta):** ampliar `setInputState` para aceptar también el payload plano y fusionar campo a campo, sin resetear ejes no informados:

```ts
type ShmupInputPatch = Partial<ShmupInputState> & {
  moveX?: number; moveY?: number; shoot?: boolean;
};

public setInputState(input: ShmupInputPatch): void {
  ...
  if (input.axes?.moveX !== undefined || input.moveX !== undefined) {
    i.axes.moveX = input.axes?.moveX ?? input.moveX!;
  }
  if (input.axes?.moveY !== undefined || input.moveY !== undefined) {
    i.axes.moveY = input.axes?.moveY ?? input.moveY!;
  }
  if (input.actions) i.actions = input.actions;
  else if (input.shoot !== undefined) {
    i.actions = input.shoot ? new Set(["shoot"]) : new Set();
  }
}
```

**Opción C (modernización):** migrar a `useCanonicalInputControls` (`src/hooks/useCanonicalInputControls.ts`), que ya existe pero no se usa en ningún juego. Requiere definir `BindingSet` y un `translateToGameInput`.

Recomendación: **A + B** para cerrar el bug ya, y **C** como evolución. Eliminar `handleInput(patch as never)` y el cast.

**Criterios de aceptación**

- [ ] Mantener `ArrowRight`/`KeyD` 10 ticks cambia `Transform.x` y `worldX`.
- [ ] Mantener `Space` 60 ticks genera ≥7 balas (cooldown 120 ms).
- [ ] Soltar `Space` deja de generar balas tras el cooldown.
- [ ] Teclado y touch funcionan a la vez sin pelearse.
- [ ] Sin casts `as never` en la ruta de entrada.
- [ ] Test de integración que simule el payload del hook y compruebe movimiento/disparo.

---

### P1-01 — La muerte no termina la partida: VFX repetidos y jugador que sigue disparando

| Campo | Valor |
|---|---|
| **Severidad** | P1 |
| **Tipo** | Ciclo de vida / game rules |
| **Archivos** | `src/games/vertical-shmup/systems/ShmupCollisionSystem.ts:46-64`; `src/games/vertical-shmup/systems/ShmupInputSystem.ts:17-91`; `src/games/vertical-shmup/systems/BulletPatternSystem.ts:8-27`; `packages/core/src/runtime/BaseGame.ts:409-413` |
| **Estado** | Confirmado con sondeo headless |

**Evidencia**

Cuando `Health.current <= 0`, `ShmupCollisionSystem` hace:

```ts
if (health.current <= 0) {
  const transform = world.getComponent(entity, "Transform");
  if (transform) {
    spawnLayeredExplosion(world, transform.x, transform.y, { type: "ship" });
    Juice.playDeathJuice(world, entity, { ... });
  }
  world.mutateSingleton("ShmupGameState", (state) => {
    state.isGameOver = true;
  });
}
```

No elimina al jugador, no lo marca como `Dead`, no desactiva `Input`, no emite `game:over` y no comprueba si ya estaba en game over. Como el jugador sigue en la query, el bloque se ejecuta **cada tick**. Sondeo:

```text
PROBE2 death renders 25 -> 31   gameOver true   lives 0   playerAlive true
PROBE2 dead player fires 8 -> 9
```

Es decir: +6 entidades de render en 3 ticks (dos capas de explosión por tick), el jugador sigue vivo y sigue creando balas.

**Impacto**

- Efectos de explosión y `Juice` acumulados indefinidamente: crecimiento de entidades/animaciones y ruido visual.
- El jugador muerto sigue moviéndose y disparando; la partida no se detiene.
- `ShmupSpawnSystem` sí deja de spawnear (`:13`), pero `BulletPatternSystem`, `EnemyPathSystem` y `ShmupInputSystem` siguen activos.
- `BaseGame` escucha `game:over` para transicionar el kernel (`BaseGame.ts:409-413`), pero nadie lo emite. El kernel se queda en `PLAYING`.
- No hay forma de reiniciar desde la UI; el jugador queda en un estado zombi.

**Reproducción**

```ts
const player = world.query("ShmupPlayer")[0]!;
world.mutateComponent(player, "Health", h => { h.current = 0; });
const before = world.query("Render").length;
for (let i = 0; i < 3; i++) game.update(1 / 60);
const after = world.query("Render").length;
// after > before; hasEntity(player) === true; getGameState().isGameOver === true
```

**Causa raíz**

La muerte se trata como un efecto, no como una transición de estado. Falta una guarda de idempotencia y un estado terminal que desactive la simulación del jugador.

**Fix recomendado**

1. Introducir una guarda de estado y emitir el evento una sola vez:

```ts
let justDied = false;
world.mutateSingleton("ShmupGameState", (state) => {
  if (!state.isGameOver) {
    state.isGameOver = true;
    state.lives = 0;
    justDied = true;
  }
});

if (justDied) {
  const t = world.getComponent(entity, "Transform");
  if (t) spawnLayeredExplosion(world, t.x, t.y, { type: "ship" });
  Juice.playDeathJuice(world, entity, { ... });
  world.getEventBus()?.emitDeferred("game:over", {
    state: { score: world.getSingleton("ShmupGameState")?.score ?? 0 },
  });
  world.getEventBus()?.emitDeferred("PlaySFX", { name: "game_over" });
}
```

2. Desactivar al jugador: `WorldUtils.removeOrReclaim(world, entity)` o añadir `Dead` y hacer que `ShmupInputSystem`/`BulletPatternSystem` ignoren el estado terminal.
3. `ShmupInputSystem`, `EnemyPathSystem` y `ShmupBulletPatternSystem` deben consultar `ShmupGameState.isGameOver` (o un `GamePhase`) y salir temprano.
4. La UI debe mostrar el overlay y ofrecer reinicio (ver P1-03).

**Criterios de aceptación**

- [ ] Al morir, se crea **una** explosión (no una por tick).
- [ ] El jugador no dispara ni se mueve tras la muerte.
- [ ] `game:over` se emite exactamente una vez con `score`.
- [ ] `ShmupGameState.isGameOver === true` y `lives === 0`.
- [ ] El número de entidades de render se estabiliza tras la muerte.
- [ ] Reiniciar la partida vuelve a un estado limpio.

---

### P1-02 — Varios impactos en el mismo tick saltan la invulnerabilidad

| Campo | Valor |
|---|---|
| **Severidad** | P1 |
| **Tipo** | Orden de sistemas / combate |
| **Archivos** | `src/games/vertical-shmup/systems/ShmupCollisionSystem.ts:9-24`; `packages/gameplay-kit/src/combat/systems/CombatSystem.ts:113-147`; `packages/core/src/ecs/Schedule.ts:221-224` |
| **Estado** | Confirmado con sondeo headless |

**Evidencia**

`CombatSystem` aplica el daño en la fase Collision y emite `combat:hit` de forma diferida. `ShmupCollisionSystem` se suscribe en el primer `update` y, al recibir el evento, pone `invulnerableRemaining = 1.5`:

```ts
world.getEventBus()?.on("combat:hit", (event) => {
  const player = world.getComponent(event.targetEntity, "ShmupPlayer");
  if (player) {
    world.mutateComponent(event.targetEntity, "Health", h => {
      h.invulnerableRemaining = 1.5;
    });
    ...
  }
});
```

Pero `Schedule.update` vacía los eventos diferidos **al final** del tick (`Schedule.ts:221-224`). Si dos balas enemigas impactan en el mismo tick, ambas pasan la comprobación de invulnerabilidad de `CombatSystem` (`invulnerableRemaining === 0`) antes de que el handler la active. Sondeo con dos balas en la misma posición:

```text
PROBE2 double hit hp 3 -> 1
```

Tres balas llevarían la salud a 0; el jugador puede morir de un solo tick.

**Impacto**

- La invulnerabilidad de 1.5 s no protege contra fuego concentrado.
- La dificultad es injusta y dependiente del framerate/agrupación de colisiones.
- En oleadas densas, un solo tick puede matar al jugador.

**Reproducción**

```ts
const player = world.query("ShmupPlayer")[0]!;
const t = world.getComponent(player, "Transform")!;
createEnemyBullet(world, t.worldX, t.worldY, 0, 0, enemyPool);
createEnemyBullet(world, t.worldX, t.worldY, 0, 0, enemyPool);
game.update(1 / 60);
// Health.current === 1 (no 2)
```

**Causa raíz**

La invulnerabilidad se activa en un evento diferido, después de que `CombatSystem` ya haya aplicado todo el daño del tick. El handler no puede prevenir los impactos simultáneos.

**Fix recomendado**

Opciones, de menor a mayor invasividad:

1. **Sistema de daño dedicado para el jugador** en `SystemPhase.Collision` con prioridad anterior a `CombatSystem`: detecta colisiones del jugador, si `invulnerableRemaining === 0` aplica **un** punto de daño, activa la invulnerabilidad y marca las balas para consumo. `CombatSystem` se salta al jugador porque ya está invulnerable.
2. **Añadir un cooldown de daño por entidad** en `CombatSystem` (`invulnerableRemaining` ya existe; el problema es el orden). Un `justDamagedThisTick`/`lastHitTick` en el componente `Health` permitiría a `CombatSystem` ignorar impactos adicionales del mismo tick.
3. **Mover la lógica de daño del jugador fuera de `CombatSystem`**: que las balas enemigas no tengan `Damage` y que un `ShmupPlayerDamageSystem` procese `CollisionEvents` una vez por tick con invulnerabilidad.

Recomendación: opción 1 o 2, con test de N balas simultáneas. La opción 3 es la más limpia a largo plazo si se quiere control total del game feel.

**Criterios de aceptación**

- [ ] 1 bala → −1 de salud.
- [ ] 2 balas en el mismo tick → −1 de salud.
- [ ] 5 balas en el mismo tick → −1 de salud.
- [ ] `invulnerableRemaining` queda en 1.5 tras el primer impacto.
- [ ] Durante la invulnerabilidad, cualquier impacto adicional no resta salud.
- [ ] Test unitario con 1, 2 y 5 balas.

---

### P1-03 — Sin pausa, game over ni reinicio en la UI

| Campo | Valor |
|---|---|
| **Severidad** | P1 |
| **Tipo** | UX / ciclo de vida |
| **Archivos** | `src/app/vertical-shmup/index.tsx:55-99`; `src/components/ui/GameLayoutShell.tsx:6-27`; `packages/core/src/runtime/BaseGame.ts:79-81,576-599`; `packages/react-native/src/hooks/useGame.ts:212-225` |
| **Estado** | Confirmado por lectura de código |

**Evidencia**

`GameLayoutShell` ofrece `topRightSlot` y `overlaySlot` para pausa/game over, pero la pantalla del shmup solo pasa `topLeftSlot`, `centerHudSlot`, `canvasSlot`, `controlsSlot` y `debugSlot` (`index.tsx:58-96`). No hay botón de pausa ni overlay.

`BaseGame` declara `pauseKey` y `restartKey` (`:79-81`), pero no hay ningún binding en el repo que los use (solo la declaración). `useGame` expone `togglePause` y `restart` (`:212-225`), pero la pantalla no los consume. `BaseGame.pause()` sí setea `IsPaused` (`:576-580`), y los sistemas lo respetan, pero nadie lo llama.

**Impacto**

- No se puede pausar con Escape ni con un botón.
- Al morir no hay pantalla de game over, puntuación final ni opción de reintentar.
- El estado zombi de P1-01 queda sin salida salvo volver al menú.
- La instrucción de la pantalla no menciona pausa porque no existe.

**Reproducción**

1. Abrir `/vertical-shmup` y empezar.
2. Pulsar Escape: no ocurre nada.
3. Forzar `health.current = 0` desde consola: el HUD muestra 0 vidas, pero no hay overlay ni reinicio.
4. Pulsar R: no ocurre nada.

**Causa raíz**

La pantalla se implementó como prototipo de canvas + HUD, sin conectar el ciclo de vida que `BaseGame`/`useGame` ya ofrecen.

**Fix recomendado**

1. Añadir `topRightSlot` con un botón de pausa que llame a `togglePause`.
2. Añadir `overlaySlot` con dos estados:
   - **Pausa**: "PAUSA", botón reanudar, botón menú.
   - **Game over**: score, wave, botón reintentar (`game.restart()` o `restart(seed)`), botón menú.
3. Binding de teclado: Escape → pausa; R → reinicio cuando `isGameOver`.
4. Suscribirse a `game:over` (o a `gameState.isGameOver`) para abrir el overlay; no depender solo del HUD.
5. Reutilizar el patrón ya existente en `src/app/pong/index.tsx` y `src/app/arkanoid/index.tsx` (usan `overlaySlot` y `restart`).

**Criterios de aceptación**

- [ ] Escape pausa y reanuda; las posiciones no cambian mientras está pausado.
- [ ] El botón de pausa funciona en web y touch.
- [ ] Al morir aparece un overlay con score final.
- [ ] Reintentar reinicia la partida con estado limpio.
- [ ] R reinicia solo en game over.
- [ ] El botón "Menu" sigue funcionando.

---

### P1-04 — `Math.random()` en la creación de enemigos rompe el determinismo

| Campo | Valor |
|---|---|
| **Severidad** | P1 |
| **Tipo** | Determinismo / RNG |
| **Archivos** | `src/games/vertical-shmup/EntityFactory.ts:132-137`; `packages/core/src/ecs/World.ts` (`gameplayRandom`); `AGENTS.md` §2 |
| **Estado** | Confirmado por lectura de código |

**Evidencia**

```ts
add({
  type: "BulletPattern",
  config: patternConfig,
  cooldownRemaining: 0.8 + Math.random() * 0.5,
  phase: 0
});
```

Es la única llamada a `Math.random()` del módulo, pero es suficiente: el cooldown inicial de cada enemigo no depende de la semilla. Dos ejecuciones con la misma semilla y las mismas entradas producen patrones de disparo distintos.

**Impacto**

- Replays no reproducibles.
- Rollback/netcode: el servidor y el cliente pueden discrepar en el primer disparo de cada enemigo.
- Tests de determinismo/hash no pueden pasar de forma fiable.
- Viola explícitamente la regla de `world.gameplayRandom` de `AGENTS.md`.

**Reproducción**

```ts
const a = new VerticalShmupGame({ gameOptions: { seed: 123 } });
const b = new VerticalShmupGame({ gameOptions: { seed: 123 } });
await a.init(); await b.init();
// Comparar cooldownRemaining de los enemigos: difieren.
```

**Causa raíz**

Se usó `Math.random()` como atajo para variar el primer disparo, sin pasar por el RNG determinista.

**Fix recomendado**

```ts
cooldownRemaining: 0.8 + world.gameplayRandom.next() * 0.5,
```

`createEnemy` se llama desde `onEnter` dentro de `runWithUnlockedRandomAndMutators` y desde `ShmupSpawnSystem` durante un tick (el `Schedule` desbloquea el RNG). Si en el futuro se llamara con el RNG bloqueado, usar una fórmula determinista basada en `wave`, `x` e índice:

```ts
cooldownRemaining: 0.8 + ((wave * 37 + Math.floor(x)) % 50) / 100,
```

Añadir un guard/CI que prohíba `Math.random()` en `src/games/**` (el `check-game-patterns` actual no lo detecta).

**Criterios de aceptación**

- [ ] `grep -R "Math.random" src/games/vertical-shmup` no devuelve nada.
- [ ] Dos partidas con la misma semilla y las mismas entradas producen el mismo `hash()` tras 300 ticks.
- [ ] El primer disparo de cada enemigo es reproducible.
- [ ] Guard de CI que detecte `Math.random()` en código de gameplay.

---

### P1-05 — `Set<string>` dentro de un componente rompe snapshots, hash y clone-on-write

| Campo | Valor |
|---|---|
| **Severidad** | P1 |
| **Tipo** | Serialización / determinismo / dev-prod divergence |
| **Archivos** | `src/games/vertical-shmup/types/ShmupTypes.ts:8-9`; `src/games/vertical-shmup/VerticalShmupGame.ts:38-45`; `packages/core/src/ecs/ComponentCloner.ts:9-13,29-44`; `packages/core/src/ecs/World.ts:591-604`; `packages/core/src/snapshots/SnapshotSerializer.ts:76`; `packages/core/src/snapshots/SnapshotHash.ts:184-193` |
| **Estado** | Confirmado con sondeo headless |

**Evidencia**

`ShmupInputComponent.actions` es un `Set<string>`:

```ts
export interface ShmupInputComponent extends Component {
  type: "Input";
  axes: Record<string, number>;
  actions: Set<string>;
  shootCooldownRemaining: number;
}
```

`ComponentCloner` documenta que **no** clona `Set`:

```ts
// ComponentCloner.ts:12
* - Special types: Does not correctly clone Map, Set, Date, TypedArrays, or other built-in objects.
```

Y su implementación recorre `for...in` sobre un objeto plano; un `Set` no tiene propiedades enumerables, así que devuelve `{}`:

```ts
const clone = {} as Record<string, unknown>;
for (const key in component) {
  if (Object.prototype.hasOwnProperty.call(component, key)) {
    clone[key] = this.cloneComponent(component[key]);
  }
}
return clone;
```

En desarrollo, `World.getComponent` congela el componente (`World.ts:537-538`), y `getMutableComponent` lo clona si está congelado (`:596-599`). `ShmupInputSystem` lee `Input` con `getComponent` (`:18`) y luego lo muta con `mutateComponent` (`:86-90`) en cada tick. Resultado del sondeo tras 30 ticks:

```text
PROBE actions after ticks isSet false {}
```

Es decir, el `Set` se convierte en `{}` en el primer tick. `hasAction` deja de funcionar (`actions instanceof Set` es falso), y el disparo por acciones solo dura un tick. En producción no hay congelación, así que el `Set` sobrevive, pero snapshots y rollback siguen rotos. Además, `SnapshotHash.hashValue` trata un `Set` como objeto sin claves, así que el contenido de `actions` **no contribuye al hash**.

**Impacto**

- **Dev vs prod**: en dev, mantener Space o el botón de disparo basado en `actions` produce un solo disparo; en prod, continuo. Comportamiento no reproducible.
- **Snapshots**: `snapshot()`/`restore()` pierde las acciones; tras un rollback, el jugador deja de disparar.
- **Hash**: dos estados con acciones distintas pueden producir el mismo hash, invalidando la verificación de determinismo.
- **Red**: cualquier serialización de `Input` pierde el `Set`.

**Reproducción**

```ts
game.setInputState({ axes: { moveX: 0, moveY: 0 }, actions: new Set(["shoot"]) });
game.update(1 / 60);
const input = world.getComponent(player, "Input")!;
// input.actions instanceof Set === false; JSON.stringify(input.actions) === "{}"
```

**Causa raíz**

Se eligió `Set` por comodidad para representar acciones, sin tener en cuenta que los componentes ECS deben ser datos serializables y clonables por `ComponentCloner`.

**Fix recomendado**

Sustituir el `Set` por datos primitivos en el componente:

```ts
export interface ShmupInputComponent extends Component {
  type: "Input";
  axes: Record<string, number>;
  shootHeld: boolean;
  shootCooldownRemaining: number;
}
```

Mantener `Set` solo en el DTO transitorio de entrada (`ShmupInputState`) si se quiere compatibilidad con el contrato actual, y convertirlo a booleano en `setInputState`:

```ts
if (input.actions) i.shootHeld = input.actions.has("shoot");
```

Alternativa: bitmask numérico (`actionsMask: number`) si se prevén más acciones.

**Criterios de aceptación**

- [ ] Ningún componente serializable contiene `Set`, `Map`, `Date` ni `TypedArray`.
- [ ] `snapshot()` + `restore()` preserva `shootHeld`.
- [ ] Tras restaurar, mantener el disparo sigue generando balas.
- [ ] `hash()` cambia si `shootHeld` cambia.
- [ ] Test de round-trip de snapshot para `Input`.
- [ ] En dev, mantener Space 60 ticks genera ≥7 balas.

---

### P2-01 — Los cuerpos enemigos no tienen `Damage`: embestir es inofensivo

| Campo | Valor |
|---|---|
| **Severidad** | P2 |
| **Tipo** | Jugabilidad / combate |
| **Archivos** | `src/games/vertical-shmup/EntityFactory.ts:101-120`; `packages/gameplay-kit/src/combat/systems/CombatSystem.ts:78-100` |
| **Estado** | Confirmado por lectura de código |

**Evidencia**

El enemigo tiene `Collider`, `CollisionEvents`, `Health` y `Faction`, pero **no** `Damage`:

```ts
add({
  type: "Collider",
  shape: { type: ShapeType.Circle, radius: c.ENEMY_COLLIDER_RADIUS },
  layer: CollisionLayers.ENEMY,
  mask: CollisionLayers.PLAYER | CollisionLayers.PROJECTILE,
  ...
});
...
add({ type: "ShmupEnemy", score: scaledScore });
add({ type: "Health", current: scaledHp, max: scaledHp });
add({ type: "Faction", faction: "enemy", value: "enemy" });
```

`CombatSystem.resolveDamageDirection` exige `Damage` en el atacante y `Health` en el objetivo:

```ts
const damageComp = world.getComponent(attacker, "Damage");
const healthComp = world.getComponent(target, "Health");
if (!damageComp || !healthComp) return;
```

El jugador tampoco tiene `Damage`, así que la colisión cuerpo a cuerpo no hace nada en ninguna dirección.

**Impacto**

- Un enemigo puede atravesar al jugador sin consecuencias.
- El diseño de shmup espera que embestir sea letal o al menos dañino; la única fuente de daño son las balas.
- Una vez corregido P0-01, el jugador podrá matar enemigos con balas, pero seguirá siendo invulnerable al contacto.

**Reproducción**

```ts
// Colocar un enemigo encima del jugador y avanzar un tick
createEnemy(world, playerX, playerY, "straight", 1);
game.update(1 / 60);
// Health.current del jugador no cambia
```

**Causa raíz**

Se asumió que `Collider` + `Faction` bastaban para el daño por contacto, pero `CombatSystem` requiere `Damage` en el atacante.

**Fix recomendado**

Añadir `Damage` al enemigo:

```ts
add({
  type: "Damage",
  amount: 1,
  category: "shmup_enemy_contact",
  friendlyFire: false,
  consumption: "none",
});
```

Y asegurarse de que la invulnerabilidad se aplica antes de que `CombatSystem` procese múltiples contactos (ver P1-02). Alternativa: un `ShmupContactDamageSystem` dedicado en `SystemPhase.Collision` que aplique daño una vez por tick y empuje al jugador.

**Criterios de aceptación**

- [ ] Un enemigo que solapa al jugador resta 1 de salud.
- [ ] El impacto activa 1.5 s de invulnerabilidad.
- [ ] Durante la invulnerabilidad, el contacto no resta salud.
- [ ] El enemigo se destruye o se empuja tras el impacto (definir comportamiento).
- [ ] Test de contacto enemigo-jugador.

---

### P2-02 — Contrato de configuración: claves, unidades, claves muertas y carga duplicada

| Campo | Valor |
|---|---|
| **Severidad** | P2 |
| **Tipo** | Configuración / mantenibilidad |
| **Archivos** | `src/games/vertical-shmup/types/ShmupConfigSchema.ts:3-34`; `src/games/vertical-shmup/config/vertical-shmup.json`; `src/games/vertical-shmup/VerticalShmupGame.ts:19-32`; `src/games/vertical-shmup/EntityFactory.ts:52` |
| **Estado** | Confirmado por lectura de código |

**Evidencia**

1. **Carga duplicada y `rawConfig` ignorado**:

```ts
// constructor, :20
const loaded = ConfigService.load("vertical-shmup", ShmupConfigSchema,
  config.gameOptions?.rawConfig ?? configRaw);

// onRegisterSystems, :27
this.config = loadAndMutateConfig(this.gameId, ShmupConfigSchema, configRaw, this._config.gameOptions);
```

La segunda carga usa `configRaw` y descarta el `rawConfig` que el llamador haya pasado. El resultado es que una config personalizada se valida en el constructor y luego se sobrescribe con el JSON del módulo. Galaxian lo hace bien (`GalaxianGame.ts:52,88` usa `this._config.gameOptions?.rawConfig ?? ...`).

2. **Claves muertas**: `COUNTDOWN`, `KEY_LEFT`, `KEY_RIGHT`, `KEY_UP`, `KEY_DOWN`, `KEY_SHOOT` no se leen en ningún sitio.

3. **Unidades mezcladas**: `PLAYER_SHOOT_COOLDOWN` en ms (se divide entre 1000), `PLAYER_BULLET_TTL`/`ENEMY_BULLET_TTL` en segundos, `MUZZLE_FLASH_FRAMES` en frames, `RETROCOIL_PX` en px. Los nombres no siempre lo indican.

4. **Fallback inconsistente**: `EntityFactory.ts:52` usa `c.ENEMY_BULLET_SPEED ?? 250`, pero el schema/JSON definen 220. `createEnemyBullet` usa `ENEMY_BULLET_SIZE ?? 4`, mientras el visual Skia usa fallback 5.

5. **Duplicación schema/JSON**: los defaults están en ambos sitios; pueden divergir.

**Impacto**

- Overrides de config (tests, campaña, dificultad) no funcionan.
- Claves muertas confunden a quien evoluciona el juego.
- Unidades ambiguas propician bugs de cadencia/duración.
- Fallbacks inconsistentes producen comportamientos distintos si falta el recurso.

**Reproducción**

```ts
const game = new VerticalShmupGame({ gameOptions: { rawConfig: { PLAYER_SPEED: 999 } } });
await game.init();
game.getWorld().getResource("GameConfig").PLAYER_SPEED; // 300, no 999
```

**Causa raíz**

Dos rutas de carga con propósitos solapados y un esquema que creció por acumulación.

**Fix recomendado**

1. Una sola carga en `onRegisterSystems`:

```ts
this.config = loadAndMutateConfig(
  this.gameId,
  ShmupConfigSchema,
  this._config.gameOptions?.rawConfig ?? configRaw,
  this._config.gameOptions,
);
```

2. Eliminar `COUNTDOWN` y `KEY_*` o implementarlos.
3. Renombrar con unidades explícitas (`shootCooldownMs`, `bulletTtlSec`, `recoilPx`) o documentar la unidad en el schema con `.describe()`.
4. Alinear fallbacks con los defaults (220, 4).
5. Añadir un test que compare `DEFAULT_SHMUP_CONFIG` con el JSON.

**Criterios de aceptación**

- [ ] `rawConfig` se respeta tras `init()`.
- [ ] No hay claves de config sin consumidor.
- [ ] Las unidades están documentadas y son consistentes.
- [ ] Los fallbacks coinciden con los defaults.
- [ ] Test de paridad schema/JSON.

---

### P2-03 — Mutadores (`extra_life`, `shmup_speed`) no integrados

| Campo | Valor |
|---|---|
| **Severidad** | P2 |
| **Tipo** | Meta-progresión / integración |
| **Archivos** | `src/utils/MutatorRegistry.ts:161-212`; `src/games/vertical-shmup/VerticalShmupGame.ts:77-80`; `src/hooks/useVerticalShmupGame.ts:10-17` |
| **Estado** | Confirmado por lectura de código |

**Evidencia**

`extra_life` espera tres cosas que el shmup no tiene:

```ts
// config
if (typeof newConfig.PLAYER_INITIAL_LIVES === "number") newConfig.PLAYER_INITIAL_LIVES += 1;
// singleton
const gameState = mWorld.getSingleton("GameState");
// query
const players = mWorld.query("Player", "Health");
```

El shmup usa `ShmupGameState`, `ShmupPlayer` y no define `PLAYER_INITIAL_LIVES`. `canDraft` también consulta `Player`, así que ni siquiera se ofrece el mutador.

`shmup_speed` se registra como hook:

```ts
registerMutatorHook("shmup_speed", (world) => {
  const state = world.getSingleton("ShmupGameState");
  if (state) state.wave += 1;
});
```

Pero ningún mutador de `BENEFICIAL_MUTATORS` llama a `runMutatorHooks(world, "shmup_speed")`; el hook nunca se ejecuta y, además, mutar `wave` en un hook no es una mejora de velocidad. `useVerticalShmupGame` pasa `activeMutators: []` fijo, así que la pantalla no recibe mutadores.

**Impacto**

- La progresión meta (vidas extra, velocidad, etc.) no tiene efecto en el shmup.
- El jugador puede gastar XP en mutadores que no funcionan.
- El hook `shmup_speed` es código muerto que sugiere una funcionalidad inexistente.

**Reproducción**

Aplicar `extra_life` al world del shmup: `Health.current` del jugador no cambia y `ShmupGameState.lives` sigue en 3.

**Causa raíz**

El registro de mutadores se diseñó con contratos de otros juegos (`Player`, `GameState`, `PLAYER_INITIAL_LIVES`) y el shmup no los adoptó.

**Fix recomendado**

1. Añadir el tag `Player` al jugador (además de `ShmupPlayer`):

```ts
world.addComponent(e, { type: "Player" });
```

Así `extra_life` encuentra `query("Player", "Health")` y suma salud. También conviene añadir `PLAYER_INITIAL_LIVES` al schema y usarlo al crear el jugador.
2. Para `GameState`, evitar duplicar estado: adaptar `extra_life` con un hook específico de shmup que lea `ShmupGameState`, o registrar un alias controlado. No crear dos fuentes de verdad.
3. Implementar `shmup_speed` como mutador real (multiplicar `ENEMY_SPEED`/`SCROLL_SPEED`) o eliminarlo.
4. Pasar los mutadores activos desde `useVerticalShmupGame` (parámetro `options`) en lugar de `[]`.

**Criterios de aceptación**

- [ ] `extra_life` aumenta la salud/vidas del jugador del shmup.
- [ ] El mutador aparece en el draft del shmup solo si está soportado.
- [ ] `shmup_speed` tiene efecto real o se elimina.
- [ ] `useVerticalShmupGame` acepta mutadores.
- [ ] Test de aplicación de `extra_life`.

---

### P2-04 — Oleadas: parte del escuadrón aparece fuera del boundary y se destruye al instante

| Campo | Valor |
|---|---|
| **Severidad** | P2 |
| **Tipo** | Diseño de oleadas / spawn |
| **Archivos** | `src/games/vertical-shmup/systems/ShmupSpawnSystem.ts:19-38`; `src/games/vertical-shmup/EntityFactory.ts:122-131`; `packages/core/src/physics/systems/BoundarySystem.ts:41-62` |
| **Estado** | Confirmado por cálculo y lectura de código |

**Evidencia**

En la transición de oleada:

```ts
const squadCount = Math.min(6, 4 + Math.floor(nextWave / 2));
for (let i = 0; i < squadCount; i++) {
  const startY = -40 - i * 45;
  createEnemy(world, startX, startY, kind, nextWave);
}
```

El boundary del enemigo tiene:

```ts
minY: -c.OFFSCREEN_MARGIN * 2, // -160 con OFFSCREEN_MARGIN=80
maxY: c.WORLD_HEIGHT + c.OFFSCREEN_MARGIN,
```

Para `i=3`, `startY = -175 < -160`; para `i=4`, `-220`; para `i=5`, `-265`. `BoundarySystem` los reclama en cuanto se actualizan (`y < minY`, modo `destroy`). Por tanto:

- Oleada 2 (`squadCount=5`): sobreviven 3 (i=0,1,2).
- Oleada 4+ (`squadCount=6`): sobreviven 3.
- El escuadrón nunca supera los 3 enemigos, aunque el cálculo pretenda 5-6.

**Impacto**

- Dificultad estancada y menor de la diseñada.
- La curva de oleadas se aplana.
- El `maxEnemies` y el spawn por intervalo no compensan la pérdida.

**Reproducción**

```ts
// Vaciar enemigos para forzar transición de oleada
for (const e of world.query("ShmupEnemy")) world.reclaimEntity(e);
world.getCommandBuffer().flush(world);
game.update(1 / 60);
// Contar enemigos tras el flush del command buffer:
// se crean 5, pero 2 quedan fuera del boundary y se destruyen al tick siguiente.
```

**Causa raíz**

El offset de spawn (`-40 - i*45`) no se validó contra `minY` del boundary. Además, la condición de avance de oleada no distingue entre enemigos eliminados por el jugador y enemigos que escaparon.

**Fix recomendado**

1. Mantener el escuadrón dentro de la banda segura:

```ts
const startY = -20 - (i % 4) * 30; // -20, -50, -80, -110
```

o ampliar `minY` a `-OFFSCREEN_MARGIN * 4` si se quieren formaciones más profundas.
2. Separar "oleada completada" de "todos los enemigos fuera de pantalla": trackear `kills` y `escapes`, y decidir si escapar penaliza.
3. Revisar `maxEnemies` y el spawn por intervalo tras corregir el tamaño real del escuadrón.
4. En `ShmupSpawnSystem`, releer el singleton después de `mutateSingleton` para evitar el retraso de un tick en dev (ver P3-01).

**Criterios de aceptación**

- [ ] La oleada 2 crea y mantiene 5 enemigos.
- [ ] La oleada 4+ crea y mantiene 6.
- [ ] Ningún enemigo se destruye en el tick de spawn por estar fuera del boundary.
- [ ] La transición de oleada no ocurre por enemigos que escapan sin penalización (o la regla está documentada).
- [ ] Test de conteo de escuadrón por oleada.

---

### P2-05 — Game feel y rendimiento: shake inerte, sin partículas, hit flash no renderizado, starfield con allocations

| Campo | Valor |
|---|---|
| **Severidad** | P2 |
| **Tipo** | Render / rendimiento / game feel |
| **Archivos** | `src/games/vertical-shmup/scenes/ShmupGameScene.ts:68-70`; `src/games/vertical-shmup/rendering/ShmupVisualHelpers.ts:16-132`; `src/games/vertical-shmup/rendering/ShmupCanvasVisuals.ts:58-60,195-210`; `src/games/vertical-shmup/rendering/ShmupSkiaVisuals.ts:190-211`; `src/games/shared/rendering/SharedVFX.ts:424-456`; `packages/core/src/utils/Juice.ts:55-95` |
| **Estado** | Confirmado por lectura de código |

**Evidencia**

1. **Shake inerte**: `Juice.shake` busca un singleton `ScreenShake`, luego un recurso, luego `GameState`. El shmup no crea ninguno de los tres. Además, `ShmupGameScene` no registra `ScreenShakeSystem`, que es el que aplica el offset a la cámara. Todos los `shakeIntensity` de `Juice.playHitJuice`, `playDeathJuice` y `spawnLayeredExplosion` son no-ops.

2. **Sin partículas**: `SharedVFX` solo crea la capa de partículas si existe `world.getResource("ParticlePool")` (`SharedVFX.ts:424`). El shmup no lo registra, así que las explosiones se quedan en flash + shockwave.

3. **Hit flash no renderizado**: `ShmupCollisionSystem` pone `render.hitFlashFrames = 10`, pero ni `ShmupCanvasVisuals` ni `ShmupSkiaVisuals` leen ese campo. No hay feedback de impacto en el sprite.

4. **Allocations por frame**:
   - `computeShmupStarfield` crea un array y 80 objetos por frame (`ShmupVisualHelpers.ts:108-129`).
   - `resolveShmupPlayerDrawContext`/`resolveShmupEnemyDrawContext`/`resolveShmupBulletDrawContext` crean un objeto por entidad por frame.
   - `tickBulletPattern` devuelve un objeto nuevo por enemigo por tick.
   - `computeBulletPatternAngles` crea arrays por disparo.

5. **Tiempo hardcodeado**: `const time = world.tick * 0.016` en tres helpers. Si el tick no es exactamente 60 Hz, la animación se acelera o desacelera. En tests con `dt=0.5`, el tiempo visual no coincide.

6. **Paridad Canvas/Skia**: Canvas usa `shadowBlur`/`shadowColor` para el glow del jugador, enemigo y balas; Skia no aplica blur ni glow equivalente. El test de rendering solo comprueba que se registran los shapes, no que se vean igual.

**Impacto**

- Los impactos y muertes se sienten "planos": sin shake, sin partículas, sin flash.
- Presión de GC evitable en un juego de 60 fps.
- Animaciones dependientes del framerate.
- Divergencia visual entre web (Canvas) y nativo (Skia).

**Reproducción**

- Forzar un impacto y comprobar que la cámara no se mueve.
- Contar allocations con el profiler durante 10 s de juego.
- Comparar una captura Canvas y Skia del jugador: Canvas tiene halo, Skia no.

**Causa raíz**

El módulo se centró en los visuales base y no conectó los servicios de juice del core.

**Fix recomendado**

1. Registrar `ScreenShakeSystem` y crear el componente `ScreenShake` en la cámara:

```ts
this.world.addSystem(new ScreenShakeSystem(), { phase: SystemPhase.Presentation });
this.world.addComponent(cam, { type: "ScreenShake", intensity: 0, duration: 0, remaining: 0 });
```

2. Registrar un `ParticlePool` (o reutilizar el compartido) para que `SharedVFX` cree partículas.
3. Renderizar `hitFlashFrames`: en el draw, si `render.hitFlashFrames > 0`, usar blanco/alfa o un contorno; decrementar en `RenderUpdateSystem` o en un sistema de presentación.
4. Cachear el starfield: calcular posiciones una vez por tick en un sistema/recurso y dibujar desde ahí; usar arrays tipados si hace falta.
5. Reutilizar contextos de dibujo (mutar un objeto en lugar de crear uno por entidad/frame) o medir si el GC es aceptable.
6. Usar un acumulador de tiempo real (`world.tick / 60` o un `elapsedTime` del core) en lugar de `0.016`.
7. Definir una checklist de paridad Canvas/Skia (glow, antialias, formas) y un test visual/snapshot.

**Criterios de aceptación**

- [ ] La cámara se sacude en impactos y muertes.
- [ ] Las explosiones incluyen partículas.
- [ ] El hit flash es visible.
- [ ] El starfield no asigna objetos por frame (o el presupuesto de GC está medido y aceptado).
- [ ] Las animaciones usan tiempo real, no `tick * 0.016`.
- [ ] Canvas y Skia tienen paridad visual documentada.

---

### P2-06 — Higiene de entrada y capas de colisión

| Campo | Valor |
|---|---|
| **Severidad** | P2 |
| **Tipo** | Entrada / colisiones / mantenibilidad |
| **Archivos** | `src/games/vertical-shmup/systems/ShmupInputSystem.ts:14,30-45,56-70`; `src/games/vertical-shmup/EntityPool.ts:6-7`; `src/games/vertical-shmup/systems/BulletPatternSystem.ts:8-27`; `src/games/vertical-shmup/systems/EnemyPathSystem.ts:5-21` |
| **Estado** | Confirmado por lectura de código |

**Evidencia**

1. **`InputState` muerto**: `ShmupInputSystem` lee `world.getSingleton("InputState")`, pero nada en el shmup crea ese componente. La rama `inputState?.axes`/`buttons` siempre es `undefined`; el input real viene del componente `Input` y de `TouchInputState`.

2. **Precedencia ambigua**: `shooting = inputState?.buttons?.shoot ?? hasAction(input.actions)`. Si algún día existe `InputState` con `shoot:false`, las acciones canónicas se ignoran. Además, `hasAction` acepta `Set` o array, pero no un booleano/bitmask, lo que perpetúa el problema de P1-05.

3. **Clamping duplicado**: `ShmupInputSystem` clampea `transform.x/y` a `PLAYER_SIZE`/`WORLD_*`, y el jugador también tiene `Boundary` con `mode:"bounce"` y `bounceX/Y:false`. Hoy el boundary no hace nada para el jugador, pero la intención está duplicada y el clamp no marca `dirty`.

4. **Sistemas que siguen tras game over**: `EnemyPathSystem` y `ShmupBulletPatternSystem` no consultan `ShmupGameState.isGameOver`; siguen moviendo y disparando aunque la partida haya terminado. `ShmupInputSystem` tampoco.

5. **Capa de bala enemiga**: `EntityPool` asigna `layer: CollisionLayers.ENEMY` a las balas enemigas (`:6`). Funciona por la combinación actual de máscaras/facciones, pero es semánticamente incorrecto: una bala no es un enemigo. Si mañana se añade una capa `ENEMY_PROJECTILE` o se cambian máscaras, aparecerán colisiones inesperadas.

**Impacto**

- Código ramificado y difícil de razonar.
- Comportamiento post-game-over inconsistente.
- Deuda de capas que puede explotar al añadir jefes, escudos o armas.
- Clamps que no sincronizan el mundo (ver P0-01).

**Reproducción**

- Buscar `InputState` en el módulo: solo aparece la lectura, nunca la creación.
- Tras `isGameOver=true`, avanzar ticks: las balas enemigas siguen saliendo.

**Causa raíz**

Se copiaron fragmentos de otros juegos (`SpaceInvadersInputSystem`, `FlappyBirdInputSystem`) sin adaptar el modelo de entrada ni las capas.

**Fix recomendado**

1. Eliminar la lectura de `InputState` o crear el singleton de forma explícita si se quiere soportar el contrato legacy.
2. Unificar la entrada en un solo DTO (`moveX`, `moveY`, `shootHeld`) y una sola precedencia: touch > teclado > gamepad.
3. Eliminar el clamp manual o el `Boundary` del jugador; quedarse con uno y marcar `dirty`.
4. Añadir un guard temprano en todos los sistemas de gameplay:

```ts
const state = world.getSingleton("ShmupGameState");
if (state?.isGameOver) return;
```

5. Usar una capa dedicada para proyectiles enemigos o documentar por qué comparten `ENEMY`.

**Criterios de aceptación**

- [ ] No hay lecturas de componentes que nadie crea.
- [ ] Una sola fuente de verdad para el movimiento del jugador.
- [ ] Todos los sistemas de gameplay respetan game over.
- [ ] Las capas de colisión tienen una tabla documentada y un test de matriz.
- [ ] El clamp marca `dirty`.

---

### P3-01 — Código muerto, imports sin usar, casts y superficie de tipos

| Campo | Valor |
|---|---|
| **Severidad** | P3 |
| **Tipo** | Calidad / lint |
| **Archivos** | `src/games/vertical-shmup/EntityFactory.ts:1,8`; `src/games/vertical-shmup/systems/ShmupCollisionSystem.ts:8`; `src/games/vertical-shmup/EntityPool.ts:29`; `src/app/vertical-shmup/index.tsx:32`; `src/games/vertical-shmup/types/ShmupTypes.ts:17-19`; `src/games/vertical-shmup/VerticalShmupGame.ts:17,23` |
| **Estado** | Confirmado con ESLint |

**Evidencia**

ESLint devuelve 3 errores:

```text
EntityFactory.ts
  1:83  error  'createDeferredEntity' is defined but never used
  8:10  error  'attachEnemyDefaults' is defined but never used
ShmupCollisionSystem.ts
  8:68  error  'deltaTime' is defined but never used
```

Además:

- `EntityPool.ts:29` hace `as never` sobre la config del pool.
- `src/app/vertical-shmup/index.tsx:32` hace `handleInput(patch as never)`.
- `ShmupTypes.ts` registra `Damage`, `SpawnDirector`, `WaveMember`, `Combo`, `RemotePlayer`, `LocalPlayer` aunque varios no se usan.
- `VerticalShmupGame` crea `NetworkController` (`:17,23`) pero no lo usa.
- `ShmupCollisionSystem` guarda `private subscribed = false` como estado de sistema; es infraestructura, pero conviene moverlo a `onAttach`/`onDetach` si el core lo permite.

**Impacto**

- Ruido en CI y en revisiones.
- Casts que ocultan errores de contrato (el de input ya causó P0-03).
- Superficie de tipos que sugiere funcionalidades inexistentes.

**Fix recomendado**

- Eliminar imports muertos y el parámetro `deltaTime` (o renombrarlo `_deltaTime`).
- Sustituir `as never` por tipos correctos; en el pool, tipar `PrefabConfig` en lugar de castear.
- Recortar `ShmupComponentRegistry` a lo que se usa.
- Usar o eliminar `NetworkController`.
- Añadir ESLint al CI del módulo.

**Criterios de aceptación**

- [ ] `pnpm exec eslint src/games/vertical-shmup src/app/vertical-shmup` → 0 errores.
- [ ] Sin `as never` en la ruta de entrada/pool.
- [ ] Registro de componentes sin entradas muertas.
- [ ] `NetworkController` usado o eliminado.

---

### P3-02 — Eventos huérfanos y `NetworkController` sin uso

| Campo | Valor |
|---|---|
| **Severidad** | P3 |
| **Tipo** | Contratos / integración |
| **Archivos** | `src/games/vertical-shmup/systems/ShmupCollisionSystem.ts:41`; `src/games/vertical-shmup/systems/ShmupSpawnSystem.ts:26-27`; `src/games/vertical-shmup/VerticalShmupGame.ts:17,23` |
| **Estado** | Confirmado por búsqueda global |

**Evidencia**

- `shmup:kill` se emite pero no tiene consumidores fuera del módulo.
- `shmup:wave_complete` se emite pero no tiene consumidores.
- `combat:death` se emite desde `CombatSystem` y el shmup lo ignora; la muerte de enemigos se detecta por polling de `Health`.
- `game:over` no se emite (P1-01).
- `NetworkController` se instancia pero no se registra ningún flujo de snapshots/inputs.

**Impacto**

- Eventos que parecen parte de la API pero no hacen nada.
- La UI no puede reaccionar a kills/oleadas sin consultar el state.
- La red queda a medias, dando falsa impresión de soporte.

**Fix recomendado**

- Consumir `shmup:kill` para HUD/combo/telemetría, o eliminarlo.
- Consumir `shmup:wave_complete` para transiciones/UI, o eliminarlo.
- Usar `combat:death` en lugar de polling para la muerte de enemigos (o justificar el polling).
- Emitir `game:over` (P1-01).
- Decidir: implementar red/rollback o eliminar `NetworkController`.

**Criterios de aceptación**

- [ ] Todo evento emitido tiene al menos un consumidor o está documentado como público.
- [ ] La muerte de enemigos y el game over usan eventos o un state explícito, no polling duplicado.
- [ ] `NetworkController` tiene flujo real o se elimina.

---

### P3-03 — Cobertura de tests insuficiente y claim falso de determinismo en la bitácora

| Campo | Valor |
|---|---|
| **Severidad** | P3 |
| **Tipo** | Testing / documentación |
| **Archivos** | `src/games/vertical-shmup/__tests__/*`; `bitacoras/BITACORA-vertical-shmup.md:36` |
| **Estado** | Confirmado con Jest y lectura |

**Evidencia**

Los 7 tests existentes cubren:

- init + 120 ticks sin excepción,
- bloqueo del RNG,
- `BulletPattern` adjunto,
- avance de oleada al vaciar enemigos,
- invulnerabilidad tras `combat:hit`,
- reclaim por boundary,
- registro de shapes Canvas/Skia.

No cubren: hierarchy/world coords, viewport, input de teclado, disparo continuo, daño del jugador, multi-hit, muerte/game over, pausa/reinicio, spawn por intervalo, contacto enemigo, mutadores, hash de determinismo.

La bitácora afirma:

```text
- **Determinismo**: `InputFrame[0..N] -> snapshot hash: MATCH`
  (verificado en `VerticalShmupInit.test.ts`).
```

Pero `VerticalShmupInit.test.ts` no llama a `hash()`, no compara snapshots y no tiene ningún `MATCH`. El claim es falso.

**Impacto**

- Falsa sensación de seguridad.
- Los P0/P1 pasan CI sin ser detectados.
- La documentación de estado del juego no es fiable.

**Fix recomendado**

- Añadir los tests de la sección 8.
- Corregir la bitácora: eliminar el claim o implementar el test.
- Añadir un test de hash con semilla + inputs scriptados.
- Incluir el módulo en el CI de lint/typecheck.

**Criterios de aceptación**

- [ ] Existe un test que falla con P0-01, P0-02 y P0-03.
- [ ] Existe un test de determinismo real con `hash()`.
- [ ] La bitácora refleja la realidad.
- [ ] Cobertura mínima acordada para sistemas críticos.

---

### P3-04 — UX/accesibilidad: carga en blanco, vidas con emoji, sin overlays

| Campo | Valor |
|---|---|
| **Severidad** | P3 |
| **Tipo** | UX / accesibilidad |
| **Archivos** | `src/app/vertical-shmup/index.tsx:50-54,64` |
| **Estado** | Confirmado por lectura de código |

**Evidencia**

- `if (!game || !isReady) return null;` deja la pantalla en blanco mientras carga; no hay spinner ni mensaje.
- Las vidas se muestran como `"❤️".repeat(lives)`, sin alternativa textual ni límite visual.
- No hay overlays de pausa/game over (P1-03).
- Las instrucciones prometen teclado que no funciona (P0-03).
- No hay opción de reduced motion para shake/partículas (cuando se implementen).

**Impacto**

- Mala primera impresión en redes lentas.
- Accesibilidad limitada para lectores de pantalla.
- Instrucciones engañosas.

**Fix recomendado**

- Añadir estado de carga con spinner/texto.
- Mostrar vidas como número + icono, con `accessibilityLabel`.
- Reutilizar `overlaySlot` para pausa/game over.
- Respetar `prefers-reduced-motion`/setting de la app.
- Actualizar las instrucciones cuando P0-03 esté corregido.

**Criterios de aceptación**

- [ ] La pantalla muestra algo durante la carga.
- [ ] Las vidas tienen texto accesible.
- [ ] Los overlays son navegables por teclado/screen reader.
- [ ] Las instrucciones coinciden con los controles reales.

---

## 7. Falsos positivos e hipótesis descartadas

Durante la auditoría se formularon varias hipótesis que la lectura estática o los probes temporales descartaron total o parcialmente. Se documentan aquí para evitar que un futuro lector (o un agente automático) las vuelva a abrir como si fueran defectos independientes, y para separar la causa raíz de sus efectos observables.

| ID | Hipótesis inicial | Resultado | Evidencia | Conclusión |
|---|---|---|---|---|
| FP-01 | El temporizador de spawn nunca avanza; `SPAWN_INTERVAL` no se aplica | **Falso** | Probe: `enemies 6 -> 7 spawnTimer 0.7000000000000005 wave 1` | El intervalo funciona. El único defecto real es que `ShmupSpawnSystem` lee el singleton antes de mutarlo y, en desarrollo, eso retrasa como máximo un tick la comprobación. No es P1. |
| FP-02 | El renderer ignora `worldX`/`worldY` y por eso el jugador no se mueve | **Falso** | `CanvasRenderer` usa `transform.worldX ?? transform.x`; probe: `x 240 -> 390 worldX 240` | El renderer sí prefiere `worldX`/`worldY`. El problema es que nadie los actualiza porque falta `HierarchySystem` (P0-01). |
| FP-03 | El jugador es invisible porque falta registrar la forma `shmup_player` | **Falso** | Test de rendering: `registeredCanvasShapes.has("shmup_player") === true`; también Skia | La forma está registrada. La invisibilidad/aparición en un borde se explica por el viewport (P0-02), no por el registro de assets. |
| FP-04 | Hay dos configuraciones distintas cargadas y eso provoca valores divergentes | **Parcialmente falso** | `VerticalShmupGame` constructor y `onRegisterSystems` cargan el mismo JSON con el mismo schema | No hay divergencia de valores en el caso base. Sí hay doble aplicación de mutadores y una segunda fuente de verdad (P2-02); es un problema de contrato, no de valores distintos. |
| FP-05 | Las balas enemigas dañan a los enemigos (friendly fire) | **Falso** | `EnemyBullet` usa capa `ENEMY` y máscara `PLAYER`; `CombatSystem` además comprueba facción | No hay fuego amigo. La capa del proyectil enemigo es `ENEMY`, no `PROJECTILE`; la máscara solo incluye `PLAYER`. |
| FP-06 | El singleton `InputState` ausente hace que el sistema de entrada lance una excepción | **Falso** | `world.getSingleton("InputState")` con cast a `T \| undefined` y posterior `?.` | Es código muerto, no un crash. El sistema sigue funcionando con `input.axes` y `TouchInputState`. Se elimina en P3-01, no es P0. |
| FP-07 | Si no existe `ScreenShake`, `Juice.playHitJuice` rompe el tick | **Falso** | El probe de muerte y disparo completa 60 ticks sin excepción; `Juice` tolera recursos ausentes | El shake queda inerte (P2-05), pero no hay fallo de ejecución. |
| FP-08 | `Math.random()` afecta a spawns, daño y loot, por lo que todo el gameplay es no determinista | **Parcialmente falso** | Única ocurrencia en `EntityFactory.ts:135`; spawns usan `world.gameplayRandom` | El alcance es una sola espera inicial de disparo enemigo. Sigue siendo una violación de determinismo (P1-04), pero no contamina todo el sistema. |
| FP-09 | `Set<string>` en `Input.actions` lanza una excepción en runtime | **Falso** | Probe: `actions after ticks isSet false {}`; el juego sigue simulando sin throw | No hay excepción inmediata, pero el `Set` se pierde y el estado deja de ser reconstruible. El fallo real es de serialización, hash y clone-on-write (P1-05). |
| FP-10 | El combate nunca resuelve porque los enemigos no tienen `Damage` | **Parcialmente falso** | Las balas del jugador sí llevan `Damage`; el enemigo no lo lleva | El daño de las balas del jugador existe; lo que falta es daño por contacto del cuerpo enemigo (P2-01). Ambos síntomas se confunden porque P0-01 impide que las balas lleguen a colisionar. |
| FP-11 | El bucle de muerte crea entidades infinitas y agota la memoria | **Falso** | Probe: `death renders 25 -> 31` en 3 ticks; no cambia el número de entidades | No se crean entidades; se repiten VFX y escrituras de estado. El impacto es rendimiento y semántica (P1-01), no una fuga de memoria. |
| FP-12 | Todo spawn con `y` negativa es inválido y se destruye al instante | **Parcialmente falso** | `Boundary.minY = -160`; el escuadrón usa `-40 - i*45` | Los tres primeros (`-40`, `-85`, `-130`) están dentro del margen; desde `i = 3` (`-175`) quedan fuera y `BoundarySystem` los destruye. El defecto real es P2-04, no “todo spawn negativo”. |
| FP-13 | El juego no tiene puntuación porque `ShmupCollisionSystem` no suma | **Falso** | El sistema suma `enemy.score` cuando `Health.current <= 0` | La suma existe. Nunca se ejecuta en la práctica porque las balas no alcanzan a los enemigos (P0-01). |
| FP-14 | La pantalla en blanco es un fallo del renderer o del canvas | **Falso** | `if (!game \|\| !isReady) return null;` en `src/app/vertical-shmup/index.tsx:50` | Es un estado de carga sin feedback (P3-04). El canvas no llega a montarse mientras `isReady` es falso. |
| FP-15 | El juego no arranca en web porque `TouchInputState` no existe en el paquete core | **Falso** | `TouchInputState` se exporta desde `@tiny-aster/core` y se usa en otras pantallas | El recurso se registra correctamente en `useEffect`; no hay error de importación. |

### 7.1 Regla de atribución

Para no duplicar hallazgos, se adoptó esta regla:

1. Un síntoma observable se atribuye a la **causa raíz más temprana** en el pipeline.
2. Los efectos derivados se mencionan dentro del hallazgo raíz, no como hallazgos nuevos.
3. Si un síntoma desaparece al corregir la causa raíz, se marca como “derivado” y no se prioriza por separado.

Ejemplos aplicados:

- “No sube el score” es derivado de P0-01; no se abrió un P1 de puntuación.
- “El jugador aparece abajo/fuera” es derivado de P0-02; no se abrió un P1 de cámara.
- “El teclado no responde” es P0-03, aunque el joystick táctil sí funcione.
- “La muerte dispara VFX cada tick” es P1-01, no un bug de partículas.

---

## 8. Matriz de cobertura de tests

### 8.1 Estado actual

El módulo tiene **3 suites y 7 tests**:

| Suite | Tests | Qué cubre realmente |
|---|---:|---|
| `VerticalShmupInit.test.ts` | 2 | `init()` no lanza; 120 ticks no lanzan; el `RandomService` bloqueado lanza al pedir números. |
| `VerticalShmupGameplay.test.ts` | 4 | `createEnemy` adjunta `BulletPattern`; limpiar enemigos avanza de oleada y genera escuadrón; un `combat:hit` sintético activa invulnerabilidad; `BoundarySystem` reclama un enemigo en `y = 1000`. |
| `VerticalShmupRendering.test.ts` | 1 | Se registran formas y efectos en Canvas y Skia. |

**Cobertura cualitativa:** los tests validan que las piezas existen y que algunas unidades aisladas responden, pero **no validan el pipeline completo**. En particular, el test de invulnerabilidad emite el evento directamente, saltándose `CombatSystem`, y por eso no detecta P1-02. El test de oleada no comprueba las posiciones de spawn y por eso no detecta P2-04. Ningún test monta el renderer con un viewport real, por eso P0-02 pasa desapercibido.

### 8.2 Matriz por área

| Área / comportamiento | Test existente | Cobertura | Test que falta | Prioridad |
|---|---|---|---|---|
| Arranque y registro de sistemas | `Init` (implícito) | Baja: solo “no lanza” | Aserción explícita de que `HierarchySystem` está registrado en fase `Transform` | P0 |
| Viewport y letterboxing | Ninguno | Nula | Render de un frame con `screenConfig 480×854`; comprobar que el jugador cae dentro del rect visible y que no hay recorte inferior | P0 |
| Movimiento del jugador y límites | Ninguno | Nula | Input sintético `moveX/moveY`; comprobar `x/y` locales y `worldX/worldY` tras `HierarchySystem` | P0 |
| Teclado → `setInputState` | Ninguno | Nula | Test del adaptador con `{ moveX, moveY, shoot }`; comprobar que el jugador se mueve y dispara | P0 |
| Disparo y colisión bala→enemigo | Ninguno | Nula | Spawn de enemigo en línea, 60 ticks, comprobar `Health`, `score` y reciclaje de bala | P0/P1 |
| Muerte de enemigo y score | Ninguno | Nula | Matar enemigo con daño real; comprobar `score += enemy.score` exactamente una vez | P1 |
| Muerte del jugador | Ninguno | Nula | 3 impactos; comprobar `isGameOver`, `lives = 0`, VFX una sola vez y cese de disparo | P1 |
| Invulnerabilidad same-tick | `Gameplay` (sintético) | Falsa confianza | Dos balas enemigas en el mismo tick; `Health 3 → 2`, no `3 → 1` | P1 |
| Game over / pausa / reinicio | Ninguno | Nula | `Escape` pausa; `R` reinicia; overlay visible; estado `gameover` | P1 |
| Determinismo y hash | Ninguno | Nula | Dos simulaciones con misma semilla e inputs; comparar `hashSoA` tick a tick | P1 |
| Snapshots / rollback | Ninguno | Nula | Snapshot con `Input.actions`; serializar, deserializar y comparar; el `Set` debe fallar o convertirse | P1 |
| `Math.random` | Ninguno | Nula | Grep/lint que falle ante `Math.random` en `src/games` y `packages` | P1 |
| Oleadas y límites de spawn | `Gameplay` (parcial) | Media-baja | Oleada 2: todos los enemigos dentro de `Boundary`; ninguno destruido en el primer tick | P2 |
| Contacto enemigo→jugador | Ninguno | Nula | Enemigo solapado con jugador; `Health` baja 1 y hay `combat:hit` | P2 |
| Mutadores | Ninguno | Nula | `activeMutators` con `extra_life` y `shmup_speed`; comprobar efecto real | P2 |
| Configuración y unidades | Ninguno | Nula | Schema con claves camelCase; validar defaults y migración | P2 |
| Entrada táctil | Ninguno | Nula | `TouchInputState` mueve y dispara sin re-render de React | P2 |
| Render Canvas/Skia | `Rendering` | Media | Paridad de posición y escala entre ambos renderers con el mismo snapshot | P2 |
| Red / multijugador | Ninguno | Nula | `NetworkController` conectado; inputs remotos aplicados; no `Set` en snapshot | P3 |
| Accesibilidad | Ninguno | Nula | Labels, foco, reduced motion, textos de carga | P3 |

### 8.3 Tests de regresión mínimos para el primer PR

Se propone un bloque de 6 tests que, juntos, habrían detectado los cuatro P0/P1 más caros:

1. **`HierarchySystem` integrado:** después de un tick con `Velocity`, `worldX === x` y `worldY === y` para jugador, enemigo y bala.
2. **Viewport coherente:** `resolveViewportDimensions(GameConfig)` devuelve `480×854` y el jugador en `y = 754` está dentro del rect visible.
3. **Teclado real:** simular `keydown` de `ArrowRight` y `Space`; el jugador se mueve y aparece una bala.
4. **Impacto real:** enemigo a 100 px sobre el jugador, bala del jugador, 30 ticks; `score` sube y el enemigo desaparece.
5. **Same-tick:** dos balas enemigas solapadas en el mismo tick; `Health` baja exactamente 1.
6. **Muerte única:** llevar `Health` a 0; contar llamadas a `spawnLayeredExplosion` (o entidades VFX) y comprobar que no crece en los ticks siguientes; el jugador no dispara.

### 8.4 Brecha de infraestructura de test

- `src/games/vertical-shmup/jest.config.cjs` aísla el módulo, pero no hay un harness compartido para simular input de teclado ni para montar el renderer Canvas con un `screenConfig` controlado.
- El test de rendering usa mocks de `Renderer`, no el `CanvasRenderer` real; por eso no puede detectar el desajuste de viewport.
- No hay test de snapshot para ningún juego del repo que use `Set`; conviene añadir un test genérico en `packages/core` que recorra los componentes y falle ante valores no serializables.

**Criterio de salida de la sección:** cada P0 y P1 del documento debe tener al menos un test que falle antes del fix y pase después. Los P2 pueden cubrirse con tests de integración por área. Los P3 con checks de lint o QA manual.

---

## 9. Cumplimiento de `AGENTS.md`

La auditoría contrasta el módulo con las reglas del repositorio. La tabla distingue cumplimiento, cumplimiento parcial y violación. “Parcial” significa que la arquitectura es correcta en la intención pero hay una desviación concreta que ya está recogida como hallazgo.

| Regla de `AGENTS.md` | Estado | Evidencia | Hallazgo asociado |
|---|---|---|---|
| Extender `BaseGame` una sola vez y componer con sistemas | **Cumple** | `VerticalShmupGame extends BaseGame`; `ShmupGameScene` registra sistemas | — |
| Registrar sistemas en la fase correcta (`Input`, `Simulation`, `Transform`, `Collision`, `GameRules`, `Presentation`) | **Parcial** | No se registra `HierarchySystem` en `Transform`; el resto de fases es razonable | P0-01 |
| Los sistemas no guardan estado mutable de gameplay en campos | **Parcial** | `ShmupCollisionSystem` guarda `subscribed` y la suscripción al `EventBus`; el resto de sistemas son stateless | P1-01, P3-01 |
| Todo el azar de gameplay usa `world.gameplayRandom`, nunca `Math.random()` | **Viola** | `EntityFactory.ts:135` usa `Math.random()` | P1-04 |
| Los componentes deben ser serializables | **Viola** | `ShmupInputComponent.actions: Set<string>` y `ShmupInputState.actions: Set<string>` | P1-05 |
| Los componentes no deben contener funciones, referencias de runtime ni estructuras no clonables | **Viola** | El `Set` no lo clona `ComponentCloner`; el hash lo serializa como `{}` | P1-05 |
| Timestep fijo y simulación determinista | **Parcial** | `BaseGame`/`GameLoop` es fijo; el `Math.random()` y el `Set` rompen la reproducibilidad | P1-04, P1-05 |
| Usar `WorldCommandBuffer` para mutaciones estructurales durante el tick | **Cumple** | `createEnemy` reserva id y usa el buffer cuando `world.isUpdating` | — |
| Los sistemas mutan componentes solo dentro de `update(world, deltaTime)` | **Parcial** | El patrón general se sigue; la excepción es el callback de `combat:hit` que muta `Health`/`Render` desde la suscripción perezosa de P1-01 | P1-01 |
| El servidor no importa UI ni React | **No aplica** | El módulo es cliente; no se tocó `/server` | — |
| Controles táctiles sin `setState` a 60–120 Hz | **Cumple** | `TouchVirtualJoystick`/`TouchActionButton` escriben en `TouchInputState`; la pantalla no re-renderiza por movimiento | — |
| La entrada de teclado/gamepad y la táctil conviven sin fragmentar el estado | **Parcial** | Hay dos caminos de entrada (`handleInput` y `game.setInputState`) y el de teclado no respeta el contrato | P0-03, P2-06 |
| Tests por módulo y regresiones para bugs corregidos | **Parcial** | 7 tests; no cubren pipeline ni los P0/P1 | P3-03, sección 8 |
| Lint y typecheck limpios en el módulo | **Parcial** | 3 errores de ESLint en el shmup; `tsc` del shmup limpio | P3-01 |
| Documentación/bitácora fiel al estado real | **Viola** | `bitacoras/BITACORA-vertical-shmup.md:36` afirma verificación de hash que no existe | P3-03 |
| Evitar duplicación y respetar el ratchet | **Parcial** | El repo falla el ratchet global; no se atribuye al shmup | P3-03 |
| Nombres y configuración coherentes con el resto de juegos | **Parcial** | Claves `UPPER_SNAKE`, unidades mezcladas (`120` ms vs `0.8` s), claves muertas | P2-02 |
| No usar `as never` para silenciar contratos | **Parcial** | `src/app/vertical-shmup/index.tsx:32` usa `handleInput(patch as never)` | P3-01 |
| Accesibilidad y estados de carga | **Parcial** | `return null` en carga; vidas con emoji; instrucciones engañosas | P3-04 |

### 9.1 Lectura de conjunto

El módulo **respeta la forma general** de la arquitectura: `BaseGame` + `Scene` + sistemas por fases + pools + `Juice`. No es un caso de “código fuera del framework”. Las violaciones son de **contrato fino** y tienen un patrón común: se implementó la pieza visual o de gameplay, pero no se conectó con el invariante del motor que la hace determinista o visible.

Los tres ejes que más se desvían:

1. **Transform jerárquico:** se asumió que `Transform` se actualiza solo. El motor exige `HierarchySystem` en `Transform`.
2. **Entrada:** se asumió que `setInputState` acepta el payload plano histórico. El contrato del shmup es `{ axes, actions }`, y además `actions` debería ser serializable.
3. **Viewport:** se asumió que `WORLD_WIDTH/WORLD_HEIGHT` eran el viewport. El renderer busca `worldWidth/worldHeight` o `viewportWidth/viewportHeight`.

Ninguno de los tres requiere reescribir el juego; los tres son correcciones de cableado.

### 9.2 Deuda de “configuración como contrato”

`AGENTS.md` insiste en que los componentes sean datos serializables y en que el azar esté aislado. La configuración del shmup, en cambio, mezcla:

- claves de presentación (`STAR_COUNT`, `STAR_SPEED`);
- claves de simulación (`ENEMY_SPEED`, `PLAYER_SHOOT_COOLDOWN`);
- claves de entrada muertas (`KEY_LEFT`, `KEY_SHOOT`);
- unidades distintas (`PLAYER_SHOOT_COOLDOWN: 120` parece ms; `SPAWN_INTERVAL: 0.8` es segundos; `PLAYER_BULLET_TTL: 2` es segundos).

Eso no viola una regla escrita al pie de la letra, pero sí el principio de contrato explícito. Se trata en P2-02.

---

## 10. Arquitectura objetivo

Esta sección describe el estado al que debería converger el módulo, no un rediseño completo. Se mantienen `BaseGame`, `Scene`, los pools y los sistemas existentes; se corrigen las costuras.

### 10.1 Pipeline objetivo de sistemas

| Fase | Sistema | Responsabilidad | Cambio respecto al estado actual |
|---|---|---|---|
| `Input` | `ShmupInputSystem` | Leer `Input` + `TouchInputState`, normalizar ejes, decidir disparo, escribir `Velocity` y cooldown | Mover de `Simulation` a `Input`; eliminar la lectura muerta de `InputState`; no escribir `Set` |
| `Simulation` | `MovementSystem` | Integrar `Velocity` en `x/y` locales | Sin cambios |
| `Simulation` | `EnemyPathSystem` | Modificar `x` local para `sine`/`arc` | Sin cambios; debe marcar `dirty = true` (ya lo hace) |
| `Simulation` | `ShmupSpawnSystem` | Avanzar oleada, spawnear escuadrón y enemigos periódicos | Corregir `startY` para que todo el escuadrón nazca dentro del boundary |
| `Simulation` | `ScrollSystem` | Avanzar `scrollDistance` y starfield | Sin cambios |
| `Simulation` | `BoundarySystem` | Destruir o rebotar según `Boundary` | Sin cambios |
| `Simulation` | `TTLSystem` | Expirar balas y VFX | Sin cambios |
| `Simulation` | `ShmupBulletPatternSystem` | Disparar patrones enemigos | Sin cambios; usa `world.gameplayRandom` si añade variación |
| `Transform` | **`HierarchySystem`** | Sincronizar `worldX/worldY/worldRotation/worldScale*` | **Añadir**; es el fix de P0-01 |
| `Collision` | `SpatialPartitioningSystem` | Broad phase | Sin cambios |
| `Collision` | `CollisionSystem2D` | Narrow phase y `CollisionEvents` | Sin cambios |
| `Collision` | **`ShmupCombatSystem`** | Resolver daño, invulnerabilidad y muerte con dedupe por tick | **Sustituir** `CombatSystem` o envolverlo; fix de P1-02 y P2-01 |
| `GameRules` | `ShmupCollisionSystem` | Reaccionar a muertes: score, VFX, `isGameOver`, `lives` | Debe ser idempotente y no repetir VFX; fix de P1-01 |
| `Presentation` | `Camera2DSystem` | Mantener cámara fija | Sin cambios |
| `Presentation` | `JuiceSystem` | Hit-stop, flash, shake | Sin cambios |
| `Presentation` | `RenderUpdateSystem` | Preparar render | Sin cambios |

**Invariante de oro:** ningún sistema escribe `worldX/worldY` salvo `HierarchySystem`. Todos los sistemas de gameplay leen y escriben `x/y` locales; colisión y render leen `worldX/worldY`. Si se respeta, el orden `Simulation → Transform → Collision` es suficiente y no hay que “arreglar” el renderer.

**Alternativa conservadora:** si se prefiere no introducir un sistema de combate propio, se puede mantener `CombatSystem` y añadir un `ShmupDamageGuardSystem` que se ejecute en `Collision` con prioridad posterior, pero el dedupe same-tick seguirá siendo frágil porque el evento `combat:hit` es diferido. La opción recomendada es el sistema propio.

### 10.2 Contrato de entrada objetivo

El contrato debe ser un DTO plano y serializable, no un `Set`:

```ts
export interface ShmupInputCommand {
  /** Eje horizontal normalizado [-1, 1]. */
  moveX: number;
  /** Eje vertical normalizado [-1, 1]; +1 es abajo. */
  moveY: number;
  /** Disparo continuo mientras se mantiene. */
  shoot: boolean;
  /** Pausa solicitada en este tick (flanco). */
  pause?: boolean;
}
```

Reglas:

- `ShmupInputSystem` lee el comando del `Input` local y de `TouchInputState`; la fuente táctil tiene prioridad solo si su magnitud supera el deadzone.
- El adaptador de teclado traduce `KeyboardEvent.code` a `ShmupInputCommand` **antes** de llamar a `setInputState`; no reutiliza el payload genérico de otras games.
- `setInputState` acepta `Partial<ShmupInputCommand>` y hace merge de campos, no reemplaza el objeto completo.
- `actions` desaparece del componente. Si se necesita compatibilidad, se acepta `{ actions: string[] }` en el borde y se normaliza a booleanos.
- El comando se puede meter en un `InputRingBuffer` para red/rollback sin serializar un `Set`.

**Compatibilidad temporal:** mientras se migra, `ShmupInputSystem` puede aceptar `Set | string[] | { shoot: boolean }` mediante un normalizador, pero el componente y el snapshot deben guardar solo el DTO plano.

### 10.3 Contrato de configuración objetivo

Se propone un schema con nombres estables y unidades explícitas. No es obligatorio renombrar todo de golpe; se puede hacer con un adaptador de migración.

| Concepto | Clave actual | Clave objetivo | Unidad |
|---|---|---|---|
| Ancho del mundo | `WORLD_WIDTH` | `world.width` | px |
| Alto del mundo | `WORLD_HEIGHT` | `world.height` | px |
| Viewport lógico | (implícito) | `viewport.width/height` | px |
| Velocidad del jugador | `PLAYER_SPEED` | `player.speed` | px/s |
| Tamaño del jugador | `PLAYER_SIZE` | `player.size` | px |
| Radio de colisión | `PLAYER_COLLIDER_RADIUS` | `player.colliderRadius` | px |
| Cadencia | `PLAYER_SHOOT_COOLDOWN` | `player.shootCooldownMs` | ms |
| Velocidad de bala | `PLAYER_BULLET_SPEED` | `playerBullet.speed` | px/s |
| TTL de bala | `PLAYER_BULLET_TTL` | `playerBullet.ttlSeconds` | s |
| Intervalo de spawn | `SPAWN_INTERVAL` | `spawn.intervalSeconds` | s |
| HP enemigo | `ENEMY_HP` | `enemy.hp` | unidades |
| Puntuación | `ENEMY_SCORE` | `enemy.score` | puntos |
| Claves de entrada | `KEY_*` | *(eliminar)* | — |
| Cuenta atrás | `COUNTDOWN` | *(eliminar o implementar)* | s |

**Regla de compatibilidad:** el renderer y `Camera2DSystem` deben leer el mismo objeto. Mientras el resto de juegos use `worldWidth/worldHeight`, el shmup puede publicar un recurso `ViewportConfig` o añadir alias camelCase al `GameConfig`:

```ts
this.world.setResource("GameConfig", {
  ...this.config,
  worldWidth: this.config.WORLD_WIDTH,
  worldHeight: this.config.WORLD_HEIGHT,
  viewportWidth: this.config.WORLD_WIDTH,
  viewportHeight: this.config.WORLD_HEIGHT,
});
```

Eso resuelve P0-02 sin tocar el renderer. La solución de largo plazo es que `GameConfig` tenga una forma común para todos los juegos y que `resolveViewportDimensions` no dependa de un alias accidental.

### 10.4 Máquina de estados de partida

Hoy el estado es un booleano (`isGameOver`) más `lives`. Se propone explicitarlo:

```ts
type ShmupPhase = "ready" | "playing" | "paused" | "gameover";

interface ShmupSessionState {
  phase: ShmupPhase;
  score: number;
  wave: number;
  lives: number;
  scrollDistance: number;
  spawnTimer: number;
  seed: number;
}
```

Transiciones:

| Desde | Evento | Hacia | Quién lo dispara |
|---|---|---|---|
| `ready` | `start()` / primer tick | `playing` | `BaseGame` / `ShmupGameScene` |
| `playing` | `Escape` | `paused` | `BaseGame` (pauseKey) o `ShmupInputSystem` |
| `paused` | `Escape` | `playing` | `BaseGame` |
| `playing` | `Health.current <= 0` | `gameover` | `ShmupCollisionSystem` una sola vez |
| `gameover` | `R` / botón | `playing` (reset) | `BaseGame` (restartKey) o UI |
| `gameover` | `Menu` | `ready`/navegación | UI |

Reglas:

- `isGameOver()` se deriva de `phase === "gameover"`; no se mantienen dos fuentes de verdad.
- `ShmupSpawnSystem` y `ShmupInputSystem` comprueban `phase === "playing"`, no solo `isGameOver`.
- La UI lee `getGameState()` y muestra overlay según `phase`.
- El reinicio no reutiliza la instancia sucia: `BaseGame` debe reconstruir el mundo o el `Scene` debe hacer un reset explícito de entidades, pools y recursos.

### 10.5 VFX, audio y “game feel”

- **Un evento, un efecto:** `combat:death` o `shmup:kill` debe ser la única fuente para explosión, score y sonido. `ShmupCollisionSystem` no debe emitir VFX cada tick.
- **VFX con TTL:** las partículas y explosiones ya usan `TTL`; el problema es el emisor, no el consumidor.
- **Shake opcional:** `Juice` ya envuelve la sacudida. Si se añade `ScreenShakeSystem`, debe registrarse en `Presentation` y tolerar ausencia de recurso.
- **Presupuesto:** limitar partículas por explosión y reutilizar pools; el shmup puede tener 20+ enemigos y 100+ balas.
- **Audio:** `PlaySFX` con `cooldownMs` para disparo; no emitir un evento por bala si el cooldown ya existe.

### 10.6 Red, snapshots y rollback

Aunque el shmup actual es local, el contrato debe ser compatible con el servidor:

1. **Input serializable:** DTO plano por tick, sin `Set`.
2. **Snapshot determinista:** componentes con números, strings, arrays y objetos planos; nada de `Map`, `Set`, funciones ni referencias a entidades fuera de `entity: number`.
3. **Hash estable:** `hashSoA` debe producir el mismo valor en cliente y servidor para el mismo tick.
4. **Reconciliación:** el cliente predice con `RemoteInputPredictor`; el servidor autoriza; el shmup debe poder re-simular desde un snapshot sin depender de `Math.random`.
5. **Separación de render:** ningún sistema de `Presentation` debe mutar estado de gameplay que entre en el snapshot.

### 10.7 Fronteras de módulo

| Frontera | Permitido | Prohibido |
|---|---|---|
| `src/games/vertical-shmup` | `@tiny-aster/core`, `@tiny-aster/gameplay-kit`, `@tiny-aster/network` | React, React Native, Skia, Expo |
| `src/app/vertical-shmup` | hooks, componentes UI, `CanvasRenderer` | lógica de simulación, mutación directa de componentes |
| `packages/core` | ECS, física, render contracts | conocimiento de “vertical-shmup” |
| `packages/gameplay-kit` | combate, loot, power-ups genéricos | conocimiento de la pantalla o del HUD |

El módulo cumple esta tabla hoy, salvo el acoplamiento implícito de `GameConfig` con el renderer (P0-02), que es una frontera de contrato, no de imports.

---

## 11. Roadmap por fases

El orden prioriza **desbloquear la observabilidad** antes de optimizar. No tiene sentido pulir game feel si el jugador no ve la nave o no puede moverla.

### Fase 0 — Hotfix de visibilidad y control (1–2 días)

**Objetivo:** que el juego sea jugable de principio a fin en el camino feliz.

| Tarea | Hallazgo | Archivos | Criterio de hecho |
|---|---|---|---|
| Registrar `HierarchySystem` en `Transform` | P0-01 | `scenes/ShmupGameScene.ts` | `worldX/worldY` siguen a `x/y`; las balas impactan; el score sube |
| Publicar viewport coherente (`worldWidth/worldHeight` o `viewport*`) | P0-02 | `scenes/ShmupGameScene.ts`, `types/ShmupConfigSchema.ts` | El jugador en `y = 754` es visible; no hay recorte inferior ni franja negra |
| Adaptar teclado al contrato `{ axes, actions }` | P0-03 | `src/hooks/useKeyboardControls.ts` o adaptador en `src/app/vertical-shmup/index.tsx` | `WASD`/flechas mueven; `Space` dispara; `blur` detiene |
| Añadir test de humo del pipeline | P0-01/02/03 | `__tests__/` | Un test falla antes y pasa después |

**Riesgo:** bajo. Son cambios localizados y reversibles. El único riesgo es que `HierarchySystem` cambie el orden de render de entidades con `parentEntity`; el shmup no usa jerarquías, así que el impacto es neutro.

**Salida:** partida jugable con teclado y táctil, balas que impactan, jugador visible.

### Fase 1 — Ciclo de vida y determinismo (3–5 días)

**Objetivo:** que la partida termine, se pueda reiniciar y sea reproducible.

| Tarea | Hallazgo | Archivos | Criterio de hecho |
|---|---|---|---|
| Guardia de muerte idempotente (`Dead` o flag) | P1-01 | `systems/ShmupCollisionSystem.ts` | VFX una vez; `isGameOver` estable; el jugador muerto no dispara |
| Resolver daño con dedupe por tick e invulnerabilidad inmediata | P1-02 | `systems/ShmupCollisionSystem.ts` o nuevo `ShmupCombatSystem` | Dos balas same-tick → 1 de daño |
| Overlay de pausa/game over y reinicio | P1-03 | `src/app/vertical-shmup/index.tsx`, `src/components/ui` | `Escape` pausa; `R` reinicia; overlay visible y accesible |
| Sustituir `Math.random()` por `gameplayRandom` | P1-04 | `EntityFactory.ts:135` | Grep sin `Math.random` en el módulo; misma semilla → mismo estado |
| Eliminar `Set` de componentes y entrada | P1-05 | `types/ShmupTypes.ts`, `systems/ShmupInputSystem.ts`, `VerticalShmupGame.ts` | Snapshot/clone/hash estables; sin `Set` en el registro |
| Test de determinismo y same-tick | P1 | `__tests__/` | Dos simulaciones comparan hash; el test de two-bullets pasa |

**Riesgo:** medio. El cambio de `CombatSystem` a un sistema propio toca el orden de colisión y la semántica de eventos. Mitigación: mantener el mismo contrato `combat:hit`/`combat:death` y añadir tests de integración antes de borrar el sistema genérico.

**Salida:** partida completa con muerte, game over, reinicio, pausa y reproducibilidad.

### Fase 2 — Robustez de gameplay (5–8 días)

**Objetivo:** que las mecánicas declaradas funcionen y no haya sorpresas de borde.

| Tarea | Hallazgo | Archivos | Criterio de hecho |
|---|---|---|---|
| Añadir `Damage` al cuerpo enemigo | P2-01 | `EntityFactory.ts` | El contacto enemigo resta 1 de vida y respeta invulnerabilidad |
| Unificar contrato de configuración y unidades | P2-02 | `types/ShmupConfigSchema.ts`, `config/vertical-shmup.json`, `VerticalShmupGame.ts` | Una sola carga; claves muertas eliminadas; unidades documentadas |
| Integrar mutadores (`extra_life`, `shmup_speed`) | P2-03 | `VerticalShmupGame.ts`, `MutatorRegistry` | Los mutadores tienen efecto observable y test |
| Corregir spawn de escuadrón fuera de boundary | P2-04 | `systems/ShmupSpawnSystem.ts` | Oleada 2: todos dentro del boundary; ninguno destruido en el primer tick |
| Game feel: shake, partículas, hit flash, starfield sin allocations | P2-05 | `rendering/*`, `systems/*` | Efectos visibles; sin allocs por frame; presupuesto de partículas |
| Higiene de entrada y capas | P2-06 | `systems/ShmupInputSystem.ts`, `EntityPool.ts` | Una sola fuente de entrada; capas documentadas y test de no-friendly-fire |
| Tests de integración por área | P2 | `__tests__/` | Matriz de la sección 8 cubierta al 70% |

**Riesgo:** medio. La configuración afecta a render, spawn y balance; conviene hacer la migración con aliases y un test de contrato antes de borrar claves viejas.

**Salida:** mecánicas completas y balanceables.

### Fase 3 — Calidad, accesibilidad y deuda (3–5 días)

**Objetivo:** dejar el módulo mantenible y sin deuda que vuelva a introducir los mismos bugs.

| Tarea | Hallazgo | Archivos | Criterio de hecho |
|---|---|---|---|
| Limpiar código muerto, imports y casts | P3-01 | `EntityFactory.ts`, `ShmupCollisionSystem.ts`, `src/app/.../index.tsx` | ESLint sin errores en el módulo; sin `as never` |
| Resolver eventos huérfanos y `NetworkController` | P3-02 | `VerticalShmupGame.ts`, `ShmupCollisionSystem.ts` | Eventos consumidos o eliminados; red conectada o explícitamente desactivada |
| Corregir bitácora y ampliar tests | P3-03 | `bitacoras/BITACORA-vertical-shmup.md`, `__tests__/` | La bitácora refleja el estado real; cobertura de P0/P1 |
| UX/accesibilidad | P3-04 | `src/app/vertical-shmup/index.tsx` | Carga con feedback; vidas accesibles; overlays navegables; instrucciones correctas |
| Pasar el ratchet de duplicación | P3-03 | repo | `pnpm run check:duplication` en verde o baseline actualizado con justificación |

**Riesgo:** bajo, salvo el ratchet global, que puede requerir refactor fuera del módulo.

**Salida:** módulo mantenible, con tests de regresión y documentación fiel.

### 11.1 Dependencias entre fases

```
Fase 0 (P0-01/02/03)
   ├── desbloquea tests de impacto y score
   ▼
Fase 1 (P1-01..05)
   ├── depende de Fase 0 para observar colisiones reales
   ├── P1-02 depende de P1-01 (muerte idempotente)
   ▼
Fase 2 (P2-01..06)
   ├── P2-01 depende de P1-02 (sistema de daño)
   ├── P2-02 depende de Fase 0 (viewport)
   ▼
Fase 3 (P3-01..04)
   └── cierre y limpieza
```

### 11.2 Qué **no** hacer todavía

- No añadir más tipos de enemigo, jefes o power-ups hasta que el pipeline básico esté verde.
- No optimizar el starfield antes de medir con el juego visible; la mitad del coste actual es consecuencia de P0-02.
- No migrar a `Skia` exclusivo: el problema es de contrato de viewport, no de renderer.
- No reescribir `CombatSystem` para todos los juegos por un bug del shmup; primero el sistema propio, luego se evalúa extraer el patrón.

### 11.3 Estimación agregada

| Fase | Esfuerzo | Incertidumbre | Impacto |
|---|---|---|---|
| 0 | 1–2 días | Baja | Desbloquea todo lo demás |
| 1 | 3–5 días | Media | Convierte el prototipo en partida |
| 2 | 5–8 días | Media | Mecánicas completas |
| 3 | 3–5 días | Baja | Mantenibilidad |
| **Total** | **12–20 días** | — | — |

La estimación asume una persona con contexto del repo y sin interrupciones. No incluye contenido nuevo (jefes, niveles, arte).

---

## 12. Plan de verificación

### 12.1 Comandos de compuerta

Ejecutar desde la raíz del repo. Estos comandos son la definición operativa de “verde” para el módulo.

```bash
# 1. Tests del módulo (rápido, sin red)
pnpm exec jest src/games/vertical-shmup --runInBand

# 2. Typecheck de la app (incluye el shmup y sus imports)
pnpm run typecheck:app

# 3. Lint del repo (filtrar salida del shmup)
pnpm run lint

# 4. Patrones de juego (hoy no detecta Math.random; se mantiene como gate)
pnpm run check:game-patterns

# 5. Duplicación (ratchet global)
pnpm run check:duplication

# 6. Gate de CI completo (más lento)
pnpm run ci
```

**Nota:** `pnpm run typecheck:app` ya reporta errores preexistentes en `src/app/index.tsx` para `/galaxian` y `/centipede`, ajenos al shmup. Para no confundir la señal, el PR del shmup debe registrar el estado base y justificar que no añade errores nuevos.

### 12.2 Tests nuevos y su intención

| Test | Archivo sugerido | Falla hoy por | Pasa cuando |
|---|---|---|---|
| `hierarchy syncs world transforms` | `__tests__/VerticalShmupPipeline.test.ts` | `worldX` queda en 240 tras mover a 390 | Se registra `HierarchySystem` |
| `viewport keeps player visible` | `__tests__/VerticalShmupViewport.test.ts` | `resolveViewportDimensions` devuelve `800×600` | `GameConfig` publica `480×854` |
| `keyboard drives shmup input` | `__tests__/VerticalShmupInput.test.ts` | El payload plano se ignora | El adaptador traduce a `{ axes, actions }` |
| `player bullet damages enemy` | `__tests__/VerticalShmupCombat.test.ts` | La bala no colisiona por `worldY` congelado | Hay impacto y `score > 0` |
| `two enemy bullets same tick deal one damage` | `__tests__/VerticalShmupCombat.test.ts` | `3 → 1` | `3 → 2` |
| `player death is idempotent` | `__tests__/VerticalShmupLifecycle.test.ts` | VFX se repite cada tick | VFX una vez; `phase = gameover` |
| `dead player cannot shoot` | `__tests__/VerticalShmupLifecycle.test.ts` | Balas `8 → 9` | No aumenta el conteo |
| `wave squad spawns inside boundary` | `__tests__/VerticalShmupSpawn.test.ts` | Enemigos con `y < -160` | Todos dentro del boundary |
| `enemy contact damages player` | `__tests__/VerticalShmupCombat.test.ts` | El enemigo no tiene `Damage` | `Health` baja 1 |
| `shmup publishes a coherent viewport` | `__tests__/VerticalShmupViewport.test.ts` | `GameConfig` no publica `worldWidth/worldHeight` | `resolveViewportDimensions` devuelve `480×854` |
| `snapshot rejects non-serializable values` | `core/__tests__/SnapshotSerialization.test.ts` | `Set` se serializa como `{}` sin error | El test detecta el `Set`; con el DTO plano pasa |
| `same seed same hash` | `__tests__/VerticalShmupDeterminism.test.ts` | `Math.random` diverge | Mismo hash en 600 ticks |

### 12.3 QA manual (web y móvil)

| # | Escenario | Pasos | Resultado esperado |
|---|---|---|---|
| 1 | Carga | Abrir `/vertical-shmup` y pulsar START | Feedback de carga; luego canvas visible; sin pantalla en blanco |
| 2 | Movimiento teclado | Mantener `A`/`D`/`W`/`S` y flechas | La nave se mueve en las 4 direcciones, sin salir del área visible |
| 3 | Disparo teclado | Mantener `Space` | Balas continuas con cadencia estable; el score sube al impactar |
| 4 | Movimiento táctil | Arrastrar el joystick | La nave sigue el dedo; al soltar, se detiene |
| 5 | Disparo táctil | Mantener el botón de fuego | Disparo continuo; no hay re-render por frame |
| 6 | Impacto enemigo | Dejar que una bala enemiga toque la nave | Pierde 1 vida; parpadea; no pierde 2 por el mismo impacto |
| 7 | Contacto enemigo | Chocar con un enemigo | Pierde 1 vida; el enemigo también recibe daño o se destruye |
| 8 | Muerte | Perder las 3 vidas | Explosión una vez; overlay de game over; no se puede disparar |
| 9 | Pausa | `Escape` durante la partida | Se detiene la simulación; overlay; `Escape` reanuda |
| 10 | Reinicio | `R` en game over | Nueva partida con score 0, 3 vidas, oleada 1 |
| 11 | Oleada | Limpiar todos los enemigos | Oleada 2; escuadrón visible; ninguno desaparece al nacer |
| 12 | Responsive | Redimensionar ventana / rotar móvil | Letterboxing correcto; sin recortes del mundo |
| 13 | Accesibilidad | Navegar con teclado y lector de pantalla | Botones enfocables; vidas con texto; instrucciones correctas |
| 14 | Rendimiento | 60 s de partida con muchos enemigos | Sin caídas sostenidas; sin crecimiento de entidades |

### 12.4 Métricas de aceptación

| Métrica | Línea base actual | Objetivo | Cómo se mide |
|---|---|---|---|
| Balas que impactan | 0 en 60 ticks | > 80% de las balas en línea | Test de combate + contador de `score` |
| Score tras matar 1 enemigo | 0 | `100` (oleada 1) | Test de integración |
| Vida tras 2 balas same-tick | `3 → 1` | `3 → 2` | Test de same-tick |
| VFX de muerte por muerte | 1 por tick (crece) | 1 total | Contador de explosiones |
| Disparos tras muerte | Sigue disparando | 0 | Test de lifecycle |
| `worldX` tras mover 150 px | 240 (congelado) | 390 | Test de pipeline |
| Viewport lógico | `800×600` | `480×854` | `resolveViewportDimensions` |
| Errores ESLint en el módulo | 3 | 0 | `pnpm run lint` |
| Tests del módulo | 7 | ≥ 19 | `jest` |
| `Math.random` en el módulo | 1 | 0 | grep + gate |
| `Set` en componentes | 2 | 0 | grep + test de snapshot |
| Duplicación global | 1.12% | ≤ 0.98% | `check:duplication` |

**Umbral de rendimiento:** en un dispositivo móvil de gama media, el tick de simulación debe mantenerse por debajo de 4 ms de media y 8 ms en el percentil 99, con 20 enemigos y 100 balas. El render Canvas puede ir aparte; lo que se mide es el `World.update`.

### 12.5 Estrategia de verificación por fase

| Fase | Verificación automática | Verificación manual | Evidencia a adjuntar al PR |
|---|---|---|---|
| 0 | Tests de pipeline, viewport e input | QA 1–4 | Captura antes/después del viewport; salida de `worldX` |
| 1 | Tests de combate, same-tick, muerte, determinismo | QA 6–10 | Hash de dos simulaciones; conteo de VFX |
| 2 | Tests de spawn, contacto, mutadores, config | QA 11–12 | Tabla de oleadas; diff de config |
| 3 | Lint, typecheck, duplicación, accesibilidad | QA 13–14 | Salida de gates; auditoría de labels |

### 12.6 Recolección de evidencia

Para que los hallazgos sigan siendo verificables después del fix:

1. Guardar el **commit base** (`e383d626`) y el comando exacto que reprodujo cada probe.
2. Adjuntar la salida de los probes en el PR de la Fase 0 (Anexo A).
3. Añadir un test que falle en el commit base y pase en el commit del fix; el diff del test es la prueba.
4. No borrar los probes de la bitácora: moverlos a `docs/audit/` o a un apéndice de tests.
5. Si un hallazgo se descarta, registrar el motivo en la sección 7 para no reabrirlo.

### 12.7 Criterio de “listo para producción”

El módulo se considera listo cuando:

- [ ] Los 3 P0 están cerrados con test de regresión.
- [ ] Los 5 P1 están cerrados o tienen una decisión explícita de producto.
- [ ] No hay `Math.random()` ni `Set` en componentes del módulo.
- [ ] `pnpm exec jest src/games/vertical-shmup --runInBand` pasa con ≥ 19 tests.
- [ ] `pnpm run lint` no reporta errores del módulo.
- [ ] `pnpm run typecheck:app` no añade errores nuevos respecto al baseline.
- [ ] `pnpm run check:duplication` está en verde o el baseline está justificado.
- [ ] QA manual 1–14 completo en web y en un dispositivo móvil.
- [ ] La bitácora refleja el estado real y enlaza esta auditoría.

---

## 13. Anexos

### Anexo A — Evidencia de los probes

Los siguientes valores se obtuvieron con probes temporales de Jest (eliminados después) sobre el commit `e383d626`, Node `v24.21.0`, pnpm `10.30.3`. No forman parte de la suite permanente; se conservan aquí como evidencia reproducible.

#### A.1 Viewport contra mundo

```
PROBE viewport {"viewportWidth":800,"viewportHeight":600} screen {"width":480,"height":854}
```

**Lectura:** `resolveViewportDimensions` no encuentra `worldWidth/worldHeight` en `GameConfig` y cae a los defaults `800×600`. La pantalla real es `480×854`. El renderer calcula `scale = min(480/800, 854/600) = 0.6`, `offsetY = 247`, y recorta el mundo a `0..600` unidades. El jugador nace en `y = 754`, fuera del rect visible.

#### A.2 Congelación de `worldX/worldY`

```
PROBE player x 240 -> 390 worldX 240
PROBE y 754 -> 604 worldY 754
PROBE enemy x 162.32419708482675 worldX 126.31794410150891 y 216.5 worldY 80
PROBE2 playerBullets 8 bulletY 92.83333333333292 bulletWorldY 732 score 0 enemies 7
```

**Lectura:** `x/y` locales cambian con `MovementSystem`; `worldX/worldY` se quedan en el valor de creación. El enemigo conserva `worldY = 80` aunque su `y` local sea `216.5`; la bala conserva `worldY = 732` aunque su `y` local sea `92.8`. La colisión usa `worldX/worldY`, por eso la bala nunca alcanza al enemigo y el score queda en 0.

#### A.3 `Input.actions` deja de ser `Set`

```
PROBE actions after ticks isSet false {}
```

**Lectura:** tras varios ticks, el componente `Input.actions` ya no es un `Set`; el hash/serializador lo ve como `{}`. El juego no lanza una excepción porque `hasAction` comprueba `instanceof Set` y devuelve `false`, pero el estado ya no es reconstruible desde un snapshot. Además, el camino de teclado que dependía de ese `Set` queda silenciosamente sin efecto.

#### A.4 Spawn y oleadas

```
PROBE enemies 6 -> 7 spawnTimer 0.7000000000000005 wave 1
```

**Lectura:** el temporizador avanza y el spawn periódico ocurre. La lectura “el intervalo no funciona” es un falso positivo (FP-01). El `spawnTimer` de `0.7000000000000005` confirma acumulación de `deltaTime` en segundos.

#### A.5 Doble impacto en el mismo tick

```
PROBE2 double hit hp 3 -> 1
```

**Lectura:** dos balas enemigas en el mismo tick restan 2 de vida. La invulnerabilidad se activa en el `combat:hit` diferido, después de que `CombatSystem` ya aplicó ambos impactos. Es P1-02.

#### A.6 Muerte y disparo posterior

```
PROBE2 death renders 25 -> 31 gameOver true lives 0 playerAlive true
PROBE2 dead player fires 8 -> 9
```

**Lectura:** en 3 ticks, el contador de renders de VFX pasa de 25 a 31 (dos explosiones por tick, aproximadamente). `isGameOver` es `true` y `lives` es `0`, pero la entidad del jugador sigue viva y sigue disparando. Es P1-01.

#### A.7 Estado inicial del jugador

```
PROBE2 player world 240 754 health 3
```

**Lectura:** el jugador nace en el centro horizontal (`480/2`) y a `754` de altura (`854 - 100`). Con el viewport efectivo `800×600`, esa posición queda por debajo del área visible. Es P0-02.

#### A.8 Reproducción de los probes

Los probes se ejecutaron con Jest y un `console.log` temporal en el módulo. Para reproducirlos sin reintroducir código:

1. Partir del commit `e383d626`.
2. Añadir un test temporal en `src/games/vertical-shmup/__tests__/` que:
   - instancie `VerticalShmupGame`, llame a `init()` y `start()`;
   - avance N ticks con `game.update(1/60)`;
   - lea `Transform`, `Health`, `ShmupGameState` y `Input` con `world.getComponent`.
3. Ejecutar `pnpm exec jest src/games/vertical-shmup/__tests__/<probe>.test.ts --runInBand`.
4. Borrar el test después de capturar la salida.

No se incluye el código del probe en este documento para no fijar una API de test que puede cambiar; los valores y la secuencia son suficientes para reconstruirlo.

---

### Anexo B — Parches quick-win

Los siguientes fragmentos son **orientativos**. No se aplicaron en esta auditoría; el documento no modifica código. Cada uno indica el archivo y el hallazgo que cierra.

#### B.1 Registrar `HierarchySystem` (P0-01)

```ts
// src/games/vertical-shmup/scenes/ShmupGameScene.ts
import { HierarchySystem } from "@tiny-aster/core";

// dentro de registerSystems(), después de los sistemas de Simulation
this.world.addSystem(new HierarchySystem(), { phase: SystemPhase.Transform });
```

**Por qué funciona:** `HierarchySystem` recorre los `Transform` con `dirty = true` y copia `x/y/rotation/scale` a `worldX/worldY/...`. Al ejecutarse en `Transform`, va después de `MovementSystem`/`EnemyPathSystem` y antes de `CollisionSystem2D`, que lee `worldX/worldY`.

**Cuidado:** si algún sistema escribe `worldX` directamente, `HierarchySystem` lo sobrescribirá en el siguiente tick. En el shmup actual nadie lo hace; conviene añadir un test que lo garantice.

#### B.2 Publicar el viewport correcto (P0-02)

```ts
// src/games/vertical-shmup/scenes/ShmupGameScene.ts
this.world.setResource("ScreenConfig", {
  width: this.config.WORLD_WIDTH,
  height: this.config.WORLD_HEIGHT,
});

this.world.setResource("GameConfig", {
  ...this.config,
  worldWidth: this.config.WORLD_WIDTH,
  worldHeight: this.config.WORLD_HEIGHT,
  viewportWidth: this.config.WORLD_WIDTH,
  viewportHeight: this.config.WORLD_HEIGHT,
});
```

**Por qué funciona:** `resolveViewportDimensions` busca primero `viewportWidth/viewportHeight`, luego `worldWidth/worldHeight`. Con `480×854`, el renderer escala a la pantalla sin recortar el mundo y el jugador en `y = 754` queda dentro.

**Alternativa de largo plazo:** añadir `viewport` al schema y hacer que todos los juegos publiquen la misma forma. No conviene que cada juego invente alias.

#### B.3 Adaptar el teclado al contrato (P0-03)

```ts
// src/hooks/useKeyboardControls.ts, antes de game.setInputState(inputPayload)
if ((game as { gameId?: string }).gameId === "vertical-shmup") {
  const moveX = (activeKeys.has("ArrowRight") || activeKeys.has("KeyD") ? 1 : 0)
    - (activeKeys.has("ArrowLeft") || activeKeys.has("KeyA") ? 1 : 0);
  const moveY = (activeKeys.has("ArrowDown") || activeKeys.has("KeyS") ? 1 : 0)
    - (activeKeys.has("ArrowUp") || activeKeys.has("KeyW") ? 1 : 0);
  game.setInputState({
    axes: { moveX, moveY },
    actions: activeKeys.has("Space") ? new Set(["shoot"]) : new Set(),
  });
  return;
}
game.setInputState(inputPayload);
```

**Por qué funciona:** `VerticalShmupGame.setInputState` hace merge de `axes` y reemplaza `actions`. El payload plano (`{ moveX, moveY, shoot }`) no tiene `axes` ni `actions`, por eso se ignoraba.

**Mejora:** no usar `new Set()` por tecla; ver B.5. Y no llamar a `handleInput` y `setInputState` a la vez (P2-06).

#### B.4 Guardia de muerte idempotente (P1-01)

```ts
// src/games/vertical-shmup/systems/ShmupCollisionSystem.ts
for (const entity of world.query("ShmupPlayer", "Health")) {
  const health = world.getMutableComponent(entity, "Health");
  if (!health) continue;

  world.mutateSingleton("ShmupGameState", (state) => {
    state.lives = Math.max(0, health.current);
  });

  if (health.current > 0) continue;
  if (world.hasComponent(entity, "Dead")) continue; // ya procesado

  const transform = world.getComponent(entity, "Transform");
  if (transform) {
    spawnLayeredExplosion(world, transform.x, transform.y, { type: "ship" });
    Juice.playDeathJuice(world, entity, { shakeIntensity: 6.0, shakeDuration: 180 });
  }
  world.getCommandBuffer().addComponent(entity, { type: "Dead" });
  world.mutateSingleton("ShmupGameState", (state) => {
    state.isGameOver = true;
  });
}
```

**Por qué funciona:** `Dead` se añade al buffer y se materializa al final del tick; en el siguiente tick la guardia evita repetir VFX y escrituras. `CombatSystem` ya añade `Dead` cuando el daño letal ocurre, así que esta guardia también cubre ese camino.

**Complemento:** en `ShmupInputSystem`, saltar si `health.current <= 0` o `world.hasComponent(entity, "Dead")` para que el jugador muerto no dispare.

#### B.5 Eliminar el `Set` de la entrada (P1-05)

```ts
// types/ShmupTypes.ts
export interface ShmupInputState {
  axes: { moveX?: number; moveY?: number };
  actions: { shoot: boolean };
}

export interface ShmupInputComponent extends Component {
  type: "Input";
  axes: Record<string, number>;
  actions: { shoot: boolean };
  shootCooldownRemaining: number;
}
```

```ts
// systems/ShmupInputSystem.ts
let shooting = inputState?.buttons?.shoot ?? input.actions.shoot;
```

**Por qué funciona:** un objeto plano con booleanos es serializable, clonable y hasheable. El adaptador de teclado construye `{ shoot: activeKeys.has("Space") }` una vez por evento, no un `Set` nuevo por tecla.

**Migración:** si hay otros consumidores que esperan `Set`, añadir un normalizador en el borde:

```ts
function normalizeActions(actions: unknown): { shoot: boolean } {
  if (actions instanceof Set) return { shoot: actions.has("shoot") };
  if (Array.isArray(actions)) return { shoot: actions.includes("shoot") };
  if (actions && typeof actions === "object" && "shoot" in actions) {
    return { shoot: Boolean((actions as { shoot?: unknown }).shoot) };
  }
  return { shoot: false };
}
```

#### B.6 Sustituir `Math.random()` (P1-04)

```ts
// EntityFactory.ts:135
cooldownRemaining: 0.8 + world.gameplayRandom.next() * 0.5,
```

**Por qué funciona:** `world.gameplayRandom` es el PRNG sembrado y bloqueado fuera de la ventana de simulación. La espera inicial del enemigo pasa a ser reproducible.

**Cuidado:** si `createEnemy` se llama fuera de un contexto desbloqueado (por ejemplo, en `onEnter`), envolver el bloque en `runWithUnlockedRandomAndMutators`, como ya se hace para el escuadrón inicial.

#### B.7 Disparo continuo sin `Set` (P0-03/P1-05)

```ts
// src/app/vertical-shmup/index.tsx
const setInput = useCallback((patch: { moveX?: number; moveY?: number; shoot?: boolean }) => {
  if (!game) return;
  game.setInputState({
    axes: {
      moveX: patch.moveX ?? 0,
      moveY: patch.moveY ?? 0,
    },
    actions: {
      shoot: patch.shoot ?? false,
    },
  });
}, [game]);
```

**Por qué funciona:** elimina la doble llamada `handleInput` + `setInputState` y usa el contrato del juego. El joystick sigue escribiendo en `TouchInputState`; esta llamada es solo para el botón de disparo y el teclado.

**Mejora:** para el joystick, no llamar a `setInput` en cada movimiento; dejar que `TouchInputState` sea la fuente y que `ShmupInputSystem` la lea. Así se evita el coste de un `setInputState` por frame.

#### B.8 Sacudida de pantalla (P2-05)

```ts
// Si se añade un sistema dedicado, registrarlo en Presentation:
this.world.addSystem(new ScreenShakeSystem(), { phase: SystemPhase.Presentation });
```

**Por qué funciona:** `Juice.playHitJuice` ya emite la intención de shake; un sistema de presentación la consume y decae. Si no existe, el juego no falla, pero el efecto no se ve.

**Cuidado:** no mutar `Transform` desde `Presentation`; la sacudida debe ser un offset de cámara/render, no un cambio de posición de gameplay que entre en el snapshot.

---

### Anexo C — Índice de referencias

| Archivo | Líneas | Qué contiene | Hallazgos |
|---|---:|---|---|
| `src/games/vertical-shmup/VerticalShmupGame.ts` | 19–32 | Constructor, doble carga de config, registro de escena | P2-02 |
| `src/games/vertical-shmup/VerticalShmupGame.ts` | 38–45 | `setInputState` con `axes`/`actions` | P0-03, P1-05 |
| `src/games/vertical-shmup/VerticalShmupGame.ts` | 77–80 | Hook `shmup_speed` que muta la oleada | P2-03 |
| `src/games/vertical-shmup/scenes/ShmupGameScene.ts` | 25–53 | `onEnter`, spawn inicial, `ScreenConfig` | P0-02 |
| `src/games/vertical-shmup/scenes/ShmupGameScene.ts` | 55–71 | Registro de sistemas sin `HierarchySystem` | P0-01 |
| `src/games/vertical-shmup/EntityFactory.ts` | 10–37 | `createPlayer`, `Health` hardcodeado, `Set` | P1-05 |
| `src/games/vertical-shmup/EntityFactory.ts` | 39–140 | `createEnemy`, falta `Damage`, `Math.random` | P1-04, P2-01 |
| `src/games/vertical-shmup/EntityFactory.ts` | 132–137 | `BulletPattern.cooldownRemaining` con `Math.random` | P1-04 |
| `src/games/vertical-shmup/EntityPool.ts` | 4–29 | Capas y máscaras de proyectiles | P2-06 |
| `src/games/vertical-shmup/systems/ShmupInputSystem.ts` | 14–15 | Lectura muerta de `InputState` | P3-01 |
| `src/games/vertical-shmup/systems/ShmupInputSystem.ts` | 30–45 | Ejes, `Set`, touch | P1-05, P2-06 |
| `src/games/vertical-shmup/systems/ShmupInputSystem.ts` | 50–90 | Clamp, cooldown, disparo | P1-01 |
| `src/games/vertical-shmup/systems/ShmupCollisionSystem.ts` | 6–24 | Suscripción `combat:hit` con estado `subscribed` | P1-01, P1-02 |
| `src/games/vertical-shmup/systems/ShmupCollisionSystem.ts` | 26–43 | Muerte de enemigo, score, VFX | P1-01 |
| `src/games/vertical-shmup/systems/ShmupCollisionSystem.ts` | 45–64 | Muerte del jugador sin guardia | P1-01 |
| `src/games/vertical-shmup/systems/ShmupSpawnSystem.ts` | 18–39 | Avance de oleada y escuadrón | P2-04 |
| `src/games/vertical-shmup/systems/ShmupSpawnSystem.ts` | 41–59 | Spawn periódico y lectura de singleton | FP-01 |
| `src/games/vertical-shmup/systems/EnemyPathSystem.ts` | 6–20 | Movimiento `sine`/`arc` local | P0-01 |
| `src/games/vertical-shmup/systems/BulletPatternSystem.ts` | 8–26 | Disparo enemigo y aim | P2-01 |
| `src/games/vertical-shmup/types/ShmupTypes.ts` | 5–18 | Registro de componentes con `Set` | P1-05 |
| `src/games/vertical-shmup/types/ShmupConfigSchema.ts` | 3–36 | Claves, unidades, `COUNTDOWN`, `KEY_*` | P2-02 |
| `src/games/vertical-shmup/config/vertical-shmup.json` | 1–26 | Valores por defecto | P2-02 |
| `src/hooks/useKeyboardControls.ts` | 39–131 | Payload plano multi-juego | P0-03 |
| `src/hooks/useVerticalShmupGame.ts` | 10–17 | `useGame` y estado inicial | P1-03 |
| `src/app/vertical-shmup/index.tsx` | 29–39 | Doble camino de entrada | P0-03, P2-06 |
| `src/app/vertical-shmup/index.tsx` | 50–54 | `return null` en carga y vidas emoji | P3-04 |
| `src/app/vertical-shmup/index.tsx` | 55–99 | HUD y controles sin overlays | P1-03 |
| `packages/core/src/systems/HierarchySystem.ts` | 23–77 | Sistema que sincroniza `world*` | P0-01 |
| `packages/core/src/rendering/RendererUtils.ts` | 53–59 | `resolveViewportDimensions` con alias camelCase | P0-02 |
| `packages/renderer-canvas/src/CanvasRenderer.ts` | 304–330 | Cálculo de escala, offsets y clip | P0-02 |
| `packages/renderer-canvas/src/CanvasRenderer.ts` | 469–477 | Uso de `worldX/worldY` en render | P0-01 |
| `packages/core/src/physics/collision/CollisionSystems.ts` | — | Colisión basada en `worldX/worldY` | P0-01 |
| `packages/gameplay-kit/src/combat/systems/CombatSystem.ts` | 31–150 | Aplicación de daño, `Dead`, eventos diferidos | P1-02 |
| `packages/core/src/ecs/ComponentCloner.ts` | — | Clonado que no cubre `Set` | P1-05 |
| `packages/core/src/snapshots/SnapshotHash.ts` | — | Hash que serializa `Set` como `{}` | P1-05 |
| `bitacoras/BITACORA-vertical-shmup.md` | 36 | Claim de verificación de hash | P3-03 |

**Nota:** las líneas son del commit `e383d626`. Si el archivo cambia, el índice debe actualizarse en el mismo PR que el fix.

---

### Anexo D — Glosario

| Término | Definición | Relevancia en este documento |
|---|---|---|
| **ECS** | Entity Component System: entidades como ids, componentes como datos, sistemas como lógica. | Base del motor y del shmup. |
| **World** | Contenedor de entidades, componentes, recursos y sistemas. | `game.getWorld()`. |
| **Schedule / fase** | Orden de ejecución de sistemas por fases (`Input`, `Simulation`, `Transform`, `Collision`, `GameRules`, `Presentation`). | P0-01 es un fallo de fase. |
| **Sistema** | Unidad de lógica que muta componentes en `update`. | `ShmupInputSystem`, `ShmupCollisionSystem`, etc. |
| **Componente** | Datos serializables adjuntos a una entidad. | `Transform`, `Health`, `Input`, `ShmupEnemy`. |
| **Recurso** | Objeto compartido del mundo (`GameConfig`, `ScreenConfig`, pools). | P0-02 y P2-02. |
| **Singleton** | Componente único consultado por tipo (`ShmupGameState`). | P1-01 y FP-01. |
| **`worldX/worldY`** | Coordenadas de mundo calculadas por `HierarchySystem`. | P0-01. |
| **`x/y`** | Coordenadas locales de `Transform`. | Los sistemas de gameplay escriben aquí. |
| **`dirty`** | Flag que indica que un `Transform` debe recalcularse. | `EnemyPathSystem` lo marca; `HierarchySystem` lo limpia. |
| **Viewport** | Rectángulo lógico que el renderer escala a la pantalla. | P0-02. |
| **Letterboxing** | Barras/espacio extra al escalar manteniendo aspecto. | Efecto del viewport incorrecto. |
| **Determinismo** | Misma semilla + mismos inputs → mismo estado bit a bit. | P1-04, P1-05. |
| **Rollback** | Re-simular ticks pasados con inputs corregidos. | Requiere componentes serializables. |
| **Snapshot** | Copia del estado para red/rollback. | `Set` lo rompe. |
| **Hash** | Huella del estado para detectar divergencias. | P1-05 y P3-03. |
| **PRNG** | Generador pseudoaleatorio sembrado. | `world.gameplayRandom`. |
| **`gameplayRandom`** | PRNG determinista del mundo, bloqueado fuera de simulación. | P1-04. |
| **`renderRandom`** | PRNG para efectos visuales, no entra en el snapshot. | Uso recomendado para partículas. |
| **Pool** | Reutilización de entidades/balas para evitar GC. | `PlayerBulletPool`, `EnemyBulletPool`. |
| **TTL** | Time To Live; componente que destruye una entidad tras un tiempo. | Balas y VFX. |
| **Juice** | Efectos de feedback (hit-stop, flash, shake, recoil). | P2-05. |
| **Hit-stop** | Congelación breve de la simulación al impactar. | `GameplayFreeze`. |
| **Same-tick** | Dos o más eventos en el mismo tick de simulación. | P1-02. |
| **Invulnerabilidad** | Ventana en la que el jugador no recibe daño. | `Health.invulnerableRemaining`. |
| **Overlay** | Capa de UI sobre el canvas (pausa, game over). | P1-03. |
| **HUD** | Información persistente (score, oleada, vidas). | P3-04. |
| **Ratchet** | Umbral que impide que una métrica empeore. | Duplicación y typecheck. |
| **Gate** | Comando que debe pasar para integrar. | Sección 12.1. |

---

### Anexo E — Historial de este documento

| Fecha | Cambio | Autor |
|---|---|---|
| 2026-10-23 | Auditoría inicial: estructura, hallazgos P0–P3, plan de verificación y anexos | Auditoría estática + probes |

**Convención de mantenimiento:** este documento es un artefacto de auditoría, no una guía viva. Cuando un hallazgo se cierre, actualizar su estado en la tabla correspondiente y añadir la evidencia del test de regresión. No reescribir la historia de los probes; añadir una nota de cierre.

---

*Fin del documento.*


