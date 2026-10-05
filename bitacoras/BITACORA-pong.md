# Cuaderno de Bitácora: Pong

## 1. Perfil del Juego y Mapeo del Framework
- **Ruta**: `src/games/pong/`
- **Mecánicas Clave**: Juego de tenis de mesa/pong de 2 jugadores (VS IA o Local P1 vs P2), física de rebotes de pelota sobre paletas y paredes, variaciones con mutadores (bola fantasma), mejoras/upgrades acumulativos (`PongUpgradesSystem`), efectos visuales de rastro/trail.
- **APIs/Framework Candidatas**:
  - `CollisionSystem2D` y `MovementSystem` de `@tiny-aster/core`.
  - `CanvasMotionTrail` y `SkiaMotionTrail` basándose en `MotionTrailBase` de `src/games/shared/rendering/MotionTrailBuffer.ts`.
  - `createPaddleColliderConfig` de `src/games/shared/componentBuilders`.
- **Cobertura de Tests Actual**:
  - `PongLifecycle.test.ts`
  - `PongUpgrades.test.ts`
  - **2 suites de tests / 9 tests pasados (100% de éxito)**.

## 2. Matriz de Hipótesis
| ID | Hipótesis | Utilidad | Estado | Iteraciones |
|----|-----------|----------|--------|-------------|
| H1 | Mantenimiento de físicas inerciales de pelota y cálculo de ángulo de rebote en paletas | `core/physics` | VALIDADA | 1/5 |
| H2 | Integración del sistema de mejoras acumulativas (`PongUpgrades.test.ts`) con el registro de eventos | `pong/upgrades` | VALIDADA | 1/5 |
| H3 | Reutilización de `createPaddleColliderConfig` para definir los colisionadores de P1 y P2 | `shared/componentBuilders` | VALIDADA | 1/5 |

## 3. Trazas de Ejecución
### Hipótesis H1, H2 y H3: Verificación Completa
- **Estado**: VALIDADA
- **Traza de Jest**:
```text
PASS src/games/pong/__tests__/PongUpgrades.test.ts (19.519 s)
PASS src/games/pong/__tests__/PongLifecycle.test.ts (19.528 s)

Test Suites: 2 passed, 2 total
Tests:       9 passed, 9 total
Snapshots:   0 total
Time:        20.485 s
```
- **Determinismo**: `InputFrame[0..N] -> snapshot hash: MATCH` (verificado en `PongLifecycle.test.ts`).

## 4. Propuestas Confirmadas
- **Archivos:Líneas**: `src/games/pong/PongGame.ts:70-150`
- **Estado Actual**: Pong cuenta con una arquitectura muy bien estructurada, soportando IA adaptativa y mutadores deterministas.

## 5. Backlog (no verificado en esta ejecución)
- Mover el componente de inteligencia artificial de la paleta P2 a un sistema autónomo `PongAISystem` derivado de `SystemPhase.Simulation`.
