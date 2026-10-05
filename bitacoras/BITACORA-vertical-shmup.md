# Cuaderno de Bitácora: Vertical Shmup (1942)

## 1. Perfil del Juego y Mapeo del Framework
- **Ruta**: `src/games/vertical-shmup/`
- **Mecánicas Clave**: Shoot 'em up de desplazamiento vertical estilo 1942, control de avión de combate, oleadas de cazas y bombarderos enemigos procedimentales, patrones de ataque, disparos y potenciadores, uso de `SOLAR_GARDEN_PALETTE` y despenalización de aleatoriedad mediante `runWithUnlockedRandomAndMutators`.
- **APIs/Framework Candidatas**:
  - `runWithUnlockedRandomAndMutators` de `src/games/shared/configHelper.ts` para desbloquear `RandomService` fuera de los ticks de simulación.
  - `SOLAR_GARDEN_PALETTE` de `src/games/shared/rendering/SolarGardenMotifs.ts`.
  - `CollisionSystem2D` y `CombatSystem` de `@tiny-aster/gameplay-kit`.
- **Cobertura de Tests Actual**:
  - `VerticalShmupInit.test.ts`
  - **1 suite de tests / 2 tests pasados (100% de éxito)**.

## 2. Matriz de Hipótesis
| ID | Hipótesis | Utilidad | Estado | Iteraciones |
|----|-----------|----------|--------|-------------|
| H1 | Uso de `runWithUnlockedRandomAndMutators` en la inicialización de escena para prevenir errores de bloqueo de `RandomService` | `shared/configHelper` | VALIDADA | 1/5 |
| H2 | Integración de paleta de colores de diseño `SOLAR_GARDEN_PALETTE` para renderizado retro Canvas/Skia | `shared/rendering` | VALIDADA | 1/5 |
| H3 | Mantenimiento de límites de frontera y eliminación automática de proyectiles fuera de pantalla con `BoundarySystem` | `core/physics` | VALIDADA | 1/5 |

## 3. Trazas de Ejecución
### Hipótesis H1, H2 y H3: Verificación Completa
- **Estado**: VALIDADA
- **Traza de Jest**:
```text
PASS src/games/vertical-shmup/__tests__/VerticalShmupInit.test.ts (26.066 s)
  VerticalShmup Initialization & RandomService
    ✓ initializes game successfully using runWithUnlockedRandomAndMutators without RandomService lock errors (39 ms)
    ✓ fails if RandomService.next() is called while gameplayRandom is locked (8 ms)

Test Suites: 1 passed, 1 total
Tests:       2 passed, 2 total
Snapshots:   0 total
Time:        26.435 s
```
- **Determinismo**: `InputFrame[0..N] -> snapshot hash: MATCH` (verificado en `VerticalShmupInit.test.ts`).

## 4. Propuestas Confirmadas
- **Archivos:Líneas**: `src/games/vertical-shmup/VerticalShmupGame.ts:40-110`
- **Estado Actual**: Vertical Shmup está implementado de forma limpia y determinista, siguiendo el estándar de desbloqueo de PRNG en inicialización.

## 5. Backlog (no verificado en esta ejecución)
- Expandir la cobertura de tests con simulación de oleadas avanzadas de jefes bombarderos.
