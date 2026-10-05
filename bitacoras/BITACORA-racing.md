# Cuaderno de Bitácora: Racing (Micro Racers)

## 1. Perfil del Juego y Mapeo del Framework
- **Ruta**: `src/games/racing/`
- **Mecánicas Clave**: Carreras estilo Micro Machines, especificaciones de pistas de datos (`TrackSpecSchema`, `VehicleSpecSchema`), física de dirección, fricción lateral/derrape (`VehicleSteeringComponent`, `VehicleSteeringSystem`), navegación IA por waypoints (`VehicleWaypointSystem`), gomas de hule (rubber-banding) en IA (`VehicleAISystem`) y puntuación cara a cara / reaparición por rondas (`HeadToHeadStateSystem`).
- **APIs/Framework Candidatas**:
  - `VehicleSteeringSystem`, `VehicleSteeringComponent`, `VehicleWaypointSystem` de `@tiny-aster/core`.
  - `LapTimerSystem` de `src/games/shared/`.
  - `Camera2DSystem` de `@tiny-aster/core` para seguimiento de múltiples vehículos.
- **Cobertura de Tests Actual**:
  - `HeadToHeadStateSystem.test.ts`
  - `VehicleAISystem.test.ts`
  - `CarPhysics.test.ts`
  - `RacingGame.test.ts`
  - `TrackSpecSchema.test.ts`
  - **5 suites de tests / 10 tests pasados (100% de éxito)**.

## 2. Matriz de Hipótesis
| ID | Hipótesis | Utilidad | Estado | Iteraciones |
|----|-----------|----------|--------|-------------|
| H1 | Reutilización de los módulos de vehículos `VehicleSteeringSystem` y `VehicleWaypointSystem` de `@tiny-aster/core` | `@tiny-aster/core` | VALIDADA | 1/5 |
| H2 | Validación del esquema de pistas `TrackSpecSchema` para pistas procedimentales y personalizadas | `racing/config` | VALIDADA | 1/5 |
| H3 | Puntuación determinista en rondas frente a frente con `HeadToHeadStateSystem` | `racing/systems` | VALIDADA | 1/5 |

## 3. Trazas de Ejecución
### Hipótesis H1, H2 y H3: Verificación Completa
- **Estado**: VALIDADA
- **Traza de Jest**:
```text
PASS src/games/racing/__tests__/HeadToHeadStateSystem.test.ts (23.292 s)
PASS src/games/racing/__tests__/VehicleAISystem.test.ts (23.388 s)
PASS src/games/racing/__tests__/CarPhysics.test.ts
PASS src/games/racing/__tests__/RacingGame.test.ts (24.473 s)
PASS src/games/racing/__tests__/TrackSpecSchema.test.ts

Test Suites: 5 passed, 5 total
Tests:       10 passed, 10 total
Snapshots:   0 total
Time:        26.213 s
```
- **Determinismo**: `InputFrame[0..N] -> snapshot hash: MATCH` (verificado en `HeadToHeadStateSystem.test.ts` y `VehicleAISystem.test.ts`).

## 4. Propuestas Confirmadas
- **Archivos:Líneas**: `src/games/racing/RacingGame.ts:35-110`
- **Estado Actual**: Micro Racers aprovecha plenamente los sistemas de vehículos de `@tiny-aster/core` para aceleración, frenado y deslizamiento dinámico.

## 5. Backlog (no verificado en esta ejecución)
- Mapear el rol de color de tema `car` en `createThemeFromGameAccents("racing")` para silenciar las advertencias de log durante las pruebas de spawn de vehículos.
