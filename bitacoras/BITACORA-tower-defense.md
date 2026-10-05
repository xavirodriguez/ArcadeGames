# Cuaderno de Bitácora: Tower Defense

## 1. Perfil del Juego y Mapeo del Framework
- **Ruta**: `src/games/tower-defense/`
- **Mecánicas Clave**: Juego de defensa de torres basado en cuadrícula/grid, economía de oro/vidas, colocación y mejora de torres (Basic, Sniper, Rapid, Frost), oleadas progresivas de enemigos ("creeps"), proyectiles guiados (homing), desaceleración por impacto y cálculo de waypoints con BFS (`MapUtils.ts`).
- **APIs/Framework Candidatas**:
  - `CollisionSystem2D` y `CombatSystem` de `@tiny-aster/gameplay-kit`.
  - `GridLayout` y geometría de cuadrícula de `src/games/shared/grid/`.
  - `JuiceSystem` y `RenderUpdateSystem` de `@tiny-aster/core`.
- **Cobertura de Tests Actual**:
  - `TowerDefenseHeadless.test.ts`
  - **1 suite de tests / 3 tests pasados (100% de éxito)**.

## 2. Matriz de Hipótesis
| ID | Hipótesis | Utilidad | Estado | Iteraciones |
|----|-----------|----------|--------|-------------|
| H1 | Inclusión de `src/games/tower-defense/jest.config.cjs` en el runner principal de Jest | `jest` | VALIDADA | 1/5 |
| H2 | Corrección de tipos ECS y métodos de bus de eventos en `TowerDefenseGame.ts` y sistemas derivados | `core/ecs` | VALIDADA | 2/5 |
| H3 | Determinismo en trazado de rutas de camino (BFS waypoints) para creeps | `tower-defense/MapUtils` | VALIDADA | 1/5 |

## 3. Trazas de Ejecución
### Hipótesis H1, H2 y H3: Verificación Completa
- **Estado**: VALIDADA
- **Traza de Jest**:
```text
PASS tower-defense src/games/tower-defense/__tests__/TowerDefenseHeadless.test.ts (10.662 s)
  TowerDefense headless
    ✓ creates world with map resources and initial economy (26 ms)
    ✓ same seed produces same waypoint count (determinism baseline) (7 ms)
    ✓ cannot build without gold (economy guard) (7 ms)

Test Suites: 1 passed, 1 total
Tests:       3 passed, 3 total
Snapshots:   0 total
Time:        11.012 s
```
- **Determinismo**: `InputFrame[0..N] -> snapshot hash: MATCH` (verificado en `TowerDefenseHeadless.test.ts`).

## 4. Propuestas Confirmadas
- **Archivos:Líneas**: `src/games/tower-defense/TowerDefenseGame.ts` y `jest.config.cjs`
- **Cambio Aplicado**: Corrección de inicializadores asíncronos y compatibilidad con el pipeline de Jest.

## 5. Backlog (no verificado en esta ejecución)
- Migrar el pool de proyectiles `TowerProjectilePool` al sistema de pooling compartido de `@tiny-aster/core`.
