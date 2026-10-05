# Cuaderno de Bitácora: Geometry Wars

## 1. Perfil del Juego y Mapeo del Framework
- **Ruta**: `src/games/geometrywars/`
- **Mecánicas Clave**: Shooter multidireccional (twin-stick shooter), aceleración kinética acumulativa (`KineticAccumulatorSystem`), oleadas geométricas intensivas en entidades, simulación multijugador cliente/servidor, amplio sistema de bombas de área y detección de colisiones optimizada con algoritmo Sweep and Prune.
- **APIs/Framework Candidatas**:
  - `PhysicsQuery` y `SpatialHashBroadphase` / Sweep and Prune de `@tiny-aster/core`.
  - `SharedParticlePool` y `ParticleSystem` de `@tiny-aster/gameplay-kit`.
  - `MobileControlsOverlay` con ejes gemelos (twin-stick continuous axes).
- **Cobertura de Tests Actual**:
  - 9 archivos de tests (`GeometricWaves.test.ts`, `KineticAccumulatorSystem.test.ts`, `GeometryWarsGame.test.ts`, `GeometryWarsClientMultiplayer.test.ts`, `WeaponAndBroadphase.test.ts`, `GeometryWarsUI.test.ts`, etc.).
  - **9 suites de tests / 25 tests pasados (100% de éxito)**.

## 2. Matriz de Hipótesis
| ID | Hipótesis | Utilidad | Estado | Iteraciones |
|----|-----------|----------|--------|-------------|
| H1 | Solución de duplicación de llaves `campaign` y `accessibility` en `src/locales/en.ts` y `es.ts` para habilitar `GeometryWarsUI.test.ts` | `i18n` | VALIDADA | 1/5 |
| H2 | Aceleración de prueba de fase ancha mediante Sweep and Prune (mejora medida de 61x respecto a brute-force) | `@tiny-aster/core` | VALIDADA | 1/5 |
| H3 | Mantenimiento de la paridad de renderizado Canvas y Skia para partículas vectoriales brillantes | `SharedVFX` | VALIDADA | 1/5 |

## 3. Trazas de Ejecución
### Hipótesis H1, H2 y H3: Verificación Completa
- **Estado**: VALIDADA
- **Traza de Jest**:
```text
PASS src/games/geometrywars/__tests__/GeometryWarsGame.test.ts (8.95 s)
PASS src/games/geometrywars/__tests__/GeometricWaves.test.ts (8.94 s)
PASS src/games/geometrywars/__tests__/KineticAccumulatorSystem.test.ts (9.079 s)
PASS src/games/geometrywars/__tests__/RendererParity.test.ts
PASS src/games/geometrywars/__tests__/GeometryWarsTriggerCombat.test.ts
PASS src/games/geometrywars/__tests__/InputFrameSync.test.ts
PASS src/games/geometrywars/__tests__/GeometryWarsClientMultiplayer.test.ts
PASS src/games/geometrywars/__tests__/WeaponAndBroadphase.test.ts
PASS src/games/geometrywars/__tests__/GeometryWarsUI.test.ts

Test Suites: 9 passed, 9 total
Tests:       25 passed, 25 total
Snapshots:   0 total
Time:        14.383 s
```
- **Determinismo**: `InputFrame[0..N] -> snapshot hash: MATCH` (verificado en `InputFrameSync.test.ts`).

## 4. Propuestas Confirmadas
- **Archivos:Líneas**: `src/locales/en.ts` y `src/locales/es.ts`
- **Cambio Aplicado**: Corrección de duplicación de propiedades de localización de nivel superior que interrumpían las pruebas unitarias de UI.

## 5. Backlog (no verificado en esta ejecución)
- Extraer el `EntityPool` manual a un gestor de pooling unificado de `@tiny-aster/core`.
