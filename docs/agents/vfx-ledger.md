# VFX Ledger

**Fase 0:** abierta. No existe una entrada de cierre de inventario. Cada fila representa una única auditoría; los documentos históricos se contrastan con el código de la rama auditada.

| Fecha | Familia | Archivo y símbolo | Estado | Evidencia / qué se hizo |
|---|---|---|---|---|
| 2026-11-07 | combat | `src/games/shared/rendering/PixelFxProceduralVFX.ts` (`drawPixelFxExplosion`, `registerPixelFxProceduralVFX`); `src/games/asteroids/systems/AsteroidCollisionSystem.ts` (`onRegister`, `spawnExplosionParticles`, `onCombatDeath`); `src/games/shared/rendering/JuiceOrchestrator.ts` (`JUICE_CATALOG.asteroids["rock:destroyed"]`, `triggerEvent`, `spawn`); `src/games/shared/rendering/VFXVisualLabModel.ts` (`VFX_LAB_EFFECTS`, `VFX_LAB_PRESETS`) | duplicate | Auditoría de un solo efecto, sin cambios de runtime. El flujo real comienza en el listener `combat:death` registrado por `AsteroidCollisionSystem.onRegister`; para la muerte de un asteroide, `onCombatDeath` llama a `spawnExplosionParticles` y luego a `triggerEvent("asteroids", "rock:destroyed")`. El primer camino ejecuta directamente `new JuiceOrchestrator(world).spawn("pixelfx_explosion", ...)`; el segundo resuelve el mismo primitive en `JUICE_CATALOG` y vuelve a invocar `spawn("pixelfx_explosion", ...)`. Por tanto, la misma destrucción solicita dos entidades del mismo efecto. Además, el perfil del catálogo ya solicita shake (2.5/80 ms) y `onCombatDeath` llama también a `Juice.shake` directamente (3.0 o 1.5/80 ms): canal redundante que queda señalado, no corregido en esta auditoría. El drawer usa `readEffectState` (Render/TTL/Transform), deriva progreso de TTL y variación de fragmentos mediante `deriveSeed`; el registro comparte composición por `IDrawAdapter` entre Canvas y Skia. El Visual Lab incluye `pixelfx_explosion` y el preset reproducible `explosion-neon` (seed 554323). Los archivos de test contienen asserts de geometría/seed y de nombres idénticos entre registros Canvas/Skia; no se ejecutaron en esta sesión. |
| 2026-11-09 | combat | `src/games/asteroids/systems/AsteroidCollisionSystem.ts` (`spawnExplosionParticles`, `onCombatDeath`, `resolveShipAsteroidCollision`) | consolidated | Se eliminó el doble spawn de `pixelfx_explosion` eliminando la llamada directa `spawn("pixelfx_explosion")` en `spawnExplosionParticles` para asteroides (delegándolo exclusivamente al perfil canónico `rock:destroyed` en `JUICE_CATALOG`). Se eliminó la llamada redundante a `Juice.shake` en `onCombatDeath`. Se agregaron guardas `!world.isReSimulating` para suprimir la emisión de VFX de presentación, SFX y popups durante resimulación en rollback, preservando el hit-stop autoritativo. Cubierto con pruebas unitarias en `AsteroidCollisionSystem.test.ts`. |

| 2026-11-16 | combat/traversal/interaction/temporal | `PixelFxProceduralVFX.ts`, `JuiceOrchestrator.ts`, `VFXVisualLabModel.ts` | in-progress | Nueva familia de diez drawers deterministas: Prism Burst, Sonic Boom, Magnetic Surge, Plasma Orbit, Solar Flare, Crystal Bloom, Pulse Lance, Echo Shatter, Tidal Wave y Phase Collapse. Añadidos a registro Canvas/Skia, unión de primitivas y catálogo/presets del Visual Lab; pruebas de smoke para estado balanceado y cobertura del catálogo. Pendiente ejecutar suites y CI; no se afirma paridad raster exacta ni integración gameplay de cada primitiva. |

| 2026-11-24 | combat/traversal/interaction/temporal | `PixelFxProceduralVFX.ts`, `JuiceOrchestrator.ts`, `VFXVisualLabModel.ts`, rendering tests | in-progress | Añadidos veinte drawers adicionales: Ember Cascade, Frost Lattice, Thorn Eruption, Thunderclap, Rune Ward, Verdant Growth, Venom Miasma, Sand Devour, Hydro Surge, Wind Shear, Eclipse Veil, Starfall, Comet Shower, Dimensional Gate, Afterimage Dash, Beam Lattice, Chain Reaction, Shrapnel Fan, Magma Fissure, Aurora Ribbon. Registro compartido Canvas/Skia y cuatro presets deterministas por efecto. La golden conserva sus 59 filas de baseline; los veinte nuevos reciben smoke coverage. Pendiente ejecutar suites y CI; sin wiring de gameplay. |


## Revalidación de catálogo y wiring (2026-11-27)
### Conteo de drawers frente a cobertura de tests

La implementación actual inspeccionada registra **79 drawers** en `src/games/shared/rendering/PixelFxProceduralVFX.ts`, y `src/games/shared/rendering/VFXVisualLabModel.ts` expone **79 efectos** al Visual Lab. Esto acredita registro y disponibilidad en el laboratorio; **no** acredita que los 79 estén conectados a eventos de gameplay.

La golden `docs/agents/fixtures/pixelfx-vfx-golden.jsonl` conserva **59 casos** de baseline. Los casos añadidos después de esa baseline tienen smoke coverage según las entradas del 16 y 24 de noviembre. No se debe cambiar el golden a 79 sin una decisión explícita de ampliar el contrato de regresión visual.

**Inconsistencia detectada en el código de tests:** `src/games/shared/rendering/__tests__/PixelFxProceduralVFX.test.ts` todavía contiene expectativas de **59 registros** para Canvas y Skia (incluidos los asserts identificados alrededor de las líneas 819 y 830), mientras que el registro actual contiene 79. `VFXVisualLabModel.test.ts` ya espera 79 y contrasta los nombres con los registros. La expectativa de conteo de registro está desalineada con la implementación.

Esta es una incompatibilidad estática observada al comparar código; **no** se afirma que Jest se haya ejecutado ni que una suite haya fallado en esta revalidación. La corrección propuesta es actualizar los asserts de cantidad de registros Canvas/Skia a 79, mantener el golden de 59 y ejecutar las suites de drawers/adapters/Visual Lab antes de declarar verde.

### Alcance de integración

- Registro Canvas/Skia, presencia en Visual Lab, golden visual y smoke coverage son dimensiones diferentes y deben reportarse por separado.
- Las entradas del 16 y 24 de noviembre declaran explícitamente que los nuevos drawers no tienen wiring de gameplay individual verificado. Mantener esa limitación.
- No se ha demostrado paridad raster exacta Canvas/Skia mediante pixel-diff de escenas reales.
- La Fase 0 continúa **abierta**: no hay evidencia de un inventario completo de todos los sistemas, efectos y productores de gameplay.

**Ejecución de esta revalidación:** inspección de fuentes y tests; no se ejecutaron Jest, typecheck, render snapshots ni CI.
