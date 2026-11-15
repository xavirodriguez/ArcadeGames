# Asteroids Gameplay Ledger

**Alcance:** spawn seguro, hyperspace, tiers y UFO.
**Regla:** una unidad por invocación. `done` requiere pruebas pertinentes y `pnpm run ci` realmente verificados en verde. Los checkpoints humanos se mantienen en `awaiting-review` hasta aprobación explícita.

| ID | Unidad | Estado | Dependencias | Archivos | Notas |
|---|---|---|---|---|---|
| U0 | Auditoría de arquitectura | awaiting-review | — | `server/src/AsteroidsRoom.ts`, `server/src/BaseRoom.ts`, `server/src/replication/*`, `src/games/asteroids/{AsteroidsGame,EntityFactory,AsteroidsMissions}.ts`, sistemas y tipos citados abajo | Informe de arquitectura completado. Checkpoint humano; no se ha modificado código de producción. |
| U1 | `findSafeSpawnPoint(world, opts)` | pending | U0 | nuevo helper Asteroids, config y tests | Distancia toroidal y K candidatos fijos; decidir almacenamiento/rollback del stream RNG antes de implementar. Checkpoint humano. |
| U2 | Adoptar helper en oleadas y respawn | pending | U1 | `EntityFactory.ts`, `AsteroidCollisionSystem.ts`, tests | Sustituir centro fijo/rejection sampling y documentar cambio del consumo RNG/replays. |
| U3 | Hyperspace seguro | pending | U1 | `AsteroidInputSystem.ts`, schema/config, HUD y tests | Destino fijo, cancel cooldown, invulnerabilidad, HUD y auditoría de replicación de preview. |
| U4 | Schema data-driven de tiers | pending | — | `AsteroidConfigSchema.ts`, `config/asteroids.json`, `EntityFactory.ts`, tests | Campos hp/fragmentImpulse/splitPattern y consumo de speedRange; regresión de defaults. Checkpoint humano. |
| U5 | Asteroides con HP>1 | pending | U4 | `EntityFactory.ts`, `AsteroidCollisionSystem.ts`, `CombatSystem` y tests | Tier blindado; daño parcial no debe fragmentar. |
| U6 | `UfoSystem`: spawn | pending | U0 | nuevo sistema, `AsteroidsGame.ts`, schema/config y tests | GameRules, un UFO máximo, RNG aislado, presión/jitter/level y cruce lateral con destroy. Checkpoint humano. |
| U7 | Contrato de muerte UFO y misiones | pending | U6 | `AsteroidRegistry.ts`, `AsteroidCollisionSystem.ts`, `AsteroidsMissions.ts`, tests | Evento tipado y petición de spawn atendida por UfoSystem. |
| U8 | Movimiento UFO | pending | U6 | UfoSystem y tests | Zigzag vertical periódico con RNG aislado. |
| U9 | Disparo UFO | pending | U8 | EntityFactory, UfoSystem, capas/colisiones, tests | Bala enemiga, target toroidal con desempate por entity id, pruebas multi-nave y telegraph accesible. |
| U10 | Fuera de alcance / futuras variantes | pending | — | este ledger | Registrar kamikaze, oleadas, transportador/loot, asteroides homing/explosivos como futuras variantes de config (`UfoVariant`). |

## Hallazgos de auditoría

### Autoridad, simulación y RNG

- `server/src/AsteroidsRoom.ts:26-37` declara `maxClients = 4` y mantiene un único `world`/ `gameSimulation` de sala. En `:54-100` construye `AsteroidsGame({ headless: true, isMultiplayer: true, gameOptions: { seed: this.state.seed }, schedule: serverSchedule })`. El servidor crea la simulación de la sala.
- `server/src/BaseRoom.ts:275-284` procesa inputs por tick, ejecuta `runSimulationStep`, sincroniza el mundo al schema y replica. Esto confirma que el servidor ejecuta la simulación autoritativa.
- Los clientes también simulan para predicción: `packages/core/src/network/NetworkController.ts:43-69` aplica inputs y ejecuta un paso local; `src/games/asteroids/AsteroidsGame.ts:137,351-368` crea el controlador y expone `predictLocalPlayer`/`runSimulationStep`. Por tanto, el modelo real es servidor autoritativo + predicción cliente, no servidor exclusivo.
- El servidor usa `state.seed` en `AsteroidsRoom.ts:82-99`; `BaseGame.ts:353-358` inicializa `world.gameplayRandom` desde `gameOptions.seed` o `config.seed`. En cliente, `useAsteroidsGame.ts:24-57` recibe un `seed?` opcional y se lo pasa a `useGame`; `src/app/asteroids/index.tsx:78-86` pasa `initialSeed`. No he encontrado evidencia suficiente en este flujo de que el seed elegido por la sala se entregue siempre al cliente antes de iniciar predicción. **Conclusión:** no afirmar que ambos RNG estén sincronizados en todas las sesiones; hay riesgo de divergencia predictiva hasta demostrar el handshake de seed.
- Core sí permite streams independientes: `packages/core/src/utils/RandomService.ts:15-35` expone constructor con seed explícita, `getSeed` y `setSeed`; `packages/core/src/index.ts` exporta RandomService. No existe en core un helper público equivalente a `deriveSeed` (la búsqueda lo encuentra en `src/games/shared/rendering/vfx-core.ts`, capa de presentación).
- Un `RandomService` independiente no queda automáticamente incluido en snapshots por ser un objeto de servicio. Core permite registrar recursos de datos planos para snapshots/rollback: `packages/core/src/ecs/World.ts:805-822`. La solución debe guardar el estado numérico del stream en un componente/recurso snapshot-registered o usar derivación stateless desde seed/tick/identidad. No guardar un objeto RNG opaco como recurso snapshot.

### Spawns existentes

- `spawnAsteroidWave` está definido en `src/games/asteroids/EntityFactory.ts:693-726`. Lo invoca `AsteroidsGame.ts:322` al iniciar la partida y `AsteroidGameStateSystem.ts:84,115` en transiciones de nivel.
- La oleada actual consume dos `rand.next()` por candidato inicial y un número variable adicional dentro de rejection sampling (`EntityFactory.ts:703-717`); mide distancia euclídea al centro (150 px), no a naves/rocas ni con topología toroidal. El spawn real de asteroide puede consumir tres llamadas más en el blueprint si no recibe velocidades (`EntityFactory.ts:250-270`, verificar antes de U1/U2).
- La sala no llama a `spawnAsteroidWave` en el inicio multiplayer: `AsteroidsRoom.ts:124-128` usa su método privado `spawnAsteroids(6)` (`:39-52`) que crea asteroides en posiciones aleatorias uniformes.
- `createUfo` solo aparece como wrapper exportado en `EntityFactory.ts:584-604`; la búsqueda de referencias no encontró callers productivos. El blueprint `ufo` se registra en `:344-389`, pero no hay un sistema de spawn autónomo auditado. El wrapper usa RNG global para velocidad si no se pasan `vx/vy`.

### Boundary, colisiones y multiplayer

- `BoundaryComponent.mode` admite exactamente `wrap | bounce | destroy`: `packages/core/src/ecs/CoreComponents.ts:135-136`; el comportamiento se ejecuta en `packages/core/src/physics/systems/BoundarySystem.ts`.
- Capas existentes: `PLAYER=0x0001`, `ENEMY=0x0002`, `PROJECTILE=0x0004`, `DEBRIS=0x0008`, `BOUNDARY=0x0010` en `packages/gameplay-kit/src/types/CollisionLayers.ts:1-7`. No hay una capa `ENEMY_PROJECTILE` dedicada.
- Ship: `EntityFactory.ts:129-130`, layer PLAYER, mask ENEMY. Bala actual: `:219-220`, layer PROJECTILE, mask ENEMY. Asteroide/UFO: `:81-82`, layer ENEMY, mask PLAYER | PROJECTILE. Por tanto, el filtro actual de bala de jugador contra nave no permite friendly-fire (la bala solo acepta ENEMY y la nave solo acepta ENEMY); no existe todavía contrato de bala enemiga.
- La sala ejecuta un mundo autoritativo y predicción cliente. El filtro de replicación puede ocultar entidades a clientes: `BinaryReplicationStrategy.ts:11-27` envía snapshot completo a cliente nuevo, pero aplica `filterSoASnapshot(snapshot, interestIds)` a clientes existentes. `InterestManagerSystem` crea `DetailedInterestMap` midiendo distancia euclídea a cada Transform (`packages/core/src/network/MultiplayerSystems.ts:413-455`), sin distancia toroidal ni una regla especial para previews.

### Hyperspace preview y misiones UFO

- `AsteroidInputSystem.ts:185-231` crea preview como entidad ECS mediante `reserveEntityId` y `CommandBuffer`, con Transform y Render; guarda coordenadas e ID en el componente Ship. El destino se elige con dos llamadas a `world.gameplayRandom.next()` en `:191-195`.
- La entidad sí forma parte del snapshot del mundo; no obstante, no se garantiza que permanezca replicada a todos los remotos. El modo binary envía todo solo en la primera actualización de cada cliente y luego filtra por interés (`BinaryReplicationStrategy.ts:13-27`); el preview está en destino aleatorio y el interés se calcula por distancia euclídea desde la nave (`MultiplayerSystems.ts:433-450`). **Conclusión:** el preview no es reliably visible a jugadores remotos; puede desaparecer del snapshot filtrado si está fuera de su AOI. El ID del preview almacenado en Ship tampoco basta si el preview queda fuera del filtro.
- `CombatDeathEvent` real contiene solo `entity`, `sourceEntity?`, `category?`: `packages/gameplay-kit/src/combat/types/CombatTypes.ts:19-23`. `CombatSystem.ts:148-159` emite exactamente esos campos, con `category: damageComp.category`; no emite `type`, `entityType`, `size` ni `isUfo`.
- La muerte UFO actual es una ruta separada: `AsteroidCollisionSystem.ts:220-239` retira bullet/UFO y emite `ufo:destroyed` con payload `{ entity: ufo }`; no usa el payload de `combat:death` en esa ruta.
- `AsteroidsEventRegistry` declara `combat:death` y `ufo:spawned`, pero no declara explícitamente `ufo:destroyed`: `src/games/asteroids/types/AsteroidRegistry.ts:47-56` (el tipo base permite keys abiertas). `doble_amenaza` en `AsteroidsMissions.ts:279-311` se suscribe a `asteroid:destroyed` y `combat:death`, no a `ufo:destroyed`, y comprueba `payload.type/entityType/category/isUfo`; ninguno existe en el payload tipado de CombatDeathEvent. Además, la ruta actual de muerte UFO emite otro evento. El requisito de la misión está roto por desacuerdo entre evento y payload.
- `AsteroidsConfigSchema.ts:6-14` define tiers con size/radius/score/splitsInto/splitCount/speedRange; `config/asteroids.json` real está en `src/games/asteroids/config/asteroids.json`, no en la raíz de `src/games/asteroids/`. El JSON actual no declara `ASTEROID_TIERS`; se aplica el default del schema.

## Deuda detectada

- Cerrar handshake de seed server→client y probar igualdad de estado/RNG en predicción; mientras tanto, toda nueva lógica debe correr de forma idéntica en servidor y cliente y ser corregible por snapshots autoritativos.
- Definir una estrategia rollback-safe para RNG de UfoSystem: seed derivada de forma determinista, estado numérico incluido en snapshot o muestreo stateless; no usar `Math.random` ni mantener un RNG mutable solo en una propiedad del sistema.
- El mapa de interés actual es euclídeo aunque el mundo de Asteroids es toroidal; la replicación del preview remoto requiere excepción de relevancia/parent-child o un evento visual dirigido a los clientes relevantes.
- `createUfo` no tiene caller productivo detectado; antes de U6 debe decidirse si se adopta como factory y cómo se asegura máximo un UFO.
- No existe `UfoSystem` auditado. Verificar `DifficultyDirectorSystem`/sistemas de spawn antes de crear otro director.
- La colisión actual de UFO se gestiona manualmente en AsteroidCollisionSystem; al introducir CombatSystem/UFO HP, evitar doble resolución y definir si UFO usa combat:death o evento de dominio.
- Misión `doble_amenaza` tiene contrato evento/payload inconsistente; normalizar productor, registro y suscripción juntos en U7.
- La configuración de tiers está en defaults Zod y no en el JSON de juego. El schema usa `speedRange`, pero la factoría de asteroides genera velocidad con `(next()-0.5)*100`; el campo no se consume en la ruta inspeccionada.
- La prueba de seguridad de spawn debe cubrir dimensiones toroidales y multi-nave; el helper debe tener K fijo para estabilizar consumo RNG.
- Fuera de alcance: UFO kamikaze, oleadas de UFOs, UFO transportador/loot, asteroides homing y explosivos. Considerar variantes declarativas futuras (`UfoVariant`).
- No se ha ejecutado `pnpm run ci` ni Jest en esta sesión. U0 es informe documental y queda a la espera de checkpoint humano; no declarar CI verde.
