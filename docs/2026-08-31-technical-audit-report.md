# Technical Audit & Architecture Evaluation Report

**Date:** 2026-08-31
**Role:** Staff / Principal Software Engineer
**Scope:** Architectural Analysis, Technical Debt Assessment, Quality & Maintainability Audit
**Repository:** Tiny Aster — Deterministic ECS Arcade Engine & Game Suite

---

## 1. Comprehensión del Sistema (Mental Model)

### Propósito y Dominio
**Tiny Aster** es un motor de juegos de arcade y suite multijuego (Asteroids, Space Invaders, Flappy Bird, Pong, Geometry Wars, Echo Runner) basado en una arquitectura **Entity-Component-System (ECS)** puramente determinista en TypeScript. Diseñado para soportar tanto renderizado multiplataforma (Web Canvas2D y Mobile Skia via React Native/Expo) como sincronización multijugador authoritative mediante redimensionamiento y reconciliación de estado en tiempo real (rollback netcode con Colyseus).

### Arquitectura Actual y Módulos
1. **Core Runtime (`packages/core`)**:
   - `World`, `Entity`, `Component`, `System`, `Schedule`, `CommandBuffers`.
   - Motor de física 2D (`SpatialHashGrid`, `BroadPhase`, `CollisionSystem2D`, `TileCollisionSystem`).
   - Gestión de snapshots (SoA - Structure of Arrays vs AoS - Array of Structures) y hashing determinista FNV-1a (`BaseGame`).
   - Event Bus determinista con soporte de emisión diferida (`emitDeferred`).
   - Abstracciones de sonido (`IAudioPlayer`) y entrada (`CanonicalInputState`).
2. **Backends de Renderizado (`@tiny-aster/renderer-canvas`, `@tiny-aster/renderer-skia`)**:
   - Capa de presentación desacoplada del bucle de gameplay. Implementan drawers específicos registrados mediante el contrato `Renderer<TRegistry, TCanvas>`.
3. **Servidor y Netcode (`server/`, `@tiny-aster/network-colyseus`)**:
   - Salones Colyseus (`BaseRoom`, `AsteroidsRoom`, `SpaceInvadersRoom`, etc.) que ejecutan la simulación determinista en modo headless en el servidor y replican estados o deltas a los clientes.
4. **Implementaciones de Juegos (`src/games/*`)**:
   - Lógica específica de cada título (`asteroids`, `space-invaders`, `pong`, `flappybird`, `geometrywars`, `echorunner`).
5. **Capa UI y App Shell (`src/app/*`, `src/components/*`, `src/story-ui/*`)**:
   - Interfaz de usuario React Native / Expo Router, diálogos de narrativa, menus y visualización de historias interactivos (`StoryGraph`).

### Tooling, Testing y CI/CD
- **Gestor de Paquetes & Workspaces**: `pnpm` v10 con workspaces y Turborepo (`turbo`).
- **Verificación de Invariantes & Calidad**:
  - `pnpm run ci`: Ejecuta `build:core`, `check:core-boundaries`, `check:ratchet`, `story:lint`, `docs:check` y `typecheck:app`.
  - `scripts/check-ecs-invariants.ts`: Detecta emisiones de eventos síncronos no deterministas durante los ticks del ECS.
  - `scripts/check-hardened-invariants.ts`: Detecta mutaciones directas de componentes sin pasar por `getMutableComponent()`.
  - `scripts/typecast-ratchet.ts`: Controla y previene el incremento de casts `as any` / `as unknown` mediante baseline json.
  - `scripts/ast-determinism-linter.ts`: Garantiza que el generador aleatorio en funciones de render provenga de `renderRandom` / `gameplayRandom`.

---

## 2. Detección de Oportunidades de Mejora

Se han identificado oportunidades prioritarias agrupadas en 5 ejes clave: **Determinismo & Netcode**, **Desacoplamiento & Arquitectura ECS**, **Rendimiento & Fugas de Memoria en Servidor**, **Calidad de Tipo & Mantenibilidad**, y **DX & Estructura del Monorepo**.

### Índice de Oportunidades

| ID | Título | Dominio | Prioridad |
|---|---|---|---|
| **OPP-01** | Antipatrón de Doble Instancia de `World` en `SpaceInvadersGame` | Arquitectura ECS | 🔴 Critical |
| **OPP-02** | Emisión Síncrona de Eventos en Sistemas (`eventBus.emit`) | Netcode / Determinismo | 🟠 High |
| **OPP-03** | Mutación Directa de Componentes que Elude el Seguimiento de Versiones ECS | ECS / Snapshots | 🟠 High |
| **OPP-04** | Fuga de Recursos en Servidor y Procesos de Test Forzados por `PerformanceObserver` | Servidor / Testing | 🟠 High |
| **OPP-05** | Juegos Monolíticos en `src/games/*` vs Paquetes Modulares en Workspace | Arquitectura Monorepo | 🟠 High |
| **OPP-06** | Duplicación de Implementaciones `NullGame` en Módulos de Juego | Mantenibilidad / DRY | 🟡 Medium |
| **OPP-07** | Adaptador e Ingesta Inconsistente de Entrada entre Clientes y Servidor | Arquitectura / DX | 🟡 Medium |
| **OPP-08** | Coste de Serialización JSON en Hashing Fallback AoS durante Resimulación | Rendimiento / Netcode | 🟡 Medium |
| **OPP-09** | Cobertura de Tipos e Incremento de Ratchet por `as any` en Netcode y Rooms | Type Safety | 🟡 Medium |
| **OPP-10** | Extracción Duplicada de Estado Común en Getters de Juegos Arcade | Calidad de Código | 🟢 Low |

---

## 3. Evaluación Detallada de Oportunidades

### OPP-01: Antipatrón de Doble Instancia de `World` en `SpaceInvadersGame`

* **Problema:** `SpaceInvadersGame` sobrescribe `getWorld()` para retornar `this.sceneManager.getCurrentScene().getWorld()`, mientras que la clase base `BaseGame` posee e inicializa su propia instancia `this.world`. Como resultado, existen dos mundos aislados. Operaciones críticas invadas desde el servidor o el bucle principal (`BaseGame.snapshot()`, `BaseGame.hash()`, `BaseGame.restore()`, `BaseGame.world.update()`) se ejecutan sobre un mundo vacío en lugar del mundo de la escena activa.
* **Evidencia:**
  - Archivo: `src/games/space-invaders/SpaceInvadersGame.ts` (`getWorld()`)
  - Consecuencia en servidor: `server/src/SpaceInvadersRoom.ts` debe reasignar manualmente `this.world = this.gameSimulation.getWorld()` en `spawnPlayer`, `despawnPlayer`, `tick` y `syncWorldToSchema`.
* **Por qué importa:** Rompe el hashing de rollback, las repeticiones (replays), la persistencia y la reconciliación netcode al invocar métodos estándar de `BaseGame`.
* **Impact:** 5/5
* **Esfuerzo estimado:** 2 días
* **Riesgo:** Medio
* **Propuesta de solución:** Refactorizar `SpaceInvadersGameScene` para recibir e interactuar sobre el `World` único gestionado por `BaseGame` en lugar de instanciar un `World` interno.
* **Alternativas:** Reenviar llamadas de snapshot/restore al mundo de la escena activa desde `BaseGame`, pero mantiene la violación de la fuente única de verdad.
* **Prioridad:** 🔴 Critical

---

### OPP-02: Emisión Síncrona de Eventos en Sistemas (`eventBus.emit`)

* **Problema:** Varios sistemas de simulación ejecutan `eventBus.emit()` de forma síncrona en lugar de `eventBus.emitDeferred()`. Esto provoca que los manejadores de eventos se ejecuten inmediatamente a mitad de la iteración de un tick de ECS, introduciendo mutaciones de componentes fuera de fase e invalidación de iteradores.
* **Evidencia:**
  - `scripts/check-ecs-invariants.ts` (12 advertencias activas en el código):
    - `src/games/flappybird/systems/FlappyBirdGameStateSystem.ts` (`PlaySFX`: score)
    - `src/games/flappybird/systems/FlappyBirdInputSystem.ts` (`PlaySFX`: flap)
    - `src/games/pong/systems/PongGameStateSystem.ts` (`PlaySFX`: hit, score, game_over)
    - `src/games/shared/arcade/systems/AchievementSystem.ts` (`achievement:unlocked`)
    - `src/games/space-invaders/systems/SpaceInvadersGameStateSystem.ts` (`stage:cleared`, `level:completed`, etc.)
* **Por qué importa:** Invalida el determinismo en la resimulación de rollback multijugador y genera inconsistencias en la reproducción de replays.
* **Impact:** 4/5
* **Esfuerzo estimado:** 0.5 días
* **Riesgo:** Bajo
* **Propuesta de solución:** Reemplazar las invocaciones `eventBus.emit()` dentro de rutinas `update()` por `eventBus.emitDeferred()`, asegurando su procesamiento al final del tick mediante `world.getEventBus().flushDeferred()`.
* **Alternativas:** Ninguna; `emitDeferred()` es el patrón estándar del core engine.
* **Prioridad:** 🟠 High

---

### OPP-03: Mutación Directa de Componentes que Elude el Seguimiento de Versiones ECS

* **Problema:** Múltiples sistemas físicos y de estado mutan directamente propiedades de componentes leídos via `getComponent()` en lugar de utilizar `getMutableComponent()`.
* **Evidencia:**
  - `scripts/check-hardened-invariants.ts` (27 ocurrencias detectadas en el core):
    - `packages/core/src/systems/InvulnerabilitySystem.ts`: `inv.remaining -= deltaTime`
    - `packages/core/src/systems/RenderUpdateSystem.ts`: `mutable.rotation += angularVelocity * deltaTime`
    - `packages/core/src/systems/RespawnSystem.ts`: `trans.x = respawnX`, `health.current = health.max`
    - `packages/core/src/physics/systems/BoundarySystem.ts`: `mt.x = 0`, `mt.x = b.width`
    - `packages/core/src/physics/systems/PlatformCarrySystem.ts`: `t.x += platformVel.vx * deltaTime`
* **Por qué importa:** Omitir `getMutableComponent()` evita que el `World` incremente `stateVersion`, impidiendo que el sistema de deltas de snapshots y los escuchadores reactivos de red detecten cambios en los componentes.
* **Impact:** 4/5
* **Esfuerzo estimado:** 1 día
* **Riesgo:** Bajo
* **Propuesta de solución:** Migrar todas las escrituras directas sobre propiedades de componentes en sistemas del core a `world.getMutableComponent()`.
* **Alternativas:** Usar `world.getCommandBuffer()` para escrituras diferidas cuando aplique.
* **Prioridad:** 🟠 High

---

### OPP-04: Fuga de Recursos en Servidor y Procesos de Test Forzados por `PerformanceObserver`

* **Problema:** Al ejecutar el test suite (`pnpm run test`), Jest emite la advertencia: *"A worker process has failed to exit gracefully and has been force exited. This is likely caused by tests leaking due to improper teardown."*.
* **Evidencia:**
  - Archivo: `server/src/metrics/NetworkMetrics.ts` (Instancias de `PerformanceObserver` observando eventos `"gc"` creadas por cada métrica sin desuscripción ni `disconnect()` global al destruir la room).
  - Archivos de salas: `server/src/AsteroidsRoom.ts` y `server/src/SpaceInvadersRoom.ts` (`onDispose()` no destruye explícitamente la simulación `gameSimulation.destroy()` ni detiene observadores).
* **Por qué importa:** En servidores authoritative de producción, la degradación de recursos y observadores de GC activos causan fuga progresiva de memoria en el heap de Node.js.
* **Impact:** 4/5
* **Esfuerzo estimado:** 1 día
* **Riesgo:** Bajo
* **Propuesta de solución:** Implementar la limpieza explícita de `PerformanceObserver` en `NetworkMetricsCollector.dispose()` y asegurar que `BaseRoom.onDispose()` llame incondicionalmente a `gameSimulation.destroy()`.
* **Alternativas:** Ignorar advertencias en Jest (no aceptable para servidores de alta disponibilidad).
* **Prioridad:** 🟠 High

---

### OPP-05: Juegos Monolíticos en `src/games/*` vs Paquetes Modulares en Workspace

* **Problema:** Todos los juegos residen directamente bajo `src/games/*` en el workspace raíz de la app, en lugar de estar encapsulados como paquetes modulares (`packages/games-*`).
* **Evidencia:**
  - Directorio raíz: `src/games/asteroids`, `src/games/space-invaders`, `src/games/pong`, `src/games/flappybird`, `src/games/geometrywars`, `src/games/echorunner`.
* **Por qué importa:** Cualquier cambio menor en un juego invalida las cachés de compilación y testing de Turborepo para todos los demás juegos, aumentando los tiempos de CI y dificultando la distribución individual de módulos.
* **Impact:** 4/5
* **Esfuerzo estimado:** 3 días
* **Riesgo:** Bajo
* **Propuesta de solución:** Extraer las carpetas de juegos a paquetes workspace (`packages/games-asteroids`, `packages/games-space-invaders`, etc.) consumidos via alias pnpm workspace (`@tiny-aster/games-asteroids`).
* **Alternativas:** Mantener estructura única utilizando filtros de rutas en Turborepo.
* **Prioridad:** 🟠 High

---

### OPP-06: Duplicación de Implementaciones `NullGame` en Módulos de Juego

* **Problema:** Múltiples módulos de juego duplican grandes clases de prueba/mock (`NullSpaceInvadersGame`, `NullAsteroidsGame`, `NullPongGame`) que reimplementan manualmente 20+ métodos de la interfaz `IGame` retornando valores nulos.
* **Evidencia:**
  - Archivos: `src/games/space-invaders/SpaceInvadersGame.ts` (líneas 583-630), `src/games/asteroids/AsteroidsGame.ts` (líneas 485-520).
* **Por me importa:** Duplicar estas stubs crea fricción cada vez que la interfaz `IGame` o `BaseGame` evoluciona, obligando a actualizar 4+ archivos manualmente.
* **Impact:** 3/5
* **Esfuerzo estimado:** 0.5 días
* **Riesgo:** Bajo
* **Propuesta de solución:** Crear una clase genérica `NullGame<TState, TInput>` en `@tiny-aster/core` que extienda `BaseGame` con configuración headless predeterminada.
* **Alternativas:** Derivar mocks de cada juego desde una base común `BaseNullGame`.
* **Prioridad:** 🟡 Medium

---

### OPP-07: Adaptador e Ingesta Inconsistente de Entrada entre Clientes y Servidor

* **Problema:** Cada controlador de juego procesa e ingesta tramas de entrada (`CanonicalInputState`, `InputFrame`, `InputState`, mapeos de acciones) mediante estructuras y validaciones ad-hoc con asunciones de tipo `as any`.
* **Evidencia:**
  - Archivos: `SpaceInvadersGame.ts` (`setInputState`), `AsteroidsGame.ts` (`setInputState`), `PongGame.ts` (`setInputState`).
* **Por qué importa:** Aumenta la superficie de errores al integrar nuevos periféricos (gamepads, joysticks táctiles) o al añadir salas multijugador adicionales.
* **Impact:** 3/5
* **Esfuerzo estimado:** 1 día
* **Riesgo:** Bajo
* **Propuesta de solución:** Normalizar la interfaz `InputAdapter<TInput>` en `@tiny-aster/core` que transforme `CanonicalInputState` a componentes `Input` deterministas por tick.
* **Alternativas:** Mantener métodos por juego pero centralizar parsers helper.
* **Prioridad:** 🟡 Medium

---

### OPP-08: Coste de Serialización JSON en Hashing Fallback AoS durante Resimulación

* **Problema:** Para snapshots de tipo Array of Structures (`isSoA === false`), `BaseGame.hash()` utiliza `hashAoS`, el cual ejecuta `JSON.stringify()` sobre todo el estado del mundo para generar el hash FNV-1a.
* **Evidencia:**
  - Archivo: `packages/core/src/runtime/BaseGame.ts` (`hash()`)
  - Archivo: `packages/core/src/snapshots/SnapshotHash.ts` (`hashAoS`)
* **Por qué importa:** La ejecución de `JSON.stringify()` en cada tick durante reconciliaciones de rollback genera asignaciones masivas de memoria en el garbage collector y caídas de rendimiento.
* **Impact:** 3/5
* **Esfuerzo estimado:** 1.5 días
* **Riesgo:** Medio
* **Propuesta de solución:** Forzar `UseSoASnapshots = true` en todos los juegos o implementar un buffer binario numérico de hashing sin asignaciones de objetos.
* **Alternativas:** Cachear el hash cuando el `stateVersion` del mundo no haya cambiado.
* **Prioridad:** 🟡 Medium

---

### OPP-09: Cobertura de Tipos e Incremento de Ratchet por `as any` en Netcode y Rooms

* **Problema:** El repositorio mantiene 600+ referencias a casts `as any`, registradas y limitadas por `scripts/typecast-baseline.json`.
* **Evidencia:**
  - Baseline: `scripts/typecast-baseline.json`
  - Concentración: `CombatRollbackResimulation.test.ts` (80), `SpaceInvadersGame.ts` (49), `AsteroidsGame.ts` (42), `BaseRoom.ts` (33).
* **Por qué importa:** Elimina las garantías del compilador TypeScript en capas críticas de simulación de red y gestión de salas Colyseus.
* **Impact:** 3/5
* **Esfuerzo estimado:** 2 días
* **Riesgo:** Bajo
* **Propuesta de solución:** Sustituir gradualmente casts `as any` por tipos genéricos estrictos y esquemas Zod en los getters de estado y rooms, reduciendo la baseline con `pnpm ratchet:update`.
* **Alternativas:** Congelar la baseline actual y evitar únicamente nuevos incrementos.
* **Prioridad:** 🟡 Medium

---

### OPP-10: Extracción Duplicada de Estado Común en Getters de Juegos Arcade

* **Problema:** Los métodos `getGameState()` en `SpaceInvadersGame`, `AsteroidsGame` y `GeometryWarsGame` repiten bloques idénticos de 30+ líneas para extraer `Combo`, `DialogueBox`, `RunMutatorChoices` y `ActiveRunMutators`.
* **Evidencia:**
  - Archivos: `SpaceInvadersGame.ts` (`getGameState`), `AsteroidsGame.ts` (`getGameState`).
* **Por qué importa:** Duplicación redundante que incrementa el coste de mantenimiento y la probabilidad de inconsistencias en la capa de UI.
* **Impact:** 2/5
* **Esfuerzo estimado:** 0.5 días
* **Riesgo:** Bajo
* **Propuesta de solución:** Extraer un helper `GameStateExtractor` en `@tiny-aster/core` o `src/games/shared` para poblar campos compartidos de estado.
* **Alternativas:** Mantener getters individuales por juego.
* **Prioridad:** 🟢 Low

---

## 4. Mejoras Rápidas (Quick Wins)

1. **Migración de `eventBus.emit` a `emitDeferred` (OPP-02):**
   - Resuelve de forma inmediata las 12 advertencias de determinismo ECS en Flappy Bird, Pong, Space Invaders y AchievementSystem.
2. **Clase Genérica `BaseNullGame` (OPP-06):**
   - Elimina ~200 líneas de código duplicado de clases mock en `SpaceInvadersGame.ts`, `AsteroidsGame.ts` y `PongGame.ts`.
3. **Limpieza Explícita de `PerformanceObserver` en Servidor (OPP-04):**
   - Desconecta los observadores de GC en `NetworkMetrics.ts` al cerrar salas, eliminando la advertencia de fuga de procesos en Jest (`pnpm run test`).
4. **Helper Compartido `GameStateExtractor` (OPP-10):**
   - Centraliza la extracción de combos y diálogos para la interfaz UI en todos los juegos arcade.

---

## 5. Mejoras Arquitectónicas

### Mejora Arquitectónica 1: Arquitectura de Unico Mundo ECS para Controladores de Juego

* **Problema Actual:** `SpaceInvadersGame` gestiona una instancia secundaria de `World` dentro de `SpaceInvadersGameScene`, desvinculando la simulación real de `BaseGame.world`.
* **Arquitectura Actual:**
  `BaseGame.world` (vacío / desincronizado) vs `SpaceInvadersGameScene.world` (activo).
* **Arquitectura Propuesta:**
  - `BaseGame` posee la instancia única e inmutable de `World`.
  - Las escenas se registran y desregistran dentro del mismo `World` sin instanciar mundos secundarios.
* **Ventajas:** Garantiza la fuente única de verdad; snapshots, reconciliación netcode y hashing operan transparente y correctamente.
* **Trade-offs:** Requiere refactorizar ligeramente la inicialización de escenas en `SpaceInvadersGameScene`.
* **Migración Incremental:** Inyectar `BaseGame.world` en los constructores de escenas de Space Invaders y deprecar la creación de mundos internos.

### Mejora Arquitectónica 2: Modularización de Juegos en Paquetes Workspace (`packages/games-*`)

* **Problema Actual:** Todos los juegos comparten el paquete raíz de la app en `src/games/*`.
* **Arquitectura Actual:**
  Un solo paquete monolítico para todos los juegos y el frontend.
* **Arquitectura Propuesta:**
  - Mover cada juego a su propio paquete: `packages/games-asteroids`, `packages/games-space-invaders`, etc.
  - Consumirlos como dependencias mediante pnpm workspaces (`@tiny-aster/games-asteroids`).
* **Ventajas:** Maximiza la efectividad del almacenamiento en caché de Turborepo, permite tests unitarios aislados por juego (`pnpm --filter=@tiny-aster/games-asteroids test`) y acelera los pipelines de CI.
* **Trade-offs:** Ligeras adiciones de archivos `package.json` y `tsconfig.json` por cada paquete.
* **Migración Incremental:** Extraer primero el juego con menos dependencias (ej. `pong`), validar el workspace y proceder con el resto.

---

## 6. Top 10 Oportunidades Priorizadas

Ordenadas por relación **Impacto / Esfuerzo / Riesgo**:

1. **OPP-01: Antipatrón de Doble Instancia de `World` en `SpaceInvadersGame`** (🔴 Critical)
2. **OPP-02: Emisión Síncrona de Eventos (`eventBus.emit`) en Sistemas** (🟠 High)
3. **OPP-04: Fuga de Recursos en Servidor y Procesos de Test Forzados** (🟠 High)
4. **OPP-03: Mutación Directa de Componentes sin `getMutableComponent()`** (🟠 High)
5. **OPP-06: Clase Genérica `BaseNullGame`** (🟡 Medium - Quick Win)
6. **OPP-07: Normalización de Entrada mediante `InputAdapter`** (🟡 Medium)
7. **OPP-08: Serialización de Hashing Binario sin Asignación de Objetos** (🟡 Medium)
8. **OPP-05: Modularización de Juegos en `packages/games-*`** (🟠 High)
9. **OPP-09: Reducción de Ratchet Baseline de `as any`** (🟡 Medium)
10. **OPP-10: Helper Compartido `GameStateExtractor`** (🟢 Low - Quick Win)

---

## 7. Propuesta de Roadmap de Ejecución

```
Phase 1 — Quick Wins (Semana 1)
  ├── OPP-02: Migrar eventBus.emit -> emitDeferred en sistemas de simulación
  ├── OPP-04: Reparar fuga de PerformanceObserver y teardown en salas del servidor
  ├── OPP-06: Sustituir mocks NullGame por clase genérica BaseNullGame en @tiny-aster/core
  └── OPP-10: Extraer helper compartido GameStateExtractor para la UI de juegos

Phase 2 — Mantenibilidad & Gates de Calidad (Semana 2)
  ├── OPP-01: Refactorizar SpaceInvadersGame a arquitectura de World único
  ├── OPP-03: Corregir escrituras directas de componentes con getMutableComponent()
  └── OPP-09: Reducir baseline de 'as any' en netcode y salas Colyseus

Phase 3 — Mejoras Arquitectónicas (Semana 3)
  ├── OPP-07: Implementar contrato unificado InputAdapter para ingesta de tramas
  └── OPP-08: Hashing binario sin asignaciones en resimulaciones de rollback

Phase 4 — Evolución a Largo Plazo (Semana 4+)
  └── OPP-05: Modularizar juegos en paquetes workspace (packages/games-*)
```
