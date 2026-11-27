# VFX Evolution Ledger

**Alcance:** blend aditivo, trails y anticipación/follow-through. Una sola unidad por invocación.
**Regla de cierre:** una unidad solo pasa a `done` cuando sus pruebas y `pnpm run ci` están verificadas en verde. Los checkpoints humanos permanecen en `awaiting-review` hasta aprobación explícita.

| ID | Unidad | Estado | Dependencias | Archivos | Notas |
|---|---|---|---|---|---|
| U1 | `setBlendMode` en `IDrawAdapter` | implemented / acceptance blocked | — | `DrawAdapter.ts`, `SkiaContext.ts`, `__tests__/DrawAdapter.test.ts` | Implementación integrada por PR #1177 (merge commit `bfb215d123d769b04533b3b463d95cd66b6860dd`). Los runs históricos de CI/E2E no quedaron verdes; mantener aceptación global pendiente hasta ejecutar CI actual en verde. |
| U2 | Blend aditivo en drawers calientes | pending | U1 | `PixelFxProceduralVFX.ts`, perfiles/contrato visual por decidir | Evaluar explosion, muzzle, nova, laser_beam, shockwave y flash de spawnLayeredExplosion. Evitar quemado en sumi-e; no asumir que lighter es apropiado para fondo claro. |
| U3 | Fases `anticipation` y `residual` en vfx-timeline | pending | — | `vfx-timeline.ts`, tests de timeline | Mantener firma de resolveVFXPhase y comprobar que los mapas por defecto conservan fronteras y resultados. |
| U4 | Anticipación y residuo en `drawPixelFxExplosion` | pending | U3 | `PixelFxProceduralVFX.ts`, tests de drawers | Anillo previo contractivo y 2–3 partículas residuales deterministas; revisar progreso/TTL real antes de implementar. |
| U5 | Mismo patrón en `drawPixelFxImpact` y `drawPixelFxNova` | pending | U3, U4 | `PixelFxProceduralVFX.ts`, tests de drawers | Reutilizar helpers de U4, sin duplicar lógica. |
| U6 | Telegraph automático en `JuiceProfile` | pending | U3 | `JuiceOrchestrator.ts`, tests de Juice | Añadir anticipation solo con secuencia temporal compatible; rollback y low-stimulation deben suprimir presentación. Checkpoint humano. |
| U7 | Componente `Trail` + `TrailSystem` | pending | — | ECS component/system, registro y tests | Decisión pendiente: preferir estado de simulación reproducible si el trail debe sobrevivir rollback; si es solo presentación, excluirlo explícitamente de resimulación. Checkpoint humano. |
| U8 | Drawer de trail con paridad Canvas/Skia | pending | U7, U1 | adapters, drawer y tests Canvas/Skia | Polyline/tiras con ancho y alpha decrecientes; sin allocations por frame. |
| U9 | Adopción de trails | pending | U8 | `JuiceOrchestrator.ts`, catálogo y pilotos | Bola de Pong, proyectiles y nave de Asteroids; comprobar coste y supresión durante rollback. |
| U10 | Ampliación de cobertura del Visual Lab | partial / pending enhancements | U2, U4, U8 | `VFXVisualLabModel.ts`, `src/app/vfx-lab/index.tsx` | El Visual Lab ya existe y consume drawers compartidos con producción. Ampliar/verificar cobertura de blend, anticipation/residual y trails cuando esas unidades estén implementadas; no construir un laboratorio paralelo. |

## Hallazgos de auditoría

- No existía `docs/agents/vfx-evolution-ledger.md`. Sí existen `docs/agents/vfx-ledger.md`, `docs/agents/juice-consolidation-ledger.md` y `docs/agents/game-feel-architecture-ledger.md`; no se encontró `docs/agents/procedural-vfx-ledger.md`. Se revisaron para evitar solapar auditorías de ownership, rollback, Juice y drawers.
- La ruta real de Juice es `src/games/shared/rendering/JuiceOrchestrator.ts`, no `src/games/shared/juice/JuiceOrchestrator.ts`.
- `src/games/shared/rendering/DrawAdapter.ts` contiene las dos implementaciones canónicas (`CanvasDrawAdapter`, `SkiaDrawAdapter`) y `IDrawAdapter`; no existía `setBlendMode`. Canvas ya tiene `save/restore`; Skia también llama a save/restore del canvas, pero no conserva estado de blend en el adapter.
- `SkiaDrawAdapter` crea un paint por primitiva a través de `createSkiaPaint`; el blend debe aplicarse ahí para cubrir fill/stroke/text de forma uniforme. El paquete usa el enum `BlendMode` exportado por `@shopify/react-native-skia` (evidencia en `packages/renderer-skia/src/SkiaSpriteDrawer.ts`: `BlendMode.SrcIn`).
- `vfx-timeline.ts` define actualmente `contact | expansion | peak | dissipation`. `resolveVFXPhase(progress, phases = DEFAULT_VFX_COMBAT_PHASES)` recibe el mapa como segundo argumento. `validatePhases` comprueba límites y solapamientos, pero no restringe el ID semántico; es agnóstico al ID en runtime.
- `PixelFxProceduralVFX.ts` calcula `progress` con `elapsed / configuredDuration`, donde `configuredDuration` puede ser `render.vfxAnimDuration`; alpha sí deriva de `TTL.remaining / TTL.timeLeft`. Esto difiere del requisito estricto del prompt de derivar progreso solo de TTL y deberá resolverse/documentarse antes de U4/U5, sin cambiarlo dentro de U1.
- `JuiceOrchestrator.spawn` ya retorna antes de emitir entidades/partículas/shake cuando `world.isReSimulating`; el hit-stop se solicita antes de esa guarda. `juiceLevel` escala TTL/size y `lowStimulationMode` reduce opacidad y suprime shake; los efectos de pantalla completa tienen una excepción específica.
- `VFXEffectIR.ts` define perfiles `arcade-neon` y `sumi-e` solo con tokens semánticos; no hay política de blend. Los colores de los perfiles proceden de tokens, no de literales hex.
- `SharedVFX.ts` reexporta los adapters y llama al registro procedural existente. `VFXVisualLabModel.ts` importa drawers reales desde `PixelFxProceduralVFX.ts`; el Lab no requiere un renderer paralelo.
- Los tests de adapters existentes están en `src/games/shared/rendering/__tests__/DrawAdapter.test.ts`; los tests de timeline/drawers siguen en el mismo árbol de rendering. El script raíz `ci` está definido en `package.json` y ejecuta build core, build gameplay-kit, guardrails, docs-check y typecheck de app.
- U7 aún no tiene una decisión de arquitectura validada. La propuesta inicial es estado de simulación con ring buffer fijo y muestras derivadas de ticks; si se decide presentation-only, el ledger debe registrar explícitamente que se descarta durante resimulación y no forma parte del estado reproducible.

## Resultado de CI observado (2026-11-15)

- PR #1177, commit `857f4080fd21a9a3b51bb7f485f6c8b367245d0f`; workflow E2E run `43726397617`: 25/27 pasan. Fallan dos pruebas en `e2e/hitandrun.spec.ts`: combo melee espera `jab1` pero recibe null (línea 129); el death flow no llega a active (timeout de 60 s, línea 166). No se modificaron archivos E2E/Hit & Run en U1.
- CI run `43726397646`: build, lint y typecheck de Turborepo completados correctamente; `DrawAdapter.test.ts` aparece como PASS. El paso "Run tests through Turborepo" falla en suites no modificadas por U1: `CombatRollbackResimulation.test.ts` (hash normal/resimulado divergente), `vfx-procedural-core.test.ts` (diferencia de precisión floating-point en `phaseT`), y `VFXVisualLabModel.test.ts` (preset extra `0.28`). Los archivos `vfx-timeline.ts` y `vfx-procedural-core.test.ts` tienen el mismo blob SHA en `master` y en la rama U1, confirmando que U1 no los cambió.
- La suite amplia adicional de 293 suites reportó inicialmente 27 fallos y 266 pases; los fallos incluyen múltiples juegos y watchdogs de GameLoop que siguen emitiendo logs después del test. El job todavía figura en ejecución al registrar esta actualización; no se interpreta como resultado final.
- Documentación CI pasa; Vercel pasó. E2E y CI no están verdes. Se respeta la regla de no corregir fallos fuera de U1. Por ello U1 queda `blocked`, no `done` ni `awaiting-review`.

## Deuda detectada

- `IDrawAdapter` es un contrato compartido: cualquier implementación/fixture externa debe compilar tras añadir el método. La búsqueda de implementaciones encontró únicamente Canvas y Skia como clases productivas.
- La pila de blend de Skia debe restaurarse junto con save/restore y no debe introducir allocations en drawers; U1 usa una pila preasignada con crecimiento solo si se excede la profundidad inicial.
- La paridad funcional de blend no equivale a paridad raster exacta entre Canvas y Skia; las pruebas verifican mapping y restauración, no pixel-diff.
- U2 debe decidir si el blend es política del perfil o decisión local del drawer. Recomendación pendiente de evaluación: política explícita por perfil, con `sumi-e` en `source-over` salvo prueba visual que justifique otro modo.
- Motion blur global por decay de framebuffer y bloom real/shaders GPU quedan fuera de alcance; solo ideas futuras, no dependencias de esta secuencia.
- No se ha ejecutado todavía `pnpm run ci` en esta sesión. No declarar U1 verde ni `done` hasta obtener evidencia de CI o ejecución local completa.


## Revalidación de estado (2026-11-27)
### U1 — `setBlendMode`

**Estado corregido: implementación integrada; aceptación global bloqueada/no verificada.** `IDrawAdapter.setBlendMode`, Canvas y Skia están implementados y cubiertos por `src/games/shared/rendering/__tests__/DrawAdapter.test.ts`. PR #1177 está fusionada (merge commit `bfb215d123d769b04533b3b463d95cd66b6860dd`). Por tanto, `blocked` no debe interpretarse como “implementación no integrada”.

La verificación global sí quedó bloqueada por evidencia de CI histórica: workflow E2E run `43726397617` falló en el paso de E2E y CI run `43726397646` no terminó en verde; el propio ledger registra fallos en suites ajenas a U1. Esos runs no prueban el estado de CI del HEAD actual. Mantener la regla de no declarar `done` hasta tener pruebas y `pnpm run ci` verdes, pero separar los campos: implementación integrada, aceptación/verificación global pendiente.

### U10 — Visual Lab

El Visual Lab **ya existe**: `src/app/vfx-lab/index.tsx` y `src/games/shared/rendering/VFXVisualLabModel.ts` consumen drawers/perfiles compartidos con producción; el modelo actual expone 79 efectos. U10 no puede describirse como “construir el Visual Lab desde cero”. Lo pendiente en el alcance de esta evolución es ampliar/verificar la cobertura para las unidades U2/U4/U8 y sus perfiles/trails cuando estén implementados. La dependencia U2/U4/U8 debe interpretarse como ampliación de casos y validación, no como dependencia para la existencia del laboratorio.

### Unidades restantes

U2–U9 permanecen pendientes según la evidencia revisada; esta revalidación no las marca como implementadas. La existencia de drawers y presets no demuestra blend aditivo aplicado a drawers concretos, fases anticipation/residual, telegraph o trails conectados a gameplay.

### Alcance de la evidencia

Los runs citados son históricos (15 de noviembre) y no representan CI del HEAD actual. No se ejecutó `pnpm run ci` ni Jest en esta actualización. La regla de cierre de la cabecera permanece vigente: pruebas y CI actuales en verde, más checkpoint humano cuando corresponda.
