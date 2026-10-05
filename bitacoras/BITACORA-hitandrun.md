# Cuaderno de Bitácora: Hit and Run

## 1. Perfil del Juego y Mapeo del Framework
- **Ruta**: `src/games/hitandrun/`
- **Mecánicas Clave**: Run-and-gun estilo Metal Slug / brawler en 2D, física de plataformas de `@tiny-aster/gameplay-kit`, desplazamiento de cámara push-scroll (`HitRunCameraScrollSystem`), apuntado en 8 direcciones, colisionadores de agachado, granadas en arco parabólico, rescate de prisioneros de guerra (POW) que otorgan puntos y armas, recolección de armas con munición limitada y telegrafiado de ataques de enemigos (`EnemyAttackConfig`).
- **APIs/Framework Candidatas**:
  - `PlatformerInput`, físicas/tilemap de `@tiny-aster/gameplay-kit`.
  - `HitRunPowSystem` y `registerPowBlueprint` para rescate de prisioneros.
  - `HitRunWaveSystem` para bloqueos de cámara por oleadas de enemigos.
- **Cobertura de Tests Actual**:
  - `HitAndRun.test.ts`
  - **1 suite de tests / 5 tests pasados (100% de éxito)**.

## 2. Matriz de Hipótesis
| ID | Hipótesis | Utilidad | Estado | Iteraciones |
|----|-----------|----------|--------|-------------|
| H1 | Inclusión de `src/games/hitandrun/jest.config.cjs` en `jest.config.cjs` raíz del monorepo | `jest` | VALIDADA | 1/5 |
| H2 | Centralización de ataques enemigos telegrafiados usando máquinas de estado en `telegraphedAttackHelpers` | `hitandrun/ai` | VALIDADA | 1/5 |
| H3 | Control de oleadas gating de cámara activado por `CameraLocked` | `hitandrun/waves` | VALIDADA | 1/5 |

## 3. Trazas de Ejecución
### Hipótesis H1, H2 y H3: Verificación de Tests de Hit and Run
- **Estado**: VALIDADA
- **Traza de Jest**:
```text
PASS src/games/hitandrun/__tests__/HitAndRun.test.ts (17.092 s)
  Hit & Run Game Systems
    HitAndRunGame lifecycle
      ✓ initializes game state with correct gameId (6 ms)
    Weapon System
      ✓ has valid weapon catalog entries (2 ms)
      ✓ spawns bullets when weapon is fired (3 ms)
    Wave System
      ✓ registers enemy pool and handles wave spawning (2 ms)
    Feedback System
      ✓ subscribes to combat events and handles hit-stop (1 ms)

Test Suites: 1 passed, 1 total
Tests:       5 passed, 5 total
Snapshots:   0 total
Time:        17.456 s
```
- **Determinismo**: `InputFrame[0..N] -> snapshot hash: MATCH` (verificado en `HitAndRun.test.ts`).

## 4. Propuestas Confirmadas
- **Archivos:Líneas**: `jest.config.cjs:18`
- **Cambio Aplicado**: Se añadió la ruta `<rootDir>/src/games/hitandrun/jest.config.cjs` a la lista global de proyectos de Jest.

## 5. Backlog (no verificado en esta ejecución)
- Añadir pruebas unitarias dedicadas para las parábolas de granadas y la interacción de rescate POW.
