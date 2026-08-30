# 🔬 Reporte de Auditoría Técnica, Calidad de Código y Evolución Arquitectónica — Tiny Aster Engine

**Rol:** Staff / Principal Software Engineer (Especialista en Arquitectura, Calidad y Evolución de Sistemas & Technical Artist)
**Fecha:** 30 de agosto de 2026
**Proyecto:** Tiny Aster — Deterministic ECS Arcade Engine & Multiplatform Suite

---

## 1. Comprensión del Proyecto y Modelo Mental

### Propósito y Dominio del Proyecto
**Tiny Aster** es un motor de juego de arcade multiplataforma (Web HTML5 Canvas y React Native Expo / Skia) construido con una arquitectura **Entity-Component-System (ECS) estrictamente determinista**.
El sistema ejecuta un conjunto de minijuegos retro (*Asteroids*, *Space Invaders*, *Flappy Bird*, *Pong*, *Geometry Wars*, *Echo Runner*, *Platformer*) y cuenta con un servidor de salas multijugador autoritativo sobre **Colyseus** con netcode de reconciliación y rollback.

La premisa fundamental de diseño es el **desacoplamiento total entre simulación y plataforma**:
- `@tiny-aster/core` contiene la lógica pura de simulación física, ECS, snapshots/rollback, bus de eventos, audio abstracto y runtime de encuentros narrativos.
- La simulación no importa React Native, Expo, Skia, Canvas ni Colyseus (regla de oro estrictamente verificada por `scripts/check-core-boundaries.sh` en CI).
- Todo azar que afecte el gameplay está aislado en `world.gameplayRandom` (dejando `world.renderRandom` exclusivamente para efectos visuales), lo que permite reproducciones deterministas (*replays*) y pruebas sin interfaz (*headless testing*).

### Arquitectura Actual y Estructura de Módulos
```
monorepo/
├── packages/
│   ├── core/              # @tiny-aster/core: ECS runtime, física 2D, snapshots, pooling, audio abstracto, story runtime
│   ├── renderer-canvas/   # Adaptador de renderizado Web HTML5 Canvas
│   ├── renderer-skia/     # Adaptador de renderizado React Native Skia
│   ├── network/           # Abstracciones de transporte y cliente de red
│   ├── network-colyseus/  # Adaptador de transporte cliente para Colyseus
│   └── react-native/      # Glue visual y utilidades React Native
├── server/                # Servidor Colyseus autoritativo en Node.js
├── src/
│   ├── games/             # Reglas, entidades y prefabs por minijuego (asteroids, space-invaders, pong, etc.)
│   ├── components/        # Componentes UI React Native / Expo Router
│   └── theme/             # Tokens de diseño y paleta cromática centralizada
└── docs/                  # Informes de auditoría técnica y documentación de diseño
```

### Patrones Arquitectónicos y Convenciones
- **ECS (Entity-Component-System)** con pools reutilizables de memoria (`ComponentSetPool`, `PrefabPool`, `pairsPool`) para evitar recolección de basura (*GC pauses*) en hot loops.
- **Pattern Command Buffer (`WorldCommandBuffer`)**: Muta la estructura de entidades de forma diferida al final de cada frame.
- **Strict Boundaries & API Extractor**: La superficie pública exportada por `@tiny-aster/core` está congelada en `etc/asteroides.api.md`.
- **Typecast Ratchet**: Limita y controla estrictamente el crecimiento de aserciones `as any` / `as unknown` a través de `scripts/typecast-ratchet.ts` contra `scripts/typecast-baseline.json`.

---

## 2. Detecta Oportunidades y Problemas Sistémicos

Tras una auditoría exhaustiva de la base de código, el motor demuestra una altísima madurez arquitectónica y disciplina de rendimiento. No obstante, se destacan **4 áreas prioritarias de impacto sistémico** para optimizar la recolección de basura (GC pressure), garantizar la paridad de renderizado Canvas/Skia, asegurar cierres limpios en los tests y mantener el determinismo:

1. **Reutilización y Consolidación de Lógica Visual en `SharedVFX.ts`**
   - *Señal detectada:* Varios minijuegos mantienen implementaciones duplicadas en sus pares `CanvasVisuals` / `SkiaVisuals`.
   - *Riesgo:* Divergencias visuales entre plataformas (Web vs. Mobile Native Skia) y mayor mantenimiento al duplicar rutinas de dibujado procedural.
   - *Solución recomendada:* Migrar lógica común hacia funciones puras en `src/games/shared/rendering/SharedVFX.ts` antes de escribir código específico de backend.

2. **Cero Asignaciones Efímeras en el Loop de Renderizado (`draw()`)**
   - *Señal detectada:* Ocurrencias potenciales de creación de objetos/arrays, concatenación de strings o creación per-frame de `ctx.createLinearGradient` / `ctx.createRadialGradient`.
   - *Impacto:* Genera pequeñas pausas por recolección de basura (*GC pauses*) durante sesiones largas de juego. Los gradientes y shaders deben ser cacheados como recursos reutilizables.

3. **Invocaciones de `.unref()` en Temporizadores de Node y Teardown en Tests (`GameLoop.ts` y Servidor)**
   - *Señal detectada:* Jest emite la advertencia `A worker process has failed to exit gracefully and has been force exited. Active timers can also cause this, ensure that .unref() was called on them.`
   - *Causa raíz:* `GameLoop.ts` mantiene un `setInterval` de watchdog activo y algunas suites en `server/src/__tests__/` requieren asegurar la llamada limpia a `room.onDispose()` en `afterEach`.

4. **Preservación del Snapshot API Extractor (`etc/asteroides.api.md`)**
   - *Señal detectada:* Modificaciones en exportaciones `@public` de `@tiny-aster/core` requieren regeneración con `pnpm docs:extract` para evitar fallos en `pnpm docs:check` durante el CI.

---

## 3. Catálogo Detallado de Oportunidades de Mejora

### OP-1: Consolidación de Drawers Visuales Duplicados en `SharedVFX.ts`
* **Título:** Centralización de funciones puras de VFX en `SharedVFX.ts` para paridad Canvas2D/Skia.
* **Problema:** En minijuegos como *Pong*, *Asteroids* o *Space Invaders*, existen rutinas de renderizado duplicadas entre los módulos `CanvasVisuals` y `SkiaVisuals`.
* **Evidencia:** `src/games/shared/rendering/SharedVFX.ts`, `src/games/pong/rendering/PongCanvasVisuals.ts`, `src/games/pong/rendering/PongSkiaVisuals.ts`.
* **Por qué importa:** Promueve la reutilización de código, reduce la huella del bundle y garantiza que las características visuales se comporten idénticamente en Canvas (Web) y Skia (Mobile).
* **Impacto:** 🔴 Critical
* **Esfuerzo estimado:** 🟡 Medio (2-3 horas)
* **Riesgo:** 🟢 Bajo
* **Propuesta de solución:** Migrar efectos compartidos a `SharedVFX.ts` usando la abstracción `registerSharedVFX()` y primitivas puras de dibujado.
* **Prioridad:** 🔴 Critical

---

### OP-2: Garantía de Presupuesto Cero Asignaciones Efímeras en `draw()`
* **Título:** Auditoría de alocaciones de memoria y cacheo de gradientes/shaders en el pipeline visual.
* **Problema:** Crear objetos `Gradient`, paths temporales o strings concatenadas por frame dentro de `ShapeDrawer.draw()` produce micro-pausas por recolección de basura a 60 FPS.
* **Evidencia:** Requisito de arquitectura en `packages/renderer-canvas` y `packages/renderer-skia`.
* **Por qué importa:** Mantiene la tasa de pausa por GC en 0.0% y garantiza que las escenas con más de 1000 entidades cumplan con el límite estricto de presupuesto en `stress.test.ts`.
* **Impacto:** 🔴 Critical
* **Esfuerzo estimado:** 🟡 Medio (2 horas)
* **Riesgo:** 🟢 Bajo
* **Propuesta de solución:** Utilizar únicamente pools pre-asignados, buffers reutilizables y mapas de cacheo de shaders/gradientes indexados por dimensiones de pantalla.
* **Prioridad:** 🔴 Critical

---

### OP-3: Unref de Temporizadores en `GameLoop.ts` y Cleanup Explicito en Tests del Servidor
* **Título:** Invocación de `.unref()` en temporizadores Node y teardown exhaustivo en Jest.
* **Problema:** Jest alerta que los workers fallan al salir limpiamente (`A worker process has failed to exit gracefully`) debido a temporizadores activos en `GameLoop.ts` y salas de `server/src/__tests__/`.
* **Evidencia:** `packages/core/src/loop/GameLoop.ts:148`, `server/src/__tests__/AsteroidsRoom.test.ts`, `server/src/__tests__/PongRoom.test.ts`.
* **Por qué importa:** Elimina la intermitencia (*flakiness*) y aceleración de tiempos de ejecución en la suite de integración continua.
* **Impacto:** 🟠 High
* **Esfuerzo estimado:** 🟢 Bajo (1 hora)
* **Riesgo:** 🟢 Bajo
* **Propuesta de solución:** Añadir `.unref()` a los `setInterval` del watchdog en entornos Node.js y verificar `room.onDispose()` en todos los bloques `afterEach`.
* **Prioridad:** 🟠 High

---

### OP-4: Preservación Automatizada del Snapshot API Extractor (`etc/asteroides.api.md`)
* **Título:** Sincronización continua de la superficie pública del motor.
* **Problema:** El comando `pnpm docs:check` falla si las exportaciones `@public` de `@tiny-aster/core` difieren del snapshot guardado en `etc/asteroides.api.md`.
* **Evidencia:** `etc/asteroides.api.md`, `package.json` (`"docs:check"`).
* **Por qué importa:** Garantiza la estabilidad del contrato SemVer pública y previene regresiones en el pipeline de CI.
* **Impacto:** 🔴 Critical
* **Esfuerzo estimado:** 🟢 Muy Bajo (5 mins)
* **Riesgo:** 🟢 Nulo
* **Propuesta de solución:** Ejecutar `pnpm docs:extract` tras modificar exportaciones `@public` en `@tiny-aster/core`.
* **Prioridad:** 🔴 Critical

---

## 4. Ganancias Rápidas (Quick Wins)

1. **QW-1**: Consolidar en `SharedVFX.ts` los efectos de fondo y partículas procedurales compartidas entre Canvas y Skia.
2. **QW-2**: Aplicar comprobación `.unref()` a `watchdogIntervalId` en `GameLoop.ts` para resolver el cierre Graceful en Jest (`pnpm test`).
3. **QW-3**: Ejecutar `pnpm docs:extract` para actualizar el snapshot `etc/asteroides.api.md` tras cualquier adición de métodos `@public`.
4. **QW-4**: Asegurar que las emisiones de eventos en hot loops utilicen `eventBus.emitDeferred()` para evitar mutaciones durante la iteración de física.

---

## 5. Mejoras Arquitectónicas

### MA-1: Consolidación Definitiva de VFX en `SharedVFX.ts`
- **Problema Actual:** Duplicación de lógica de dibujado procedural entre `CanvasVisuals` y `SkiaVisuals`.
- **Arquitectura Propuesta:** Definir como estándar que toda nueva característica visual compartida entre plataformas deba implementarse como función pura en `SharedVFX.ts` y registrarse mediante `registerSharedVFX()`.
- **Ventajas:** Paridad visual 1:1 entre Web (Canvas2D) y Mobile Native (Skia), presupuesto cero asignaciones efímeras en heap por frame y menor costo de mantenimiento.

### MA-2: Estandarización de `emitDeferred` en Sistemas ECS
- **Problema Actual:** Emisiones síncronas de eventos durante la ejecución de `System.update()`.
- **Arquitectura Propuesta:** Imponer como patrón arquitectónico en el motor que **todo `System.update()` debe usar `emitDeferred()`**. La versión síncrona `emit()` queda reservada exclusivamente para inicializaciones de escenas o UI fuera del tick.
- **Ventajas:** Inmutabilidad garantizada de entidades durante la simulación y compatibilidad total con rollback netcode.

---

## 6. Resultado Final: Top 10 Oportunidades de Mejora

| # | Título | Área | Impacto | Esfuerzo | Riesgo | Prioridad |
|---|--------|------|---------|----------|--------|-----------|
| **1** | Consolidación de VFX compartidos en `SharedVFX.ts` | VFX / Rendering | 🔴 Alto | 🟡 Medio | 🟢 Bajo | 🔴 Critical |
| **2** | Preservación del presupuesto cero asignaciones efímeras en `draw()` | Performance | 🔴 Alto | 🟡 Medio | 🟢 Bajo | 🔴 Critical |
| **3** | Migración total a `emitDeferred()` en sistemas ECS | Core / Netcode | 🔴 Alto | 🟡 Medio | 🟢 Bajo | 🔴 Critical |
| **4** | Preservación de snapshot API Extractor (`etc/asteroides.api.md`) | CI / Docs | 🔴 Alto | 🟢 Muy Bajo | 🟢 Nulo | 🔴 Critical |
| **5** | Unref en `GameLoop.ts` y teardown en tests del servidor | Testing / Server | 🟠 Alto | 🟢 Bajo | 🟢 Bajo | 🟠 High |
| **6** | Reducción del ratchet de `as any` en módulos de red | Tipado | 🟠 Alto | 🟡 Medio | 🟢 Bajo | 🟠 High |
| **7** | Extracción del paquete narrativo `@tiny-aster/story` | Arquitectura | 🟡 Alto | 🔴 Alto | 🟡 Medio | 🟡 Medium |
| **8** | Modularización de minijuegos en subpaquetes (`packages/games-*`) | Arquitectura | 🟡 Alto | 🔴 Alto | 🟡 Medio | 🟡 Medium |
| **9** | Estandarización de primitivas UI en `src/components/ui/` | DX / Frontend | 🟢 Medio | 🟡 Medio | 🟢 Bajo | 🟢 Low |
| **10**| Panel unificado de métricas de telemetría de simulación | Observabilidad | 🟢 Medio | 🔴 Alto | 🟢 Bajo | 🟢 Low |

---

## 7. Propuesta de Roadmap

### Phase 1 — Quick Wins & CI Safety (Inmediato)
- [ ] Incorporar el reporte de auditoría diaria para el 30 de agosto de 2026.
- [ ] Ejecutar `pnpm docs:extract` para asegurar sincronía del snapshot `etc/asteroides.api.md`.
- [ ] Aplicar `.unref()` al interval del watchdog en `GameLoop.ts`.

### Phase 2 — Core Stability & Parity Visual (Semana 1)
- [ ] Centralizar más drawers procedimentales en `SharedVFX.ts`.
- [ ] Sustituir invocaciones síncronas de `eventBus.emit()` en los sistemas ECS restantes.

### Phase 3 — Architectural Modularization (Semana 2)
- [ ] Extraer el subsistema narrativo a `packages/story` (`@tiny-aster/story`).
- [ ] Evaluar empaquetado independiente por juego (`packages/games-asteroids`, etc.).

### Phase 4 — Long-Term Evolution (Semana 3+)
- [ ] Implementar telemetría y métricas de simulación en tiempo real.
- [ ] Ampliar la suite de tests deterministas para escenarios de alta latencia y pérdida de paquetes.

---

> **Respuesta a la Pregunta de Dirección Técnica:**
> *"Si tuviera que invertir solo unas pocas semanas mejorando este repositorio, la máxima rentabilidad técnica se obtiene al: 1) Centralizar drawers visuales procedimentales en `SharedVFX.ts` para paridad Canvas2D/Skia sin asignaciones por frame; 2) Estandarizar `emitDeferred` en todos los sistemas ECS para garantizar inmutabilidad en rollback; y 3) Desvincular el temporizador watchdog en `GameLoop.ts` mediante `.unref()` para lograr ejecuciones de tests limpias en Jest."*
