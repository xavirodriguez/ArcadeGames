# Auditoría Técnica y Diagnóstico de Arquitectura — Tiny Aster Engine

**Fecha:** 2026-09-01
**Rol:** Staff / Principal Software Engineer
**Repositorio:** `tiny-aster` (A Cross-Platform Deterministic ECS Arcade Engine)

---

## 1. Comprensión del Proyecto

### Propósito y Dominio
**Tiny Aster** es un motor de videojuegos 2D estilo arcade determinista basado en **Entity-Component-System (ECS)**, orientándolo a plataformas Web y Mobile (React Native / Expo). Destaca por su soporte de renderizado dual (HTML5 Canvas 2D y React Native Skia), netcode multijugador autoritativo basado en Colyseus con reconciliación y rollback determinista, y un conjunto de juegos retro integrados (Asteroids, Space Invaders, Flappy Bird, Pong, Echo Runner, Geometry Wars).

### Arquitectura Actual
- **Monorepo gestionado con pnpm workspaces + Turborepo**:
  - `packages/core` (`@tiny-aster/core`): Núcleo ECS agnóstico a la plataforma (físicas SAT/Sweep&Prune, snapshots SoA/AoS, pooling, jerarquías, director narrativo y loops de juego).
  - `packages/renderer-canvas`: Adaptador de renderizado para Canvas2D Web.
  - `packages/renderer-skia`: Adaptador de renderizado para React Native Skia.
  - `packages/network` y `packages/network-colyseus`: Capa de abstracción de red e integración con cliente Colyseus.
  - `server/`: Servidor de juegos autoritativo en Node.js con Colyseus.
  - `src/games/*`: Implementación de reglas y entidades específicas para cada juego.
  - `src/app/*`: Shell de la aplicación React Native (Expo Router) y UI.

### Reglas de Frontera y Calidad
- **Verificación de Fronteras (`scripts/check-core-boundaries.sh`)**: Garantiza que `@tiny-aster/core` no importe dependencias de React Native, Expo, Skia, Colyseus ni juegos de `src/games/*`.
- **Trinquete de Typecasting (`scripts/typecast-ratchet.ts`)**: Controla y congela la cantidad de afirmaciones `as any` / `as unknown` por archivo.
- **Linter de Narrativa (`scripts/story-lint.ts`)**: Valida la integridad estructural de grafos de historia (`StoryGraph`).

---

## 2. Detección de Oportunidades y Señales Tecnológicas

### A. Silenciamiento de Errores y Excepciones (Error Swallowing)
- **Evidencia:** En `packages/core/src/events/EventBus.ts`, dentro del método `emit()`, las excepciones lanzadas por los handlers se capturan silenciosamente:
  ```typescript
  try {
    handlersToIterate[i](payload, event);
  } catch (_e) {
    // Silently catch handler errors to prevent crashing the main loop
  }
  ```
- **Por qué importa:** Silenciar errores en la capa de eventos impide la observabilidad del motor. Si un handler de UI o sistema falla, la excepción desaparece sin log ni métricas, dificultando el diagnóstico de bugs.

### B. Fugas de Recursos y Timers en Tests del Servidor (Open Handles en Jest)
- **Evidencia:** `server/src/BaseRoom.ts` inicia un intervalo de simulación con `this.setSimulationInterval((dt) => this.tick(dt))`, pero en `onDispose()` no detiene el timer.
- **Por qué importa:** Durante las pruebas (`pnpm test`), Jest emite advertencias sobre procesos worker que no finalizan limpiamente debido a *open handles* / timers activos.

### C. Inconsistencia de Tipado en `EventBus` y Eventos Globales (`PlaySFX as any`)
- **Evidencia:** Aunque `CoreEvents` define `"PlaySFX": { name: string }`, existen invocaciones con `eventBus.emit("PlaySFX" as any, ...)` debido a desacoples entre el genérico `TEvents` y `CoreEvents`.
- **Por qué importa:** Debilita la seguridad de tipos en la capa de audio y eventos, y degrada la experiencia del desarrollador (DX).

### D. Ubicación Monolítica de los Juegos (`src/games/*`)
- **Evidencia:** Los juegos están situados en `src/games/` dentro del paquete raíz de la app de Expo en lugar de estar desacoplados como paquetes del monorepo (`packages/games-*`).
- **Por qué importa:** Cualquier cambio menor en las reglas de un juego invalida las cachés de Turborepo para el resto de los juegos.

### E. Emisión Síncrona vs Diferida en Sistemas de Colisión
- **Evidencia:** `PongCollisionSystem.ts` utiliza `eventBus.emit()` síncrono en lugar de `eventBus.emitDeferred()`.
- **Por qué importa:** Las pautas de diseño del motor exigen el uso de `emitDeferred()` durante fases de física para prevenir mutaciones estructurales durante la iteración y garantizar reconciliación transparente en rollback.

### F. Duplicación de Lógica de Combos
- **Evidencia:** Se observa duplicación entre `packages/core/src/systems/ComboSystem.ts` y la gestión local de multiplicadores en `SpaceInvadersGame.ts` y `GeometryWarsGame.ts`.
- **Por qué importa:** Aumenta la complejidad de mantenimiento y genera inconsistencias en el balance del gameplay.

---

## 3. Matriz de Priorización

| ID | Oportunidad | Impacto | Esfuerzo | Riesgo | Confianza | Prioridad |
|----|------------|---------|----------|--------|---------|-----------|
| OPT-1 | Eliminar captura silenciosa de errores en `EventBus.emit()` | Alto | Muy Bajo | Muy Bajo | Alta | 🔴 Critical |
| OPT-2 | Detener timer de simulación en `BaseRoom.onDispose()` | Alto | Muy Bajo | Muy Bajo | Alta | 🔴 Critical |
| OPT-3 | Unificar tipado estricto para eventos globales (`PlaySFX`, etc.) | Medio | Bajo | Bajo | Alta | 🟠 High |
| OPT-4 | Modularizar juegos en subpaquetes (`packages/games-*`) | Alto | Medio | Bajo | Alta | 🟠 High |
| OPT-5 | Migrar colisiones de Pong a `emitDeferred` | Medio | Bajo | Muy Bajo | Alta | 🟠 High |
| OPT-6 | Reutilizar `ComboSystem` genérico en todos los juegos arcade | Medio | Medio | Bajo | Alta | 🟡 Medium |
| OPT-7 | Centralizar validaciones y schemas Zod de red/configuración | Medio | Medio | Bajo | Alta | 🟡 Medium |
| OPT-8 | Optimizar serialización de snapshots en el servidor autoritativo | Medio | Medio | Medio | Alta | 🟡 Medium |
| OPT-9 | Ampliar cobertura de tests de determinismo headless | Medio | Medio | Nulo | Alta | 🟢 Low |
| OPT-10 | Documentar diagramas de secuencia del ciclo de vida ECS | Bajo | Bajo | Nulo | Alta | 🟢 Low |

---

## 4. Quick Wins

1. **Error Logging en `EventBus`**: Modificar `EventBus.emit` para registrar o emitir errores de handlers en modo desarrollo en vez de silenciarlos.
2. **Teardown Limpio en `BaseRoom`**: Agregar `this.setSimulationInterval(null)` en `BaseRoom.onDispose()` para solventar la fuga de timers en las suites de Jest.
3. **Estandarizar `emitDeferred` en Pong**: Ajustar `PongCollisionSystem` para utilizar `emitDeferred`, manteniendo simetría con el resto de juegos.

---

## 5. Mejoras Arquitectónicas

### A. Modularización de Juegos (`packages/games-*`)
- **Problema actual:** Los juegos se encuentran dentro de `src/games/` en el árbol de la aplicación React Native/Expo.
- **Arquitectura propuesta:** Extraer cada juego a paquetes monorepo agnósticos como `@tiny-aster/games-asteroids`, `@tiny-aster/games-pong`, etc.
- **Ventajas:** Aislamiento de código, compilaciones incrementales paralelas ultra rápidas con Turborepo y máxima reutilización.

### B. EventBus con CoreEvents por Defecto
- **Problema actual:** Castings `as any` en la emisión de eventos centrales por conflicto de tipos genéricos.
- **Arquitectura propuesta:** Parametrizar `EventBus<TEvents = CoreEvents>` asegurando que `TEvents` incluya `CoreEvents` por intersección implícita.

---

## 6. Top 10 Oportunidades (Relación Impacto / Esfuerzo / Riesgo)

1. **OPT-1: Eliminar captura silenciosa de errores en `EventBus`** (`Impacto: Alto` / `Esfuerzo: Muy Bajo` / `Riesgo: Nulo`)
2. **OPT-2: Detener timers en `BaseRoom.onDispose()`** (`Impacto: Alto` / `Esfuerzo: Muy Bajo` / `Riesgo: Nulo`)
3. **OPT-5: Estandarizar `emitDeferred` en colisiones** (`Impacto: Medio` / `Esfuerzo: Bajo` / `Riesgo: Nulo`)
4. **OPT-3: Tipado estricto en `EventBus`** (`Impacto: Medio` / `Esfuerzo: Bajo` / `Riesgo: Bajo`)
5. **OPT-4: Modularizar juegos en `packages/games-*`** (`Impacto: Alto` / `Esfuerzo: Medio` / `Riesgo: Bajo`)
6. **OPT-6: Reutilizar `ComboSystem` en Space Invaders y Geometry Wars** (`Impacto: Medio` / `Esfuerzo: Medio` / `Riesgo: Bajo`)
7. **OPT-7: Consolidar esquemas Zod de configuración** (`Impacto: Medio` / `Esfuerzo: Medio` / `Riesgo: Bajo`)
8. **OPT-8: Reconciliación SoA con zero-alloc buffer hash** (`Impacto: Alto` / `Esfuerzo: Alto` / `Riesgo: Medio`)
9. **OPT-9: Expansión de pruebas de determinismo headless** (`Impacto: Medio` / `Esfuerzo: Medio` / `Riesgo: Nulo`)
10. **OPT-10: Mejorar TSDoc y documentación visual del ciclo de vida** (`Impacto: Bajo` / `Esfuerzo: Bajo` / `Riesgo: Nulo`)

---

## 7. Roadmap de Evolución

### Phase 1 — Quick Wins
- Eliminar silenciamiento de errores en `EventBus`.
- Corregir el teardown de timers en `BaseRoom.onDispose()`.
- Migrar colisiones de Pong a `emitDeferred`.

### Phase 2 — Maintainability
- Refactorizar `EventBus` para unificar `CoreEvents` y evitar typecastings.
- Eliminar duplicación de lógica de combos e integrarla en `ComboSystem`.
- Mantener y ratchetear límites de `as any` en CI.

### Phase 3 — Architectural Improvements
- Refactorizar los juegos a paquetes independientes (`packages/games-*`).
- Configurar cachés granulares de Turborepo por juego.

### Phase 4 — Long-term Evolution
- Implementar pipeline de replay/netcode con codificación binaria nativa SoA.
