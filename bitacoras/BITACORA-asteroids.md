# Cuaderno de Bitácora: Asteroids

## 1. Perfil del Juego y Mapeo del Framework
- **Ruta**: `src/games/asteroids/`
- **Mecánicas Clave**: Control inercial de nave espacial, rotación, disparo con enfriamiento, fragmentación procedimental de asteroides (large -> medium -> small), wraparound espacial (pantalla toroidal), power-ups (escudos, velocidad, disparo esparcido), bosses, modo historia/campaña.
- **APIs/Framework Candidatas**:
  - `computeShipPhysics` y `Camera2DSystem` de `@tiny-aster/core`.
  - `CollisionSystem2D` y `CombatSystem` de `@tiny-aster/gameplay-kit`.
  - `generateBackdrop` y `Mulberry32` de `@tiny-aster/core` para fondo espacial procedimental.
  - `SharedVFX` y `AsteroidsRendererManager` para renderizado unificado Canvas/Skia.
- **Cobertura de Tests Actual**:
  - 19 archivos de tests (`AsteroidsGame.test.ts`, `AsteroidsGameplay.test.ts`, `AsteroidCollisionSystem.test.ts`, `AsteroidPoolAndInput.test.ts`, etc.).
  - **19 suites de tests / 114 tests pasados (100% de éxito)**.

## 2. Matriz de Hipótesis
| ID | Hipótesis | Utilidad | Estado | Iteraciones |
|----|-----------|----------|--------|-------------|
| H1 | Corrección de firmas de tipos `unknown` en tests de renderizado mock para `CampaignRenderFix.test.ts` | `core/rendering` | VALIDADA | 1/5 |
| H2 | Refactorización de duplicación de borrado de partículas en `AsteroidCollisionSystem` hacia `SharedParticlePool` | `gameplay-kit` | VALIDADA | 1/5 |
| H3 | Mapeo explícito de roles de color de tema (`asteroid-large`, `powerup-shield`) para suprimir advertencias de log | `core/theme` | BACKLOG | N/A |

## 3. Trazas de Ejecución
### Hipótesis H1 y H2: Verificación de Suite Completa de Tests
- **Estado**: VALIDADA
- **Traza de Jest**:
```text
Test Suites: 19 passed, 19 total
Tests:       114 passed, 114 total
Snapshots:   0 total
Time:        11.205 s
```
- **Determinismo**: `InputFrame[0..N] -> snapshot hash: MATCH` (verificado en `AsteroidsGameplay.test.ts` y `PhysicsRenderInvariant.test.ts`).

## 4. Propuestas Confirmadas
- **Archivos:Líneas**: `src/games/asteroids/__tests__/CampaignRenderFix.test.ts:9-13`
- **Cambio Aplicado**: Casting correcto mediante `mockRenderer as unknown as Parameters<typeof initializeAsteroidsRenderer>[0]` para corregir fallos del compilador TypeScript en la suite de tests de Jest.

## 5. Backlog (no verificado en esta ejecución)
- Definir un `Theme` completo en `createThemeFromGameAccents("asteroids")` que incluya las claves `asteroid-large`, `asteroid-medium`, `asteroid-small` y `powerup-*` para eliminar warnings en desarrollo.
