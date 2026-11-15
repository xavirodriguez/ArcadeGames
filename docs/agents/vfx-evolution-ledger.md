# VFX Evolution Ledger

**Alcance:** blend aditivo, trails y anticipación/follow-through. Una sola unidad por invocación.
**Regla de cierre:** una unidad solo pasa a `done` cuando sus pruebas y `pnpm run ci` están verificadas en verde. Los checkpoints humanos permanecen en `awaiting-review` hasta aprobación explícita.

| ID | Unidad | Estado | Dependencias | Archivos | Notas |
|---|---|---|---|---|---|
| U1 | `setBlendMode` en `IDrawAdapter` | in-progress | — | `DrawAdapter.ts`, `SkiaContext.ts`, `__tests__/DrawAdapter.test.ts` | Implementación y tests añadidos en esta rama; falta ejecutar `pnpm run ci`. Checkpoint humano: al cerrar CI, pasar a `awaiting-review` y detenerse. |
| U2 | Blend aditivo en drawers calientes | pending | U1 | `PixelFxProceduralVFX.ts`, perfiles/contrato visual por decidir | Evaluar explosion, muzzle, nova, laser_beam, shockwave y flash de spawnLayeredExplosion. Evitar quemado en sumi-e; no asumir que lighter es apropiado para fondo claro. |
| U3 | Fases `anticipation` y `residual` en vfx-timeline | pending | — | `vfx-timeline.ts`, tests de timeline | Mantener firma de resolveVFXPhase y comprobar que los mapas por defecto conservan fronteras y resultados. |
| U4 | Anticipación y residuo en `drawPixelFxExplosion` | pending | U3 | `PixelFxProceduralVFX.ts`, tests de drawers | Anillo previo contractivo y 2–3 partículas residuales deterministas; revisar progreso/TTL real antes de implementar. |
| U5 | Mismo patrón en `drawPixelFxImpact` y `drawPixelFxNova` | pending | U3, U4 | `PixelFxProceduralVFX.ts`, tests de drawers | Reutilizar helpers de U4, sin duplicar lógica. |
| U6 | Telegraph automático en `JuiceProfile` | pending | U3 | `JuiceOrchestrator.ts`, tests de Juice | Añadir anticipation solo con secuencia temporal compatible; rollback y low-stimulation deben suprimir presentación. Checkpoint humano. |
| U7 | Componente `Trail` + `TrailSystem` | pending | — | ECS component/system, registro y tests | Decisión pendiente: preferir estado de simulación reproducible si el trail debe sobrevivir rollback; si es solo presentación, excluirlo explícitamente de resimulación. Checkpoint humano. |
| U8 | Drawer de trail con paridad Canvas/Skia | pending | U7, U1 | adapters, drawer y tests Canvas/Skia | Polyline/tiras con ancho y alpha decrecientes; sin allocations por frame. |
| U9 | Adopción de trails | pending | U8 | `JuiceOrchestrator.ts`, catálogo y pilotos | Bola de Pong, proyectiles y nave de Asteroids; comprobar coste y supresión durante rollback. |
| U10 | Visual Lab | pending | U2, U4, U8 | `VFXVisualLabModel.ts`, `src/app/vfx-lab/index.tsx` | Reutilizar exclusivamente drawers y perfiles de producción. |

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

## Deuda detectada

- `IDrawAdapter` es un contrato compartido: cualquier implementación/fixture externa debe compilar tras añadir el método. La búsqueda de implementaciones encontró únicamente Canvas y Skia como clases productivas.
- La pila de blend de Skia debe restaurarse junto con save/restore y no debe introducir allocations en drawers; U1 usa una pila preasignada con crecimiento solo si se excede la profundidad inicial.
- La paridad funcional de blend no equivale a paridad raster exacta entre Canvas y Skia; las pruebas verifican mapping y restauración, no pixel-diff.
- U2 debe decidir si el blend es política del perfil o decisión local del drawer. Recomendación pendiente de evaluación: política explícita por perfil, con `sumi-e` en `source-over` salvo prueba visual que justifique otro modo.
- Motion blur global por decay de framebuffer y bloom real/shaders GPU quedan fuera de alcance; solo ideas futuras, no dependencias de esta secuencia.
- No se ha ejecutado todavía `pnpm run ci` en esta sesión. No declarar U1 verde ni `done` hasta obtener evidencia de CI o ejecución local completa.
