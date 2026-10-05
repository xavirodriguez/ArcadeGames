# Cuaderno de Bitácora: Echo Runner

## 1. Perfil del Juego y Mapeo del Framework
- **Ruta**: `src/games/echorunner/`
- **Mecánicas Clave**: Juego de plataformas de desplazamiento lateral en 2D basado en `PlatformerArcadeGame`, control del tiempo/gravedad, sistema de ataque eco/fantasma (`EchoRunnerAttackSystem`), colisiones de mapa de azulejos (`TileCollisionSystem`), plataformas móviles y puntos de control.
- **APIs/Framework Candidatas**:
  - `PlatformerArcadeGame` y sistemas de plataformas de `@tiny-aster/gameplay-kit`.
  - `Camera2DSystem` y `ParticleSystem` de `@tiny-aster/core`.
  - Tokens de color y paleta de `SOLAR_GARDEN_PALETTE`.
- **Cobertura de Tests Actual**:
  - `EchoRunner.test.ts`
  - `EchoRunnerLifecycle.test.ts`
  - **2 suites de tests / 23 tests pasados / 1 snapshot pasado (100% de éxito)**.

## 2. Matriz de Hipótesis
| ID | Hipótesis | Utilidad | Estado | Iteraciones |
|----|-----------|----------|--------|-------------|
| H1 | Extensión limpia de `PlatformerArcadeGame` con registro directo de sistemas en `onRegisterSystems` | `gameplay-kit` | VALIDADA | 1/5 |
| H2 | Eliminación de trazas de `console.log` de depuración en `EchoRunnerGame.ts:321` para mantener logs de consola limpios en producción/tests | `core/diagnostics` | VALIDADA | 1/5 |
| H3 | Reutilización de `SOLAR_GARDEN_PALETTE` para constantes visuales de renderizado | `shared/rendering` | BACKLOG | N/A |

## 3. Trazas de Ejecución
### Hipótesis H1 y H2: Verificación de Tests de Echo Runner
- **Estado**: VALIDADA
- **Traza de Jest**:
```text
PASS echorunner src/games/echorunner/__tests__/EchoRunnerLifecycle.test.ts (19.45 s)
PASS echorunner src/games/echorunner/__tests__/EchoRunner.test.ts (19.52 s)

Test Suites: 2 passed, 2 total
Tests:       23 passed, 23 total
Snapshots:   1 passed, 1 total
```
- **Determinismo**: `InputFrame[0..N] -> snapshot hash: MATCH` (verificado en `EchoRunnerLifecycle.test.ts`).

## 4. Propuestas Confirmadas
- **Archivos:Líneas**: `src/games/echorunner/EchoRunnerGame.ts:321`
- **Cambio Recomendado**: Retirar la traza de depuración `console.log("[EchoDebug] sistemas registrados: ...")` antes de la entrega final para optimizar el rendimiento de la consola en desarrollo.

## 5. Backlog (no verificado en esta ejecución)
- Mover definiciones en línea de planos de entidades de `EchoRunnerGame.ts` a una `EntityFactory.ts` dedicada para seguir la convención del proyecto.
