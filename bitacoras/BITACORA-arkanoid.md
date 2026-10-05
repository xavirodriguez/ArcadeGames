# Cuaderno de Bitácora: Arkanoid

## 1. Perfil del Juego y Mapeo del Framework
- **Ruta**: `src/games/arkanoid/`
- **Mecánicas Clave**: Destrucción de ladrillos, física de pelota/paleta con ángulo dinámico y spin (`ArkanoidSpinSystem`), generación de cápsulas de power-ups, enemigos flotantes, jefe (Doh), combos y progresión de niveles.
- **APIs/Framework Candidatas**:
  - `CollisionSystem2D` y `CombatSystem` de `@tiny-aster/gameplay-kit`.
  - `createPaddleColliderConfig` y `registerPresentationSystems` de `src/games/shared/componentBuilders`.
  - `SharedVFX` para efectos visuales retro (CRT scanlines, border glow).
  - `ComboSystem` y `ParticleSystem` de `@tiny-aster/core`.
- **Cobertura de Tests Actual**:
  - `ArkanoidEncounter.test.ts`
  - `ArkanoidGameplay.test.ts`
  - `arkanoid.test.ts`
  - `ArkanoidConfig.test.ts`
  - **4 suites de tests / 22 tests pasados (100% de éxito)**.

## 2. Matriz de Hipótesis
| ID | Hipótesis | Utilidad | Estado | Iteraciones |
|----|-----------|----------|--------|-------------|
| H1 | Mantenimiento de alineación con `registerPresentationSystems` para sincronización de transform y render | `src/games/shared/componentBuilders` | VALIDADA | 1/5 |
| H2 | Centralización del estado de juego y combo en un recurso de mundo unificado | `core/ecs` | BACKLOG | N/A |
| H3 | Reutilización de `SharedParticlePool` de `gameplay-kit` para partículas de colisión de ladrillos | `gameplay-kit` | VALIDADA | 1/5 |

## 3. Trazas de Ejecución
### Hipótesis H1 y H3: Verificación de Baseline y Sistemas Compartidos
- **Estado**: VALIDADA
- **Traza de Jest**:
```text
PASS arkanoid src/games/arkanoid/__tests__/ArkanoidEncounter.test.ts (12.13 s)
PASS arkanoid src/games/arkanoid/__tests__/ArkanoidGameplay.test.ts (12.259 s)
PASS arkanoid src/games/arkanoid/__tests__/arkanoid.test.ts (12.267 s)
PASS arkanoid src/games/arkanoid/__tests__/ArkanoidConfig.test.ts

Test Suites: 4 passed, 4 total
Tests:       22 passed, 22 total
Snapshots:   0 total
```
- **Determinismo**: `InputFrame[0..N] -> snapshot hash: MATCH` (confirmado mediante `ArkanoidGameplay.test.ts`).

## 4. Propuestas Confirmadas
- **Archivos:Líneas**: `src/games/arkanoid/ArkanoidGame.ts:160-200`
- **Estado Actual**: Arkanoid ya hace un uso ejemplar de la arquitectura ECS de Tiny Aster, integrando `registerPresentationSystems`, `createPaddleColliderConfig`, `SharedParticlePool`, y `ComboSystem`. No se requieren cambios invasivos inmediatos.

## 5. Backlog (no verificado en esta ejecución)
- Migrar el manejo de partículas de cápsulas de powerups a `SharedVFX.ParticleEmitter` genérico.
- Unificar la jerarquía de colisiones de jefes utilizando el árbol de transformaciones de `@tiny-aster/core`.
