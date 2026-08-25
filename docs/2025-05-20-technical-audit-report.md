# 🔬 Reporte de Auditoría Técnica y Diagnóstico de Arquitectura — Tiny Aster Engine

**Rol:** Staff / Principal Software Engineer
**Fecha:** 20 de mayo de 2025
**Proyecto:** Tiny Aster — Deterministic ECS Arcade Engine & Web/Mobile Platform

---

## 1. Comprensión del Sistema y Modelo Mental

### Propósito y Dominio
**Tiny Aster** es un motor de videojuegos arcade multijugador y multiplataforma (Web/React Native Expo) escrito en TypeScript. El núcleo del sistema implementa un motor **ECS (Entity-Component-System)** determinista desacoplado de la plataforma de renderizado y comunicación de red. El sistema soporta 4 juegos retro principales (*Asteroids*, *Space Invaders*, *Flappy Bird*, *Pong*) más prototipos adicionales (*Geometry Wars*, *Echo Runner*, *Platformer*), renderizado dual (HTML5 Canvas 2D y React Native Skia), y multijugador autoritativo basado en **Colyseus**.

### Arquitectura Actual
- **`packages/core` (`@tiny-aster/core`)**: Núcleo agnóstico de la plataforma. Contiene la simulación ECS (`World`, `Query`, `Schedule`, `ComponentSetPool`), físicas 2D, snapshots e interpolación/rollback, audio abstracto (`IAudioPlayer`), bus de eventos (`EventBus`), árbol de decisiones/narrativa (`StoryGraph`, `NarrativeDirector`), y ciclo de vida (`BaseGame`, `Simulation`).
- **`packages/renderer-canvas` & `packages/renderer-skia`**: Adaptadores de renderizado intercambiables basados en contratos de dibujado (`registerShape`, `registerBackgroundEffect`).
- **`packages/network` & `packages/network-colyseus`**: Abstracciones de transporte de red y sincronización cliente-servidor.
- **`server/`**: Servidor de juego autoritativo basado en Colyseus Rooms que ejecuta la misma simulación `@tiny-aster/core` headless.
- **`src/games/*` & `src/app/`**: Reglas específicas de juegos y shell de la aplicación React Native Expo Router.

### Convenciones y Límites Arquitectónicos
- **Límite Estricto de Core**: Verificado mediante el script `pnpm check:core-boundaries`, asegurando que `packages/core` nunca importe módulos de React Native, Expo, Skia, Colyseus o `src/games`.
- **Linter de Determinismo**: `scripts/ast-determinism-linter.ts` verifica que las funciones puras de simulación utilicen `world.gameplayRandom` o `world.renderRandom` en lugar de `Math.random()`.
- **Ratchet de Typecast**: `scripts/typecast-ratchet.ts` impide el incremento de assertions `as any` y `as unknown`.

---

## 2. Detección de Oportunidades y Diagnóstico de Señales

A través de la ejecución de linters estáticos, inspección del suite de pruebas (`pnpm test`), auditorías de tipos (`scripts/audit-any.ts`), verificadores de invariantes ECS (`scripts/check-ecs-invariants.ts`) y análisis de pipeline CI (`pnpm run ci`), hemos identificado las siguientes oportunidades clave de mejora.

---

## 3. Quick Wins (Ganancias Rápidas de Alto Impacto)

### QW-1: Corregir Fallo en CI Pipeline (`docs:check` / `asteroides.api.md`)
* **Título**: Alineación de API Extractor Report y corrección de pipeline CI
* **Problema**: La ejecución de `pnpm run ci` falla en el paso `docs:check` porque el archivo de reporte API `etc/asteroides.api.md` no se encuentra generado en la carpeta `etc/`.
* **Evidencia**: `package.json` ejecuta `pnpm exec api-extractor run` en `docs:check`, requiriendo que `temp/asteroides.api.md` coincida con `etc/asteroides.api.md`.
* **Por qué importa**: Impide que el pipeline de integración continua pase de forma limpia en local y en servidor CI.
* **Impacto**: Alto (Desbloquea el CI para todo el equipo).
* **Esfuerzo estimado**: Muy Bajo (10 minutos).
* **Riesgo**: Nulo.
* **Propuesta de solución**: Ejecutar `pnpm docs:extract` para generar `etc/asteroides.api.md` o sincronizar el script `docs:check` para que genere el snapshot inicial cuando no exista.
* **Alternativas**: Desactivar `docs:check` en CI (no recomendado).
* **Prioridad**: 🔴 Critical

### QW-2: Marcar Nodos Terminales (`isEndNode`) en Gráfos Narrativos
* **Título**: Limpieza de advertencias de nodos sin salida en `StoryGraphValidator`
* **Problema**: El linter narrativo (`pnpm story:lint`) emite 5 advertencias de "nodo callejón sin salida" en los grafos de *Asteroids*, *Space Invaders*, *Pong* y *Flappy Bird*.
* **Evidencia**: `src/games/shared/story/StoryGraphs.ts`: Nodos `ast_cutscene_aggressive`, `ast_cutscene_stealth`, `si_cutscene_victory`, `pong_cutscene_champ`, `fb_cutscene_freedom` no tienen transiciones ni la propiedad `isEndNode: true`.
* **Por qué importa**: Elimina ruido en logs de compilación y asegura que la validación semántica de la narrativa diferencie entre errores reales de ramas incompletas y finales de campaña intencionados.
* **Impacto**: Medio.
* **Esfuerzo estimado**: Muy Bajo (15 minutos).
* **Riesgo**: Nulo.
* **Propuesta de solución**: Agregar `isEndNode: true` a los nodos de corte/victoria en `StoryGraphs.ts`.
* **Prioridad**: 🟠 High

### QW-3: Reemplazar la Instanciación por Defecto de `UnifiedInputSystem` Deprecado
* **Título**: Eliminación de advertencias por deprecación de `UnifiedInputSystem` en tests
* **Problema**: El constructor de `BaseGame.ts` instancia `new UnifiedInputSystem()` por defecto si no se pasa `inputSystem`, lo que imprime advertencias `console.warn` en cada suite de test.
* **Evidencia**: `packages/core/src/runtime/BaseGame.ts:293` instanciar `UnifiedInputSystem`.
* **Por qué importa**: Elimina docenas de logs de advertencia en la consola durante los tests del servidor y facilita la adopción del nuevo puente de entrada (`setInputState`).
* **Impacto**: Medio.
* **Esfuerzo estimado**: Bajo (1 hora).
* **Riesgo**: Bajo.
* **Propuesta de solución**: Proveer un adaptador nulo de entrada o una implementación ligera por defecto sin warning para entornos headless y tests.
* **Prioridad**: 🟠 High

### QW-4: Limpieza de Open Handles y Timers en Tests del Servidor Colyseus
* **Título**: Eliminación de fuga de recursos/handles asíncronos en Jest
* **Problema**: La ejecución de `pnpm test` en el servidor Colyseus termina con el aviso: `A worker process has failed to exit gracefully and has been force exited...`.
* **Evidencia**: `server/src/__tests__/AsteroidsRoom.test.ts` y `GeometryWarsMultiplayer.test.ts` mantienen timers activos de simulación al finalizar el test.
* **Por qué importa**: Previene test suites intermitentes o "colgadas" en entornos de integración continua.
* **Impacto**: Alto.
* **Esfuerzo estimado**: Bajo-Medio (2 horas).
* **Riesgo**: Bajo.
* **Propuesta de solución**: Asegurar que `room.disconnect()` o `game.destroy()` se llamen de forma exhaustiva en los bloques `afterEach` / `afterAll`.
* **Prioridad**: 🟠 High

---

## 4. Mejoras Arquitectónicas

### MA-1: Migración de `EventBus.emit()` Síncrono a `emitDeferred()` en Sistemas ECS
* **Problema Actual**: 21 invocaciones dentro del ciclo de actualización de los sistemas de juego (p. ej. `FlappyBirdCollisionSystem`, `PongCollisionSystem`, `SpaceInvadersCollisionSystem`) llaman a `eventBus.emit(...)` de forma síncrona.
* **Arquitectura Actual**: Las emisiones síncronas ejecutan listeners e interrupciones de código inmediatamente en medio de la iteración sobre componentes.
* **Arquitectura Propuesta**: Utilizar `eventBus.emitDeferred(...)` o encolar eventos de gameplay para que sean despachados al finalizar la fase de simulación (fase PostUpdate/Render).
* **Ventajas**: Garantiza el determinismo en la reconciliación de red/rollback, evita mutaciones reentrantes no deseadas durante la iteración sobre arreglos de componentes.
* **Trade-offs**: Los listeners no reaccionan en la misma línea de código, sino al final del frame de simulación (comportamiento estándar en motores de juegos profesionales).
* **Migración Incremental**: Reemplazar invocaciones de `PlaySFX`, `stage:cleared`, y `game_over` en los sistemas de física/colisión por `emitDeferred()`.
* **Prioridad**: 🔴 Critical

### MA-2: Optimización del Cálculo de Hash de Simulación en `BaseGame.hash()`
* **Problema Actual**: `BaseGame.hash()` utiliza `JSON.stringify` recursivo con ordenamiento dinámico de claves de objetos en cada paso de verificación de snapshot/rollback.
* **Arquitectura Actual**: Serialización en cadena basada en objetos JS dinámicos.
* **Arquitectura Propuesta**: Cálculo directo de hash numérico FNV-1a / MurmurHash3 iterando arreglos SoA (Structure of Arrays) en memoria binaria sin asignación de strings en el Heap.
* **Ventajas**: Reduce significativamente la recolección de basura (GC pauses) y el consumo de CPU durante partidas multijugador a 60 FPS.
* **Trade-offs**: Requiere adaptar el hash para leer buffers TypedArrays directamente.
* **Migración Incremental**: Implementar `hashSoA()` en `SnapshotSerializerSoA.ts` e integrar en `BaseGame`.
* **Prioridad**: 🟠 High

### MA-3: Modularización de Juegos en Subpaquetes (`packages/games-*`)
* **Problema Actual**: Todos los juegos residen en `src/games/*` dentro del paquete raíz de la aplicación Expo.
* **Arquitectura Actual**: Monolito de juegos en `src/games/`.
* **Arquitectura Propuesta**: Extraer juegos independientes a paquetes workspace dedicados (`@tiny-aster/games-asteroids`, `@tiny-aster/games-pong`, etc.).
* **Ventajas**: Invalidation de caché fina en Turborepo. Cambiar código en *Asteroids* no re-ejecuta tests ni builds de *Space Invaders*.
* **Trade-offs**: Incremento menor en archivos `package.json` de configuración workspace.
* **Migración Incremental**: Mover primero los juegos más estables (*Pong* y *Flappy Bird*).
* **Prioridad**: 🟡 Medium

### MA-4: Reducción Ratchet de Tipos `any` en `NetworkManager` y `BaseGame`
* **Problema Actual**: Existen 332 usos explícitos de `any` en `@tiny-aster/core` (destacando 25 en `NetworkManager.ts` y 25 en `BaseGame.ts`).
* **Arquitectura Actual**: Tipado genérico incompleto en interfaces de red y adaptadores de estado.
* **Arquitectura Propuesta**: Uso estricto de genéricos condicionales, `unknown` con type guards y discriminated unions.
* **Ventajas**: Mayor seguridad de tipos en tiempo de compilación y mejor refactorización.
* **Prioridad**: 🟠 High

---

## 5. Top 10 Oportunidades de Mejora

| # | Título | Área | Impacto | Esfuerzo | Riesgo | Prioridad |
|---|--------|------|---------|----------|--------|-----------|
| **1** | Corregir reporte de API Extractor en `docs:check` | CI/CD | 🔴 Alto | 🟢 Muy Bajo | 🟢 Nulo | 🔴 Critical |
| **2** | Convertir `eventBus.emit()` síncronos a `emitDeferred()` en sistemas | ECS / Red | 🔴 Alto | 🟡 Bajo | 🟢 Bajo | 🔴 Critical |
| **3** | Eliminar instanciación por defecto de `UnifiedInputSystem` deprecado | Core / DX | 🟠 Medio | 🟢 Muy Bajo | 🟢 Nulo | 🟠 High |
| **4** | Corregir fugas de handles/timers en tests de servidor Colyseus | Testing | 🟠 Alto | 🟡 Bajo | 🟢 Bajo | 🟠 High |
| **5** | Marcar nodos terminales (`isEndNode`) en grafos de campaña | Narrativa | 🟠 Medio | 🟢 Muy Bajo | 🟢 Nulo | 🟠 High |
| **6** | Optimizar `BaseGame.hash()` para evitar `JSON.stringify` en rollback | Rendimiento | 🟠 Alto | 🟡 Medio | 🟡 Medio | 🟠 High |
| **7** | Reducir usos de `any` en `NetworkManager.ts` y `BaseGame.ts` | Tipado | 🟠 Alto | 🟡 Medio | 🟢 Bajo | 🟠 High |
| **8** | Desacoplar juegos de `src/games/` a subpaquetes `packages/games-*` | Arquitectura | 🟡 Alto | 🔴 Alto | 🟡 Medio | 🟡 Medium |
| **9** | Estandarizar serialización SoA en todos los motores de juego | Estado / ECS | 🟡 Medio | 🟡 Medio | 🟡 Medio | 🟡 Medium |
| **10**| Protocolo unificado de telemetría y métricas en tiempo real | Observabilidad| 🟢 Medio | 🔴 Alto | 🟢 Bajo | 🟢 Low |

---

## 6. Proposal Roadmap

```
Phase 1 — Quick Wins (Día 1-2)
├── QW-1: Generar etc/asteroides.api.md y asegurar 'pnpm run ci' en verde.
├── QW-2: Añadir isEndNode: true en StoryGraphs.ts para 0 warnings en story:lint.
├── QW-3: Sustituir UnifiedInputSystem por defecto en BaseGame por NullInputAdapter.
└── QW-4: Asegurar teardown limpio en Colyseus Room tests para Jest worker exit limpio.

Phase 2 — Maintainability & Safety (Semana 1)
├── MA-1: Refactorizar emisiones síncronas en sistemas ECS a emitDeferred().
├── MA-4: Reducir los 50 mayores 'any' en NetworkManager y BaseGame usando genéricos estrictos.
└── Ratchet Update: Actualizar scripts/typecast-baseline.json con el nuevo techo de 'any'.

Phase 3 — Architectural Improvements (Semana 2)
├── MA-2: Implementar hashSoA() binario libre de alocación de memoria en el Heap.
└── MA-3: Iniciar migración de src/games/pong y src/games/flappybird a packages/games-*.

Phase 4 — Long-term Evolution (Semana 3+)
├── Estandarizar pipelines de estado e interpolación SoA en todos los juegos.
└── Unificar métricas de rendimiento cliente/servidor bajo un dashboard de telemetría único.
```

---

> **Respuesta a la Pregunta Clave de Dirección Técnica:**
> *"Si tuviéramos que invertir solo unas pocas semanas mejorando este repositorio, las acciones de mayor retorno (ROI) son: garantizar un CI verde resolviendo `docs:check`, convertir las emisiones síncronas de eventos en sistemas ECS a `emitDeferred()` para evitar desincronizaciones multijugador, y optimizar el hash de simulación para eliminar las pausas de recolector de basura durante la reconciliación de red."*
