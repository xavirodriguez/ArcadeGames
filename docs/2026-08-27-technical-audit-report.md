# 🔬 Reporte de Auditoría Técnica, Calidad de Código y Evaluación Arquitectónica — Tiny Aster Engine

**Rol:** Staff / Principal Software Engineer (Especialista en Arquitectura, Calidad y Evolución de Sistemas)
**Fecha:** 27 de agosto de 2026
**Proyecto:** Tiny Aster — Deterministic ECS Arcade Engine & Multiplatform Suite

---

## 1. Comprensión del Proyecto y Modelo Mental

### Propósito y Dominio
**Tiny Aster** es una suite multiplataforma (Web HTML5 Canvas y React Native Expo / Skia) de juegos arcade retro (*Asteroids*, *Space Invaders*, *Flappy Bird*, *Pong*, *Geometry Wars*, *Echo Runner*, *Platformer*) con soporte para multijugador autoritativo mediante la librería **Colyseus** y netcode basado en rollback/reconciliación.

El diseño del proyecto busca desacoplar estrictamente la lógica de simulación física y ECS de los frameworks de renderizado y UI:
- El núcleo (`@tiny-aster/core`) es agnóstico a la plataforma de ejecución.
- El determinismo de la simulación se garantiza mediante semillas aleatorias explícitas (`world.gameplayRandom` para lógica y `world.renderRandom` para efectos visuales), lo que permite reproducciones (*replays*) y pruebas sin interfaz (*headless*).

### Arquitectura Actual y Estructura de Módulos
- **`packages/core` (`@tiny-aster/core`)**: Motor Entity-Component-System (ECS) en 2D, pools de memoria reutilizables (`ComponentSetPool`, `PrefabPool`), serialización e interpolación SoA (Structure of Arrays), bus de eventos síncrono/diferido (`EventBus`), y runtime narrativo de encuentros (`StoryRuntime`, `StoryGraph`, `NarrativeDirector`).
- **`packages/renderer-canvas` & `packages/renderer-skia`**: Adaptadores de renderizado 2D para Canvas de HTML5 y React Native Skia.
- **`packages/network` & `packages/network-colyseus`**: Abstracciones de transporte y cliente multijugador autoritativo.
- **`server/`**: Servidor de salas de juego autoritativas ejecutadas en Node.js sobre la misma simulación de `@tiny-aster/core`.
- **`src/games/*` & `src/app/`**: Implementación de mecánicas de juego concretas, adaptadores de historia (`EscapeRouteEncounter`, `PongEncounter`, etc.) y UI React Native Expo.

---

## 2. Diagnóstico de Oportunidades y Problemas Sistémicos

Durante el análisis del repositorio se identificaron las siguientes oportunidades y problemas sistémicos clave:

1. **Emisión de Eventos Síncronos dentro de Hot Loops de Sistemas ECS**:
   - Ocurrencias de `eventBus.emit()` en sistemas de física y estado (`TileCollisionSystem.ts`, `PongGameStateSystem.ts`, `SpaceInvadersGameStateSystem.ts`, `LootSystem.ts`).
   - *Riesgo*: Invocar callbacks síncronos en medio de la iteración de entidades puede causar mutación de colecciones activas, romper el determinismo o provocar bugs en partidas multijugador.

2. **Fugas de Timers y Cierre No Graceful en Tests del Servidor Colyseus**:
   - `server/src/__tests__/` muestra advertencias de Jest donde los procesos worker son forzados a salir debido a temporizadores activos no limpiados al destruir las salas en los bloques `afterEach`.

3. **Mantenimiento del Snapshot de la API Pública (`docs:check`)**:
   - Las exportaciones públicas de `@tiny-aster/core` deben sincronizarse estrictamente con `etc/asteroides.api.md` usando `pnpm docs:extract` cuando cambien, evitando fallos en la integración continua.

4. **Desacoplamiento Gradual del Subsistema Narrativo (`packages/core/src/story/`)**:
   - Aunque `packages/core/src/story/` cumple las reglas de límites sin importar dependencias externas, colocar el runtime narrativo dentro del paquete core del motor ECS genera acoplamiento conceptual. La extracción a `@tiny-aster/story` es la ruta arquitectónica recomendada a medio plazo.

5. **Eliminación de Typecast Ratchets (`as any` / `as unknown`)**:
   - Existen 1438 type assertions congelados en el baseline (`scripts/typecast-baseline.json`). Se requiere una estrategia continua para reducir las aserciones `as any` en módulos críticos como `NetworkManager.ts` y `StoryRuntime.ts`.

---

## 3. Catálogo Detallado de Oportunidades

### OP-1: Migración de Emisiones Síncronas a `eventBus.emitDeferred` en Sistemas Hot Loop
* **Título**: Reemplazar `eventBus.emit` por `eventBus.emitDeferred` en sistemas ECS de física y colisiones.
* **Problema**: Eventos como `spike:hit` en `TileCollisionSystem.ts` y SFX en sistemas de estado emiten eventos síncronos mientras los iteradores de entidades siguen activos.
* **Evidencia**: `packages/core/src/physics/systems/TileCollisionSystem.ts:231`, `src/games/shared/arcade/systems/LootSystem.ts:50`.
* **Por qué importa**: Protege contra mutaciones inesperadas de componentes durante la iteración y garantiza la estabilidad del netcode de rollback.
* **Impacto**: 🔴 Critical
* **Esfuerzo estimado**: 🟡 Medio (2-3 horas)
* **Riesgo**: 🟢 Bajo
* **Propuesta de solución**: Reemplazar llamadas síncronas por `eventBus.emitDeferred(...)` en todos los `System.update()` que corren cada tick.
* **Alternativas**: Mantener buffers manuales de eventos en cada juego (duplicación de código).
* **Prioridad**: 🔴 Critical

### OP-2: Teardown Explicito y Cierre Limpio en Tests de Servidor (`server/src/__tests__`)
* **Título**: Limpieza rigurosa de simuladores ECS y temporizadores en los tests de Jest del servidor.
* **Problema**: Jest emite advertencias `A worker process has failed to exit gracefully` al terminar la ejecución de tests de salas Colyseus (`AsteroidsRoom.test.ts`, `PongRoom.test.ts`, `FlappyBirdRoom.test.ts`).
* **Evidencia**: Salida de `pnpm test` en `server/src/__tests__/`.
* **Por qué importa**: Evita falsos positivos y ejecuciones intermitentes (*flaky tests*) en el pipeline de CI/CD.
* **Impacto**: 🟠 High
* **Esfuerzo estimado**: 🟡 Bajo-Medio (1-2 horas)
* **Riesgo**: 🟢 Bajo
* **Propuesta de solución**: Asegurar que en los bloques `afterEach` o `afterAll` se invoque `room.onDispose()`, limpiando el bucle de ticks ECS con `unref()` o `clearInterval()`.
* **Prioridad**: 🟠 High

### OP-3: Automatización y Sincronización del Snapshot de API Extractor (`etc/asteroides.api.md`)
* **Título**: Preservación del contrato de API pública del motor mediante `docs:extract`.
* **Problema**: Cambios en métodos o interfaces exportadas en `@tiny-aster/core` pueden desincronizar `etc/asteroides.api.md`, haciendo fallar `pnpm run ci`.
* **Evidencia**: Script `docs:check` en `package.json` y reporte de `api-extractor`.
* **Por qué importa**: Asegura la estabilidad semántica de la biblioteca core y evita rupturas inadvertidas de API.
* **Impacto**: 🔴 Critical
* **Esfuerzo estimado**: 🟢 Muy Bajo (5 mins)
* **Riesgo**: 🟢 Nulo
* **Propuesta de solución**: Ejecutar `pnpm docs:extract` tras cualquier cambio en la API pública e incluir el archivo resultante en el control de versiones.
* **Prioridad**: 🔴 Critical

### OP-4: Extracción Incremental de `@tiny-aster/story` como Paquete Independiente
* **Título**: Modularización del subsistema narrativo fuera de `@tiny-aster/core`.
* **Problema**: `packages/core/src/story/` aloja la lógica de grafos de historia y DSL de encuentros dentro del paquete principal del motor ECS.
* **Evidencia**: `AGENTS.md` (Sección "Visión Arquitectónica Futura") y directorio `packages/core/src/story/`.
* **Por qué importa**: Reduce el tamaño del motor ECS base para usos puramente arcade sin narrativa y clarifica los límites del dominio.
* **Impacto**: 🟡 Medium
* **Esfuerzo estimado**: 🔴 Alto (1-2 semanas)
* **Riesgo**: 🟡 Medio
* **Propuesta de solución**: Mover `packages/core/src/story` a un nuevo paquete de workspace `packages/story` (`@tiny-aster/story`).
* **Prioridad**: 🟡 Medium

---

## 4. Ganancias Rápidas (Quick Wins)

1. **QW-1**: Ejecutar `pnpm docs:extract` tras cambios en la superficie pública de `@tiny-aster/core` para mantener `etc/asteroides.api.md` en paridad exacta.
2. **QW-2**: Reemplazar emisiones síncronas de colisión en `TileCollisionSystem.ts` por `eventBus.emitDeferred()`.
3. **QW-3**: Implementar teardown exhaustivo de intervalos en `server/src/__tests__/` para eliminar las advertencias de Jest worker processes.
4. **QW-4**: Ejecutar `pnpm ratchet:update` cuando se logren reducciones en type assertions para fijar el progreso de tipado estricto.

---

## 5. Mejoras Arquitectónicas

### MA-1: Adopción Completa de Eventos Diferidos (`emitDeferred`) en Sistemas ECS
- **Problema Actual**: Varias colisiones y eventos de juego invocan `eventBus.emit()` directamente dentro del ciclo `update()` del motor.
- **Arquitectura Propuesta**: Utilizar exclusivamente `eventBus.emitDeferred()` dentro de cualquier `System.update()`, procesando la cola de eventos al finalizar la fase del tick.
- **Ventajas**: Garantiza inmutabilidad de colecciones de entidades durante el frame de simulación y evita desincronizaciones en el netcode de rollback.
- **Migración Incremental**: Refactorizar sistema por sistema comenzando con colisiones y físicas (`packages/core/src/physics/systems/`).

### MA-2: Extracción del Dominio Narrativo a Paquete Dedicado (`@tiny-aster/story`)
- **Problema Actual**: Lógica DSL narrativa y runtime de encuentros residen en `@tiny-aster/core`.
- **Arquitectura Propuesta**: Crear `packages/story` con las utilidades de `StoryRuntime`, `StoryGraph` y `SemanticValidator`.
- **Ventajas**: Menor footprint en `@tiny-aster/core` y reutilización modular en aplicaciones sin campaña.
- **Migración Incremental**: Crear el paquete workspace, re-exportar desde core de forma deprecada y migrar los minijuegos progresivamente.

---

## 6. Top 10 Oportunidades de Mejora

| # | Título | Área | Impacto | Esfuerzo | Riesgo | Prioridad |
|---|--------|------|---------|----------|--------|-----------|
| **1** | Migrar `eventBus.emit` a `emitDeferred` en sistemas ECS | Core / Netcode | 🔴 Alto | 🟡 Medio | 🟢 Bajo | 🔴 Critical |
| **2** | Sincronización automática de API Extractor (`etc/asteroides.api.md`) | CI / Docs | 🔴 Alto | 🟢 Muy Bajo | 🟢 Nulo | 🔴 Critical |
| **3** | Eliminar fugas de timers en tests del servidor Colyseus | Testing / Server | 🟠 Alto | 🟡 Bajo | 🟢 Bajo | 🟠 High |
| **4** | Reducción del ratchet de aserciones `as any` en `NetworkManager.ts` | Tipado | 🟠 Alto | 🟡 Medio | 🟢 Bajo | 🟠 High |
| **5** | Extracción del paquete narrativo `@tiny-aster/story` | Arquitectura | 🟡 Alto | 🔴 Alto | 🟡 Medio | 🟡 Medium |
| **6** | Modularización de juegos en subpaquetes workspace (`packages/games-*`) | Arquitectura | 🟡 Alto | 🔴 Alto | 🟡 Medio | 🟡 Medium |
| **7** | Optimización SoA de cero asignaciones en snapshots de reconciliación | Rendimiento | 🟠 Alto | 🟡 Medio | 🟡 Medio | 🟠 High |
| **8** | Estandarización de componentes UI compartidos (`src/components/ui/`) | Frontend / DX | 🟢 Medio | 🟡 Medio | 🟢 Bajo | 🟢 Low |
| **9** | Panel unificado de métricas de telemetría cliente/servidor | Observabilidad | 🟢 Medio | 🔴 Alto | 🟢 Bajo | 🟢 Low |
| **10**| Ampliación de tests deterministas headless para netcode rollback | Testing | 🟠 Alto | 🟡 Medio | 🟢 Bajo | 🟠 High |

---

## 7. Proposal Roadmap

### Phase 1 — Quick Wins (Inmediato)
- [ ] Asegurar paridad en `etc/asteroides.api.md` con `pnpm docs:extract`.
- [ ] Refactorizar `TileCollisionSystem.ts` para usar `emitDeferred()`.
- [ ] Limpiar temporizadores en `server/src/__tests__/` para lograr teardown transparente en Jest.

### Phase 2 — Maintainability & Safety (Semana 1)
- [ ] Reemplazar llamadas síncronas a `eventBus.emit` en los sistemas ECS de minijuegos.
- [ ] Disminución progresiva del conteo de `as any` en `NetworkManager.ts` y actualización del baseline ratchet.

### Phase 3 — Architectural Improvements (Semana 2)
- [ ] Preparación y extracción de `@tiny-aster/story` a su paquete workspace dedicado.
- [ ] Evaluación de empaquetado por juegos en `packages/games-*`.

### Phase 4 — Long-term Evolution (Semana 3+)
- [ ] Implementación de panel de telemetría y métricas de rendimiento en tiempo real.
- [ ] Cobertura extendida de suites de prueba end-to-end para reconciliación multijugador.

---

> **Conclusión Estratégica:**
> *"La arquitectura del motor Tiny Aster presenta un nivel elevado de disciplina en separación de límites y determinismo. Para maximizar el retorno de inversión en calidad y mantenibilidad, la prioridad debe enfocarse en blindar la emisión de eventos diferidos en hot loops, garantizar que la suite de tests del servidor libere recursos limpiamente sin leaks y mantener sincronizada la superficie pública de API Extractor."*
