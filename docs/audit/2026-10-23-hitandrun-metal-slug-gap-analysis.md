# Auditoría de Brecha Técnica — Hit&Run vs. Benchmark *Metal Slug*

> **Tipo de documento:** análisis read-only (sin cambios de código).
> **Alcance:** `src/games/hitandrun/**`, `packages/core/src/**` (motor ECS), `src/app/hitandrun/index.tsx` (borde de entrada), historial Git.
> **Rol del autor:** arquitecto de motor 2D + diseñador senior de gameplay.
> **Fecha:** 2026-10-23 · **gameId:** `hitandrun` · **Rama observada:** `feature/belt-brawler-fantasy`

---

## 0. Resumen ejecutivo

### 0.1 Veredicto

El benchmark *Metal Slug* es un **run-and-gun de plataformas horizontal**: gravedad, salto de arco parabólico con altura ≈ 2,5–3 cuerpos, apuntado en 8 direcciones, economía de munición con retorno a pistola infinita, vehículos *Slug* con vida propia y eyección, POWs rescatables y bloqueo de cámara por oleada.

El código actual **no es una versión incompleta de ese juego: es otro género**. `src/games/hitandrun/README.md:1-16` lo declara explícitamente — *"Conversión de platformer run-and-gun a belt-scroll beat'em-up fantasy"* — con movimiento libre en X + profundidad (Y), hop corto en Z, combos melee y cámara con *gates* por sección. La consecuencia arquitectónica es que **la mayoría de las mecánicas de Metal Slug no están "a medio hacer": fueron eliminadas del diseño** y varias sobreviven como código huérfano o como sistemas que siguen registrados sin función real.

El commit `d7f7038a` — *"feat(hitandrun): convert Hit&Run to Metal Slug style run-and-gun"* — sí implementó el benchmark (controlador de plataformas `HitRunPlayerControllerSystem`, POWs, pickups de arma con munición, granadas parabólicas, crouch, apuntado 8-way). Ese commit fue revertido de facto por la migración a belt-scroll: `git show --stat d7f7038a` registra la creación de `pow/HitRunPowSystem.ts` (+74), `pow/registerPowBlueprint.ts` (+44), `weapons/spawnWeaponPickup.ts` (+44) y `systems/HitRunPlayerControllerSystem.ts` (+236), y la eliminación de todo `belt/**` (−~700 líneas). Hoy ocurre lo inverso: `belt/**` existe y `pow/`, `spawnWeaponPickup.ts` y `HitRunPlayerControllerSystem.ts` no existen.

**Conclusión:** la brecha no es de "pulido". Es (a) una **deuda de correctitud** con bugs que rompen el combate, (b) una **deuda de determinismo/arquitectura** que impide rollback y replays, y (c) una **brecha de producto** que solo se cierra decidiendo si se re-adopta el género run-and-gun o se acepta formalmente el beat'em-up y se reescribe el benchmark objetivo.

### 0.2 Hallazgos P0 (rompen el juego hoy)

| # | Hallazgo | Evidencia | Efecto observable |
|---|---|---|---|
| 1 | **Las balas enemigas no hacen daño** | `ai/enemyShoot.ts:45-58` construye `damageAmount`, pero el fallback `:106-165` nunca añade el componente `Damage` | El fuego enemigo es decorativo; la presión a distancia no existe |
| 2 | **El pool de balas enemigas nunca se registra** | `enemyShoot.ts:41-43` lee el resource `"EnemyBulletPool"`; no hay ningún `setResource("EnemyBulletPool", …)` en el repo | Siempre se usa el fallback no pooleado → GC por disparo + bug #1 |
| 3 | **Las explosiones dañan al jugador con su propio cohete** | `weapons/HitRunExplosionSystem.ts:131-134` lee `faction.faction`, pero el jugador se registra con `value: "player"` (`belt/registerBeltPlayerBlueprint.ts:90-93`) | Autodaño por AoE; rockets y fire staff son trampas |
| 4 | **Cada explosión se resuelve dos veces** | `HitRunExplosionSystem.ts:101-105` emite `emitDeferred` **y** hace `pendingExplosions.push`; `Schedule.ts:222` hace flush al final del tick y `onSubscribe` (`:44-48`) re-encola | Daño AoE duplicado (2× `explosionDamage`), muertes y eventos `combat:death` duplicados |
| 5 | **El apuntado en 8 direcciones es inalcanzable** | `src/app/hitandrun/index.tsx:190-191` fija `aimUp/aimDown: false`; `:241` fuerza `axisY: 0`; `mutateBeltInputState.ts:19-56` no mapea aim en absoluto | Solo se dispara horizontal; `resolveHitRunAim` es prácticamente código muerto |
| 6 | **El enemigo `hr_hop` está roto en modo belt** | `ai/hitRunStateMachines.ts:421-435` escribe `Velocity.vy` (que en belt es **profundidad**, no altura) y lee `PlatformerGroundState`, componente que el jugador/enemigos belt no tienen | El saltador se desplaza en profundidad y nunca "aterriza" lógicamente |
| 7 | **`HitRunEnemyPool` no es un pool** | `waves/HitRunEnemyPool.ts:56-79` crea una entidad nueva con `ArcadeEntityBuilder` en cada `acquireEnemy` | Picos de GC en cada oleada; el nombre engaña al lector y al profiling |
| 8 | **No hay CCD en Hit&Run** | `CCDSystem` existe en `packages/core/src/physics/collision/CollisionSystems.ts:364`; `registerBeltSystems.ts:61-84` y `HitAndRunGame.ts:189-205` no lo registran | Tunneling con proyectiles rápidos (ver §3.3) |
| 9 | **Hit-stop inconsistente** | `systems/HitRunFeedbackSystem.ts:75-95` escribe el resource propio `"HitStopRemaining"` y cada sistema lo consulta a mano (`HitRunWeaponSystem.ts:26`, `HitRunShootCooldownSystem.ts:11`); el mecanismo canónico `GameplayFreeze` (`ecs/Schedule.ts:170-180`) no se usa | Durante el hit-stop el movimiento y la física siguen corriendo → "se siente" mal y desincroniza la ventana de impacto |
| 10 | **La IA de patrol congela el cooldown con un literal** | `ai/hitRunStateMachines.ts:279-282` resta `0.016` fijo en vez de usar `dt` | El cooldown de ataque varía con el framerate efectivo y rompe determinismo entre dispositivos |

### 0.3 Lo que sí está bien (no reescribir)

- **Fixed timestep real**: `packages/core/src/loop/GameLoop.ts:117` (`step ?? 1/60`) con acumulador y `alpha` calculado en `:273`.
- **Broadphase sweep-and-prune + SAT**: `CollisionSystems.ts:178` → `BroadPhase.sweepAndPrune`; narrowphase SAT en `NarrowPhase.ts:156`.
- **Determinismo de gameplay**: `world.gameplayRandom`, snapshots SoA y hash FNV-1a ya existen y están integrados en `BaseGame`.
- **Fases del `Schedule`** respetadas: el juego registra por `SystemPhase` con prioridades coherentes (`registerBeltSystems.ts:61-84`).
- **Pooling de balas del jugador**: `ProjectilePool` con 64 instancias (`HitRunBulletPool.ts:67-70`), reutilización real.
- **Bordes de entrada sin `setState`**: el patrón de `TouchInputState`/mutación directa del AGENTS.md se cumple; no hay re-render a 60 Hz.

---

## 1. Pilar 1 — Arquitectura de motor, ECS y rendimiento

### 1.1 Estado Actual Detectado

**Herencia y ensamblaje.** `HitAndRunGame extends PlatformerArcadeGame` (`HitAndRunGame.ts:19,115`). El `super.onRegisterSystems()` (`:182`) instala recursos de arcade y `DeathPlaneY: 650` (`PlatformerArcadeGame.ts:82`), que el propio juego neutraliza después con `Infinity` (`HitAndRunGame.ts:248-251`) porque en belt el eje Y es profundidad. Aun así se siguen registrando blueprints de plataformas y coleccionables:

```ts
// HitAndRunGame.ts:184-187
registerPlatformerTilemapBlueprint(this.blueprints, DEFAULT_HIT_AND_RUN_CONFIG);
registerStandardPlatformerCollectibles(this.blueprints);
registerPlatformerEnvironmentBlueprints(this.blueprints);
```

El comentario `:184` admite que es transitorio (*"still used for corridor props until a pure belt level lands"*). Es deuda estructural: el juego arrastra un sustrato de plataformas que ya no gobierna al jugador.

**Ciclo de simulación.** `BaseGame` → `GameLoop` fijo a `1/60`; `HitAndRunGame.update` delega en `world.update(dt)` (`:143-146`). El `Schedule` aplica `TimeScale`, `GameplayFreeze` y `scaledDeltaTime` (`Schedule.ts:154-180`), y hace `flushDeferred()` al cierre de cada tick (`:222`).

**Colisión.** `CollisionSystem2D` usa sweep-and-prune + SAT. `CCDSystem` (barrido continuo) está disponible pero **no registrado** en Hit&Run.

**Pooling.**
- Balas del jugador: pool real de 64 (`HitRunBulletPool.ts:67-70`, registro en `:99-108`).
- Balas enemigas: **sin pool** (ver §0.2 #2).
- Enemigos: clase llamada pool que **no recicla** (`HitRunEnemyPool.ts:31-136`).
- Explosiones/partículas: sin entidades propias; ver Pilar 5.

**Determinismo.** Infraestructura correcta, pero con fugas:
1. `HitRunExplosionSystem` mantiene `pendingExplosions` y `scratchTargets` como **estado de instancia mutable** (`:39-42`), igual que `CombatHitListenerSystem.pendingHits`. Ese estado **no entra en el snapshot**; tras un rollback, las colas pueden contener eventos del futuro re-simulado.
2. `src/app/hitandrun/index.tsx:30-77` muta el `World` **desde callbacks de React**, fuera del tick fijo (`applyAimToPlayer` escribe `BeltInput`, `Transform.scaleX`). El instante de muestreo del input depende del scheduling del navegador → no reproducible bit-a-bit.
3. Literal `0.016` en la IA (§0.2 #10).

**Render.** `GameLoop` entrega `alpha` (`GameLoop.ts:273-274`), pero ningún drawer de `rendering/HitRun*` lo usa: se dibuja el último estado simulado. Con paso fijo a 60 Hz y pantallas de 120 Hz, el resultado es micro-judder.

### 1.2 Estándar Objetivo (Metal Slug Benchmark)

- Simulación **autoritativa y determinista** a paso fijo, con input empaquetado en `InputFrame`/`CompactInputFrame` **por tick** (nunca inyectado desde la capa de UI).
- **Cero asignaciones en el hot path**: pools pre-calentados para balas (ambos bandos), enemigos, partículas, daño flotante y pickups. Los sistemas no crean entidades por disparo.
- **Colisión en dos niveles**: broadphase espacial + narrowphase exacta + **CCD para proyectiles rápidos**, con `raycast/sweep` para láseres y cadenas.
- **Estado de sistema fuera del sistema**: todo lo rewindable vive en `World` (componentes/recursos), no en campos de instancia.
- **Interpolación de render** entre `prev` y `curr` con `alpha`, o fixed-step con presentación a 60 Hz estables.
- Sin `switch` de género a mitad de proyecto: un único modelo de movimiento (plataformas **o** belt), no ambos.

### 1.3 Brecha Identificada (The Gap)

| ID | Brecha | Severidad | Evidencia | Impacto |
|---|---|---|---|---|
| G1.1 | Estado mutable en sistemas (`pendingExplosions`, `pendingHits`, `scratchTargets`) fuera del snapshot | **P1** | `HitRunExplosionSystem.ts:39-42`; `CombatHitListenerSystem.ts` | Rollback y replays divergen; bugs fantasma difíciles de reproducir |
| G1.2 | Input inyectado desde React fuera del tick fijo | **P1** | `app/hitandrun/index.tsx:30-77,187-193` | No determinista entre dispositivos; imposible grabar/reproducir inputs |
| G1.3 | `CCDSystem` no registrado | **P1** | `CollisionSystems.ts:364` vs `registerBeltSystems.ts:61-84` | Tunneling de proyectiles (ver §3.3) |
| G1.4 | Pool de enemigos inexistente de facto | **P1** | `HitRunEnemyPool.ts:56-79` | GC spikes por oleada; frame drops en móvil |
| G1.5 | Pool de balas enemigas nunca registrado | **P0** | `enemyShoot.ts:41-64` | GC + bug de daño |
| G1.6 | Hit-stop por resource ad-hoc en vez de `GameplayFreeze`/`TimeScale` | **P1** | `HitRunFeedbackSystem.ts:75-95`; `Schedule.ts:170-180` | Congelación parcial incoherente; sistemas se desfasan |
| G1.7 | `alpha` de render ignorado | **P2** | `GameLoop.ts:273`; `rendering/*` | Judder en 120 Hz |
| G1.8 | Sustrato de plataformas aún registrado (tilemap, coleccionables, `PlatformerArcadeGame`) | **P2** | `HitAndRunGame.ts:19,184-187`; `PlatformerArcadeGame.ts:82` | Peso muerto, confusión, riesgo de regresiones |
| G1.9 | Literales de tiempo en IA | **P0** | `hitRunStateMachines.ts:281` | No determinista ante `TimeScale`/hit-stop |

---

## 2. Pilar 2 — Controlador de jugador y física

### 2.1 Estado Actual Detectado

El jugador belt se compone de: `Transform`, `Velocity`, `Collider2D` (18,2 × 23,4 px con `size: 26`), `BeltMovement`, `BeltElevation`, `BeltInput`, `MeleeAttack`, `ComboMelee`, `HitRunWeapon`, `Health`, `Faction`, `Hurtbox` (`registerBeltPlayerBlueprint.ts:56-121`). **No hay** `PlatformerGravity`, `PlatformerJumper`, `PlatformerGroundState`, `Crouch`, `Vehicle` ni `Ammo`.

**Movimiento horizontal y profundidad** (`BeltMovementSystem.ts:70-97`): aceleración `900`, deceleración `1100`, `maxSpeedX 160`, `maxSpeedY 110`, banda de profundidad `280–520` (`BeltMovementConfig.ts:27-36`). La velocidad se acerca al objetivo con `moveTowards` (rampa lineal, no exponencial), y el clamp de profundidad se aplica sobre `transform.y` antes de la integración.

**Salto** (`BeltMovementSystem.ts:109-123`): no es un salto, es un **hop**. `hopImpulse: -220` se normaliza con `Math.abs(...)` y se inyecta como `elevation.vz = 220`; `BeltElevationSystem.ts:35-61` integra con `hopGravity: 980`.

Cálculo del arco real:

```
h_apice = v² / (2g) = 220² / (2·980) ≈ 24,7 px
t_vuelo = 2v / g      = 440 / 980      ≈ 0,449 s
```

El jugador mide 26 px de alto: **el salto no llega a un cuerpo**. En *Metal Slug* el salto supera 2,5–3 cuerpos y es la herramienta central de esquiva y reposicionamiento. Además `hopMaxAirSeconds: 0.45` (`BeltMovementConfig.ts:34`) está calibrado al milímetro contra el vuelo natural (0,449 s): cualquier cambio de `hopGravity` rompe la coherencia sin aviso.

**Apuntado.** `resolveHitRunAim` (`input/resolveHitRunAim.ts:18-55`) implementa 8 direcciones con `snapTo8WayAsymmetric`, pero:
- `mutateBeltInputState.ts` **no escribe** `aimX/aimY` (solo move/attack/fire/jump/special).
- `pushTouch` fuerza `axisY: 0` (`app/hitandrun/index.tsx:241`) y lee `inp.moveDir`, campo que no existe en `BeltInputComponent` (`belt/BeltMovementTypes.ts:17-30`).
- El teclado fija `aimUp/aimDown: false` (`:190-191`) y reserva ↑/↓ para profundidad.

Resultado: `HitRunWeaponSystem.ts:65-70` recibe `dirY` siempre 0 y cae al fallback de facing. **El juego es estrictamente horizontal**.

**Estados.** No hay máquina de estados de jugador (idle/run/jump/fall/crouch/hurt/dead). El estado se infiere de flags dispersos (`isHopping`, `hitstunRemaining`, `BeltElevation.grounded`, `ComboMelee.activeStep`). Esto impide animación coherente y transiciones limpias.

**Colisión y resolución.** AABB + SAT, sin sweep; el jugador puede solaparse con enemigos (no hay empuje entre cuerpos). El knockback escribe `Velocity.vx` y `BeltElevation.vz` (`HitRunHurtSystem.ts:160-170`), sin fricción ni recuperación de control hasta que expira el hitstun.

**I-frames.** Solo el jugador los recibe (`HitRunHurtSystem.ts:103-110`), con blink (`:233-245`). Los enemigos no tienen i-frames ni hurt-flash consistente.

### 2.2 Estándar Objetivo (Metal Slug Benchmark)

- **Salto parabólico con altura 2,5–3× el cuerpo**, control aéreo, altura variable (soltar el botón corta el impulso), aterrizaje con recuperación corta (~3 frames).
- **8-way aim real**: arriba, arriba-diagonal, horizontal, abajo-diagonal, abajo; el disparo horizontal cambia a diagonal si se mantiene ↑/↓.
- **Crouch/prone**: reduce hurtbox ~40 %, permite disparar a ras de suelo y esquivar fuego alto; transición con frames de entrada/salida.
- **Melee dedicado** (cuchillo) independiente del arma equipada, con cancelación.
- **Empuje entre cuerpos** y separación suave para evitar apilamiento de enemigos.
- **Estado explícito** (FSM de jugador) que gobierna animación, hitbox, hurtbox y cancelaciones.

### 2.3 Brecha Identificada (The Gap)

| ID | Brecha | Severidad | Evidencia | Impacto |
|---|---|---|---|---|
| G2.1 | Hop de 24,7 px (≈ 0,95 cuerpos) vs. 2,5–3 cuerpos del benchmark | **P2 (diseño) / P1 si se vuelve a run-and-gun** | `BeltMovementConfig.ts:32-34`; `BeltElevationSystem.ts:36-37` | No sirve para esquivar patrones ni para verticalidad |
| G2.2 | Sin altura de salto variable ni control aéreo | **P2** | `BeltMovementSystem.ts:109-123` | Salto "de una sola pieza", sensación rígida |
| G2.3 | Sin crouch/prone ni hurtbox alternativa | **P2** | `registerBeltPlayerBlueprint.ts:59-65` (collider único) | No hay esquiva baja; el benchmark la usa constantemente |
| G2.4 | 8-way aim inalcanzable | **P0** | §2.1; `app/hitandrun/index.tsx:190-191,241` | Toda la verticalidad de combate desaparece |
| G2.5 | Sin FSM de jugador | **P1** | flags dispersos; `ComboMelee.activeStep` | Animación/estado inconsistentes, bugs de cancelación |
| G2.6 | Sin separación/empuje entre cuerpos | **P2** | `CollisionSystem2D` no resuelve penetración de triggers/AABB dinámicos | Enemigos se apilan y ocultan al jugador |
| G2.7 | Enemigos sin i-frames ni hurt-flash | **P2** | `HitRunHurtSystem.ts:124-138` | Feedback de impacto débil; ambigüedad de "¿le di?" |
| G2.8 | `hopMaxAirSeconds` acoplado al cálculo físico | **P3** | `BeltMovementConfig.ts:34` | Deuda de tuning frágil |

---

## 3. Pilar 3 — Armas, munición y vehículos

### 3.1 Estado Actual Detectado

**Catálogo data-driven** (`weapons/HitRunWeaponCatalog.ts`): `hmg`, `shotgun`, `rocket`, `longbow`, `rune_scatter`, `fire_staff`, `crossbow`, con `cooldownDuration`, `pelletCount`, `spreadRadians`, `damage`, `explosive`, `explosionRadius`, `recoilImpulse`.

**Lo que no existe en el tipo**: `ammoMax`, `ammoCurrent`, `pickupWeight`, `expirySeconds`, `fallbackWeaponId`. El estado por entidad es solo `{ weaponId, cooldownRemaining, muzzleFlashRemaining? }` (`registerBeltPlayerBlueprint.ts:117-121`). **No hay munición, no hay pickups, no hay retorno a pistola, no hay pérdida de arma al morir.**

**Disparo** (`HitRunWeaponSystem.ts:54-92`): lee `BeltInput`/`PlatformerInput`/`Aim`, calcula dirección (siempre horizontal por G2.4), llama `fireWeapon`, aplica recoil, fija cooldown y muzzle flash. No decrementa nada porque no hay nada que decrementar.

**Balas del jugador**: pool real (`HitRunBulletPool.ts`), `Damage` inyectado por `extraComponents` con `friendlyFire: false` (`:23-34`), `BeltElevation` a `z = 16` fijo (`:78-84`). Consecuencia: **todos los proyectiles vuelan a altura de pecho**; no hay balas rasantes ni arcos.

**Explosivos**: `HitRunExplosionSystem` convierte `combat:hit` con `category === "explosive"` en `CombatExplosionPayload`, y resuelve AoE radial 2D sobre `Health` + `Transform` (`:112-196`). Tres defectos:
1. Filtro de facción roto (`:131-134`) → autodaño.
2. Doble resolución (`:101-105` + flush en `Schedule.ts:222`).
3. **Radio puramente 2D**: ignora `BeltElevation.z` y la profundidad, así que un cohete a `z=16` golpea a un enemigo a `z=0` en el mismo `(x,y)`.

**Balas enemigas**: `enemyShoot.ts` calcula dirección normalizada hacia el jugador y crea/recicla un proyectil con `Faction: "enemy"`, `Collider2D` trigger y `TTL`, pero **sin `Damage`** (`:106-165`).

**Vehículos**: no hay rastro. `grep -rn "Vehicle|Mount|Slug"` sobre `src/games/hitandrun` devuelve cero.

### 3.2 Estándar Objetivo (Metal Slug Benchmark)

- **Arma base infinita** (pistola) + **armas temporales con munición contada** (HMG ~200, Shotgun ~30, Rocket ~30, Flame, Laser, Enemy Chaser), mostrada en HUD.
- Al agotar munición o al morir, **degradación automática a pistola**. El arma temporal es un recurso de tempo, no una mejora permanente.
- **Granadas** como arma secundaria infinita/limitada, con **arco parabólico**, rebote y daño AoE — el jugador debe calcular el arco.
- **Hitbox de proyectil ≠ hurtbox de personaje**; balas rasantes, diagonales y aéreas coexisten.
- **Vehículos *Slug***: montaje/desmontaje, **barra de vida propia**, vulcan + cañón, eyección al destruirse con i-frames de salida, y penalización por perderlo.
- **Munición como drop de POW** y de cajas destructibles.

### 3.3 Brecha Identificada (The Gap)

| ID | Brecha | Severidad | Evidencia | Impacto |
|---|---|---|---|---|
| G3.1 | Sin munición ni economía de armas | **P2 (producto)** | `HitRunWeaponTypes.ts`/`HitRunWeaponCatalog.ts` sin campos de ammo | El arma es una elección permanente, no un recurso; desaparece la tensión del benchmark |
| G3.2 | Sin pickups ni retorno a pistola | **P2** | inexistente (`git show d7f7038a` sí tenía `spawnWeaponPickup.ts`) | No hay bucle de recompensa/pérdida |
| G3.3 | Sin granadas ni arcos parabólicos | **P2** | `HitRunBulletPool.ts:78-84` fija `vz: 0` | Todo el combate es lineal y horizontal |
| G3.4 | Sin vehículos | **P2** | inexistente | Falta el pilar más icónico del benchmark |
| G3.5 | Balas enemigas sin `Damage` | **P0** | `enemyShoot.ts:106-165` | Fuego enemigo inofensivo |
| G3.6 | Sin pool enemigo | **P0/P1** | `enemyShoot.ts:41-64` | GC + bug |
| G3.7 | AoE autolesiva | **P0** | `HitRunExplosionSystem.ts:131-134` | Explosivos castigan al jugador |
| G3.8 | AoE duplicada | **P0** | `HitRunExplosionSystem.ts:101-105` | 2× daño, muertes duplicadas |
| G3.9 | AoE ignorando `z`/profundidad | **P1** | `:141-145` usa solo `worldX/worldY` | Explosiones "atraviesan" la verticalidad del belt |
| G3.10 | Sin CCD en proyectiles | **P1** | `CCDSystem` no registrado | Ver cálculo abajo |
| G3.11 | Todos los proyectiles a `z = 16` | **P2** | `HitRunBulletPool.ts:78` | Sin disparo rasante/aéreo |

**Cálculo de tunneling (G3.10).** A `1/60 s`:

```
hmg:     560 px/s → 9,33 px/tick
longbow: 480 px/s → 8,00 px/tick
enemy:   260 px/s → 4,33 px/tick
enemigo AABB por defecto: 12 × 12 px (HitRunEnemyPool.ts:63-68)
```

Un proyectil de 9,33 px/tick contra un objetivo de 12 px de ancho deja un margen de 2,67 px: si el muestreo cae en el borde, el par se detecta; si el proyectil "salta" el intervalo, no. Con armas rápidas, `TimeScale < 1` o hurtboxes pequeñas (jefes, POWs), el túnel es probable. El benchmark resuelve esto con sweep/raycast por frame.

---

## 4. Pilar 4 — IA, FSM y flujo de nivel

### 4.1 Estado Actual Detectado

**FSM por arquetipo** (`ai/hitRunStateMachines.ts`): `hr_walk`, `hr_flank`, `hr_hop`, `hr_charge`. Estados típicos: `Idle/Patrol → Alert/Anticipation → Attack → Recovery → Patrol`. Hay telegrafiado (`telegraphedAttackHelpers.ts`), flanqueo (`flankingHelpers.ts`) y sensor de jugador (`PlayerSensor`).

**Problemas estructurales:**
- `hr_walk` resta `0.016` fijo al cooldown (`:279-282`).
- `hr_hop` usa `Velocity.vy` y `PlatformerGroundState` (`:421-435`), incompatibles con belt.
- **No hay estado `Death`**: al morir se añade el componente `Dead` (`HitRunCombatSystem.ts:136`, `HitRunMeleeSystem.ts:395`, `ComboMeleeSystem.ts:189`) y `HitRunDeadCleanupSystem` elimina la entidad (`systems/HitRunCombatBootstrap.ts:18-50`). Sin animación de muerte, sin `score popup`, sin cuerpo que cae.
- Los enemigos solo se mueven en X (`applyPatrolVelocity`); **nunca cambian de profundidad**, así que la banda 280–520 es decorativa para la IA.

**Oleadas y cámara.** `HitRunWaveSystem` + `BeltCameraSystem`:
```ts
// BeltCameraSystem.ts:102-104
state.sectionCleared = state.hadEnemiesThisSection && aliveInSection === 0 && !spawning;
state.gateLocked = !state.sectionCleared;
```
La cámara se bloquea hasta limpiar la sección (`:123-145`) y avanza al cruzar `gateX - 40` (`:150-165`). Es un **equivalente funcional** al screen-lock del benchmark, pero acoplado a `isHittableEnemy`, que filtra por `Render.size >= 5` (`:35-42`) — un heurístico frágil que puede dejar la cámara bloqueada si un enemigo nace con `size` pequeño o pierde el collider.

**POWs**: inexistentes (el commit `d7f7038a` los tenía: `pow/HitRunPowSystem.ts` +74, `pow/registerPowBlueprint.ts` +44).
**Objetos destructibles**: no hay sistema dedicado; el tilemap de plataformas sigue registrado pero no interactúa con el combate belt.
**Puntuación**: `HitAndRunGame.getGameState` (`:290-295`) calcula score a partir de coleccionables de plataformas (`collectedTemporalIds * 10 + collectedPermanentIds * 100`), **no de kills**. No hay `Score` por enemigo, combo ni POW.

### 4.2 Estándar Objetivo (Metal Slug Benchmark)

- **FSM con `Death` explícito**: animación de muerte, `score popup`, sonido, y opcionalmente `corpse` persistente. La muerte es un estado, no un `delete`.
- **Aparición multicanal**: puertas, helicópteros, emboscadas laterales, enemigos que **entran desde el fondo** (profundidad) y desde arriba. La verticalidad y la profundidad se usan.
- **Screen lock real**: la cámara se detiene, se muestra indicador de peligro, y se libera al limpiar **la oleada exacta**, no al contar `Health` globales.
- **POWs**: interactuables, con recompensa (score, arma, 1UP), y **riesgo**: si muere un POW, penalización.
- **Objetos destructibles** con loot y con valor táctico (cobertura).
- **Score por kill** con multiplicadores y popups.

### 4.3 Brecha Identificada (The Gap)

| ID | Brecha | Severidad | Evidencia | Impacto |
|---|---|---|---|---|
| G4.1 | Sin estado `Death` (borrado directo) | **P1** | `HitRunCombatBootstrap.ts:18-50` | Sin feedback de muerte; el benchmark vive de eso |
| G4.2 | Enemigos solo se mueven en X (profundidad ignorada) | **P1** | `hitRunStateMachines.ts:101-110` (`applyPatrolVelocity`) | La banda de profundidad no aporta juego; IA plana |
| G4.3 | `hr_hop` incompatible con belt | **P0** | `hitRunStateMachines.ts:421-435` | Enemigo saltador roto |
| G4.4 | Cooldown con `0.016` hardcodeado | **P0** | `hitRunStateMachines.ts:281` | No determinista |
| G4.5 | Sin POWs | **P2** | inexistente; `git show d7f7038a` | Falta el bucle de rescate/recompensa |
| G4.6 | Sin destructibles | **P2** | sin sistema; tilemap residual | Nivel estático, sin táctica |
| G4.7 | Score no ligado a kills | **P1** | `HitAndRunGame.ts:290-295` | El HUD mide coleccionables de otro género |
| G4.8 | Gate dependiente de heurística `Render.size` | **P1** | `BeltCameraSystem.ts:35-42` | Riesgo de cámara bloqueada permanentemente |
| G4.9 | Sin indicador de pantalla bloqueada / dirección de amenaza | **P2** | inexistente | El jugador no entiende por qué no avanza |

---

## 5. Pilar 5 — Juice, render y feedback

### 5.1 Estado Actual Detectado

**Render procedural**: `rendering/HitRunCanvasVisuals.ts` dibuja personajes, muzzle flash, sombras y squash de aterrizaje; `HitRunBackdropCanvas.ts` genera cielo/terreno/agua con partículas ambientales de fondo (no gameplay).

**Partículas de gameplay**: **no hay**. `ParticleSystem` existe en core (`packages/core/src/systems/ParticleSystem.ts:40`) y se registra en otros juegos (`AsteroidsGame.ts:240`, `ArkanoidGame.ts:265`, `CentipedeGame.ts:124`), pero **Hit&Run nunca lo registra**: `registerPresentationSystems` solo añade `JuiceSystem` y `ScreenShakeSystem` (`src/games/shared/componentBuilders.ts:344-348`). No hay impactos, chispas, casquillos, humo ni explosiones dibujadas como partículas.

**Screen shake**: doble canal y ninguno autoritativo. `HitRunWeaponSystem.ts:94-129` escribe el resource `"HitRunScreenShake"` **y** el componente core `ScreenShake` en la cámara; `HitRunFeedbackSystem.ts:101-128` también escribe el resource. El render lee uno u otro según el drawer — riesgo de doble sacudida o de ninguna.

**Hit-stop**: resource `"HitStopRemaining"` + guardas manuales (`isSimulationFrozen`) en algunos sistemas. `BeltMovementSystem` y `CollisionSystem2D` **no** lo consultan: durante el hit-stop el jugador sigue deslizando y las colisiones siguen resolviendo.

**Flash de impacto**: `Render.hitFlashFrames` (6 frames en jugador, `HitRunHurtSystem.ts:119`) y `opacity` para el blink de invulnerabilidad. No hay flash de impacto en enemigos (G2.7).

**Parallax**: el backdrop es procedural con capas y `alpha` (`HitRunBackdropCanvas.ts:497-518`), pero no hay capas de gameplay (props, vallas, multitud) con parallax propio ni *depth sorting* explícito más allá de `depthSort: true` en `Render`.

**HUD**: `HitRunHudCanvas.ts` dibuja vida, oleada y enemigos vivos; no muestra arma/munición (no existe el dato).

### 5.2 Estándar Objetivo (Metal Slug Benchmark)

- **Impacto legible en 3 capas**: flash de sprite (1–2 frames) + partícula de chispa/sangre + micro-shake. Sin las tres, el disparo "no se siente".
- **Explosiones multi-fase**: flash → bola de fuego → humo → escombros, con `screen shake` decreciente y `hit-stop` de 2–4 frames.
- **Muzzle flash** direccional, casquillos y humo de cañón en armas automáticas.
- **Hit-stop global** (todos los sistemas) de 30–80 ms en impactos fuertes y 120–200 ms en muertes.
- **Parallax de 3–5 capas** con velocidades relativas y elementos de gameplay en primer plano.
- **Score popups** y contadores flotantes.
- **Slow-motion** breve en muerte de jefe / último enemigo de sección.

### 5.3 Brecha Identificada (The Gap)

| ID | Brecha | Severidad | Evidencia | Impacto |
|---|---|---|---|---|
| G5.1 | Sin partículas de gameplay | **P1** | `ParticleSystem` no registrado en Hit&Run (`componentBuilders.ts:344-348`) | Impactos y explosiones "secos"; el juego se siente prototipo |
| G5.2 | Sin explosión visual multi-fase | **P1** | `HitRunExplosionSystem` solo emite SFX (`:193-195`) | El cohete hace daño invisible |
| G5.3 | Screen shake con doble fuente | **P1** | `HitRunWeaponSystem.ts:94-129` vs `HitRunFeedbackSystem.ts:101-128` | Sacudida inconsistente o acumulada |
| G5.4 | Hit-stop no global | **P1** | §5.1; `BeltMovementSystem.ts` sin guarda | El mundo "sigue" durante el freeze → incoherencia |
| G5.5 | Sin flash de impacto en enemigos | **P2** | `HitRunHurtSystem.ts:124-138` | Falta confirmación de acierto |
| G5.6 | Sin parallax de gameplay ni props | **P2** | `HitRunBackdropCanvas.ts` (solo fondo) | Escenario plano, poca profundidad percibida |
| G5.7 | Sin score popups ni HUD de arma | **P2** | `HitRunHudCanvas.ts`; no hay dato de ammo | Recompensa ilegible |
| G5.8 | Sin slow-mo en hitos | **P3** | `TimeScale` solo en muerte del jugador (`HitRunDeathFlowSystem.ts:48`) | Clímax sin énfasis |

---

## 6. Plan de Acción Priorizado

> Convención de esfuerzo: **S** ≤ 1 día · **M** 2–5 días · **L** 1–3 semanas.
> Regla de oro: **no añadir features (P2) hasta cerrar P0 y P1**; hoy el juego tiene bugs que invalidan cualquier tuning.

### 6.1 Prioridad ALTA — Correctitud y determinismo (bloqueante)

| # | Acción | Archivos | Criterio de aceptación | Esf. |
|---|---|---|---|---|
| A1 | Añadir componente `Damage` (con `amount`, `category`, `consumption`, `sourceEntity`, `friendlyFire: false`) al fallback de bala enemiga | `ai/enemyShoot.ts:106-165` | Un enemigo a 200 px del jugador baja HP en 1 tick; test de integración que lo pruebe | S |
| A2 | Registrar un `EnemyBulletPool` real (extender `ProjectilePool`, resource `"EnemyBulletPool"`, 128 iniciales) | `weapons/` + `registerHitRunWeapons.ts` | `world.getResource("EnemyBulletPool")` existe; 0 `createEntity` por disparo (contador en test) | M |
| A3 | Corregir filtro de facción en AoE (`value ?? faction`) y extraer helper `isFriendly` compartido con `CombatSystem` | `HitRunExplosionSystem.ts:131-134`; crear `combat/faction.ts` | Cohete del jugador a 0 px del jugador → HP intacta; enemigo a 10 px → daño | S |
| A4 | Eliminar la doble resolución: elegir **una** vía (deferred **o** cola local), nunca ambas | `HitRunExplosionSystem.ts:101-105` | Test: 1 explosión ⇒ exactamente 1 `combat:hit` por objetivo | S |
| A5 | Reemplazar `0.016` por `deltaTime` en `hr_walk.Patrol` | `hitRunStateMachines.ts:279-282` | Cooldown idéntico con `dt = 1/60`, `1/30`, `1/120` | S |
| A6 | Migrar `hr_hop` a `BeltElevation.vz` + `grounded` (o retirar el arquetipo si no se usa) | `hitRunStateMachines.ts:400-438` | El hopper describe arco en Z y vuelve a `Recovery` al tocar `z = 0` | S |
| A7 | Cablear 8-way aim de extremo a extremo: añadir `aimX/aimY` a `BeltInputComponent`, mapearlos en `mutateBeltInputState`, exponer ↑/↓ de apuntado y `axisY` táctil | `belt/BeltMovementTypes.ts:17-30`; `belt/mutateBeltInputState.ts`; `app/hitandrun/index.tsx:187-193,234-242` | Mantener ↑+disparo ⇒ proyectil a −45°; test unitario de `BeltInput → fireWeapon` | M |
| A8 | Unificar hit-stop en `GameplayFreeze` (o `TimeScale = 0`) y eliminar `HitStopRemaining` | `systems/HitRunFeedbackSystem.ts`; `ecs/Schedule.ts:170-180` | Durante el freeze, `Transform.x` del jugador no cambia; un único resource | M |
| A9 | Registrar `CCDSystem` antes de `CollisionSystem2D` | `belt/registerBeltSystems.ts` o `HitRunGame.ts` | Test de túnel: bala a 900 px/s contra AABB de 8 px ⇒ impacto garantizado | S |
| A10 | Instrumentar contadores de asignación por tick (balas, enemigos, eventos) en debug overlay | `rendering/HitRunDebugOverlay.ts` | El overlay muestra `allocs/tick`; baseline documentado | S |

### 6.2 Prioridad MEDIA — Arquitectura, pooling y calidad de simulación

| # | Acción | Archivos | Criterio de aceptación | Esf. |
|---|---|---|---|---|
| M1 | Convertir `HitRunEnemyPool` en pool real (free-list, `resetEntity`, reciclaje en `Dead`) | `waves/HitRunEnemyPool.ts` | 200 spawns ⇒ ≤ N entidades vivas; sin `createEntity` tras warm-up | M |
| M2 | Sacar `pendingExplosions`, `pendingHits` y `scratchTargets` del estado de instancia a recursos/componentes del `World` | `HitRunExplosionSystem.ts`, `CombatHitListenerSystem.ts` | Snapshot → mutate → rollback ⇒ mismo hash FNV-1a | M |
| M3 | Mover la inyección de input a un `InputFrame` por tick (cola en `World`, consumida en `SystemPhase.Input`) | `app/hitandrun/index.tsx`, `belt/BeltInputSystem.ts` | Grabar 300 ticks y reproducir ⇒ hash idéntico | M |
| M4 | Añadir estado `Death` a la FSM de enemigos (animación, score popup, `combat:death` único) antes del cleanup | `ai/hitRunStateMachines.ts`, `systems/HitRunCombatBootstrap.ts` | `Dead` no elimina hasta `deathTimer <= 0`; el cadáver se ve 300 ms | M |
| M5 | Añadir separación suave jugador↔enemigo y enemigo↔enemigo (resolución de penetración) | `physics`/nuevo `BeltSeparationSystem` | Dos enemigos en el mismo `(x,y)` se separan en ≤ 10 ticks | M |
| M6 | Unificar screen shake en **una** fuente (`ScreenShake` en cámara) y eliminar `HitRunScreenShake` | `HitRunWeaponSystem.ts`, `HitRunFeedbackSystem.ts` | Un solo `ScreenShake` por impacto; sin acumulación doble | S |
| M7 | Registrar `ParticleSystem` + emisores de impacto/muzzle/explosión | `HitRunGame.ts`, nuevo `rendering/particles/` | Impacto ⇒ ≥ 6 partículas; explosión ⇒ ≥ 24 + humo | M |
| M8 | Arreglar el gate de cámara: contar por `BeltSectionEnemy` + `Enemy`, no por `Render.size` | `BeltCameraSystem.ts:35-42,91-104` | Un enemigo sin `Render` sigue bloqueando; se libera al morir | S |
| M9 | Ligar score a kills (evento `combat:death` → `Score` resource) y mostrarlo en HUD | `HitRunGame.ts:290-295`, `rendering/HitRunHudCanvas.ts` | Matar 10 enemigos ⇒ +score esperado; HUD lo refleja | S |
| M10 | Interpolar render con `alpha` (`prevTransform` → `currTransform`) | `rendering/*`, `BaseGame` | En 120 Hz no hay judder visual; test de snapshot de frame | M |
| M11 | Retirar el sustrato de plataformas de Hit&Run (tilemap, coleccionables, `PlatformerArcadeGame`) | `HitAndRunGame.ts:19,184-187` | `grep Platformer` en hitandrun ⇒ solo lo estrictamente compartido | M |

### 6.3 Prioridad BAJA — Features del benchmark y polish

> Estas acciones **solo tienen sentido si se decide volver al género run-and-gun**. Si el belt-scroll es la dirección definitiva, deben reemplazarse por su equivalente belt (p. ej. "hop" → "dash/roll", "Slug" → "montura/invocación").

| # | Acción | Archivos | Criterio de aceptación | Esf. |
|---|---|---|---|---|
| B1 | Economía de munición: `ammoMax/ammoCurrent` en el catálogo, decremento por disparo, retorno a `longbow` al agotar | `weapons/HitRunWeaponTypes.ts`, `HitRunWeaponCatalog.ts`, `HitRunWeaponSystem.ts` | HMG dispara 200 y vuelve a longbow; HUD muestra `87/200` | M |
| B2 | Pickups de arma con TTL y drop de enemigo/POW | nuevo `weapons/spawnWeaponPickup.ts` (recuperar de `d7f7038a`) | Recoger pickup cambia `weaponId` y munición | M |
| B3 | Granadas parabólicas (secundario, `vz` + gravedad + rebote) | `weapons/fireWeapon.ts`, `HitRunBulletPool.ts` | La granada describe arco y explota al tocar `z=0` | M |
| B4 | POWs rescatables con recompensa (score + arma) y penalización si mueren | recuperar `pow/HitRunPowSystem.ts` de `d7f7038a` | Rescatar ⇒ +score +drop; POW muerto ⇒ −score | M |
| B5 | Vehículo montable con HP propio, eyección e i-frames | nuevo `vehicles/` | Montar ⇒ hurtbox del jugador desactivada; destruir ⇒ eyección con 1 s de i-frames | L |
| B6 | Crouch/prone con hurtbox alternativa y disparo rasante | `belt/`, `registerBeltPlayerBlueprint.ts` | Crouch reduce hurtbox 40 % y habilita `z=8` | M |
| B7 | Salto con altura variable y control aéreo (si se recupera plataformas) | `BeltElevationSystem.ts` | Soltar salto ⇒ ápice ~50 %; mantener ⇒ 100 % | S |
| B8 | Parallax de gameplay (props, vallas, multitud) + depth sorting fino | `rendering/` | ≥ 3 capas con velocidades distintas y oclusión correcta | M |
| B9 | Score popups flotantes y slow-mo en cierre de sección | `rendering/`, `HitRunDeathFlowSystem.ts` | Popup en cada kill; `TimeScale 0.35` durante 400 ms al limpiar sección | S |
| B10 | Emisores de casquillos y humo de cañón para armas automáticas | `rendering/particles/` | HMG deja rastro visual continuo | S |

### 6.4 Secuencia recomendada (3 iteraciones)

```
Iteración 1 (semana 1)  → A1..A10  : el juego deja de estar roto y pasa a ser determinista.
Iteración 2 (semana 2-3) → M1..M11   : pooling, muerte con estado, partículas, cámara y HUD.
Iteración 3 (semana 4+)  → B1..B10   : decisiones de género (¿ammo/Slug/POW o equivalentes belt?).
```

**Puerta de calidad entre iteraciones:** `pnpm test`, `pnpm run check:duplication`, y un test de determinismo que ejecute 600 ticks con el mismo seed + input y compare el hash FNV-1a del snapshot.

---

## 7. Anexos

### 7.1 Mapa de sistemas registrados en Hit&Run

| Fase | Sistemas | Fuente |
|---|---|---|
| Input | `BeltInputSystem` | `registerBeltSystems.ts:61-64` |
| Simulation (−10) | `PhysicsIntegrateSystem` | `registerBeltPlayerBlueprint.ts:151-158` |
| Simulation | `BeltMovementSystem` (10), `BeltElevationSystem` (15), `BeltCameraSystem` (80), `BeltDepthScaleSystem` (85) | `registerBeltSystems.ts:66-84` |
| Transform | `HierarchySystem` | `registerBeltPlayerBlueprint.ts:159-162` |
| GameRules | `HitRunCombatSystem`, `HitRunExplosionSystem`, `HitRunHurtSystem`, `HitRunMeleeSystem`, `ComboMeleeSystem` | `HitAndRunGame.ts:190-194` |
| Presentation | `JuiceSystem`, `ScreenShakeSystem` | `componentBuilders.ts:344-348` |
| **Ausentes** | `ParticleSystem`, `CCDSystem` | — |

### 7.2 Checklist de determinismo (estado actual)

| Requisito | Estado | Nota |
|---|---|---|
| Fixed timestep 1/60 | ✅ | `GameLoop.ts:117` |
| RNG de gameplay aislado | ✅ | `world.gameplayRandom` |
| Snapshots + hash | ✅ | `BaseGame` + FNV-1a |
| Input por tick | ❌ | Inyectado desde React (§G1.2) |
| Estado de sistemas rewindable | ❌ | Colas en instancia (§G1.1) |
| Sin literales de tiempo | ❌ | `hitRunStateMachines.ts:281` |
| Hit-stop vía `GameplayFreeze` | ❌ | Resource ad-hoc (§G1.6) |

### 7.3 Evidencia Git

```text
d7f7038a feat(hitandrun): convert Hit&Run to Metal Slug style run-and-gun
  + src/games/hitandrun/systems/HitRunPlayerControllerSystem.ts   (+236)
  + src/games/hitandrun/pow/HitRunPowSystem.ts                    (+74)
  + src/games/hitandrun/pow/registerPowBlueprint.ts               (+44)
  + src/games/hitandrun/weapons/spawnWeaponPickup.ts              (+44)
  − src/games/hitandrun/belt/**                                   (−~700)
```

Estado actual: `belt/**` presente; `pow/`, `spawnWeaponPickup.ts` y `HitRunPlayerControllerSystem.ts` ausentes. **La conversión a Metal Slug fue revertida por la migración a belt-scroll**, no completada.

### 7.4 Nota metodológica

Este documento es de solo lectura. No se modificó ningún archivo del juego; el único artefacto generado es este informe. Las referencias de línea corresponden al árbol de trabajo en la fecha indicada y deben re-verificarse tras cualquier refactor.
