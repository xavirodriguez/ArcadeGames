# Cuaderno de Bitácora: Out Run (Pseudo-3D Racer)

## 1. Perfil del Juego y Mapeo del Framework
- **Ruta**: `src/games/outrun/`
- **Mecánicas Clave**: Renderizado de carretera pseudo-3D en espacio de pantalla con simulación ECS pura independiente del renderizador, proyección de segmentos con elevación e inclinación curva, movimiento de jugador (`RacerInputSystem`, `RoadAdvanceSystem`), tráfico dinámico con colisiones y fuerza centrífuga (`TrafficSystem`), y soporte de paletas de escenarios deterministas (`OutrunPalettes.ts`).
- **APIs/Framework Candidatas**:
  - `@tiny-aster/core` (`BaseGame`, `World`, `SystemPhase`, `RendererUtils`, `WebAudioPlayer`).
  - `loadAndMutateConfig` y `runWithUnlockedRandomAndMutators` de `src/games/shared/configHelper.ts`.
  - Integración de renderizado dual Canvas (`OutrunCanvasVisuals.ts`) / Skia (`OutrunSkiaVisuals.ts`) registrado mediante `RendererUtils.registerAssets`.
- **Cobertura de Tests Actual**:
  - `RoadProjection.test.ts`
  - `OutrunGameplay.test.ts`
  - **2 suites de tests / 18 tests pasados (100% de éxito)**.

## 2. Matriz de Hipótesis
| ID | Hipótesis | Utilidad | Estado | Iteraciones |
|----|-----------|----------|--------|-------------|
| H1 | Eliminación de typecasts `as unknown` en `OutrunGameplay.test.ts` mediante el método público `game.getWorld()` para cumplir con la regla de trinquete (ratchet) | `@tiny-aster/core` | VALIDADA | 1/5 |
| H2 | Registro de `src/games/outrun/jest.config.cjs` (y `hitandrun`) en la raíz de `jest.config.cjs` para cobertura global en ejecuciones CI | Raíz del proyecto | VALIDADA | 1/5 |
| H3 | Reemplazo de llamadas `require()` dinámicas por importaciones estáticas en `OutrunGame.ts#initializeRenderer` | `outrun/rendering` | VALIDADA | 1/5 |

## 3. Trazas de Ejecución
### Hipótesis H1, H2 y H3: Verificación Completa
- **Estado**: VALIDADA
- **Traza de Jest**:
```text
PASS src/games/outrun/__tests__/RoadProjection.test.ts
PASS src/games/outrun/__tests__/OutrunGameplay.test.ts

Test Suites: 2 passed, 2 total
Tests:       18 passed, 18 total
Snapshots:   0 total
Time:        9.732 s
```
- **Determinismo**: `InputFrame[0..N] -> snapshot hash: MATCH` (verificado en `OutrunGameplay.test.ts` mediante pruebas de snapshot/restore y simulación idéntica desde misma semilla).

## 4. Propuestas Confirmadas
- **Archivos:Líneas**:
  - `src/games/outrun/__tests__/OutrunGameplay.test.ts:19-75` (Acceso a World vía `game.getWorld()` eliminando `as unknown`)
  - `jest.config.cjs:17-21` (Inclusión de `hitandrun` y `outrun` en la configuración global de Jest)
  - `src/games/outrun/OutrunGame.ts:26-38, 280-295` (Uso de importaciones ESM estáticas en lugar de `require` dinámicos)

## 5. Backlog (no verificado en esta ejecución)
- Extraer fórmulas de proyección de carretera de `RoadProjection.ts` a un paquete reutilizable `@tiny-aster/gameplay-kit/pseudo3d` si se desarrollan otros juegos tipo pseudo-3D.
- Refactorizar las sombras de los vehículos de tráfico para utilizar primitivas de sombra compartidas de `SharedVFX.ts`.
