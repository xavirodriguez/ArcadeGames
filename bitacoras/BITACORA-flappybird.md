# Cuaderno de Bitácora: Flappy Bird

## 1. Perfil del Juego y Mapeo del Framework
- **Ruta**: `src/games/flappybird/`
- **Mecánicas Clave**: Impulso vertical por toques ("flap"), planeo holding, física de gravedad dinámica, generación procedural de tuberías y obstáculos móviles por recetas (`ScenarioDefinitions.ts`), puntuación al pasar brechas, misiones y partículas de plumas/polvo.
- **APIs/Framework Candidatas**:
  - `selectScenario` y `FlappyBirdGameStateSystem` para la lógica pura de rotación de recetas.
  - `ParticleSystem` y `SharedParticlePool` de `@tiny-aster/gameplay-kit`.
  - Evento `pipe:passed` de `EventBus` puenteado hacia la campaña mediante `useStoryEventBridge`.
- **Cobertura de Tests Actual**:
  - `FlappyBirdMissions.test.ts`
  - `FlappyBirdScenarios.test.ts`
  - `FlappyBirdDynamicObstacles.test.ts`
  - `FlappyBirdParticles.test.ts`
  - `FlappyBirdGeometry.test.ts`
  - `FlappyBird.test.ts`
  - **6 suites de tests / 32 tests pasados (100% de éxito)**.

## 2. Matriz de Hipótesis
| ID | Hipótesis | Utilidad | Estado | Iteraciones |
|----|-----------|----------|--------|-------------|
| H1 | Rotación determinista de recetas de escenarios mediante funciones puras en `selectScenario` | `flappybird/ScenarioDefinitions` | VALIDADA | 1/5 |
| H2 | Reutilización de `ParticleSystem` para partículas de plumas al aletear y partículas de impacto | `@tiny-aster/core` | VALIDADA | 1/5 |
| H3 | Mantenimiento del puente de eventos `pipe:passed` hacia la historia de campaña | `hooks/campaign` | VALIDADA | 1/5 |

## 3. Trazas de Ejecución
### Hipótesis H1, H2 y H3: Verificación Completa
- **Estado**: VALIDADA
- **Traza de Jest**:
```text
PASS src/games/flappybird/__tests__/FlappyBirdMissions.test.ts (24.285 s)
PASS src/games/flappybird/__tests__/FlappyBirdScenarios.test.ts (24.297 s)
PASS src/games/flappybird/__tests__/FlappyBirdDynamicObstacles.test.ts (24.441 s)
PASS src/games/flappybird/__tests__/FlappyBirdParticles.test.ts
PASS src/games/flappybird/__tests__/FlappyBirdGeometry.test.ts
PASS src/games/flappybird/__tests__/FlappyBird.test.ts

Test Suites: 6 passed, 6 total
Tests:       32 passed, 32 total
Snapshots:   0 total
Time:        26.066 s
```
- **Determinismo**: `InputFrame[0..N] -> snapshot hash: MATCH` (verificado en `FlappyBirdScenarios.test.ts`).

## 4. Propuestas Confirmadas
- **Archivos:Líneas**: `src/games/flappybird/ScenarioDefinitions.ts:10-85`
- **Estado Actual**: Flappy Bird posee una excelente separación de responsabilidades entre el generador de escenarios y los sistemas de simulación, siendo 100% determinista y estable.

## 5. Backlog (no verificado en esta ejecución)
- Mover los logs de depuración `console.log("Start glide test", ...)` de `FlappyBird.test.ts` a un modo verbose opcional.
