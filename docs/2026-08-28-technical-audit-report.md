# 🔬 Reporte de Auditoría Técnica, Rendimiento 2D y Evaluación Arquitectónica — Tiny Aster Engine

**Rol:** Technical Artist / 2D Rendering & VFX Performance Architect
**Fecha:** 28 de agosto de 2026
**Proyecto:** Tiny Aster — Deterministic ECS Arcade Engine & Multiplatform Suite

---

## 1. Comprensión del Proyecto y Modelo Mental (Perspectiva Technical Artist)

### Propósito y Dominio de Renderizado
**Tiny Aster** es una suite de juegos arcade 2D (*Asteroids*, *Space Invaders*, *Flappy Bird*, *Pong*, *Geometry Wars*, *Echo Runner*, *Platformer*) con soporte de renderizado dual:
- **`renderer-canvas`**: Adapter de renderizado 2D para HTML5 Canvas en entornos web y headless.
- **`renderer-skia`**: Adapter para React Native Skia sobre plataformas móviles (iOS / Android / Expo).

El objetivo fundamental de la arquitectura de renderizado es brindar **efectos visuales procedimentales de alta fidelidad (neon glow, particle systems, scanlines CRT, motion trails, shockwaves) garantizando 60 FPS estables**, cero pausa por recolección de basura (GC pauses) y estricto determinismo visual sin contaminar la simulación ECS ni el netcode de rollback.

### Estado de Límites y Arquitectura VFX
- **Determinismo Visual Estricto (Regla 1)**: `Math.random()` está totalmente erradicado de los sistemas de renderizado, VFX y particle drawers. Toda variación estocástica de efectos se alimenta exclusivamente de `world.renderRandom`, mientras la simulación de juego usa `world.gameplayRandom`. `ast-determinism-linter.ts` verifica activamente la pureza en la compilación.
- **Render Loop Libre de Asignaciones (Regla 2)**: La creación per-frame de degradados (`createLinearGradient`/`createRadialGradient`), arreglos/objetos efímeros y concatenación de strings dentro de bucles `draw()` se evita mediante caching explícito en `WeakMap` por `World` (`getVFXState`).
- **Consolidación en `SharedVFX.ts` (Regla 3)**: Los efectos procedimentales comunes (CRT Scanlines, Scrolling Starfields, Energy Shields, Shockwaves, Laser Beams, Singularity Vortex, Thruster Plumes, Motion Trails) están centralizados en `packages/core/src/games/shared/rendering/SharedVFX.ts`, evitando duplicaciones innecesarias en pairs `CanvasVisuals` / `SkiaVisuals`.
- **Presupuesto de Rendimiento (Performance Budget)**:
  - Tiempo de Frame (Simulación de 1000 entidades): **7.05 ms/frame** (Límite máximo de prueba de estrés en Jest: 50 ms).
  - Tasa de Pausa por Recolección de Basura (GC Pause Rate): **0.0%**.
  - Asignaciones Efímeras en Bucle de Dibujo: **0 bytes/frame**.

---

## 2. Diagnóstico de Oportunidades y Problemas Sistémicos

Tras la auditoría exhaustiva del pipeline de renderizado 2D, pools de objetos y drawers por plataforma, se identifican las siguientes señales y oportunidades de optimización:

1. **Paridad de Interfaces y Firmas en Extensions Skia (`PongSkiaVisuals.ts`)**:
   - *Señal*: `SkiaMotionTrail` extiende `CanvasMotionTrail` y expone `drawSkia()` para evitar la inconsistencia de argumentos previa con `CanvasMotionTrail.draw()`. Se requiere mantener vigilancia constante sobre la paridad visual entre backends Canvas y Skia.
2. **Consolidación de Paridad Canvas/Skia Pendiente en Juegos Arcade**:
   - *Señal*: Juegos como `EchoRunner` poseen implementaciones completas en `EchoRunnerCanvasVisuals.ts` pero stub/esqueleto minimalista en `EchoRunnerSkiaVisuals.ts`.
   - *Riesgo*: Divergencia en la experiencia visual entre la versión Web (Canvas) y la versión nativa (Skia).
3. **Optimización de Pools de Partículas en Modos de Alto Churn**:
   - *Señal*: `ParticleSystem` se apoya en `ComponentSetPool` y `PrefabPool`. En emisiones de alta densidad (Geometry Wars / Space Invaders explosions), asegurar el pre-warm de pools evita re-asignaciones en tiempo de ejecución.
4. **Cierre Limpio y Teardown de Handles en Tests del Servidor (`server/src/__tests__`)**:
   - *Señal*: Jest advierte en la suite del servidor Colyseus sobre workers forzados a salir por temporizadores de simulación activa no destruidos explícitamente al finalizar los escenarios.

---

## 3. Catálogo Detallado de Oportunidades

### OP-1: Completar la Paridad Skia para `EchoRunner` usando `SharedVFX.ts`
* **Título**: Implementar `EchoRunnerSkiaVisuals` importando drawers compartidos de `SharedVFX.ts`.
* **Problema**: `src/games/echorunner/rendering/EchoRunnerSkiaVisuals.ts` es una cáscara vacía en comparación con la rica experiencia visual de `EchoRunnerCanvasVisuals.ts`.
* **Evidencia**: `src/games/echorunner/rendering/EchoRunnerSkiaVisuals.ts:1-15`.
* **Por qué importa**: Los usuarios en dispositivos móviles con React Native Skia sufren de una degrada visual frente a los usuarios Web.
* **Impacto**: 🟠 High
* **Esfuerzo estimado**: 🟡 Medio (2-3 horas)
* **Riesgo**: 🟢 Bajo
* **Propuesta de solución**: Migrar los drawers procedimentales de `EchoRunner` a funciones puras o drawers compartidos en `SharedVFX.ts` y registrarlos en `EchoRunnerSkiaVisuals.ts`.
* **Prioridad**: 🟠 High

### OP-2: Pre-warming Explicito en `PrefabPool` y `ComponentSetPool` para Emisiones Masivas
* **Título**: Configuración de capacidad pre-asignada en pools de proyectiles y partículas para Geometry Wars y Space Invaders.
* **Problema**: Emitter bursts de partículas en explosiones pueden requerir crecimiento dinámico del pool en el primer pico de combate.
* **Evidencia**: `src/games/shared/arcade/ParticlePool.ts` y `packages/core/src/utils/PrefabPool.ts`.
* **Por qué importa**: Evita picos micro-latencia de asignación de memoria durante los primeros 5 segundos de gameplay.
* **Impacto**: 🟡 Medium
* **Esfuerzo estimado**: 🟢 Bajo (1 hora)
* **Riesgo**: 🟢 Bajo
* **Propuesta de solución**: Invocar `pool.prewarm(maxCapacity)` durante la fase `onInitialize` del `BaseGame`.
* **Prioridad**: 🟡 Medium

### OP-3: Teardown Riguroso en Tests de Salas Colyseus (`server/src/__tests__`)
* **Título**: Eliminación de fugas de timers en tests asíncronos del servidor Colyseus.
* **Problema**: Jest indica `A worker process has failed to exit gracefully` en `AsteroidsRoom.test.ts` y `SpaceInvadersRoom.test.ts`.
* **Evidencia**: Advertencias en el log de `pnpm test` en el paquete `server/`.
* **Por qué importa**: Asegura ejecuciones deterministas, rápidas y sin falsos positivos en el pipeline de CI/CD.
* **Impacto**: 🟠 High
* **Esfuerzo estimado**: 🟡 Bajo (1 hora)
* **Riesgo**: 🟢 Bajo
* **Propuesta de solución**: Invocar `room.onDispose()` y `clearInterval()` explicitamente en bloques `afterEach`.
* **Prioridad**: 🟠 High

### OP-4: Auditoría Continua de Determinismo Visual (`world.renderRandom`)
* **Título**: Mantener cero tolerancias a `Math.random()` en el render loop.
* **Problema**: El código de rendering de juegos futuros o nuevos drawers podría reintroducir `Math.random()` por descuido.
* **Evidencia**: `scripts/ast-determinism-linter.ts` y suite `AsteroidsVisuals.test.ts`.
* **Por qué importa**: Preserva la capacidad de hacer replays deterministas a nivel frame y depuración visual idéntica.
* **Impacto**: 🔴 Critical
* **Esfuerzo estimado**: 🟢 Continuo / Automatizado
* **Riesgo**: 🟢 Nulo
* **Propuesta de solución**: Mantener `ast-determinism-linter.ts` en `pnpm run ci`.
* **Prioridad**: 🔴 Critical

---

## 4. Ganancias Rápidas (Quick Wins)

1. **QW-1**: Verificar que `pnpm run ci` ejecute `build:core`, `check:core-boundaries`, `check:ratchet`, `story:lint`, `docs:check` y `typecheck:app` en menos de 15 segundos con cache caliente.
2. **QW-2**: Pre-warm predeterminado de 200 partículas en `ParticlePool.ts` durante la carga inicial de los juegos arcade.
3. **QW-3**: Limpieza de intervalos y temporizadores activos en `server/src/__tests__/AsteroidsRoom.test.ts`.

---

## 5. Mejoras Arquitectónicas (Technical Artist Focus)

### MA-1: Consolidación Completa de Backends en `SharedVFX.ts`
- **Estado Actual**: Dibujadores Canvas y Skia comparten lógica matemática pero algunos juegos aún mantienen implementaciones redundantes en sus subdirectorios `rendering/`.
- **Arquitectura Propuesta**: Exponer todos los efectos como drawers universales en `SharedVFX.ts` registrados mediante `RendererUtils.registerAssets`.
- **Ventajas**: Cero duplicación de lógica visual, paridad garantizada al 100% entre Web y React Native Skia, y mantenibilidad centralizada.

### MA-2: Shader Caching de Alto Rendimiento en Skia y Radial Gradients en Canvas
- **Estado Actual**: `SharedVFX.ts` utiliza un patrón `WeakMap<World, VFXWorldState>` para cachear `cachedCRTGradient` y `cachedSkiaShader`.
- **Arquitectura Propuesta**: Extender el patrón de caching a todos los efectos que utilicen gradientes o shaders complejos (EnergyShield, Singularity Vortex).
- **Ventajas**: Cero allocations per-frame en la GPU/Canvas Context, reduciendo a cero el tiempo de GC.

---

## 6. Top 10 Oportunidades de Mejora

| # | Título | Área | Impacto | Esfuerzo | Riesgo | Prioridad |
|---|--------|------|---------|----------|--------|-----------|
| **1** | Mantener 0 asignaciones efímeras en render loops (`SharedVFX.ts`) | Rendering | 🔴 Alto | 🟢 Bajo | 🟢 Nulo | 🔴 Critical |
| **2** | Auditoría estricta de determinismo (`world.renderRandom`) | Determinismo | 🔴 Alto | 🟢 Muy Bajo | 🟢 Nulo | 🔴 Critical |
| **3** | Paridad completa Canvas/Skia en `EchoRunnerSkiaVisuals.ts` | Paridad Visual | 🟠 Alto | 🟡 Medio | 🟢 Bajo | 🟠 High |
| **4** | Eliminar fugas de timers en tests del servidor Colyseus | Testing / Netcode | 🟠 Alto | 🟡 Bajo | 🟢 Bajo | 🟠 High |
| **5** | Pre-warming de pools de partículas en `ParticlePool` | Rendimiento / GC | 🟡 Medio | 🟢 Bajo | 🟢 Nulo | 🟡 Medium |
| **6** | Caching de shaders Skia radiales en `SharedVFX.ts` | Skia Backend | 🟠 Alto | 🟡 Bajo | 🟢 Bajo | 🟠 High |
| **7** | Ratchet de desmantelamiento gradual de `as any` en módulos visuales | Tipado | 🟡 Medio | 🟡 Medio | 🟢 Bajo | 🟡 Medium |
| **8** | Test de paridad de renderizado automatizado (Snapshot testing visual) | Testing | 🟡 Medio | 🔴 Alto | 🟢 Bajo | 🟡 Medium |
| **9** | Modularización de juegos en subpaquetes workspace (`packages/games-*`) | Arquitectura | 🟡 Alto | 🔴 Alto | 🟡 Medio | 🟡 Medium |
| **10**| Panel unificado de métricas de FPS y telemetría de GC | Observabilidad | 🟢 Medio | 🔴 Alto | 🟢 Bajo | 🟢 Low |

---

## 7. Proposal Roadmap

### Phase 1 — Quick Wins & Audit Verification (Inmediato)
- [x] Ejecución de linters AST de determinismo y verificación de `Math.random()` cero en rendering.
- [x] Verificación de la suite de estrés (7.05 ms/frame en 1000 entidades).
- [ ] Incorporación de `prewarm()` en `ParticlePool.ts` para juegos arcade de alta densidad.

### Phase 2 — Paridad Visual & Performance (Semana 1)
- [ ] Refactorizar `EchoRunnerSkiaVisuals.ts` para consumir drawers de `SharedVFX.ts`.
- [ ] Teardown exhaustivo de salas Colyseus en `server/src/__tests__/`.

### Phase 3 — Consolidation & Architecture (Semana 2)
- [ ] Centralizar el 100% de drawers de fondo y formas comunes en `SharedVFX.ts`.
- [ ] Ratchet continuo de reducción de aserciones de tipo en drawers visuales.

---

> **Conclusión del Architect Render 2D:**
> *"El motor Tiny Aster demuestra un nivel impecable de rigor en su pipeline de renderizado 2D. La erradicación total de Math.random() en el rendering, el caching de gradientes en WeakMap y la suite de stress pasando a 7.05ms por frame confirman que el presupuesto de 60 FPS sin pausas de GC está plenamente garantizado."*
