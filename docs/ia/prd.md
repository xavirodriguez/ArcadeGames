# PRD — Tiny Aster: Arcade Games Suite & ECS Engine

> Los marcadores `⚠ COMPLETAR` son datos que el autor del PRD debe rellenar o verificar
> contra el repo. Un agente no debe rellenarlos por su cuenta: debe preguntar o
> reportarlos como bloqueo.

## 0. Cómo usar este documento (agentes)

1. Lee las secciones 5 (invariantes), 9 (comandos) y 10 (límites) antes de tocar código.
2. Si este documento y el código discrepan, **no elijas**. Para y reporta la
   discrepancia con archivo y línea.
3. Si una tarea cae en una decisión de la sección 12 (decisiones abiertas), no la
   resuelvas: propón opciones y espera respuesta.
4. Una tarea no está terminada hasta cumplir la definición de hecho de la sección 11.

## 1. Resumen y prioridades

Tiny Aster es un motor de juegos Entity-Component-System determinista, distribuido como
monorepo (`pnpm` + `Turborepo`). Sirve a tres usos que a veces chocan:

- **Motor**: `@tiny-aster/core` y los paquetes de render y red.
- **Suite jugable**: arcades clásicos para web y mobile.
- **Recurso educativo**: el código y el libro que lo acompaña enseñan arquitectura de
  videojuegos.

**Regla de desempate cuando dos usos chocan** (confirmada por el autor):

1. Corrección y determinismo del core.
2. Claridad didáctica del código.
3. Rendimiento.
4. Funcionalidad nueva de un juego concreto.

Una funcionalidad reutilizable va al core, no a un juego concreto.

## 2. Problema

- Los motores mainstream acoplan lógica, renderizado y plataforma, lo que dificulta
  aprender y portar.
- No hay una referencia open-source en TypeScript/React Native que combine ECS,
  determinismo y netcode de forma didáctica.

## 3. Objetivos y cómo se verifican

| Objetivo                       | Criterio                                                                           | Verificación                                                                                                                                                                                                  | Estado                                                                               |
| :----------------------------- | :--------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | :----------------------------------------------------------------------------------- |
| Core desacoplado               | `@tiny-aster/core` no importa React, React Native, Skia, DOM ni Colyseus           | `pnpm run check:core-boundaries` (también en CI: `.github/workflows/ecs-sentinel.yml` y `ci.yml`)                                                                                                             | Check existe                                                                         |
| Determinismo en una plataforma | Misma seed + misma secuencia de `InputFrame` → mismo hash de snapshot tras N ticks | `packages/core/tests/determinism.test.ts`, `DeterministicReplay.test.ts`, `golden.test.ts`; hash FNV-1a vía `BaseGame.hash()`/`SnapshotHash`; `pnpm test:replays`/`test:rollback`/`test:snapshots` en el core | Tests existen; ⚠ falta fijar seed/N/hash literal si se quiere un valor de referencia |
| Determinismo entre plataformas | Igual que el anterior, en Node, navegador y Hermes                                 | Fuera del compromiso firme: ver D-1 (cerrada, opción b). El hash actúa como detector de divergencia                                                                                                           | Detector, no garantía                                                                |
| Multiplataforma                | Mismo core en web (Canvas) y mobile (Skia/Expo)                                    | Build web y arranque en Expo, sin cambios en core                                                                                                                                                             | ⚠ verificar ejecutando                                                               |
| Multijugador                   | Sesiones Colyseus con prediction e interpolación                                   | D-2 (cerrada): servidor autoritativo + `LocalPredictionSystem` + `MultiplayerReconciler`; rollback solo para replays locales                                                                                  | Implementado; escenario de aceptación en FR-5                                        |
| Duplicación controlada         | La duplicación no supera el umbral del ratchet                                     | `pnpm run check:duplication` (`scripts/duplication-ratchet.ts` + jscpd)                                                                                                                                       | Check existe                                                                         |

## 4. Estado actual de los juegos

Última información conocida. Verifícala con el criterio de la columna "Hecho cuando"
antes de fiarte de ella.

| Juego                 | Estado conocido                                                                                                                                     | Qué falta                      | Hecho cuando                                         |
| :-------------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------- | :----------------------------- | :--------------------------------------------------- |
| asteroids             | Con tests de gameplay y multiplayer                                                                                                                 | Verificar arranque real        | Arranca, se juega un nivel completo y pasa sus tests |
| space-invaders        | Con tests de gameplay y multiplayer                                                                                                                 | Verificar arranque real        | Igual                                                |
| flappybird            | Con tests de gameplay                                                                                                                               | Verificar arranque real        | Igual                                                |
| pong                  | ⚠                                                                                                                                                   | ⚠                              | Igual                                                |
| geometrywars          | Con tests de gameplay y multiplayer                                                                                                                 | Verificar arranque real        | Igual                                                |
| platformer            | ⚠                                                                                                                                                   | ⚠                              | Igual                                                |
| arkanoid              | Con tests; solo standalone, fuera de la campaña                                                                                                     | Verificación de arranque       | Arranca y tiene tests                                |
| hitandrun             | Con tests (`HitAndRun.test.ts`, 5 tests verdes, hash de determinismo verificado según `bitacoras/BITACORA-hitandrun.md`); ruta `src/app/hitandrun/` | Verificar arranque real en app | Arranca y se juega                                   |
| echorunner            | Injugable en el último diagnóstico; fuera de la campaña                                                                                             | Causa raíz sin analizar        | Arranca y se juega                                   |
| frogger               | No funciona (rana invisible, camiones inmóviles)                                                                                                    | Análisis de causa raíz         | Arranca y se juega                                   |
| tower-defense         | No carga                                                                                                                                            | Análisis de causa raíz         | Carga y se juega                                     |
| racing (Micro Racers) | No aparece el coche y nada se mueve                                                                                                                 | Análisis de causa raíz         | Coche visible y carrera funcional                    |
| outrun                | ⚠                                                                                                                                                   | ⚠                              | ⚠                                                    |
| vertical-shmup        | Error `RandomService` "Gameplay context is locked"; existe `VerticalShmupInit.test.ts`                                                              | Corregir el acceso al RNG      | Arranca sin ese error                                |

Un juego roto no es diseño intencional. Si encuentras un fallo en un juego de esta
tabla, es un defecto a corregir.

## 5. Arquitectura e invariantes

Cada invariante tiene un check. Una invariante sin check es una convención, y las
convenciones se pueden romper sin querer.

| ID    | Invariante                                                                                                              | Check                                                                                                                                                                                                                                                                                     |
| :---- | :---------------------------------------------------------------------------------------------------------------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| INV-1 | `@tiny-aster/core` no depende de UI ni de plataforma                                                                    | `pnpm run check:core-boundaries` (`scripts/check-core-boundaries.sh`); análogos `check:gameplay-kit-boundaries` y `check:network-boundaries`; también regla de imports en el AST linter                                                                                                   |
| INV-2 | Toda aleatoriedad de gameplay pasa por `world.gameplayRandom`                                                           | `pnpm exec tsx scripts/ast-determinism-linter.ts` — prohíbe `Math.random()`/`Date.now()`/`performance.now()` como error. **Limitación conocida:** solo cubre archivos bajo `/systems/` y `/simulation/` de `packages/core/src` y `src/games`; factories/blueprints de juegos quedan fuera |
| INV-3 | El loop usa fixed timestep; el input entra como `InputFrame`; el render sale a `RenderCommandBuffer`                    | Tests de `GameLoop` en `packages/core/tests`                                                                                                                                                                                                                                              |
| INV-4 | El estado del `World` es serializable: sin funciones, clases con estado oculto ni referencias circulares en componentes | Test de roundtrip de snapshot (serializar, restaurar, comparar hash) — `determinism.test.ts` + `test:snapshots`                                                                                                                                                                           |
| INV-5 | Las mutaciones estructurales durante el update de un sistema van por `world.commands` (WorldCommandBuffer)              | Regla 5 del AST linter: prohíbe `world.addComponent/removeComponent/createEntity/removeEntity` directos en sistemas. **Nota:** la mutación de _campos_ de componentes fuera de sistemas no tiene check automático — es revisión manual                                                    |
| INV-6 | Todo juego extiende `BaseGame` y registra sus sistemas en `onRegisterSystems()`                                         | ⚠ COMPLETAR: test de contrato por juego                                                                                                                                                                                                                                                   |
| INV-7 | TypeScript estricto; sin `any` nuevos                                                                                   | `pnpm typecheck:app` / `pnpm typecheck:core` (`tsc --noEmit`) y regla de lint                                                                                                                                                                                                             |

Si una invariante no tiene check, añadirlo es trabajo válido por sí mismo.

## 6. Alcance

**Dentro**

- Core: `World`, `EntityBuilder`, `Schedule`, `GameLoop`, física, snapshots, input
  canónico.
- Render: `renderer-canvas` (web) y `renderer-skia` (mobile).
- Suite de juegos (sección 4).
- Campaña con meta-progresión, sin adaptador DOM. ⚠ La decisión original se referenció
  como "ADR-001" pero no existe ningún ADR en el repo; confirmar si se registra en
  `docs/adr/` o en `bitacoras/`.
- Audio (`WebAudioPlayer`), localización, accesibilidad.
- Red con Colyseus (ver D-2).

**Fuera**

- Gráficos 3D reales (Outrun es pseudo-3D).
- Editor visual de niveles.
- Backend propio de leaderboards.
- Pipeline headless o web-embed (sin caso de uso a corto plazo).
- Rollback netcode para multijugador en red (ver D-2: el rollback es solo local).

## 7. Requisitos funcionales

Cada requisito se acepta con un test o un comportamiento observable.

- **FR-1** Un juego nuevo extiende `BaseGame` y registra sus sistemas en
  `onRegisterSystems()`. _Aceptación:_ pasa el test de contrato de INV-6.
- **FR-2** Fixed timestep, input como `InputFrame`, salida a `RenderCommandBuffer`.
  _Aceptación:_ INV-3.
- **FR-3** Aleatoriedad de gameplay solo vía `world.gameplayRandom`.
  _Aceptación:_ INV-2 (AST linter).
- **FR-4** Snapshots serializables del `World` para replay. _Aceptación:_ INV-4, y un
  replay de N ticks reproduce el hash final (`pnpm test:replays` en el core).
- **FR-5** Los juegos multijugador — **asteroids, space-invaders, geometrywars** —
  soportan salas Colyseus (`server/src/AsteroidsRoom.ts` + `LocalPredictionSystem` +
  `MultiplayerReconciler`). _Aceptación:_ dos clientes conectados a una sala terminan
  con el mismo estado final tras N ticks.

## 8. Requisitos no funcionales

- **Determinismo.** Compromiso firme: misma seed y mismos inputs dan la misma
  simulación _en la misma plataforma_. Entre plataformas, el hash de snapshot actúa
  como detector de divergencia (D-1, opción b). La física usa `Math.sin/cos/atan2/
pow/sqrt` extensivamente, así que no se afirma "bit-exacto entre plataformas".
- **Separación core/plataforma:** INV-1.
- **Calidad:** tests en `packages/core/tests` (jest), e2e en `e2e/games.spec.ts`
  (Playwright, `pnpm test:e2e`), ratchet de duplicación y linter AST de determinismo
  (CI: `ecs-sentinel.yml`).
- **Rendimiento:** ⚠ COMPLETAR: presupuesto medible (p. ej. ms por tick con N
  entidades en dispositivo de referencia). Sin número, el agente no puede saber si una
  optimización sirvió.

## 9. Cómo se construye y se prueba

Comandos verificados contra `package.json`:

```bash
pnpm install                    # postinstall: setup-skia-web + fix-canvaskit-wasm
pnpm turbo run build
pnpm test                       # turbo run test (jest)
pnpm test:e2e                   # playwright test (e2e/games.spec.ts)
pnpm lint                       # turbo run lint
pnpm typecheck:app              # tsc -p tsconfig.json --noEmit (app)
pnpm typecheck:core             # typecheck del core
pnpm check:core-boundaries      # INV-1
pnpm check:duplication          # ratchet jscpd
pnpm exec tsx scripts/ast-determinism-linter.ts   # INV-2 + INV-5 (CI: ecs-sentinel.yml)
pnpm story:lint                 # validación del grafo de historia
pnpm ci                         # pipeline completo de checks
pnpm test:ci                    # jest --runInBand (Node 4GB heap)
```

````

Entorno de desarrollo: Node `>=20`, pnpm `10.30.3`, Expo SDK `~55` (RN 0.83.10,
React 19.2, Skia 2.4.18, TypeScript 5.9). SO de referencia: ⚠ COMPLETAR.

## 10. Límites

**Nunca**

- Importar React, React Native, Skia, DOM o Colyseus desde `@tiny-aster/core`.
- Usar `Math.random`, `Date.now` o `performance.now` dentro de lógica de simulación
  (archivos `/systems/` y `/simulation/` lo impide el AST linter; fuera de ahí es
  responsabilidad del autor y de la revisión).
- Mutar componentes fuera de un sistema; en sistemas, mutaciones estructurales solo
  vía `world.commands`.
- Añadir `any` para que compile.
- Bajar o saltarse un test para que pase. Si un test es incorrecto, repórtalo.
- Subir el umbral del ratchet de duplicación.

**Pregunta antes de**

- Cambiar la API pública de `@tiny-aster/core`.
- Añadir una dependencia.
- Tocar un archivo relacionado con las decisiones de la sección 12.
- Borrar o reescribir un juego entero.

## 11. Definición de hecho (por tarea)

1. Los comandos de la sección 9 pasan, o se reporta cuáles fallaban antes de empezar.
2. Los checks de las invariantes que toca el cambio pasan (`check-core-boundaries`,
   AST linter, `check:duplication`).
3. Hay un test que falla sin el cambio y pasa con él. Si no es testeable, la tarea
   explica por qué.
4. Para un arreglo de juego: el criterio "Hecho cuando" de la sección 4.
5. El informe final distingue lo que el agente verificó ejecutando de lo que supone.

## 12. Decisiones

**D-1 — Alcance del determinismo entre plataformas. CERRADA (opción b).**
El compromiso firme es por plataforma; entre plataformas el hash de snapshot actúa
como detector de divergencia. La física usa trigonometría nativa (`Math.sin/atan2/
pow/sqrt` en `PhysicsQuery.ts`, `NarrowPhase.ts`, `SteeringSystem.ts`, etc.), así que
no se afirma "bit-exacto entre plataformas" en documentación ni código. Una capa de
math propia queda como trabajo futuro si surge la necesidad.

**D-2 — Modelo de red. CERRADA.**
Servidor autoritativo Colyseus con client-side prediction e interpolación
(`server/src/AsteroidsRoom.ts`, `LocalPredictionSystem`, `MultiplayerReconciler`).
El rollback (`RollbackSimulation`, `CombatRollbackResimulation`) se limita a replays
y resimulación local, no a netcode entre peers.

**D-3 — Quién gana, claridad o rendimiento. CERRADA.**
Resuelto por la regla de desempate de la sección 1: claridad didáctica (2) gana a
rendimiento (3), y ambas pierden contra corrección/determinismo (1).

## 13. Riesgos

| Riesgo                                                             | Mitigación                                   | Check                                                             |
| :----------------------------------------------------------------- | :------------------------------------------- | :---------------------------------------------------------------- |
| El core acaba acoplado a React Native                              | INV-1                                        | `check:core-boundaries` + AST linter en `ecs-sentinel.yml`        |
| Divergencia de determinismo en física                              | RNG aislado + hash de snapshot como detector | INV-2 (AST linter), INV-4 (`determinism.test.ts`, golden replays) |
| `Math.random` en factories/blueprints fuera del alcance del linter | Extender el linter o revisión manual         | ⚠ sin check automático hoy                                        |
| Un agente da por válido un fix sin ejecutarlo                      | Definición de hecho, punto 5                 | Revisión del informe                                              |
| Documentación que contradice decisiones                            | Las decisiones de la sección 12 mandan       | Revisión manual                                                   |

## 14. Audiencia

- Jugadores casuales de arcade (web y mobile).
- Estudiantes que quieren aprender arquitectura de juegos.
- Contribuidores que añaden juegos siguiendo el patrón existente.

```

## Resumen de lo que quedó pendiente

- **⚠ SO de referencia** (sección 9): indícame macOS/Linux/Windows.
- **⚠ Presupuesto de rendimiento** (sección 8): juego + entidades + ms por tick + dispositivo.
- **⚠ Referencia ADR-001** (sección 6): dejé el texto sin ADR y con nota; si quieres, se puede crear `docs/adr/ADR-001.md`.
- **⚠ Seed/N/hash literal** (sección 3) y estados ⚠ de la tabla de juegos: requieren ejecutar el repo — eso sería una sesión de Devin.
```
````
