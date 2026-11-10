# Roadmap — Lancero, presentation guard y Space Invaders

**Fecha:** 2026-11-10  
**Base auditada:** `master` en `7008b94a06b4ead8e24301d1d24bf10975e26ab0`  
**Estado:** propuesta de ejecución; todavía no modifica runtime  
**Iniciativa:** B + C + D del plan de consolidación de Game Feel

## 1. Decisión ejecutiva

Ejecutar B, C y D como **una iniciativa coordinada**, no como un único cambio monolítico:

1. **B — Lancero Canvas/Skia:** corrección autocontenida del registro del drawer y fallback procedural.
2. **C — Presentation Guard:** contrato común para impedir efectos de presentación durante rollback/resimulación y guardrail AST para que no reaparezcan productores sin protección.
3. **D — Space Invaders:** migración del flujo de impactos al contrato anterior, preservando la reproducción determinista del hit-stop y corrigiendo el evento semántico del jefe.

La secuencia recomendada es **B → C → D**. B puede integrarse sin depender de C; D sí depende del contrato y del guardrail de C. Mantener tres PR pequeñas permite revertir cada unidad y revisar por separado el cambio visual, la frontera arquitectónica y la migración del juego.

## 2. Estado real verificado en master

### PR-A ya está integrada

- PR #1166 está incorporada en el commit `7008b94`.
- `.github/workflows/e2e.yml` contiene ahora `push: branches: [master]`, conserva `pull_request` para `master` y `develop`, y conserva `workflow_dispatch`.
- La ejecución E2E inicial de la PR informó 25 pruebas correctas y 2 fallos de Hit & Run. La activación post-merge ya está configurada; esos fallos deben seguirse como baseline E2E y no mezclarse con las modificaciones B/C/D.

### B — Lancero

Archivos comprobados:

- `src/games/hitandrun/HitAndRunGame.ts`
- `src/games/shared/sprites/LanceroSpriteVisuals.ts`

Hallazgos confirmados:

- `HitAndRunGame.registerHitRunRenderers` separa correctamente los drawers de Canvas y Skia para las demás formas, pero registra siempre `drawLanceroSpriteCanvas` para `LANCERO_SHAPE`.
- `drawSkiaLanceroSprite` existe, pero no se registra en esa ruta.
- El drawer Canvas dibuja un fallback procedural cuando el sprite no está cargado.
- El drawer Skia retorna sin dibujar si `getSkiaImage(LANCERO_SPRITE_ID)` no devuelve imagen. Por tanto, puede quedar invisible durante carga o ante un fallo de asset.

### C — Presentation Guard

La base arquitectónica ya existe:

- ADR: `docs/specs/adr-001-game-feel-architecture.md`.
- Orquestador: `src/games/shared/rendering/JuiceOrchestrator.ts`.
- Tests: `src/games/shared/rendering/__tests__/JuiceOrchestrator.test.ts` y `packages/core/tests/CombatRollbackResimulation.test.ts`.

Contrato importante que debe preservarse:

- `GameplayFreeze` es estado temporal autoritativo y debe reproducirse durante resimulación.
- VFX, partículas, shake, flashes, popups y audio son salidas de presentación y no deben duplicarse durante resimulación.
- `JuiceOrchestrator.spawn` ya solicita hit-stop antes de comprobar `world.isReSimulating`; no mover esa comprobación por encima de la solicitud de hit-stop.
- No convertir la protección de presentación en una supresión de mutaciones de gameplay, puntuación, salud, destrucción, combo o eventos autoritativos.

### D — Space Invaders

Archivo comprobado:

- `src/games/space-invaders/systems/SpaceInvadersCollisionSystem.ts`
- Catálogo: `src/games/shared/rendering/JuiceOrchestrator.ts`
- Tests existentes: `src/games/space-invaders/__tests__/space-invaders.test.ts`, `packages/core/tests/CombatRollbackResimulation.test.ts` y `src/games/shared/rendering/__tests__/JuiceOrchestrator.test.ts`.

Hallazgos confirmados:

- `onBossCombatHit` escribe directamente `GameplayFreeze` con 50 ms.
- `onInvaderCombatHit` escribe directamente `GameplayFreeze` con 30 ms.
- El impacto del jefe llama al perfil `ufo:destroyed`, aunque el evento observado es un impacto, no la destrucción del UFO.
- Se crean instancias transitorias de `JuiceOrchestrator` en handlers de impacto/muerte/degradación.
- Hay productores de presentación directos (por ejemplo `Juice.squash`, `Juice.shake` y `createEmitter`) cuya protección debe revisarse por punto de emisión.
- El catálogo actual de Space Invaders contiene `shield:degraded`, `alien:destroyed` y `ufo:destroyed`; no contiene `boss:hit`.

## 3. Diseño del contrato C

### 3.1 API

Introducir un helper compartido en rendering, con un contrato mínimo equivalente a:

```ts
presentOnly(world, () => {
  // VFX, emitter, shake, flash, popup o audio.
});
```

Reglas:

1. Si `world.isReSimulating` es `true`, el callback no se ejecuta.
2. Si no hay resimulación, se ejecuta exactamente una vez.
3. El helper no modifica recursos ECS ni estado de gameplay.
4. No debe englobar la petición de hit-stop autoritativo.
5. El helper no debe capturar ni ocultar errores del callback.
6. Evaluar el coste de closures en rutas calientes; si el coste no es aceptable, usar un predicado compartido sin callback en esos puntos, manteniendo una única semántica de guardia.

El helper debe depender del contrato mínimo de estado de resimulación, no de un cast amplio a `World<any, any, any>`.

### 3.2 Frontera entre gameplay y presentación

**No** envolver handlers completos de colisión si contienen reglas autoritativas. Separar el handler en:

- Mutaciones autoritativas: daño, vida, score, combo, eliminación de entidades, RNG de gameplay y eventos que gobiernan simulación. Se ejecutan también durante replay.
- Salidas de presentación: VFX, emitters, shake, flashes, popups y SFX. Se ejecutan solo fuera de replay.

Para el orquestador, mantener el orden actual: solicitar/reproducir hit-stop primero; suprimir después la creación de presentación durante replay.

### 3.3 Guardrail AST

Añadir un análisis estático basado en TypeScript Compiler API (no regex) para los productores de presentación acordados.

Alcance inicial:

- `createEmitter` y productores equivalentes de partículas.
- `Juice.shake`, `Juice.squash`, `Juice.add` y helpers visuales equivalentes.
- `JuiceOrchestrator.spawn` / `triggerEvent` cuando se usen como salida de presentación; el analizador debe respetar que el hit-stop interno es autoritativo.
- Emisión de SFX, popups y flashes cuando se añadan explícitamente al catálogo de productores.

Aceptación del análisis:

- Aceptar una llamada dentro de un callback pasado a `presentOnly`.
- Aceptar una guarda explícita reconocida y estrecha sobre `!world.isReSimulating`, si se decide mantener esa forma compatible.
- Rechazar productores nuevos sin protección.
- No confundir una guarda de presentación con una guarda que suprima gameplay.
- Mensajes de error con ruta, línea y nombre del productor.
- Fixtures positivos y negativos para ramas invertidas, alias de world, callbacks anidados y llamadas dentro de funciones helper.
- Lista de excepciones pequeña, motivada y con propietario; no permitir allowlist global silenciosa.

No intentar resolver todo el flujo de control de TypeScript en la primera iteración. Definir una gramática conservadora de patrones admitidos, probarla con fixtures y fallar de forma explícita ante formas ambiguas.

## 4. Entregas de implementación

### PR-B — Fix Lancero Skia

**Objetivo:** equivalencia funcional de Lancero en ambos backends, sin rediseñar el sprite system.

Cambios:

1. Importar `drawSkiaLanceroSprite` en `HitAndRunGame.ts`.
2. Registrar el drawer correcto dentro de la rama correspondiente:
   - Skia → `drawSkiaLanceroSprite`.
   - Canvas → `drawLanceroSpriteCanvas`.
3. Añadir un fallback procedural Skia equivalente al Canvas cuando la imagen no esté disponible. Debe dibujar dentro del mismo sistema de coordenadas/transformaciones que utiliza el drawer de sprite y respetar opacity, tamaño y anchor de pies.
4. Mantener la carga asíncrona del sprite y el comportamiento de Canvas.
5. No modificar otros personajes ni extender el cambio a otros juegos.

Tests mínimos:

- Registro Canvas selecciona el drawer Canvas.
- Registro Skia selecciona el drawer Skia.
- Sprite disponible usa el camino de sprite.
- Sprite ausente usa fallback visible en Skia.
- Render invisible no dibuja.
- Opacity y tamaño se respetan.

Criterio de salida: ambos backends producen un Lancero visible antes y después de completar la carga del asset; no hay registro Canvas accidental en renderer Skia.

### PR-C — Presentation Guard + AST Guardrail

**Objetivo:** hacer difícil introducir nuevos efectos de presentación duplicables en rollback.

Cambios:

1. Añadir el helper `presentOnly` y tests unitarios de ejecución normal y resimulación.
2. Definir explícitamente la lista de productores de presentación.
3. Añadir script AST y fixtures de conformidad.
4. Integrar el guardrail en el comando de checks del repositorio/CI sin sustituir los guardrails existentes.
5. Migrar únicamente los puntos de emisión necesarios para demostrar el contrato en un piloto pequeño; no hacer una migración masiva de juegos en esta PR.
6. Documentar que el hit-stop del orquestador se procesa antes de suprimir la salida visual.

Tests mínimos:

- El callback se ejecuta una vez en ejecución normal.
- No se ejecuta durante resimulación.
- No se producen emisores/VFX/SFX duplicados en replay.
- El hit-stop sigue actualizándose y el hash del estado autoritativo coincide entre ejecución normal y replay.
- AST: fixtures que deben pasar y fallar.
- Ejecutar el guardrail contra el repositorio completo y revisar cada hallazgo antes de activar el modo estricto.

Criterio de salida: el helper tiene contrato probado, el guardrail detecta un productor sin guarda y no produce falsos positivos sobre código autoritativo.

### PR-D — Space Invaders migration

**Objetivo:** aplicar C a los impactos y muertes de Space Invaders, eliminando escrituras directas de hit-stop y eventos semánticamente incorrectos.

Cambios:

1. Crear/obtener una instancia de `JuiceOrchestrator` asociada al ciclo de vida del sistema o mundo; no construirla repetidamente dentro de handlers.
2. Añadir el perfil tipado `space-invaders: boss:hit` al catálogo. Mantener un perfil separado para `ufo:destroyed`; no reutilizar el evento de destrucción para un impacto.
3. Sustituir las escrituras directas de `GameplayFreeze` en impacto de jefe e invader por los perfiles canónicos del catálogo.
4. Preservar las duraciones observadas (50 ms para boss hit y 30 ms para invader hit) salvo que una prueba o el contrato de prioridades justifique un cambio deliberado y documentado.
5. Proteger con `presentOnly` los efectos directos de presentación: squash, shake, emitters y cualquier popup/flash/SFX asociado.
6. Mantener durante replay las mutaciones de daño, score, combo, shield, destrucción y los eventos de simulación necesarios.
7. Corregir los tests para comprobar tanto el estado autoritativo como la ausencia de duplicación de presentación.

Tests mínimos:

- Boss hit solicita el hit-stop correcto y produce el perfil visual `boss:hit` en ejecución normal.
- Boss hit no produce VFX/SFX durante resimulación, pero sí reproduce el estado de hit-stop.
- Invader hit mantiene el hit-stop de 30 ms y no emite partículas duplicadas.
- Invader death mantiene score/combo/destrucción idénticos entre ejecución normal y replay.
- Shield degradation no duplica efectos durante replay.
- Ningún handler conserva una escritura directa a `GameplayFreeze`.
- Ningún handler crea un `JuiceOrchestrator` transitorio por evento.

Criterio de salida: la misma secuencia de entradas produce el mismo estado/hash autoritativo en ejecución normal y replay; la presentación se emite una sola vez fuera de replay.

## 5. Orden, dependencias y criterios de integración

| Orden | Entrega | Dependencia | Resultado requerido |
|---|---|---|---|
| 1 | PR-B Lancero | Ninguna | Drawer correcto y fallback Skia probado |
| 2 | PR-C Guard + AST | Ninguna de runtime; establece contrato para D | API y guardrail integrados en CI |
| 3 | PR-D Space Invaders | PR-C integrada | Migración de impactos/muertes sin regresión de replay |

Aunque B/C/D forman una iniciativa única, no acumularlas en una PR gigante. Abrir y verificar cada PR antes de empezar la siguiente; squash merge siguiendo el flujo habitual del repositorio.

## 6. Validación global

Ejecutar en cada PR los tests focalizados y los checks relevantes. Antes de cerrar la iniciativa:

- `pnpm exec jest --runInBand src/games/shared/sprites` (si los tests de Lancero se ubican en esa carpeta).
- `pnpm exec jest --runInBand src/games/shared/rendering/__tests__/JuiceOrchestrator.test.ts`.
- `pnpm exec jest --runInBand src/games/space-invaders/__tests__/space-invaders.test.ts packages/core/tests/CombatRollbackResimulation.test.ts`.
- `pnpm run typecheck:app`.
- `pnpm run test:ci` o el conjunto focalizado acordado si el runner impone límites; nunca declarar la suite completa como pasada si no terminó.
- `pnpm run check:agent-guardrails` y el nuevo guardrail AST.
- E2E en GitHub Actions tras push a `master`, siguiendo el workflow incorporado por PR-A.

Los comandos anteriores son el plan de verificación, no resultados ya ejecutados. El entorno de edición mediante GitHub no proporciona checkout local ni ejecución de pnpm; cada PR debe esperar evidencia real de GitHub Actions antes de marcarse como validada.

## 7. Riesgos y decisiones que no deben tomarse

- **Riesgo principal:** envolver handlers completos con `presentOnly` y suprimir accidentalmente mutaciones autoritativas. Mitigación: delimitar cada llamada de presentación.
- **Riesgo de hit-stop:** mover la guarda antes de `requestHitStop` en `JuiceOrchestrator.spawn`. Esto rompería replay. No hacerlo.
- **Riesgo de AST:** regex o análisis excesivamente ambicioso que genere falsos positivos. Usar TypeScript AST, fixtures y patrones admitidos conservadores.
- **Riesgo de renderer:** usar el drawer Canvas en Skia o fallback con coordenadas distintas. Probar registro y fallback por backend.
- **Riesgo de semántica:** seguir emitiendo `ufo:destroyed` en un impacto del jefe. Añadir `boss:hit` sin borrar el evento de destrucción real.
- No añadir una nueva capa de orquestación ni un segundo motor de animación.
- No limpiar `any` ajenos a estos cambios ni refactorizar otros juegos dentro de estas PR.

## 8. Estado de ejecución

| Entrega | Estado |
|---|---|
| PR-A — E2E en push a master | Integrada (#1166) |
| PR-B — Lancero Skia | Pendiente |
| PR-C — Presentation Guard + AST | Pendiente |
| PR-D — Space Invaders | Pendiente |
| Validación final B/C/D | Pendiente |

**Siguiente paso:** implementar PR-B como primer cambio de runtime; no iniciar C ni D hasta que B tenga diff acotado y sus checks estén reportados.
