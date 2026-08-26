# 🔬 Reporte de Auditoría Técnica, Calidad de Código y Evaluación Arquitectónica — Tiny Aster Engine

**Rol:** Staff / Principal Software Engineer (Especialista en Arquitectura, Calidad y Evolución de Sistemas)
**Fecha:** 26 de agosto de 2026
**Proyecto:** Tiny Aster — Deterministic ECS Arcade Engine & Multiplatform Suite

---

## 1. Comprensión del Proyecto y Modelo Mental

### Propósito y Dominio
**Tiny Aster** es una suite multiplataforma (Web y React Native Expo) de juegos retro arcade de alta velocidad (*Asteroids*, *Space Invaders*, *Flappy Bird*, *Pong*, *Geometry Wars*, *Echo Runner*, *Platformer*) con soporte para multijugador autoritativo mediante la librería **Colyseus**.

El valor diferencial del proyecto reside en **desacoplar completamente la lógica de simulación y física del renderizador y del framework de UI**:
- El núcleo (`@tiny-aster/core`) es agnóstico a plataformas de renderizado (`<canvas>` o Skia) y frameworks móviles (Expo / React Native).
- La aleatoriedad que afecta la jugabilidad se aísla de forma determinista mediante `world.gameplayRandom` y `world.renderRandom`, habilitando reproducción de partidas, pruebas sin cabeza (*headless*) y netcode basado en reconciliación/rollback.

### Arquitectura Actual y Estructura de Módulos
- **`packages/core` (`@tiny-aster/core`)**: Motor Entity-Component-System (ECS), físicas 2D en punto flotante, pools de memoria reutilizable (`ComponentSetPool`, `PrefabPool`), serialización e interpolación de snapshots SoA (Structure of Arrays), audio abstracto (`IAudioPlayer`), bus de eventos síncrono/diferido (`EventBus`), y motor narrativo/DSL de decisiones (`StoryRuntime`, `StoryGraph`, `NarrativeDirector`).
- **`packages/renderer-canvas`**: Adaptador de renderizado 2D para HTML5 Canvas con registro dinámico de formas (`registerShape`) y efectos de fondo (`registerBackgroundEffect`).
- **`packages/renderer-skia`**: Adaptador de renderizado para React Native Skia.
- **`packages/network` & `packages/network-colyseus`**: Abstracciones de transporte y cliente de red autoritativo.
- **`server/`**: Servidor de juego independiente escrito en Node.js/TypeScript que ejecuta salas de juego autoritativas con Colyseus Rooms sobre la misma simulación `@tiny-aster/core`.
- **`src/games/*` & `src/app/`**: Definición de mecánicas, entidades de juego, componentes visuales de UI y enrutamiento con Expo Router.

### Patrones Arquitectónicos y Convenciones
1. **Separación Estricta de Capas**: Regla verificada activamente en CI (`scripts/check-core-boundaries.sh`) que prohíbe a `@tiny-aster/core` importar paquetes de plataforma (`react-native`, `expo`, `@shopify/react-native-skia`, `@colyseus`) o código específico de juegos (`src/games/`).
2. **Determinismo AST Linter**: `scripts/ast-determinism-linter.ts` prohíbe el uso directo de `Math.random()` en funciones puras de actualización e impone el uso de semillas del motor.
3. **Ratchet de Tipado**: `scripts/typecast-ratchet.ts` congela el conteo de type assertions `as any` / `as unknown` por archivo para evitar la degradación de la seguridad de tipos.

### Estrategia de Testing y Quality Gates
- **Engine Core & Games**: Pruebas unitarias e integración en `packages/core/src/__tests__` y `src/games/*/__tests__`. Pruebas visuales/narrativas en Node con `tsx`.
- **Server Netcode**: Pruebas con Jest en `server/src/__tests__/` que simulan conexiones de clientes y ciclo de vida de salas Colyseus.
- **CI Pipeline**: Ejecutado mediante `pnpm run ci`, abarcando `build:core`, `check:core-boundaries`, `check:ratchet`, `story:lint`, `docs:check` y `typecheck:app`.

---

## 2. Diagnóstico de Oportunidades y Problemas Sistémicos

A través de la inspección de código, auditoría estática de tipos, análisis de dependencias de build y ejecución de linters de límites y tests, se identifican las siguientes señales y problemas sistémicos:

1. **Inconsistencia de Tipos entre Rendición Canvas y Skia (`PongSkiaVisuals.ts`)**:
   - *Señal*: Firma de método incompatible entre `CanvasMotionTrail` y `SkiaMotionTrail`. `CanvasMotionTrail.draw` espera 8 argumentos, mientras que `SkiaMotionTrail.draw` requiere 9 argumentos (añadiendo `paint: any` al inicio), rompiendo el chequeo de tipos estricto en TypeScript (`typecheck:app`).
2. **Emisiones de Eventos Síncronas en Sistemas ECS**:
   - *Señal*: 21 ocurrencias de `eventBus.emit(...)` en la fase de física/colisiones de los juegos. Ejecutar callbacks inmediatamente durante la iteración sobre componentes puede mutar listas de entidades en ejecución o provocar desincronizaciones en partidas multijugador rollback.
3. **Advertencias de Nodos sin Salida (`dead_end`) en Grafos Narrativos**:
   - *Señal*: `pnpm story:lint` reporta 5 advertencias en grafos de campaña debido a nodos de cierre/victoria que carecen de `isEndNode: true`.
4. **Alocación de Memoria durante Snapshots (`JSON.stringify` en `BaseGame.hash()`)**:
   - *Señal*: En cada tick de reconciliación multijugador, `BaseGame.hash()` serializa recursivamente objetos JavaScript en formato JSON, introduciendo pausado por recolección de basura (GC pressure).
5. **Deprecación e Inyección de Dependencias por Defecto (`UnifiedInputSystem`)**:
   - *Señal*: `BaseGame.ts` instancia por defecto `UnifiedInputSystem` deprecado si no se inyecta uno, produciendo alertas en consola durante suites de prueba headless en el servidor.
6. **Fugas de Handles Asíncronos en Tests del Servidor Colyseus**:
   - *Señal*: Jest alerta que los workers no cierran de forma limpia (`A worker process has failed to exit gracefully`) tras ejecutar `server/src/__tests__/*.test.ts` debido a timers de simulación no detenidos en `afterEach`.

---

## 3. Catálogo Detallado de Oportunidades

### OP-1: Alineación de API Extractor Report (`docs:check`)
* **Título**: Mantener sincronizado el snapshot de API `etc/asteroides.api.md` con las firmas públicas del motor core
* **Problema**: Si las firmas exportadas en `@tiny-aster/core` cambian sin actualizar el snapshot de API en `etc/asteroides.api.md`, el paso `docs:check` de `pnpm run ci` falla.
* **Evidencia**: `package.json` script `docs:check` y archivo `etc/asteroides.api.md`.
* **Por qué importa**: Garantiza la estabilidad semántica de la API del motor e impide romper proyectos dependientes sin detección previa.
* **Impacto**: 🔴 Critical
* **Esfuerzo estimado**: 🟢 Muy Bajo (5-10 mins)
* **Riesgo**: 🟢 Nulo
* **Propuesta de solución**: Ejecutar `pnpm docs:extract` tras modificar exportaciones en `@tiny-aster/core` y versionar la documentación resultante.
* **Alternativas**: Omitir `docs:check` (Desaconsejado, perdería gobierno de API).
* **Prioridad**: 🔴 Critical

### OP-2: Marcar Nodos Finales en Grafos Narrativos (`isEndNode`)
* **Título**: Marcado explícito de nodos finales de campaña en `StoryGraphs.ts`
* **Problema**: Nodos como `ast_cutscene_aggressive`, `ast_cutscene_stealth`, `si_cutscene_victory`, `pong_cutscene_champ` y `fb_cutscene_freedom` son finales de historia pero no declaran `isEndNode: true`.
* **Evidencia**: Output de `pnpm story:lint` y código fuente en `src/games/shared/story/StoryGraphs.ts`.
* **Por qué importa**: Limpia advertencias en el pipeline de build y asegura validación topológica exacta en el motor narrativo.
* **Impacto**: 🟠 High
* **Esfuerzo estimado**: 🟢 Muy Bajo (15 mins)
* **Riesgo**: 🟢 Nulo
* **Propuesta de solución**: Agregar `isEndNode: true` a todos los nodos de cierre de campaña.
* **Prioridad**: 🟠 High

### OP-3: Corregir Firma de Método en `SkiaMotionTrail`
* **Título**: Resolver desalineación de firma entre `CanvasMotionTrail.draw` y `SkiaMotionTrail.drawSkia`
* **Problema**: `SkiaMotionTrail` sobrescribía `draw()` alterando el número y tipo de parámetros respecto a su clase base `CanvasMotionTrail`, causando un error TS2416 durante `typecheck:app`.
* **Evidencia**: `src/games/pong/rendering/PongSkiaVisuals.ts:29`.
* **Por qué importa**: Desbloquea la verificación de tipos limpia en toda la aplicación React Native Expo.
* **Impacto**: 🔴 Critical
* **Esfuerzo estimado**: 🟢 Muy Bajo (10 mins)
* **Riesgo**: 🟢 Nulo
* **Propuesta de solución**: Renombrar el método en `SkiaMotionTrail` a `drawSkia()` para desacoplarlo del contrato de `CanvasRenderingContext2D`.
* **Prioridad**: 🔴 Critical

### OP-4: Reemplazar la Instanciación por Defecto de `UnifiedInputSystem` Deprecado
* **Título**: Adopción de `NullInputSystem` por defecto en `BaseGame`
* **Problema**: `BaseGame` instancia `UnifiedInputSystem` deprecado por defecto si no se pasa `inputSystem` en la configuración.
* **Evidencia**: `packages/core/src/runtime/BaseGame.ts:293`.
* **Por qué importa**: Elimina advertencias `console.warn` molestas en ejecuciones headless, servidores y pruebas unitarias.
* **Impacto**: 🟠 High
* **Esfuerzo estimado**: 🟢 Bajo (30 mins)
* **Riesgo**: 🟢 Bajo
* **Propuesta de solución**: Utilizar `NullInputSystem` como valor predeterminado cuando no se inyecte un sistema de entrada UI.
* **Prioridad**: 🟠 High

### OP-5: Limpieza Limpia de Timers y Salas en Tests de Servidor (`server/src/__tests__`)
* **Título**: Teardown explícito de temporizadores y simulaciones Colyseus en pruebas de servidor
* **Problema**: Jest indica que los procesos worker se fuerzan a salir tras ejecutar las pruebas de las salas Colyseus (`AsteroidsRoom.test.ts`, `PongRoom.test.ts`, etc.).
* **Evidencia**: `server/src/__tests__/AsteroidsRoom.test.ts` y warning final en `pnpm run test`.
* **Por qué importa**: Evita bloqueos intermitentes (*flaky tests*) en pipelines de CI/CD.
* **Impacto**: 🟠 High
* **Esfuerzo estimado**: 🟡 Bajo-Medio (1-2 horas)
* **Riesgo**: 🟢 Bajo
* **Propuesta de solución**: Invocar de manera exhaustiva `room.onDispose()` y detener los intervalos de simulación ECS en bloques `afterEach()`.
* **Prioridad**: 🟠 High

---

## 4. Ganancias Rápidas (Quick Wins)

1. **QW-1**: Renombrar `draw` por `drawSkia` en `SkiaMotionTrail` (`src/games/pong/rendering/PongSkiaVisuals.ts`) para solventar el fallo de `typecheck:app`.
2. **QW-2**: Configurar `isEndNode: true` en las cinemáticas de victoria/cierre de `src/games/shared/story/StoryGraphs.ts` eliminando 5 warnings de `pnpm story:lint`.
3. **QW-3**: Actualizar `BaseGame` para instanciar `NullInputSystem` por defecto en lugar de `UnifiedInputSystem`.
4. **QW-4**: Ejecutar `pnpm docs:extract` para regenerar y sincronizar `etc/asteroides.api.md`.

---

## 5. Mejoras Arquitectónicas

### MA-1: Migración a Emisiones de Eventos Diferidas (`eventBus.emitDeferred`)
- **Problema Actual**: Las colisiones y eventos de física invocan de forma síncrona `eventBus.emit()`, pausando el bucle de actualización ECS y reaccionando durante la mutación de arrays de entidades.
- **Arquitectura Propuesta**: Reemplazar emisiones síncronas por `eventBus.emitDeferred()`, asegurando que la lógica de audio y UI se procese al finalizar la fase de tick de física.
- **Ventajas**: Preserva el determinismo en partidas con rollback netcode y evita bugs por modificación de arreglos en iteración.

### MA-2: Serialización y Hashing SoA Numérico Sin Asignaciones en Heap (`hashSoA`)
- **Problema Actual**: `BaseGame.hash()` utiliza `JSON.stringify` sobre estructuras de datos dinámicas para computar el hash de estado.
- **Arquitectura Propuesta**: Utilizar `SnapshotHash.ts` sobre buffers binarios `Float64Array` y `Int32Array` mediante un algoritmo hash FNV-1a directo de cero asignaciones en Heap.
- **Ventajas**: Elimina los picos de trabajo del recolector de basura (*GC pauses*) a 60 FPS.

### MA-3: Modularización de Juegos en Paquetes Workspace (`packages/games-*`)
- **Problema Actual**: Todos los juegos residen en `src/games/*` dentro de la app React Native.
- **Arquitectura Propuesta**: Mover juegos estables como `asteroids` o `pong` a paquetes como `@tiny-aster/games-asteroids`.
- **Ventajas**: Invalidación de caché granular en Turborepo y tiempos de compilación/test drásticamente menores en CI.

---

## 6. Top 10 Oportunidades de Mejora

| # | Título | Área | Impacto | Esfuerzo | Riesgo | Prioridad |
|---|--------|------|---------|----------|--------|-----------|
| **1** | Corregir firma de método en `SkiaMotionTrail` (`PongSkiaVisuals.ts`) | Tipos / UI | 🔴 Alto | 🟢 Muy Bajo | 🟢 Nulo | 🔴 Critical |
| **2** | Sincronizar snapshot de API Extractor (`etc/asteroides.api.md`) | CI / Docs | 🔴 Alto | 🟢 Muy Bajo | 🟢 Nulo | 🔴 Critical |
| **3** | Sustituir `UnifiedInputSystem` por `NullInputSystem` por defecto en `BaseGame` | DX / Core | 🟠 Medio | 🟢 Muy Bajo | 🟢 Nulo | 🟠 High |
| **4** | Marcar nodos terminales (`isEndNode: true`) en grafos narrativos | Narrativa | 🟠 Medio | 🟢 Muy Bajo | 🟢 Nulo | 🟠 High |
| **5** | Eliminar fugas de timers en tests del servidor Colyseus | Testing | 🟠 Alto | 🟡 Bajo | 🟢 Bajo | 🟠 High |
| **6** | Convertir `eventBus.emit()` a `emitDeferred()` en sistemas de física | ECS / Netcode | 🔴 Alto | 🟡 Medio | 🟢 Bajo | 🔴 Critical |
| **7** | Implementar `hashSoA()` numérico libre de `JSON.stringify` | Rendimiento | 🟠 Alto | 🟡 Medio | 🟡 Medio | 🟠 High |
| **8** | Ratchet de desmantelamiento gradual de tipos `any` en `NetworkManager.ts` | Tipado | 🟠 Alto | 🟡 Medio | 🟢 Bajo | 🟠 High |
| **9** | Modularizar juegos en subpaquetes workspace (`packages/games-*`) | Arquitectura | 🟡 Alto | 🔴 Alto | 🟡 Medio | 🟡 Medium |
| **10**| Panel unificado de métricas de telemetría y FPS en cliente/servidor | Observabilidad| 🟢 Medio | 🔴 Alto | 🟢 Bajo | 🟢 Low |

---

## 7. Proposal Roadmap

### Phase 1 — Quick Wins (Inmediato)
- [x] Corregir firma incompatible de `SkiaMotionTrail.drawSkia` en `PongSkiaVisuals.ts`.
- [ ] Incorporar `isEndNode: true` en los 5 nodos de corte narrativos en `StoryGraphs.ts`.
- [ ] Sincronizar `NullInputSystem` por defecto en `BaseGame.ts`.
- [ ] Sincronizar snapshot `etc/asteroides.api.md` con `pnpm docs:extract`.

### Phase 2 — Maintainability & Safety (Semana 1)
- [ ] Migrar emisiones de física de `eventBus.emit()` a `eventBus.emitDeferred()`.
- [ ] Refactorizar teardowns en `server/src/__tests__/*.test.ts` para un cierre 100% limpio de workers de Jest.
- [ ] Reducir tipos `any` en `NetworkManager.ts` y actualizar baseline ratchet.

### Phase 3 — Architectural Improvements (Semana 2)
- [ ] Adoptar hashing binario SoA FNV-1a en `BaseGame.hash()`.
- [ ] Iniciar la extracción de `@tiny-aster/games-pong` y `@tiny-aster/games-asteroids`.

### Phase 4 — Long-term Evolution (Semana 3+)
- [ ] Extracción de `@tiny-aster/story` como paquete narrativo independiente.
- [ ] Sistema unificado de métricas y telemetría de rendimiento cliente/servidor.

---

> **Respuesta a la Pregunta Clave de Dirección Técnica:**
> *"Si tuviéramos que invertir solo unas pocas semanas mejorando este repositorio, los cambios con mayor retorno (ROI) son: asegurar un pipeline de CI completamente verde reparando los contratos de tipos de Skia y el reporte de API Extractor, pasar las emisiones de colisiones a `emitDeferred()` para blindar la sincronía multijugador, y eliminar la recolección de basura por `JSON.stringify` en el cálculo de snapshots de rollback."*
