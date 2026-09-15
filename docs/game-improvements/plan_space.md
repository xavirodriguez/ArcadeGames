Implementar de forma incremental las mejoras evolutivas de Space Invaders en el repo `xavirodriguez/ArcadeGames`, en 4 fases secuenciales. Cada fase debe dejar la suite de tests existente en verde (`src/games/space-invaders/__tests__/*`) antes de pasar a la siguiente. Usar SIEMPRE la API real del motor confirmada abajo, NO inventar métodos.

APIs reales a respetar (evitar los errores de pseudocódigo detectados):

- Para leer una entidad singleton: `world.query("Player")[0]` + `world.getComponent(entity, "Type")`. NO existe `getSingletonEntity`.
- Para leer un singleton component directamente: `world.getSingleton("Formation")` / `world.getSingleton("GameState")` (ver `packages/core/src/ecs/World.ts` líneas 711-715 y uso en `SpaceInvadersCollisionSystem.ts`).
- Para emitir eventos de forma segura con rollback: `world.getEventBus()?.emitDeferred("evento", payload)`, envuelto en `if (!world.isReSimulating)` cuando dispare efectos secundarios no deterministas (ver patrón en `SpaceInvadersCollisionSystem.onCombatHit`).
- Mutaciones de componentes: `world.mutateComponent(entity, "Type", c => {...})` o `world.mutateSingleton("Type", s => {...})`.
- Cambios estructurales (add/remove component/entity) durante `update()`: usar `world.getCommandBuffer()` o `world.commands`, nunca mutar estructura directamente.
- RNG determinista de gameplay: siempre `world.gameplayRandom` (nunca `Math.random()`), respetando `isLocked()`/`unlock()`/`lock()` como se hace en `MutatorRegistry.generateDraft()`.

---

## FASE 1 — Core Juice & Hot-Path Optimization

### 1.1 Muzzle Flash

- En `packages/core/src/ecs/CoreComponents.ts`, añadir el campo opcional `muzzleFlashFrames?: number;` a la interfaz `RenderComponent` (junto a `hitFlashFrames`).
- En `packages/core/src/ecs/EntityBuilder.ts`, método `withRender`, añadir `muzzleFlashFrames: config?.muzzleFlashFrames ?? 0` al objeto construido para mantener consistencia con el resto de defaults.
- En `src/games/space-invaders/systems/SpaceInvadersInputSystem.ts`, en el bloque donde ya se aplica el recoil (`Juice.add`, `Juice.squash`, `Juice.shake`, emisor de humo — líneas ~110-141), añadir `world.mutateComponent(entity, "Render", render => { render.muzzleFlashFrames = 3; })`.
- En `src/games/space-invaders/rendering/SpaceInvadersCanvasVisuals.ts` y `SpaceInvadersSkiaVisuals.ts`, en el shape drawer del jugador, si `render.muzzleFlashFrames > 0`, dibujar un resplandor breve (círculo/rombo blanco-cian) en la punta de la nave y decrementar el contador cada frame (mismo patrón usado para decrementar `hitFlashFrames`, buscar `applyHitFlash`/`getRenderFlash` para replicar la técnica de decremento).

### 1.2 Chispas direccionales de impacto

- En `src/games/space-invaders/systems/SpaceInvadersCollisionSystem.ts`, método `onCombatHit` (bloque `Invader`, líneas ~137-172): obtener la velocidad/dirección de la bala (`world.getComponent(bulletEntity, "Velocity")` o el vector `dx`/`dy` de la bala) ANTES de destruirla, calcular `theta = Math.atan2(dy, dx) * 180/Math.PI`, y cambiar el emisor de chispas `angle: [0, 360]` por `angle: [theta - 30, theta + 30]`.
- Ajustar el hit-stop de `world.setResource("GameplayFreeze", { remaining: 0.04 })` a `0.03` (30ms) según el balance del roadmap, si se decide adoptar ese valor.

### 1.3 Zero-allocation Formation System

- En `src/games/space-invaders/systems/SpaceInvadersFormationSystem.ts`: sustituir el campo `columnShooters: Map<number, {entity, y}>` por dos arrays tipados de tamaño fijo `INVADER_COLS` (usar `config.INVADER_COLS`, no un literal hardcodeado, ya que varía por nivel según `getFormationSize`): `private columnShooterEntities: Int32Array` y `private columnShooterY: Float32Array`, inicializados en el constructor o lazily en el primer `update` con el tamaño correcto, rellenados con `-1` como sentinela.
- Reescribir `fireFromFormation` para poblar estos arrays indexando por `invader.col` en vez de `Map.set`/`Map.get`.
- Reescribir la selección aleatoria del tirador (líneas ~204-218) para compactar los índices válidos (`entity !== -1`) al principio del array y usar `world.gameplayRandom.nextInt(0, validCount)` sobre el array compacto, en vez de iterar `Map.values()`.
- CRÍTICO: ejecutar `src/games/space-invaders/__tests__/space-invaders.test.ts` (sección "SpaceInvadersFormationSystem Deterministic RNG & Firing") y `formation.test.ts` tras el cambio — el orden de iteración/selección debe producir exactamente los mismos resultados para no romper el determinismo esperado por esos tests. Si el orden de recorrido de columnas cambia respecto al `Map` original, actualizar los valores esperados en los tests solo si el cambio de orden es intencional y documentado, no de forma silenciosa.

---

## FASE 2 — Combate Táctico & Telegraphing

### 2.1 Kamikaze telegrafiado

- En `src/games/space-invaders/types/SpaceInvadersTypes.ts`, extender `KamikazeComponent`: cambiar `phase: "diving" | "returning"` a `phase: "telegraphing" | "diving" | "returning"`, y añadir `telegraphRemaining: number`, `targetX: number`, `targetY: number`.
- En `src/games/space-invaders/systems/KamikazeSystem.ts`, método `spawnKamikaze` (líneas 92-115): iniciar el componente con `phase: "telegraphing"`, `telegraphRemaining: 0.6` (segundos), y capturar `targetX`/`targetY` como la posición actual del jugador en ese instante.
- En el método `update` (líneas 10-90), añadir un bloque `if (kami.phase === "telegraphing")` ANTES del bloque `"diving"` existente: decrementar `telegraphRemaining -= deltaTime`; mientras esté en telegraphing, la entidad no debe moverse (no mutar `Velocity`); cuando `telegraphRemaining <= 0`, transicionar a `phase: "diving"` vía `world.mutateComponent`.
- En `src/games/space-invaders/rendering/SpaceInvadersCanvasVisuals.ts` / `SpaceInvadersSkiaVisuals.ts`, en el drawer de invasor, si `kami.phase === "telegraphing"`, dibujar: (a) parpadeo del propio invasor con opacidad `0.3 + 0.7 * Math.abs(Math.sin(world.tick * 0.3))`, (b) línea discontinua roja desde la posición del invasor hasta `(targetX, targetY)`, (c) una retícula/marca de peligro en `(targetX, targetY)`.
- Actualizar cualquier test existente que dependa de que `spawnKamikaze` cree la entidad directamente en `"diving"` (revisar `src/games/space-invaders/__tests__/` por referencias a `Kamikaze`).

### 2.2 EMP Blast Wave

- En `src/games/space-invaders/types/SpaceInvadersTypes.ts`: añadir nueva interfaz `EmpAbilityComponent extends Component { type: "EmpAbility"; charge: number; cooldownRemaining: number; radius: number; chargePerKill: number; }`, y registrarla en `SpaceInvadersComponentRegistry`.
- Extender `FormationComponent` con `stunnedRemaining?: number` (campo nuevo, confirmado inexistente).
- En `src/games/space-invaders/types/SpaceInvadersConfigSchema.ts`: añadir al esquema `KEYS` una nueva tecla (p.ej. `EMP: z.string().default("KeyE")`), y campos de configuración `EMP_RADIUS`, `EMP_COOLDOWN`, `EMP_STUN_DURATION`, `EMP_CHARGE_PER_KILL` con sus `.default()` correspondientes (Zod), para que sobrevivan snapshot/restore y revalidación.
- En `src/games/space-invaders/SpaceInvadersGame.ts`, en el blueprint del jugador (cerca de donde se añade el `InputComponent`, líneas ~166-172), añadir el componente `EmpAbility` inicial al crear la entidad jugador.
- En `src/games/space-invaders/systems/SpaceInvadersInputSystem.ts`, detectar la nueva tecla de input (siguiendo el mismo patrón usado para `shoot`) y, si `emp.charge >= 1.0`, ejecutar: iterar `world.query("EnemyBullet", "Transform")`, calcular distancia al jugador, y para las que estén dentro de `emp.radius` destruirlas de forma segura (usar el mismo helper de remoción de balas que usa `SpaceInvadersCollisionSystem`, p.ej. `removeBulletSafely`, o replicar su lógica); aplicar `world.mutateSingleton("Formation", f => { f.stunnedRemaining = config.EMP_STUN_DURATION; })`; resetear `emp.charge = 0` y aplicar cooldown; emitir `world.getEventBus()?.emitDeferred("si:emp_used", {...})` envuelto en `if (!world.isReSimulating)`.
- En `SpaceInvadersFormationSystem.ts`, al inicio del `update`, comprobar `formation.stunnedRemaining > 0`: si es así, decrementarlo y `return` antes de ejecutar movimiento/disparo de la formación.
- En `src/games/space-invaders/systems/SpaceInvadersCollisionSystem.ts`, método `onCombatDeath` (bloque `Invader`, líneas ~175-207), incrementar la carga del EMP del jugador: `world.mutateComponent(playerEntity, "EmpAbility", emp => { emp.charge = Math.min(1.0, emp.charge + emp.chargePerKill); })`.
- Añadir efecto visual de onda expansiva (nuevo shape drawer o `createEmitter` tipo anillo) en `SpaceInvadersCanvasVisuals.ts`/`SpaceInvadersSkiaVisuals.ts`, siguiendo el patrón de `BossSystem.destroyBoss`/`spawnLayeredExplosion`.
- Añadir una barra de carga de EMP en el HUD (revisar cómo `ComboHUDRenderSystem` dibuja el combo actual y replicar el patrón para mostrar `emp.charge`).

### 2.3 Balas cargadas atravesando escudos

- En el paquete `gameplay-kit` donde vive la interfaz real `DamageComponent` (usada vía `import { DamageComponent } from "@tiny-aster/gameplay-kit"` en `SpaceInvadersTypes.ts`), EXTENDER la interfaz existente (no redefinirla) añadiendo campos opcionales `piercing?: number;` y `charged?: boolean;`, y añadir `"decrement-piercing"` como valor válido adicional de `consumption` junto a `"destroy-entity"`.
- En `src/games/space-invaders/systems/SpaceInvadersCollisionSystem.ts`, en el bloque que maneja el par `PlayerBullet`/`Shield` (líneas ~320-334) y el método `damageShield` (líneas ~360-385): si la bala tiene `Damage.charged === true` y `Damage.piercing > 0`, dañar el escudo igual que hoy pero NO destruir la bala — en su lugar, `world.mutateComponent(bulletEntity, "Damage", d => { d.piercing!--; })` y dejar que continúe su trayectoria; emitir chispas de "plasma" cian en el punto de impacto (reutilizar `createEmitter`, mismo patrón que en `onCombatHit`). Si `piercing` llega a 0 tras esta interacción, destruir la bala normalmente.
- Registrar un nuevo mutador de sesión `plasma_pierce` en `src/utils/MutatorRegistry.ts` (`BENEFICIAL_MUTATORS`) con `supportedGames: ["space-invaders"]`, que al aplicarse mute el `DamageComponent` de la bala del jugador (vía `EntityBuilder`/blueprint `player_bullet` en `SpaceInvadersGame.ts`, líneas ~242-249) para incluir `charged: true, piercing: 1, consumption: "decrement-piercing"`.
- Actualizar los shape drawers de bala y escudo para reflejar visualmente el color cian de las balas cargadas.

---

## FASE 3 — Población de Mutadores & UI de Draft

### 3.1 Mutadores temáticos adicionales

- En `src/utils/MutatorRegistry.ts`, añadir a `BENEFICIAL_MUTATORS` (siguiendo exactamente el shape de `BeneficialMutator` ya usado por `combo_head_start`/`faster_bullets`): `emp_overcharge` (aumenta `chargePerKill` del `EmpAbilityComponent` del jugador), `plasma_pierce` (definido en Fase 2), y cualquier otro perk temático de las mecánicas nuevas (gravedad invertida, escáner, si se implementan más adelante). Cada uno debe implementar `id`, `name`, `description`, `rarity`, `supportedGames`, `canDraft`, `apply` con la firma real `apply: (world, context) => void` (confirmar la firma exacta leyendo mutadores existentes como `faster_bullets` antes de escribir los nuevos).
- Verificar que ninguno de estos mutadores escriba a `PersistenceService` — deben mutar únicamente `World`/componentes de la partida en curso (contrato "one-shot, run-scoped" documentado en `GDD.md`).

### 3.2 UI del Draft entre oleadas

- Crear un nuevo componente React (p.ej. `src/components/DraftOverlayUI.tsx`), ya que no existe ningún precedente `Draft*`/`useDraftState` en el repo — diseñar desde cero un hook o mecanismo de lectura que consulte, en cada frame o vía suscripción a eventos, el componente `DraftState` del jugador local (`world.getComponent(playerEntity, "DraftState")`, poblado por `WaveTransitionSystem`).
- El overlay debe mostrarse cuando `GameState.phase === "MUTATOR_DRAFT"`, listar las `draft.options` (ids de mutadores, resolver nombre/descripción/rareza vía `MutatorRegistry.get(id)`), y al seleccionar una opción llamar a `SpaceInvadersGame.selectRunMutator(mutatorId)` (método ya implementado y testeado en `SpaceInvadersGame.ts` líneas 571-647).
- Verificar la integración con el patrón de renderizado existente de overlays de UI del juego (revisar cómo se montan otros overlays como `LeaderboardOverlay`/`PassportOverlay` para mantener consistencia de estilo/estructura).

---

## FASE 4 — Enlaces Meta & Perfil Passport

- En `AchievementSystem` o su configuración de logros (revisar `packages/gameplay-kit/src/arcade/systems/AchievementSystem.ts` y su tabla de definiciones), añadir nuevos logros ligados a los eventos emitidos en fases anteriores: `si:emp_used` → logro "Electrocutioner"; nuevo evento `si:pierce_kill` (emitir desde `SpaceInvadersCollisionSystem` cuando una bala con `piercing` destruye más de un invasor) → logro de plasma.
- Conectar `MetaProgressionService.incrementMiniGameMastery("space-invaders", n)` al flujo normal (no-story) de fin de partida de Space Invaders — actualmente solo se invoca desde `MultiGameStoryProofOfConcept.ts`; localizar dónde se emite el evento de `GAME_OVER`/fin de sesión en `SpaceInvadersGame.ts` o `SpaceInvadersGameStateSystem.ts` y añadir la llamada ahí.
- Extender `src/components/PassportOverlay.tsx` con nuevas filas `StatRow` para `empActivations`, `chargedShotsFired`, `perfectWavesStreak` (u otras stats relevantes de las nuevas mecánicas), siguiendo el patrón ya usado para `stat_invaders`/`siKills`. Estas stats deben acumularse en el perfil de persistencia (`PersistenceService`) desde los mismos puntos donde se emiten los eventos de logro.

---

## Consideraciones transversales para todas las fases

- Todo nuevo estado de gameplay que necesite persistir en snapshot/rollback debe añadirse como componente/resource del `World`, nunca como estado interno de clase de sistema (excepto los arrays reutilizables de la Fase 1.3, que son puramente de rendimiento y se recalculan cada tick).
- Cualquier aleatoriedad de gameplay debe pasar por `world.gameplayRandom`, nunca `Math.random()`.
- Cualquier efecto secundario no determinista (sonido, partículas visuales puras) debe condicionarse con `if (!world.isReSimulating)` como ya se hace en `BossSystem.destroyBoss` y `SpaceInvadersCollisionSystem.onCombatHit`.
- Tras cada fase, ejecutar la suite completa de tests en `src/games/space-invaders/__tests__/` para detectar regresiones de determinismo antes de avanzar a la siguiente fase.
