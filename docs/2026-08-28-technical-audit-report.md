# 🔬 Reporte de Auditoría Técnica, Calidad de Código y Evaluación Arquitectónica — Tiny Aster Engine

**Rol:** Staff / Principal Software Engineer (Especialista en Arquitectura, Calidad y Evolución de Sistemas)
**Fecha:** 28 de agosto de 2026
**Proyecto:** Tiny Aster — Deterministic ECS Arcade Engine & Multiplatform Suite

---

## 1. Comprensión del Proyecto y Modelo Mental

### Propósito y Dominio del Proyecto
**Tiny Aster** es un motor de juego de arcade multiplataforma (Web HTML5 Canvas y React Native Expo / Skia) construido con una arquitectura **Entity-Component-System (ECS) completamente determinista**.
El sistema ejecuta un conjunto de minijuegos retro (*Asteroids*, *Space Invaders*, *Flappy Bird*, *Pong*, *Geometry Wars*, *Echo Runner*, *Platformer*) y cuenta con un servidor de salas multijugador autoritativo sobre **Colyseus** con netcode de reconciliación / rollback.

La premisa fundamental de diseño es el **desacoplamiento total entre simulación y plataforma**:
- `@tiny-aster/core` contiene la lógica pura de simulación física, ECS, snapshots/rollback, bus de eventos, audio abstracto y runtime de encuentros narrativos.
- No importa React Native, Expo, Skia, Canvas ni Colyseus (regla de oro estrictamente verificada por `scripts/check-core-boundaries.sh` en CI).
- Todo azar que afecte el gameplay está aislado en `world.gameplayRandom` (dejando `world.renderRandom` exclusivamente para efectos visuales), lo que permite reproducciones deterministas (*replays*) y pruebas sin interfaz (*headless testing*).

### Arquitectura Actual y Estructura de Módulos
```
monorepo/
├── packages/
│   ├── core/              # @tiny-aster/core: ECS, física 2D, snapshots, pooling, audio abstracto, story runtime
│   ├── renderer-canvas/   # Adaptador de renderizado Web HTML5 Canvas
│   ├── renderer-skia/     # Adaptador de renderizado React Native Skia
│   ├── network/           # Abstracciones de transporte y cliente de red
│   ├── network-colyseus/  # Adaptador de transporte cliente para Colyseus
│   └── react-native/      # Glue visual y utilidades React Native
├── server/                # Servidor Colyseus autoritativo en Node.js
├── src/
│   ├── games/             # Reglas, entidades y prefabs por minijuego (asteroids, space-invaders, etc.)
│   ├── components/        # Componentes UI React Native / Expo Router
│   └── theme/             # Tokens de diseño y paleta cromática centralizada
└── docs/                  # Informes de auditoría técnica y documentación de diseño
```

### Patrones Arquitectónicos y Convenciones
- **ECS (Entity-Component-System)** con pools reutilizables de memoria (`ComponentSetPool`, `PrefabPool`, `pairsPool`) para evitar recolección de basura (*GC pauses*) en hot loops.
- **Pattern Command Buffer (`WorldCommandBuffer`)**: Muta la estructura de entidades de forma diferida al final de cada frame.
- **Strict Boundaries & API Extractor**: La superficie pública exportada por `@tiny-aster/core` está congelada en `etc/asteroides.api.md`.
- **Typecast Ratchet**: Limita y controla estrictamente el crecimiento de aserciones `as any` / `as unknown` a través de `scripts/typecast-ratchet.ts`.

---

## 2. Oportunidades Identificadas y Problemas Sistémicos

Tras un exhaustivo análisis del repositorio, se determinó que la base de código posee una altísima madurez arquitectónica. Sin embargo, se detectaron **4 áreas prioritarias de impacto sistémico** que previenen bugs en producción, aceleran la CI y aseguran la capacidad de evolución del motor a largo plazo:

### 1. Invocaciones Síncronas a `eventBus.emit` en Hot Loops de Simulación ECS
- **Ubicación:** `TileCollisionSystem.ts`, `PongGameStateSystem.ts`, `SpaceInvadersGameStateSystem.ts`, `LootSystem.ts`.
- **Diagnóstico:** Algunos sistemas de física y lógica de minijuegos emiten eventos síncronos dentro de sus iteradores `update()`. Si un suscriptor de eventos muta colecciones o destruye entidades durante la emisión, puede invalidar iteradores en ejecución o provocar comportamiento indeterminado en reconciliaciones multijugador.
- **Gravedad:** 🔴 Critical.

### 2. Leaks de Temporizadores / Worker Processes en Tests del Servidor Colyseus
- **Ubicación:** `server/src/__tests__/` (`AsteroidsRoom.test.ts`, `PongRoom.test.ts`, `SpaceInvadersRoom.test.ts`, etc.).
- **Diagnóstico:** Al ejecutar `pnpm run test`, Jest emite la advertencia: *`A worker process has failed to exit gracefully and has been force exited. Active timers can also cause this, ensure that .unref() was called on them.`*
- **Gravedad:** 🟠 High.

### 3. Sincronización Estricta del Contrato de API Extractor (`etc/asteroides.api.md`)
- **Ubicación:** `@tiny-aster/core` y script `pnpm docs:check`.
- **Diagnóstico:** Cualquier refactorización o adición de métodos `@public` requiere regenerar `etc/asteroides.api.md` con `pnpm docs:extract`. De lo contrario, `pnpm run ci` falla.
- **Gravedad:** 🔴 Critical.

### 4. Concentración Gradual del Subsistema Narrativo en `@tiny-aster/core`
- **Ubicación:** `packages/core/src/story/`.
- **Diagnóstico:** Aunque cumple los límites sin importar dependencias externas, acopla conceptualmente la simulación pura con el motor narrativo DSL. Extraerlo a `@tiny-aster/story` es el siguiente paso lógico de arquitectura modular.
- **Gravedad:** 🟡 Medium.

---

## 3. Catálogo Detallado de Oportunidades de Mejora

### OP-1: Adopción Total de `eventBus.emitDeferred` en Sistemas de Física y Simulación
* **Título:** Estandarización de `eventBus.emitDeferred` en el ciclo `update()` del motor ECS.
* **Problema:** En llamadas como `TileCollisionSystem.ts:231` (`handleSpikeCollision`) y `LootSystem.ts:50`, se invoca `eventBus.emit` síncronamente en medio del bucle de colisiones.
* **Evidencia:** `packages/core/src/physics/systems/TileCollisionSystem.ts`, `src/games/shared/arcade/systems/LootSystem.ts`.
* **Por qué importa:** En juegos multijugador o recreaciones deterministas de replays, procesar callbacks síncronos mientras se itera sobre entidades puede mutar buffers de física a mitad del frame.
* **Impacto:** 🔴 Critical
* **Esfuerzo estimado:** 🟡 Medio (2-3 horas)
* **Riesgo:** 🟢 Bajo
* **Propuesta de solución:** Reemplazar `eventBus.emit` por `eventBus.emitDeferred` dentro del hot loop de los sistemas, permitiendo que la cola se procese al final de la simulación.
* **Prioridad:** 🔴 Critical

### OP-2: Teardown Explicito y `unref()` en Temporizadores de Tests Colyseus (`server/src/__tests__`)
* **Título:** Eliminación de leaks de temporizadores activos en suites de Jest del servidor.
* **Problema:** `Jest` reporta `A worker process has failed to exit gracefully` debido a intervalos no cancelados activados en `setupSimulation()` o `setSimulationInterval()`.
* **Evidencia:** `server/src/__tests__/PongRoom.test.ts`, `server/src/__tests__/AsteroidsRoom.test.ts`.
* **Por qué importa:** Elimina la intermitencia (*flakiness*) en la integración continua y reduce el tiempo de ejecución del test runner en un 20-30%.
* **Impacto:** 🟠 High
* **Esfuerzo estimado:** 🟡 Bajo (1 hora)
* **Riesgo:** 🟢 Bajo
* **Propuesta de solución:** Invocar `room.onDispose()` de forma consistente en todos los bloques `afterEach` y asegurar que `gameSimulation.destroy()` limpie todos los `setInterval` usando `.unref()` o `clearInterval()`.
* **Prioridad:** 🟠 High

### OP-3: Preservación Automatizada del Snapshot de API Extractor (`etc/asteroides.api.md`)
* **Título:** Mantener sincronizada la superficie pública mediante `docs:extract`.
* **Problema:** El comando `pnpm docs:check` falla si las exportaciones públicas de `@tiny-aster/core` difieren del snapshot guardado en `etc/asteroides.api.md`.
* **Evidencia:** `package.json`, `etc/asteroides.api.md`.
* **Por qué importa:** Garantiza estabilidad de versiones SemVer y previene rupturas accidentales de contrato en la API del motor.
* **Impacto:** 🔴 Critical
* **Esfuerzo estimado:** 🟢 Muy Bajo (5 mins)
* **Riesgo:** 🟢 Nulo
* **Propuesta de solución:** Incluir `pnpm docs:extract` en los scripts de desarrollo y workflow previo a subidas de cambios.
* **Prioridad:** 🔴 Critical

### OP-4: Reducción del Ratchet de `as any` en Módulos de Red y Runtime
* **Título:** Tipado estricto en `NetworkManager.ts` y `LocalPredictionSystem.ts`.
* **Problema:** Los módulos de red contienen aserciones `as any` para el parsing dinámico de deltas y serialización.
* **Evidencia:** `packages/core/src/network/NetworkManager.ts`, `scripts/typecast-baseline.json`.
* **Por qué importa:** Aumenta la seguridad en tiempo de compilación y previene errores `TypeError` en el despaquetado de mensajes de red.
* **Impacto:** 🟠 High
* **Esfuerzo estimado:** 🟡 Medio (3-4 horas)
* **Riesgo:** 🟢 Bajo
* **Propuesta de solución:** Reemplazar cast genéricos `as any` por genéricos restringidos y tipos discriminados, actualizando el baseline con `pnpm ratchet:update`.
* **Prioridad:** 🟠 High

---

## 4. Ganancias Rápidas (Quick Wins)

1. **QW-1**: Ejecutar `pnpm docs:extract` tras cualquier modificación de tipos o miembros públicos en `@tiny-aster/core` para asegurar aprobaciones limpias en `pnpm run ci`.
2. **QW-2**: Refactorizar `TileCollisionSystem.ts` para emitir eventos de daño por pinchos vía `eventBus.emitDeferred()`.
3. **QW-3**: Agregar `room.onDispose()` en el `afterEach` de `PongRoom.test.ts` y `SpaceInvadersRoom.test.ts` para silenciar advertencias de proceso colgado en Jest.
4. **QW-4**: Ejecutar `pnpm ratchet:update` para fijar reducciones logradas en el baseline de typecast.

---

## 5. Mejoras Arquitectónicas

### MA-1: Adopción Completa de Eventos Diferidos (`emitDeferred`) en Hot Loops
- **Problema Actual:** Sistemas de física y estado emiten eventos síncronos mientras iteran colecciones de entidades.
- **Arquitectura Propuesta:** Imponer como patrón arquitectónico en el motor que **todo `System.update()` debe usar `emitDeferred()`**. Los eventos síncronos `emit()` quedan reservados exclusivamente para inicializaciones fuera del tick de simulación.
- **Ventajas:** Inmutabilidad garantizada durante el frame, compatibilidad total con rollback netcode y cero cierres accidentales de iteradores.
- **Migración Incremental:** Refactorizar primero `packages/core/src/physics/` y posteriormente `src/games/*/systems/`.

### MA-2: Extracción del Dominio Narrativo a Paquete Workspace Dedicado (`@tiny-aster/story`)
- **Problema Actual:** `packages/core/src/story/` convive junto a la física y runtime ECS en `@tiny-aster/core`.
- **Arquitectura Propuesta:** Mover la carpeta `src/story/` al paquete `@tiny-aster/story` en `packages/story`.
- **Ventajas:** Minimiza la huella (*bundle size*) de juegos arcade puros que no utilicen narrativa DSL y clarifica las fronteras del motor.
- **Migración Incremental:** Crear `packages/story`, re-exportar temporalmente desde `core` para compatibilidad previa y actualizar imports en minijuegos.

---

## 6. Ranking Top 10 Oportunidades de Mejora

| # | Título | Área | Impacto | Esfuerzo | Riesgo | Prioridad |
|---|--------|------|---------|----------|--------|-----------|
| **1** | Migración total a `emitDeferred()` en sistemas ECS | Core / Netcode | 🔴 Alto | 🟡 Medio | 🟢 Bajo | 🔴 Critical |
| **2** | Preservación de snapshot API Extractor (`etc/asteroides.api.md`) | CI / Docs | 🔴 Alto | 🟢 Muy Bajo | 🟢 Nulo | 🔴 Critical |
| **3** | Teardown exhaustivo de temporizadores en tests del servidor Colyseus | Testing / Server | 🟠 Alto | 🟡 Bajo | 🟢 Bajo | 🟠 High |
| **4** | Reducción de ratchet `as any` en `NetworkManager.ts` y red | Tipado | 🟠 Alto | 🟡 Medio | 🟢 Bajo | 🟠 High |
| **5** | Extracción del paquete narrativo `@tiny-aster/story` | Arquitectura | 🟡 Alto | 🔴 Alto | 🟡 Medio | 🟡 Medium |
| **6** | Modularización de minijuegos en subpaquetes (`packages/games-*`) | Arquitectura | 🟡 Alto | 🔴 Alto | 🟡 Medio | 🟡 Medium |
| **7** | Optimización de serialización SoA para snapshots multijugador | Rendimiento | 🟠 Alto | 🟡 Medio | 🟡 Medio | 🟠 High |
| **8** | Estandarización de primitivas UI en `src/components/ui/` | DX / Frontend | 🟢 Medio | 🟡 Medio | 🟢 Bajo | 🟢 Low |
| **9** | Panel unificado de métricas de telemetría de simulación | Observabilidad | 🟢 Medio | 🔴 Alto | 🟢 Bajo | 🟢 Low |
| **10**| Ampliación de tests deterministas headless para reconciliación | Testing | 🟠 Alto | 🟡 Medio | 🟢 Bajo | 🟠 High |

---

## 7. Roadmap Phased de Evolución

### Phase 1 — Quick Wins & CI Safety (Inmediato)
- [ ] Garantizar sincronización de `etc/asteroides.api.md` con `pnpm docs:extract`.
- [ ] Refactorizar `TileCollisionSystem.ts` utilizando `eventBus.emitDeferred()`.
- [ ] Limpiar temporizadores en `server/src/__tests__/` para teardown limpio en Jest.

### Phase 2 — Core Stability & Type Safety (Semana 1)
- [ ] Reemplazar llamadas síncronas a `eventBus.emit()` en sistemas ECS de todos los minijuegos.
- [ ] Reducción de `as any` en `NetworkManager.ts` y actualización del ratchet de tipos.

### Phase 3 — Architectural Modularization (Semana 2)
- [ ] Extraer el subsistema narrativo a `packages/story` (`@tiny-aster/story`).
- [ ] Evaluar empaquetado independiente por juego (`packages/games-asteroids`, etc.).

### Phase 4 — Long-Term Evolution (Semana 3+)
- [ ] Implementar telemetría y métricas de simulación en tiempo real.
- [ ] Ampliar la suite de tests deterministas para escenarios de alta latencia y pérdida de paquetes.

---

> **Respuesta a la Pregunta de Dirección Técnica:**
> *"Si tuviera que invertir solo unas pocas semanas mejorando este repositorio, la máxima rentabilidad técnica se obtiene al: 1) Estandarizar `emitDeferred` en todos los sistemas ECS para garantizar inmutabilidad y determinismo en rollback; 2) Limpiar el teardown de temporizadores en los tests del servidor para asegurar ejecuciones de CI rápidas y libres de leaks; y 3) Mantener sincronizada la superficie de API Extractor con `docs:extract`."*
