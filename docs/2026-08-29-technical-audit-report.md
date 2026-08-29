# 🔬 Reporte de Auditoría Técnica, Calidad de Código y Evolución Arquitectónica — Tiny Aster Engine

**Rol:** Staff / Principal Software Engineer (Especialista en Arquitectura, Calidad y Evolución de Sistemas)
**Fecha:** 29 de agosto de 2026
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

Tras una auditoría profunda de la base de código, el sistema demuestra una excelente salud general. No obstante, existen **4 áreas prioritarias de impacto sistémico** que previenen bugs de concurrencia en simulación, aceleran la CI, eliminan timer leaks en el test runner y aseguran la capacidad de evolución del motor a largo plazo:

1. **Efecto Secundario de Emisiones Síncronas (`eventBus.emit`) en Hot Loops de Simulación ECS**
   - *Señal detectada:* Emisión síncrona de eventos dentro de iteradores `update()` en `HitDetectionSystem.ts`, `TileCollisionSystem.ts` y `LootSystem.ts`.
   - *Riesgo:* Modificación accidental de colecciones de entidades/componentes durante la iteración de colisiones, provocando comportamiento no determinista durante la reconciliación de rollback.

2. **Leaks de Temporizadores Node/Jest en `GameLoop.ts` y Suites de Servidor Colyseus**
   - *Señal detectada:* Advertencia en ejecuciones de Jest: `A worker process has failed to exit gracefully and has been force exited. Active timers can also cause this, ensure that .unref() was called on them.`
   - *Causa raíz:* `GameLoop.ts` inicializa un `watchdogIntervalId = setInterval(...)` en modo manual sin invocar `.unref()`, manteniendo handles activos en Node.js durante los tests.

3. **Sincronización Estricta de la Superficie Pública de API Extractor (`etc/asteroides.api.md`)**
   - *Señal detectada:* `pnpm docs:check` falla si se modifican exportaciones `@public` sin regenerar el snapshot congelado con `pnpm docs:extract`.
   - *Impacto:* Rompe el pipeline de integración continua si no se ejecuta `docs:extract` tras cambios en `@tiny-aster/core`.

4. **Acoplamiento Conceptual del Subsistema Narrativo en `@tiny-aster/core`**
   - *Señal detectada:* `packages/core/src/story/` alberga la lógica del runtime narrativo DSL y salvado de historias.
   - *Impacto:* Aunque cumple con los límites de importación, recarga el paquete core con responsabilidades de juego de alto nivel.

---

## 3. Catálogo Detallado de Oportunidades de Mejora

### OP-1: Estandarización de `eventBus.emitDeferred` en Sistemas de Física y Simulación ECS
* **Título:** Estandarización de `eventBus.emitDeferred` en el ciclo `update()` del motor ECS.
* **Problema:** En módulos como `HitDetectionSystem.ts:47`, `TileCollisionSystem.ts:231` y `LootSystem.ts:50`, se invoca `eventBus.emit` síncronamente mientras se itera sobre entidades o arrays de colisiones.
* **Evidencia:** `packages/core/src/systems/HitDetectionSystem.ts`, `packages/core/src/physics/systems/TileCollisionSystem.ts`, `src/games/shared/arcade/systems/LootSystem.ts`.
* **Por qué importa:** En simulaciones deterministas con rollback netcode, procesar callbacks síncronos en medio de una iteración puede mutar los buffers de física o destruir entidades antes de que el resto del bucle termine, generando desincronizaciones entre cliente y servidor.
* **Impacto:** 🔴 Critical
* **Esfuerzo estimado:** 🟡 Medio (2-3 horas)
* **Riesgo:** 🟢 Bajo
* **Propuesta de solución:** Reemplazar las invocaciones de `eventBus.emit` por `eventBus.emitDeferred` dentro de todos los métodos `update()` de los sistemas ECS, permitiendo que la cola de eventos se descargue ordenadamente al finalizar el tick.
* **Alternativas:** Procesar eventos mediante buffers temporales explícitos en el sistema.
* **Prioridad:** 🔴 Critical

---

### OP-2: Invocación de `.unref()` en `watchdogIntervalId` de `GameLoop.ts` y Cleanup en Tests del Servidor
* **Título:** Invocación de `.unref()` en temporizadores Node y teardown explícito en tests.
* **Problema:** Al ejecutar `pnpm test`, Jest reporta `A worker process has failed to exit gracefully` debido a intervalos no desvinculados del loop de eventos de Node.js.
* **Evidencia:** `packages/core/src/loop/GameLoop.ts:148` (`this.watchdogIntervalId = setInterval(...)`), `server/src/__tests__/PongRoom.test.ts`, `server/src/__tests__/AsteroidsRoom.test.ts`.
* **Por qué importa:** Elimina la intermitencia (*flakiness*) y retrasos de salida en los ejecutos de CI, garantizando ejecuciones limpias de Jest.
* **Impacto:** 🟠 High
* **Esfuerzo estimado:** 🟢 Bajo (1 hora)
* **Riesgo:** 🟢 Bajo
* **Propuesta de solución:**
  1. En `GameLoop.ts`, invocar `.unref()` sobre `this.watchdogIntervalId` si el entorno es Node.js:
     ```typescript
     if (this.watchdogIntervalId && typeof this.watchdogIntervalId === "object" && "unref" in this.watchdogIntervalId) {
       (this.watchdogIntervalId as any).unref();
     }
     ```
  2. Asegurar que en todos los tests de `server/src/__tests__/` se llame a `room.onDispose()` en el bloque `afterEach`.
* **Alternativas:** Desactivar el watchdog explícitamente en entornos de test (`process.env.NODE_ENV === "test"`).
* **Prioridad:** 🟠 High

---

### OP-3: Preservación Automatizada del Snapshot API Extractor (`etc/asteroides.api.md`)
* **Título:** Sincronización continua de la superficie pública del motor.
* **Problema:** El comando `pnpm docs:check` falla si las exportaciones `@public` de `@tiny-aster/core` difieren del snapshot congelado en `etc/asteroides.api.md`.
* **Evidencia:** `package.json:44` (`"docs:check"`), `etc/asteroides.api.md`.
* **Por qué importa:** Protege la estabilidad del contrato SemVer pública del motor y previene fallos inesperados en el runner de CI.
* **Impacto:** 🔴 Critical
* **Esfuerzo estimado:** 🟢 Muy Bajo (5 mins)
* **Riesgo:** 🟢 Nulo
* **Propuesta de solución:** Ejecutar `pnpm docs:extract` antes de cada subida o integrarlo en la tarea de compilación del paquete core.
* **Alternativas:** Ninguna; la documentación congelada es una garantía de contrato de API.
* **Prioridad:** 🔴 Critical

---

### OP-4: Reducción del Ratchet de Typecasts (`as any`) en Capa de Red
* **Título:** Tipado estricto en `NetworkManager.ts` y `LocalPredictionSystem.ts`.
* **Problema:** Los módulos de red acumulan 29 aserciones `as any` en `typecast-baseline.json` debido al parsing de payloads genéricos.
* **Evidencia:** `packages/core/src/network/NetworkManager.ts`, `packages/core/src/network/LocalPredictionSystem.ts`, `scripts/typecast-baseline.json`.
* **Por qué importa:** Fortalece el tipado estricto en tiempo de compilación y evita excepciones insospechadas durante la deserialización de mensajes multijugador.
* **Impacto:** 🟠 High
* **Esfuerzo estimado:** 🟡 Medio (3-4 horas)
* **Riesgo:** 🟢 Bajo
* **Propuesta de solución:** Utilizar tipos discriminados y esquemas Zod con genéricos restrictivos, actualizando el baseline mediante `pnpm ratchet:update`.
* **Prioridad:** 🟠 High

---

## 4. Ganancias Rápidas (Quick Wins)

1. **QW-1**: Agregar comprobación `.unref()` a `watchdogIntervalId` en `GameLoop.ts` para resolver de forma definitiva los procesos colgados en Jest (`pnpm test`).
2. **QW-2**: Ejecutar `pnpm docs:extract` para actualizar el snapshot `etc/asteroides.api.md` tras cualquier adición o cambio de métodos `@public`.
3. **QW-3**: Migrar `HitDetectionSystem.ts` de `eventBus.emit` a `eventBus.emitDeferred` para garantizar inmutabilidad en el bucle de detección de impactos.
4. **QW-4**: Incluir invocaciones explícitas a `room.onDispose()` en los bloques `afterEach` de todos los archivos de test en `server/src/__tests__/`.

---

## 5. Mejoras Arquitectónicas

### MA-1: Adopción Obligatoria de Eventos Diferidos (`emitDeferred`) en Sistemas ECS
- **Problema Actual:** Varios sistemas de física y estado emiten eventos de forma síncrona durante la ejecución de su método `update()`.
- **Arquitectura Propuesta:** Definir como regla de arquitectura que **todo `System.update()` debe emitir eventos exclusivamente vía `emitDeferred()`**. La versión síncrona `emit()` queda restringida a eventos fuera de la simulación frame-by-frame (e.g. inicializaciones de escenas o handlers de UI).
- **Ventajas:** Inmutabilidad garantizada de las entidades durante la simulación, cero invalidaciones de iteradores y total compatibilidad con rollback netcode.
- **Migración Incremental:** Refactorizar primero `packages/core/src/systems/HitDetectionSystem.ts` y `packages/core/src/physics/systems/TileCollisionSystem.ts`, seguido por los sistemas de minijuegos en `src/games/`.

### MA-2: Extracción del Dominio Narrativo a Paquete Dedicado (`@tiny-aster/story`)
- **Problema Actual:** La lógica narrativo-declarativa convive dentro de `@tiny-aster/core` (`packages/core/src/story/`).
- **Arquitectura Propuesta:** Mover la carpeta `src/story/` al paquete `@tiny-aster/story` en `packages/story`.
- **Ventajas:** Reduce el tamaño del paquete core para juegos puramente arcade y delimita de forma más limpia las fronteras del motor.
- **Migración Incremental:** Crear `packages/story`, re-exportar tipos desde `@tiny-aster/core` para retrocompatibilidad temporal y actualizar gradualmente los imports en `src/games/`.

---

## 6. Resultado Final: Top 10 Oportunidades de Mejora

| # | Título | Área | Impacto | Esfuerzo | Riesgo | Prioridad |
|---|--------|------|---------|----------|--------|-----------|
| **1** | Migración total a `emitDeferred()` en sistemas ECS | Core / Netcode | 🔴 Alto | 🟡 Medio | 🟢 Bajo | 🔴 Critical |
| **2** | Preservación de snapshot API Extractor (`etc/asteroides.api.md`) | CI / Docs | 🔴 Alto | 🟢 Muy Bajo | 🟢 Nulo | 🔴 Critical |
| **3** | Unref en `GameLoop.ts` y teardown en tests del servidor Colyseus | Testing / Server | 🟠 Alto | 🟢 Bajo | 🟢 Bajo | 🟠 High |
| **4** | Reducción de ratchet `as any` en `NetworkManager.ts` y red | Tipado | 🟠 Alto | 🟡 Medio | 🟢 Bajo | 🟠 High |
| **5** | Extracción del paquete narrativo `@tiny-aster/story` | Arquitectura | 🟡 Alto | 🔴 Alto | 🟡 Medio | 🟡 Medium |
| **6** | Modularización de minijuegos en subpaquetes (`packages/games-*`) | Arquitectura | 🟡 Alto | 🔴 Alto | 🟡 Medio | 🟡 Medium |
| **7** | Optimización de serialización SoA para snapshots multijugador | Rendimiento | 🟠 Alto | 🟡 Medio | 🟡 Medio | 🟠 High |
| **8** | Estandarización de primitivas UI en `src/components/ui/` | DX / Frontend | 🟢 Medio | 🟡 Medio | 🟢 Bajo | 🟢 Low |
| **9** | Panel unificado de métricas de telemetría de simulación | Observabilidad | 🟢 Medio | 🔴 Alto | 🟢 Bajo | 🟢 Low |
| **10**| Ampliación de tests deterministas headless para reconciliación | Testing | 🟠 Alto | 🟡 Medio | 🟢 Bajo | 🟠 High |

---

## 7. Propuesta de Roadmap

### Phase 1 — Quick Wins & CI Safety (Inmediato)
- [ ] Aplicar `.unref()` al interval del watchdog en `GameLoop.ts`.
- [ ] Ejecutar `pnpm docs:extract` para asegurar sincronía del snapshot `etc/asteroides.api.md`.
- [ ] Refactorizar `HitDetectionSystem.ts` para emitir mediante `eventBus.emitDeferred()`.

### Phase 2 — Core Stability & Type Safety (Semana 1)
- [ ] Sustituir invocaciones síncronas de `eventBus.emit()` en el resto de los sistemas ECS.
- [ ] Reducir typecasts `as any` en la capa de red y actualizar el baseline con `pnpm ratchet:update`.

### Phase 3 — Architectural Modularization (Semana 2)
- [ ] Extraer el subsistema narrativo a `packages/story` (`@tiny-aster/story`).
- [ ] Evaluar empaquetado independiente por juego (`packages/games-asteroids`, etc.).

### Phase 4 — Long-Term Evolution (Semana 3+)
- [ ] Implementar telemetría y métricas de simulación en tiempo real.
- [ ] Ampliar la suite de tests deterministas para escenarios de alta latencia y pérdida de paquetes.

---

> **Respuesta a la Pregunta de Dirección Técnica:**
> *"Si tuviera que invertir solo unas pocas semanas mejorando este repositorio, la máxima rentabilidad técnica se obtiene al: 1) Estandarizar `emitDeferred` en todos los sistemas ECS para garantizar inmutabilidad y determinismo en rollback; 2) Desvincular el temporizador watchdog en `GameLoop.ts` mediante `.unref()` para lograr ejecuciones de tests limpias y rápidas en Jest; y 3) Preservar sincronizada la superficie pública con `pnpm docs:extract`."*
