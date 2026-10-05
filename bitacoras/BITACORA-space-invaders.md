# Cuaderno de Bitácora: Space Invaders

## 1. Perfil del Juego y Mapeo del Framework
- **Ruta**: `src/games/space-invaders/`
- **Mecánicas Clave**: Matriz/formación de alienígenas que descienden en bloque (`formation.ts`), escudos destructibles de búnkeres por píxeles o bloques, proyectiles de jugador y enemigos, sistema de reclutamiento/draft de naves seguidoras, jefes finales, repetición de partidas (replays) y multijugador.
- **APIs/Framework Candidatas**:
  - `CollisionSystem2D` y `CombatSystem` de `@tiny-aster/gameplay-kit`.
  - `HordeScalingHelper` / `generateScaledWave` de `@tiny-aster/gameplay-kit`.
  - `ParticleSystem` y `SharedParticlePool`.
- **Cobertura de Tests Actual**:
  - 15 archivos de tests (`SpaceInvadersCombat.test.ts`, `SpaceInvadersDraftSystem.test.ts`, `formation.test.ts`, `SpaceInvadersMultiplayer.test.ts`, etc.).
  - **15 suites de tests / 57 tests pasados (100% de éxito)**.

## 2. Matriz de Hipótesis
| ID | Hipótesis | Utilidad | Estado | Iteraciones |
|----|-----------|----------|--------|-------------|
| H1 | Mantenimiento de la formación sincrónica en rejilla mediante desplazamientos deterministas en bloque | `space-invaders/systems` | VALIDADA | 1/5 |
| H2 | Reutilización de `CombatSystem` para proyectiles de enemigos y búnkeres destructibles | `gameplay-kit` | VALIDADA | 1/5 |
| H3 | Sistema de selección/draft de naves aliadas y retransmisión de estados multijugador | `space-invaders/systems` | VALIDADA | 1/5 |

## 3. Trazas de Ejecución
### Hipótesis H1, H2 y H3: Verificación Completa
- **Estado**: VALIDADA
- **Traza de Jest**:
```text
PASS src/games/space-invaders/__tests__/SpaceInvadersCombat.test.ts (24.914 s)
PASS src/games/space-invaders/__tests__/SpaceInvadersDraftSystem.test.ts (25.119 s)
PASS src/games/space-invaders/__tests__/space-invaders.test.ts (25.151 s)
PASS src/games/space-invaders/__tests__/formation.test.ts
...
Test Suites: 15 passed, 15 total
Tests:       57 passed, 57 total
Snapshots:   0 total
Time:        29.755 s
```
- **Determinismo**: `InputFrame[0..N] -> snapshot hash: MATCH` (verificado en `SpaceInvadersHeadless.test.ts` y `SpaceInvadersReplayIntegration.test.ts`).

## 4. Propuestas Confirmadas
- **Archivos:Líneas**: `src/games/space-invaders/SpaceInvadersGame.ts:120-280`
- **Estado Actual**: Space Invaders cuenta con una de las implementaciones más maduras del monorepo, incluyendo soporte para replays, multijugador en tiempo real y drafts de naves.

## 5. Backlog (no verificado en esta ejecución)
- Migrar el generador de oleadas de marcianos a `HordeScalingHelper` de `@tiny-aster/gameplay-kit`.
