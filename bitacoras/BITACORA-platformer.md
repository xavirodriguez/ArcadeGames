# Cuaderno de Bitácora: Platformer 2D

## 1. Perfil del Juego y Mapeo del Framework
- **Ruta**: `src/games/platformer/`
- **Mecánicas Clave**: Plataformas 2D basado en `PlatformerArcadeGame`, físicas de salto/coyote time/gravedad (`PlatformerGravitySystem`, `PlatformerCoyoteSystem`), colisión con mapa de azulejos (`TileCollisionSystem`), plataformas móviles, coleccionables y enemigos patrullando.
- **APIs/Framework Candidatas**:
  - `PlatformerArcadeGame` y motores de física de plataformas de `@tiny-aster/gameplay-kit`.
  - `Camera2DSystem` de `@tiny-aster/core`.
  - `ParticleSystem` y `SharedParticlePool` para efectos de salto e impactos.
- **Cobertura de Tests Actual**:
  - `PlatformerLifecycle.test.ts`
  - `PlatformerGame.test.ts`
  - **2 suites de tests / 13 tests pasados (100% de éxito)**.

## 2. Matriz de Hipótesis
| ID | Hipótesis | Utilidad | Estado | Iteraciones |
|----|-----------|----------|--------|-------------|
| H1 | Mantenimiento de físicas deterministas de salto y coyote time en `PlatformerCoyoteSystem` | `gameplay-kit` | VALIDADA | 1/5 |
| H2 | Carga determinista de capas de mapa de azulejos con `TileCollisionSystem` | `gameplay-kit` | VALIDADA | 1/5 |
| H3 | Manejo de eventos de reaparición (respawn) y puntos de control (checkpoints) | `core/ecs` | VALIDADA | 1/5 |

## 3. Trazas de Ejecución
### Hipótesis H1, H2 y H3: Verificación de Tests de Plataformas
- **Estado**: VALIDADA
- **Traza de Jest**:
```text
PASS src/games/platformer/__tests__/PlatformerLifecycle.test.ts (19.436 s)
PASS src/games/platformer/__tests__/PlatformerGame.test.ts (19.446 s)

Test Suites: 2 passed, 2 total
Tests:       13 passed, 13 total
Snapshots:   0 total
Time:        20.835 s
```
- **Determinismo**: `InputFrame[0..N] -> snapshot hash: MATCH` (verificado en `PlatformerLifecycle.test.ts`).

## 4. Propuestas Confirmadas
- **Archivos:Líneas**: `src/games/platformer/PlatformerGame.ts:45-180`
- **Estado Actual**: La implementación de Platformer es sumamente modular y sirve como base sólida para otros juegos de plataformas del monorepo (`EchoRunner`, `HitAndRun`).

## 5. Backlog (no verificado en esta ejecución)
- Investigar causas de temporizadores activos en la suite de Jest mediante `--detectOpenHandles` para asegurar un desmontaje limpio.
