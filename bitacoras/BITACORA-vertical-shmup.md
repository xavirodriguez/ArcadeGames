# Cuaderno de Bitácora: Vertical Shmup (1942)

## 1. Perfil del Juego y Mapeo del Framework
- **Ruta**: `src/games/vertical-shmup/`
- **Mecánicas Clave**: Shoot 'em up de desplazamiento vertical estilo 1942, control de avión de combate, oleadas de cazas y bombarderos enemigos procedimentales, patrones de ataque, disparos y potenciadores, uso de `SOLAR_GARDEN_PALETTE` y despenalización de aleatoriedad mediante `runWithUnlockedRandomAndMutators`.
- **APIs/Framework Candidatas**:
  - `runWithUnlockedRandomAndMutators` de `src/games/shared/configHelper.ts` para desbloquear `RandomService` fuera de los ticks de simulación.
  - `SOLAR_GARDEN_PALETTE` de `src/games/shared/rendering/SolarGardenMotifs.ts`.
  - `CollisionSystem2D` y `CombatSystem` de `@tiny-aster/gameplay-kit`.
- **Cobertura de Tests Actual**:
  - `VerticalShmupInit.test.ts`
  - **1 suite de tests / 2 tests pasados (100% de éxito)**.

## 2. Matriz de Hipótesis
| ID | Hipótesis | Utilidad | Estado | Iteraciones |
|----|-----------|----------|--------|-------------|
| H1 | Uso de `runWithUnlockedRandomAndMutators` en la inicialización de escena para prevenir errores de bloqueo de `RandomService` | `shared/configHelper` | VALIDADA | 1/5 |
| H2 | Integración de paleta de colores de diseño `SOLAR_GARDEN_PALETTE` para renderizado retro Canvas/Skia | `shared/rendering` | VALIDADA | 1/5 |
| H3 | Mantenimiento de límites de frontera y eliminación automática de proyectiles fuera de pantalla con `BoundarySystem` | `core/physics` | VALIDADA | 1/5 |

## 3. Trazas de Ejecución
### Hipótesis H1, H2 y H3: Verificación Completa
- **Estado**: VALIDADA
- **Traza de Jest**:
```text
PASS src/games/vertical-shmup/__tests__/VerticalShmupInit.test.ts (26.066 s)
  VerticalShmup Initialization & RandomService
    ✓ initializes game successfully using runWithUnlockedRandomAndMutators without RandomService lock errors (39 ms)
    ✓ fails if RandomService.next() is called while gameplayRandom is locked (8 ms)

Test Suites: 1 passed, 1 total
Tests:       2 passed, 2 total
Snapshots:   0 total
Time:        26.435 s
```
- **Determinismo**: `InputFrame[0..N] -> snapshot hash: MATCH` (verificado en `VerticalShmupInit.test.ts`).

## 4. Propuestas Confirmadas
- **Archivos:Líneas**: `src/games/vertical-shmup/VerticalShmupGame.ts:40-110`
- **Estado Actual**: Vertical Shmup está implementado de forma limpia y determinista, siguiendo el estándar de desbloqueo de PRNG en inicialización.

## 5. Backlog (no verificado en esta ejecución)
- Expandir la cobertura de tests con simulación de oleadas avanzadas de jefes bombarderos.


---

# Registro de investigación TDD — 2026-10-23

## Alcance de esta iteración

- **Rama:** `feat/vertical-shmup-tdd-suite`
- **Objetivo:** convertir los contratos prioritarios de movimiento, hitbox, disparo y ciclo de vida en pruebas de integración ECS que no dependan del renderizador.
- **Método previsto:** Red → Green → Refactor. Las pruebas se escribieron antes de la implementación de los ajustes, pero no se pudo capturar una ejecución real en rojo/verde durante esta sesión.
- **Entorno de ejecución:** no verificado localmente. El clon de GitHub falló por resolución DNS de `github.com` y no se encontraron ejecuciones GitHub Actions de Jest para esta rama. No interpretar la lista de pruebas como una ejecución superada.

## Hallazgos respaldados por inspección de código

| ID | Hallazgo | Evidencia inspeccionada | Resultado |
|---|---|---|---|
| AUD-P0-01 | El input diagonal asignaba directamente `moveX * PLAYER_SPEED` y `moveY * PLAYER_SPEED`, dando una magnitud de `PLAYER_SPEED * √2`. | `systems/ShmupInputSystem.ts` | Corregido: normalización de la entrada cuando su magnitud supera 1. |
| AUD-P0-02 | La nave usaba radio de collider 12, no el radio conceptual de 2,5. | `EntityFactory.ts`, `types/ShmupConfigSchema.ts`, `config/vertical-shmup.json` | Corregido el valor de configuración por defecto a 2,5. Debe validarse el balance jugando. |
| AUD-P0-03 | El input limitaba la posición antes de integrar la velocidad, pero podía terminar el paso fuera del límite. El `BoundarySystem` compartido en modo `bounce` con `bounceX/bounceY=false` tampoco aplicaba el clamp de la zona de juego. | `systems/ShmupInputSystem.ts`, `EntityFactory.ts`, `packages/core/src/physics/systems/BoundarySystem.ts` | Corregido con `ShmupPlayerBoundarySystem` tras la integración. |
| AUD-P0-04 | El cooldown de disparo se decrementaba sin conservar el exceso temporal cuando un frame cruzaba el vencimiento; esto podía desplazar la cadencia según `deltaTime`. | `systems/ShmupInputSystem.ts` | Corregido preservando el exceso temporal y procesando vencimientos pasados. Casos de intervalos extremos aún pendientes de ejecutar. |
| AUD-P0-05 | `CollisionSystem2D` consulta coordenadas de mundo (`worldX/worldY`) si están presentes. El desplazamiento modifica `x/y`; faltaba una fase explícita de sincronización jerárquica en la escena del shmup antes de colisionar. | `scenes/ShmupGameScene.ts`, `packages/core/src/physics/collision/CollisionSystems.ts`, `packages/core/src/systems/HierarchySystem.ts` | Añadido `HierarchySystem` en `SystemPhase.Transform`, después de simulación y antes de colisiones. |
| AUD-P1-01 | `EntityFactory.createEnemy` asigna `cooldownRemaining` usando `Math.random()`, por lo que el tiempo inicial de los patrones no queda gobernado por la semilla ECS. | `EntityFactory.ts` | Pendiente P1: sustituir por una fuente reproducible que respete el contrato de aleatoriedad del motor y añadir prueba con semilla fija. |
| AUD-P2-01 | No se encontró evidencia ejecutable revisada de las mecánicas de graze ni de bombas en esta iteración. | Sistemas y componentes del shmup inspeccionados | Pendiente de inspección/implementación; no asumir que existen. |

### Matiz sobre la documentación histórica

Los dos tests de `VerticalShmupInit.test.ts` citados más arriba son una traza histórica de inicialización. No demuestran la cobertura de todos los límites de jugador, el radio de la hitbox o el determinismo global. La hipótesis H3 histórica sobre límites y limpieza de entidades no equivale a verificar el límite interno del jugador tras la integración. La presencia de `Math.random()` en el factory de enemigos impide describir todo el juego como determinista sin reservas.

## Suite TDD añadida

Archivo: `src/games/vertical-shmup/__tests__/VerticalShmupSimulationContracts.test.ts`

| ID | Contrato | Estado de implementación | Estado de ejecución |
|---|---|---|---|
| TEST-MOV-01 | Normalización diagonal: módulo de velocidad igual a `PLAYER_SPEED` y componentes de magnitud `v/√2`. | Cambio implementado y test añadido. | Pendiente de ejecutar. |
| TEST-MOV-02 | Distancia de un segundo comparable a 30 FPS, 60 FPS y pasos irregulares. | Test añadido; la implementación existente integra `v * deltaTime`. | Pendiente de ejecutar. |
| TEST-MOV-03 | Clamp del jugador al límite derecho después de integrar movimiento. | Sistema de límites específico añadido. | Pendiente de ejecutar. |
| TEST-HIT-01 | Un proyectil en la parte visual exterior, pero fuera de ambos radios combinados, no daña al jugador. | Radio del jugador actualizado y test ECS añadido. | Pendiente de ejecutar. |
| TEST-HIT-02 | Un proyectil que intersecta la hitbox registra colisión, reduce salud y se reclama. | Sincronización de transformaciones añadida antes de colisión; test ECS añadido. | Pendiente de ejecutar. |
| TEST-SHOOT-01 | Cadencia de 150 ms durante un segundo con paso fijo e irregular; disparo inmediato definido como parte del contrato. | Lógica de cooldown actualizada y test añadido. | Pendiente de ejecutar. |
| TEST-LIFECYCLE-01 | Un proyectil que supera el margen vertical se retira/reclama. | Se apoya en `BoundarySystem`, `Reclaimable` y pool existentes; test añadido. | Pendiente de ejecutar. |

### Decisiones de contrato

- El movimiento mantiene la velocidad máxima en diagonal normalizando la entrada solo si la magnitud excede 1; las diagonales parciales conservan su intensidad.
- La hitbox de jugador se configura con radio 2,5. La prueba de colisión toma en cuenta también el radio del proyectil: para dos círculos, la intersección ocurre cuando la distancia entre centros no supera la suma de sus radios.
- La cadencia de disparo define un disparo inmediato cuando el cooldown está listo. Con intervalo de 150 ms durante 1 segundo, el contrato espera 7 disparos (t=0, 150, 300, 450, 600, 750 y 900 ms).
- Se añade la fase de actualización de `worldX/worldY` porque el pipeline de colisiones usa estas coordenadas si están presentes.

## Cambios realizados en la rama

- `src/games/vertical-shmup/__tests__/VerticalShmupSimulationContracts.test.ts` — nuevos contratos de integración P0.
- `src/games/vertical-shmup/systems/ShmupInputSystem.ts` — normalización diagonal y cooldown con conservación de exceso temporal.
- `src/games/vertical-shmup/systems/ShmupPlayerBoundarySystem.ts` — clamp de jugador posterior al movimiento.
- `src/games/vertical-shmup/types/ShmupConfigSchema.ts` — hitbox por defecto de 2,5.
- `src/games/vertical-shmup/config/vertical-shmup.json` — configuración de hitbox de 2,5.
- `src/games/vertical-shmup/scenes/ShmupGameScene.ts` — orden de fases, límites posintegración y sincronización de transforms previa a colisiones.

## Validación pendiente y comandos

Desde la raíz del repositorio, ejecutar:

```bash
pnpm exec jest --config src/games/vertical-shmup/jest.config.cjs --runInBand
pnpm exec tsc -p tsconfig.json --noEmit
pnpm run check:ratchet
```

Después de corregir fallos, ejecutar la suite completa mediante `pnpm test:ci`. Registrar aquí salida real, número de tests y cualquier desviación; no marcar Red/Green como validado hasta disponer de esas trazas.

## Próxima secuencia

1. Ejecutar la suite P0 y ajustar los tests al comportamiento real del motor sin ocultar defectos.
2. Añadir pruebas unitarias puras para ángulos de abanico, secuencias deterministas y rendijas de escape (P1).
3. Investigar y eliminar `Math.random()` del factory solo después de confirmar el mecanismo reproducible correcto del motor.
4. Definir contratos ECS explícitos para graze y bombas (P2–P3) antes de implementar esas mecánicas.


### Actualización de CI — 2026-10-23

- El pipeline existente ejecutaba `pnpm exec turbo run test`, que no garantiza incluir pruebas dentro de `src/games/vertical-shmup`, ya que esa ruta no figura como workspace en `pnpm-workspace.yaml` (los workspaces declarados son `packages/*` y `server`).
- Para evitar una suite sin ejecución automática, se añadió al workflow `.github/workflows/ci.yml` un paso dedicado: `pnpm exec jest --config src/games/vertical-shmup/jest.config.cjs --runInBand`.
- El PR #860 activó CI; la etapa de build general había terminado correctamente en la primera ejecución. La prueba directa del juego se ejecutará en la nueva ejecución desencadenada por este cambio.
- **Estado final de Jest:** pendiente de la traza de GitHub Actions. No declarar la suite verde hasta que termine el paso dedicado.
