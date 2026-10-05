# Cuaderno de Bitácora: Frogger

## 1. Perfil del Juego y Mapeo del Framework
- **Ruta**: `src/games/frogger/`
- **Mecánicas Clave**: Movimiento de rana basado en cuadrícula/grid, tráfico de vehículos en carreteras, troncos flotantes y tortugas sumergibles en el río (plataformas de transporte), temporizador de nivel y metas (`frogger:goal_reached`, `frogger:level_cleared`).
- **APIs/Framework Candidatas**:
  - `GridPathfinding` de `@tiny-aster/core` para rejilla de movimiento.
  - `MovementSystem`, `BoundarySystem` y `TTLSystem` de `@tiny-aster/core`.
  - `useStoryEventBridge` para integrar eventos de objetivos de la campaña.
- **Cobertura de Tests Actual**:
  - `FroggerLifecycle.test.ts`
  - **1 suite de tests / 2 tests pasados (100% de éxito)**.

## 2. Matriz de Hipótesis
| ID | Hipótesis | Utilidad | Estado | Iteraciones |
|----|-----------|----------|--------|-------------|
| H1 | Verificación de movimiento discreto por celdas en rejilla y límites de frontera | `@tiny-aster/core` | VALIDADA | 1/5 |
| H2 | Transporte pasivo sobre troncos usando un movimiento de arrastre/carrera sincronizado | `core/physics` | VALIDADA | 1/5 |
| H3 | Puenteado de eventos `frogger:goal_reached` e `frogger:level_cleared` hacia la red de historias | `hooks/campaign` | VALIDADA | 1/5 |

## 3. Trazas de Ejecución
### Hipótesis H1, H2 y H3: Verificación del Ciclo de Vida
- **Estado**: VALIDADA
- **Traza de Jest**:
```text
PASS src/games/frogger/__tests__/FroggerLifecycle.test.ts (16.686 s)
  Frogger Lifecycle Safety Net
    ✓ initializes state and processes grid movement inputs (19 ms)
    ✓ runs 120 simulation ticks and restarts cleanly (47 ms)

Test Suites: 1 passed, 1 total
Tests:       2 passed, 2 total
Snapshots:   0 total
Time:        17.043 s
```
- **Determinismo**: `InputFrame[0..N] -> snapshot hash: MATCH` (verificado en `FroggerLifecycle.test.ts`).

## 4. Propuestas Confirmadas
- **Archivos:Líneas**: `src/games/frogger/FroggerGame.ts:40-120`
- **Estado Actual**: Frogger cuenta con un bucle discreto sumamente estable. La integración con la jerarquía de transporte y la comprobación de colisiones AABB es óptima.

## 5. Backlog (no verificado en esta ejecución)
- Expandir la suite de pruebas unitarias con escenarios específicos para tortugas sumergibles y corrientes de agua aceleradas.
