# Cross-System Consolidation Audit — ArcadeGames

**Fecha de auditoría:** 2026-11-27  
**Repositorio:** xavirodriguez/ArcadeGames  
**Rama/base inspeccionada:** master  
**Commit base:** c6fb48c0a1127a7e47f07372e4ebcfed8dba8316  
**Alcance:** Fase 0, inspección exclusivamente de lectura.  
**Resultado:** hay una base de reutilización real y valiosa en locomoción, combate genérico, pools de proyectiles, Juice/VFX y backends gráficos. La deuda principal no es la ausencia de abstracciones: es la aplicación desigual de los contratos existentes, la convivencia de rutas de feedback y la falta de una política temporal común demostrada en todos los consumidores.

---

## 1. Resumen ejecutivo

### Diagnóstico

1. **La locomoción de Platformer y Echo Runner ya está compartida de verdad.** Ambos registran los mismos sistemas de locomoción de Core mediante el helper de gameplay-kit. Sus perfiles y acciones específicas difieren de forma legítima. No se recomienda reescribir esta parte; se recomienda protegerla con escenarios de integración comunes.

2. **La infraestructura básica de proyectiles también está compartida.** Core proporciona ProjectilePool y gameplay-kit proporciona createProjectilePoolConfig. Asteroids, Geometry Wars, Space Invaders, Vertical Shmup y Hit & Run consumen esta base. Persisten adaptadores locales y varias fugas de any; hay que consolidar contratos y reset, no crear un segundo pool.

3. **CombatSystem es compartido por varios juegos, pero Hit & Run mantiene su propio resolvedor de contactos y daño.** Su profundidad Z, guardia, armadura y consumo de ataques son particularidades válidas. La duplicación está en la parte común del ciclo de daño, salud, invulnerabilidad, Dead y emisión de combat:hit/combat:death, no en todo el sistema.

4. **La propiedad del tiempo está dividida.** Schedule evalúa simultáneamente TimeScale, GameplayFreeze e IsPaused. TimeScale se describe como sustituto de los otros dos, pero Schedule aún los consulta. Además, los dominios temporal y de presentación se mezclan mediante reglas especiales para TTLSystem, JuiceSystem y ParticleSystem.

5. **Hit-stop tiene una implementación canónica funcional, pero no todos los productores la utilizan.** HitStopSystem arbitra prioridad y cooldown y delega la duración efectiva a GameplayFreeze. Hit & Run y Space Invaders escriben GameplayFreeze directamente; el resultado evita que el contrato de prioridad sea uniforme.

6. **Hay llamadas de feedback redundantes verificadas.** Platformer tiene dos listeners que reproducen el mismo PlaySFX. Geometry Wars, Space Invaders y Asteroids combinan perfiles de catálogo Juice con llamadas directas al mismo canal de screen shake. Juice.shake fusiona por máximo intensidad/duración, de modo que no se deben describir como dos shakes visuales acumulados; sí son dos productores de la misma respuesta.

7. **Canvas y Skia tienen una interfaz de dibujo compartida en el código de juego.** IDrawAdapter y los registros de primitivas conservan nombres equivalentes. La evidencia consultada demuestra equivalencia de contrato/registro y tests puntuales de adapter; no demuestra paridad raster completa de todos los efectos.

8. **La animación tiene dos contratos paralelos.** AnimationSystem/Animator está marcado deprecated; SpriteAnimatorSystem/SpriteAnimator es la ruta moderna. Platformer y Asteroids siguen en la ruta antigua, Echo Runner usa la moderna, y Hit & Run registra ambas durante la migración.

9. **El audio tiene una abstracción de reproducción compartida, pero no una integración de sound design procedural en gameplay demostrada.** BaseGame enruta PlaySFX a IAudioPlayer; WebAudioPlayer y ExpoAudioPlayer implementan el contrato. La búsqueda de referencias a @tiny-aster/arcade-sound-kit no encontró consumidores de runtime en juegos; sí encontró la herramienta Sound Lab y documentación.

10. **Los ledgers son útiles pero tienen desfases.** VFX ledger deja Fase 0 abierta y documenta duplicaciones de Asteroids ya corregidas; Juice ledger conserva tareas basadas parcialmente en un HitRunScreenShake que ya no se escribe en el código actual. Esta auditoría utiliza como fuente la rama master indicada, no el estado histórico del ledger.

### Riesgos más importantes

- **P0 — consistencia funcional:** doble reproducción de SFX en Platformer; peticiones de hit-stop que evitan la política compartida; solicitudes de shake duplicadas para un mismo evento.
- **P0 — autoridad temporal:** coexistencia de TimeScale, GameplayFreeze e IsPaused sin una semántica única documentada y ejecutada.
- **P1 — contrato de combate:** Hit & Run tiene una implementación paralela del ciclo común de daño y un DTO de CombatHit solapado con el del gameplay-kit.
- **P1 — mantenibilidad:** API de animación legacy todavía activa; tipos any en APIs que se presentan como compartidas.
- **P2 — fiabilidad de presentación:** registro procedural duplicado en Flappy Bird; cobertura de Canvas/Skia basada en contrato y pruebas puntuales, no en paridad visual completa.

---

## 2. Método, alcance y límites

### Fuentes operativas leídas

- AGENTS.md: separación de Core, gameplay-kit, renderers y sound-kit; determinismo y estructura de los juegos.
- docs/agents/OPERATING_CONTRACT.md: inspección de productores y consumidores, contratos públicos, tests, serialización, rollback y ambos backends; reglas de no ocultar errores y de no declarar verificación no ejecutada.
- docs/agents/vfx-ledger.md.
- docs/agents/juice-consolidation-ledger.md.
- docs/agents/pixelfx-vfx-quality-ledger.md.
- docs/agents/asteroids-gameplay-ledger.md.
- docs/JUICE_SWORD_COMBAT_EVOLUTION_ROADMAP.md.

### Método

Se contrastaron declaraciones de responsabilidad con implementación, registros de sistemas, productores y consumidores, exports, contratos tipados y adaptadores Canvas/Skia. Se inspeccionaron directamente las rutas relevantes de Core, gameplay-kit, shared rendering y los cinco juegos requeridos.

### Límites de verificación

- No se modificó código, configuración ni tests.
- No se ejecutaron typecheck, Jest, E2E, CI ni golden tests en esta fase de inspección remota.
- Las duplicaciones marcadas como verificadas se apoyan en las rutas de código y el mismo canal/contrato de salida; no equivalen automáticamente a dos resultados visuales acumulados.
- Cuando solo hay similitud de propósito o una hipótesis sobre el comportamiento en runtime, se identifica como tal y no como duplicación probada.

### Convención de evidencia

- **Verificado:** comprobado en el código de la base indicada.
- **Parcial:** existe consumo compartido, pero también hay caminos locales o no migrados.
- **Hipótesis:** inferencia que necesita test de integración o inspección adicional.
- Los números de línea corresponden al commit base declarado; deben revalidarse antes de cada PR.

---

## 3. Matriz de responsabilidades actuales

| Subsistema | Responsabilidad efectiva observada | Productores / consumidores principales | Diagnóstico |
|---|---|---|---|
| Gameplay | Estado ECS, movimiento, colisiones, reglas, salud, daño, AI y lifecycle de proyectiles | Sistemas Core, gameplay-kit y sistemas de cada juego | La separación existe, pero la resolución de daño está parcialmente replicada en Hit & Run y algunas reglas se mezclan con feedback. |
| EventBus | Comunicación tipada por registry, emisión inmediata/diferida y puente de audio | BaseGame, sistemas de gameplay, Juice y listeners de juegos | El mecanismo es compartido; CoreEvents contiene algunos eventos de juego concretos y el evento de audio usa una clave genérica PlaySFX. |
| Juice | Resolver perfiles semánticos, solicitar hit-stop y shake, coordinar feedback de alto nivel | JuiceOrchestrator, JUICE_CATALOG, sistemas locales | Existe una fuente común, pero varios productores vuelven a escribir el mismo canal después de invocar el catálogo. |
| VFX | Primitivas, efectos procedurales, perfiles visuales, TTL/render progress y adapters | SharedVFX, PixelFxProceduralVFX, VFXEffectIR, renderer | Buena base compartida a nivel aplicación; el IR y el catálogo no equivalen todavía a una ruta única de eventos para todos los juegos. |
| Audio | Reproducción, manifest, presets, voice limits y adaptadores de plataforma | BaseGame, IAudioPlayer, WebAudioPlayer, ExpoAudioPlayer, SoundBank | Contrato de reproducción común; parte de los juegos llama directamente al player y no todos siguen una ruta semántica única. |
| Animation | Avance de clips y selección de estado visual | AnimationSystem, SpriteAnimatorSystem, sistemas locales de selección | Dos APIs/sistemas paralelos; el legacy está deprecated pero continúa en uso. |
| Scheduler / tiempo | Orden de fases, fixed-step, escala, pausa y congelación | GameLoop, Schedule, TimeScale, GameplayFreeze, IsPaused | No hay una única fuente de verdad para todos los estados de detención/escala. |
| Renderer | Dibujar primitivas y juegos mediante Canvas o Skia | renderer-canvas, renderer-skia, IDrawAdapter y registros de cada juego | Los paquetes de backend están separados; la capa SharedVFX adapta ambos. La paridad de registro no demuestra paridad raster total. |

### APIs y registros observados

- Core exports: packages/core/src/index.ts:74-87 y 110-183.
- EventBus y CoreEvents: packages/core/src/events/EventBus.ts:9-100, 174-205.
- Scheduler y fases: packages/core/src/ecs/Schedule.ts:146-250.
- Juice API: packages/core/src/utils/Juice.ts:37-179.
- JuiceSystem: packages/core/src/systems/JuiceSystem.ts:58-197.
- Shared VFX registration: src/games/shared/rendering/SharedVFX.ts:269-311.
- Shared Juice registration: src/games/shared/rendering/registerSharedJuiceSystems.ts:13-41.
- Canvas/Skia adapter: src/games/shared/rendering/DrawAdapter.ts:15-23, 43-131 y 138-286.
- Audio interface and shared presets: packages/core/src/audio/IAudioPlayer.ts; packages/core/src/audio/AudioEventMap.ts:8-99.
- Procedural sound toolkit: packages/arcade-sound-kit/README.md:6-74 y packages/arcade-sound-kit/package.json:1-53.

---

## 4. Diez duplicaciones o solapamientos prioritarios verificados

Se distinguen tres clases: **doble emisión/escritura** (dos rutas producen la misma respuesta), **política paralela** (dos sitios deciden el mismo fenómeno con reglas distintas) y **API paralela** (dos implementaciones mantienen la misma responsabilidad con contratos distintos). Esta distinción evita confundir dos temporizadores de conceptos distintos o dos efectos visualmente parecidos con duplicación funcional.

### D1 — Tres recursos participan en pausa/escala/freeze

**Clase:** política temporal paralela. **Prioridad:** P0.

- packages/core/src/ecs/Schedule.ts:155-186 lee TimeScale, GameplayFreeze e IsPaused y calcula isFrozen a partir de los tres.
- packages/core/src/runtime/TimeScale.ts:2-8 declara que TimeScale reemplaza IsPaused y GameplayFreeze; la implementación Schedule sigue soportando los tres mecanismos.
- Schedule reduce remainingDuration de TimeScale con deltaTime antes de calcular pausa. GameplayFreeze sí suspende su countdown cuando IsPaused es true. Son semánticas diferentes.
- Durante freeze, Schedule omite determinadas fases, mantiene Presentation y permite TTLSystem/JuiceSystem/ParticleSystem mediante una lista por nombre de clase (Schedule.ts:200-224). Los sistemas permitidos reciben deltaTime sin escalar.

**Equivalencia:** los tres recursos pueden detener o alterar la progresión de la simulación.  
**Diferencias legítimas:** una escala fraccional, una pausa explícita y un hit-stop pueden necesitar políticas de reanudación distintas.  
**Coste:** orden de prioridad implícito, temporizadores que no envejecen igual bajo pausa y riesgo de que un consumidor consulte solo uno de los recursos.  
**Consolidación:** ADR de dominios temporales y un único contrato de autoridad; mantener adaptadores de compatibilidad mientras se migran consumidores. No eliminar recursos hasta probar pausa, slow motion, freeze, rollback y restart.  
**Riesgo:** alto; una refactorización directa puede cambiar el número de ticks de simulación o la duración audiovisual.

### D2 — Platformer reproduce dos veces el evento PlaySFX

**Clase:** doble emisión. **Prioridad:** P0.

- packages/core/src/runtime/BaseGame.ts:373-380 suscribe PlaySFX y ejecuta audio.playSFX con resolveAudioOptions.
- BaseGame registra el mismo EventBus como recurso del World en BaseGame.ts:393-400.
- src/games/platformer/PlatformerGame.ts:145-155 añade otra suscripción a PlaySFX y ejecuta this.audio.playSFX(sfx.name).

**Equivalencia:** ambos listeners reaccionan al mismo evento del bus del juego y reproducen el mismo nombre de SFX.  
**Diferencia:** el listener de BaseGame aplica presets y opciones; el listener local ignora los parámetros.  
**Coste:** posible doble voz por evento, cooldown/pitch/volumen inconsistentes y mayor dificultad de depurar audio.  
**Consolidación:** conservar un único bridge de reproducción en BaseGame; eliminar el listener de Platformer o convertirlo en consumidor de un evento distinto que realmente necesite una respuesta adicional. Añadir test que emita un PlaySFX y espere una llamada al player.  
**Riesgo:** bajo si el test confirma la topología del bus; revisar si el listener local ejecuta otra lógica antes de retirarlo.

### D3 — Geometry Wars pide el mismo screen shake directamente y por el catálogo

**Clase:** doble escritura coalescida. **Prioridad:** P1.

- src/games/geometrywars/systems/KineticAccumulatorSystem.ts:163-172 ejecuta Juice.shake(world, 10, 300) y después JuiceOrchestrator.triggerEvent("geometry-wars", "bomb:trigger", ...).
- src/games/shared/rendering/JuiceOrchestrator.ts:183-186 define bomb:trigger con shakeIntensity 7 y shakeDurationMs 200.
- JuiceOrchestrator.ts:237-275 enruta el perfil a Juice.shake.
- packages/core/src/utils/Juice.ts:53-105 fusiona el ScreenShake existente por máximo de intensidad y duración.

**Equivalencia:** ambos productores solicitan shake para la misma activación de la bomba.  
**Diferencia legítima:** la bomba puede necesitar un shockwave ECS local, audio y la singularidad VFX del catálogo; esas salidas no son duplicadas por sí mismas.  
**Coste:** hay dos valores de shake para un mismo evento. El resultado efectivo actual queda dominado por 10/300 ms, por lo que el perfil 7/200 ms no representa la salida real.  
**Consolidación:** decidir si el perfil es autoridad del shake; preservar las demás acciones locales que no dupliquen el catálogo.  
**Riesgo:** medio; cambiar la autoridad puede alterar intensidad y duración del game feel.

### D4 — Space Invaders pide shake directo además del perfil alien:destroyed

**Clase:** doble escritura coalescida. **Prioridad:** P1.

- src/games/space-invaders/systems/SpaceInvadersCollisionSystem.ts:243-250 dispara el perfil alien:destroyed y después llama Juice.shake con intensidad 2.5/5.5 y duración 100/180 ms según combo.
- src/games/shared/rendering/JuiceOrchestrator.ts:162-165 define alien:destroyed con shake 2.0/60 ms.
- Juice.shake fusiona por máximo, así que la llamada directa domina el resultado actual.

**Equivalencia:** dos productores solicitan screen shake por la destrucción del invader.  
**Diferencia legítima:** la intensidad contextual del combo es una regla de Space Invaders; el efecto shockwave y su hit-stop del catálogo son otras salidas.  
**Coste:** el catálogo deja de describir el feedback real completo y cambiar uno de los dos valores puede no tener efecto observable.  
**Consolidación:** mover la variación por combo al dato semántico/perfil de la petición o mantener un solo productor de shake contextual.  
**Riesgo:** medio; comparar cadenas de combo y muerte simple.

### D5 — Asteroids solicita shake dos veces en ship:damage

**Clase:** doble escritura coalescida. **Prioridad:** P1.

- src/games/asteroids/systems/AsteroidCollisionSystem.ts:302-314 genera feedback de colisión, dispara el perfil ship:damage y ejecuta Juice.playDeathJuice con shakeIntensity 6 y shakeDuration 180.
- src/games/shared/rendering/JuiceOrchestrator.ts:157-160 define ship:damage con shakeIntensity 5 y shakeDurationMs 150.
- Juice.shake fusiona los dos valores por máximo; la ruta directa domina el resultado actual.

**Equivalencia:** perfil y helper escriben en el mismo canal ScreenShake para el mismo daño de nave.  
**Diferencia legítima:** la explosión de nave y el borde de pantalla pueden ser salidas diferentes y deben conservarse solo si el test visual demuestra que ambas comunican información distinta.  
**Coste:** los valores del catálogo no representan la salida final y el feedback queda repartido entre dos productores.  
**Consolidación:** asignar la autoridad de shake al catálogo o a un helper semántico, no a ambos. La eliminación del antiguo doble pixelfx_explosion en destrucción de asteroide sí está documentada como corregida y no se vuelve a contar aquí.  
**Riesgo:** medio; validar muerte, respawn e invulnerabilidad.

### D6 — Hit & Run escribe GameplayFreeze sin utilizar la política común de hit-stop

**Clase:** política paralela. **Prioridad:** P0/P1.

- src/games/hitandrun/systems/HitRunFeedbackSystem.ts:82-90 lee GameplayFreeze.remaining y llama enterGameplayFreeze con el máximo entre el valor actual y la duración solicitada.
- src/games/shared/rendering/HitStopSystem.ts:59-107 contiene la política común requestHitStop: prioridad, cooldown de 50 ms, propiedad del freeze y arbitraje para no reemplazar freezes ajenos.
- src/games/hitandrun/systems/registerHitRunFeedback.ts:17-43 registra HitRunFeedbackSystem y ScreenShakeSystem, pero no HitStopSystem.

**Equivalencia:** ambos resuelven cuándo solicitar una congelación por impacto.  
**Diferencia legítima:** Hit & Run necesita perfiles específicos por arma, guardia, armadura y finisher.  
**Coste:** Hit & Run no pasa por la política de prioridades/cooldown y su registro no inicializa el estado snapshot-backed de HitStopSystem. La duración efectiva continúa siendo la de GameplayFreeze; no hay dos countdowns activos, hay dos políticas para solicitarlo.  
**Consolidación:** preservar los perfiles Hit & Run y enrutar su resultado a la API compartida de petición, con prioridad explícita y pruebas de rollback.  
**Riesgo:** alto por el impacto en combate y rollback.

### D7 — Space Invaders combina freeze directo con un perfil de hit-stop de catálogo en un evento de impacto mal nombrado

**Clase:** doble ruta de petición y contrato semántico incorrecto. **Prioridad:** P0/P1.

- src/games/space-invaders/systems/SpaceInvadersCollisionSystem.ts:109-143 reduce HP del boss, aplica GameplayFreeze de 50 ms, y llama al perfil ufo:destroyed.
- JuiceOrchestrator.ts:162-165 asigna también hitStopMs al perfil ufo:destroyed.
- HitStopSystem.ts:70-87 rechaza una petición Juice cuando ya existe un freeze activo que pertenece a otro origen. Por tanto, la llamada de catálogo no crea un segundo temporizador efectivo mientras el freeze directo siga activo.
- El evento se llama ufo:destroyed aunque el boss solo haya recibido daño; el método se ejecuta en cada impacto de boss.

**Equivalencia:** ambas rutas pretenden congelar la simulación tras el mismo impacto.  
**Diferencia legítima:** el hit normal y la destrucción definitiva del boss deben ser eventos distintos.  
**Coste:** una de las dos peticiones de hit-stop queda rechazada y el evento de destrucción se emite en una transición que no representa destrucción.  
**Consolidación:** separar boss:hit de boss:destroyed; conservar un solo propietario de la petición de freeze y usar el perfil de destrucción solo cuando Health llegue a cero.  
**Riesgo:** alto; revisar score, muerte del boss, rollback y audio/VFX.

### D8 — HitRunCombatSystem replica el ciclo común de resolución de daño

**Clase:** implementación paralela con extensión legítima. **Prioridad:** P1.

- packages/gameplay-kit/src/combat/systems/CombatSystem.ts:87-175 implementa lectura de Damage/Health, facción, invulnerabilidad, Dead, reducción de salud, emisión combat:hit/combat:death y política de consumo.
- src/games/hitandrun/systems/HitRunCombatSystem.ts:71-160 implementa de nuevo el mismo ciclo: Damage/Health, facción, invulnerabilidad, Dead, Health, los mismos eventos y consumo.
- HitRunCombatSystemBootstrap.ts:79-104 registra la variante local.
- CombatTypes.ts:7-23 define CombatHitEvent; HitRunFeedbackTypes.ts:3-29 declara CombatHitPayload con campos base solapados y metadatos adicionales de guardia, armadura, knockback y hitstun.

**Equivalencia:** ambos resuelven contacto -> daño -> Health -> Dead -> eventos de combate -> consumo de Damage.  
**Diferencias legítimas:** Hit & Run aplica profundidad Z, isFriendly, resolveHitRunDamage, guardia/armadura y políticas de consumo propias.  
**Coste:** cambios en invulnerabilidad, atribución, eventos o consumo deben mantenerse en dos implementaciones; además hay tipos any en HitRunCombatSystem.ts:78 y 158.  
**Consolidación:** no reemplazar HitRunCombatSystem por CombatSystem sin más. Extraer únicamente el contrato/funciones puras realmente comunes o permitir una política de resolución tipada que el sistema local pueda invocar. Unificar el DTO base sin borrar campos específicos.  
**Riesgo:** alto; conservar regresiones de melee, guardia, armadura, explosivos, 2.5D y rollback.

### D9 — Dos sistemas y dos modelos de animación coexisten

**Clase:** API paralela / migración incompleta. **Prioridad:** P1/P2.

- packages/core/src/systems/AnimationSystem.ts:6-10 declara AnimationSystem deprecated y recomienda SpriteAnimatorSystem.
- AnimationSystem.ts:25-68 avanza Animator index-based.
- packages/core/src/systems/SpriteAnimatorSystem.ts:14-67 avanza SpriteAnimator y SpriteSheetDefinition.
- Platformer registra AnimationSystem en PlatformerGame.ts:357-359; Asteroids lo registra en AsteroidsGame.ts:287-296.
- Echo Runner registra SpriteAnimatorSystem en EchoRunnerGame.ts:452-458.
- Hit & Run registra ambos: SamuraiAnimationSystems.ts:1-8 y sus registros de sistemas; el comentario local indica que AnimationSystem sigue activo para las entidades legacy restantes.

**Equivalencia:** los dos sistemas son propietarios del avance temporal de clips/frame animation.  
**Diferencias legítimas:** Animator utiliza índices y metadatos inline; SpriteAnimator utiliza definiciones de spritesheet y rectángulos fuente canónicos. No se ha demostrado que ambos avancen el mismo componente en el mismo entity.  
**Coste:** dos contratos de animador, dos rutas de eventos de completion y migración indefinida.  
**Consolidación:** fijar SpriteAnimator como contrato nuevo, inventariar entidades legacy por juego y migrarlas individualmente; retirar AnimationSystem solo con evidencia de cero consumidores y pruebas.  
**Riesgo:** medio/alto por timing de clips, frames y eventos de finalización.

### D10 — Flappy Bird registra dos veces PixelFxProceduralVFX

**Clase:** registro redundante. **Prioridad:** P2.

- src/games/shared/rendering/SharedVFX.ts:269-309 registra las primitivas comunes y llama internamente a registerPixelFxProceduralVFX(renderer).
- src/games/flappybird/FlappyBirdGame.ts:547-548 llama a registerSharedVFX(renderer) y, justo después, a registerPixelFxProceduralVFX(renderer) otra vez.

**Equivalencia:** ambas llamadas ejecutan el mismo registro de formas procedurales para el mismo renderer.  
**Diferencia legítima:** otros juegos llaman directamente a registerPixelFxProceduralVFX porque solo necesitan ese conjunto, sin implicar que deban registrar todo SharedVFX.  
**Coste:** trabajo de registro repetido y contratos de inicialización menos previsibles. No se ha demostrado doble render: la API registra drawers por shape y el efecto real depende de la resolución de registro.  
**Consolidación:** retirar la llamada explícita duplicada de Flappy Bird y añadir un test de registro por renderer.  
**Riesgo:** bajo si se comprueba que no se estaba usando el segundo registro para sobrescribir una implementación custom.

---

## 5. Sistemas ya compartidos correctamente

### 5.1 Locomotion: Platformer + Echo Runner

**Estado: shared, verificado.**

- packages/gameplay-kit/src/arcade/helpers/platformerSystemRegistry.ts:33-57 registra el conjunto común: MovingPlatformSystem, PlatformerSlideSystem, PlatformerMovementSystem, PlatformerGravitySystem, PlatformerCoyoteSystem, PlatformerJumpSystem y PlatformCarrySystem.
- src/games/platformer/PlatformerGame.ts:341-350 registra registerCommonPlatformerSystems con includeMovingPlatforms true.
- src/games/echorunner/EchoRunnerGame.ts:441-450 registra la misma función y opción.
- src/games/shared/componentBuilders.ts:112-231 construye los componentes comunes de locomoción y perfiles.
- Platformer selecciona el perfil momentum y adapta parámetros a sus opciones en PlatformerGame.ts:265-289.

**Conclusión:** los juegos comparten algoritmo/sistemas; sus controles, wall jump, dash, ataque y reglas de nivel permanecen específicos. No crear otro locomotion framework. El problema técnico pendiente identificado es que platformerSystemRegistry.ts:39-40 declara World<any>, incompatible con la regla de no introducir any.

### 5.2 Projectile: Core + gameplay-kit + cinco consumidores

**Estado: shared/partial, verificado.**

- packages/core/src/utils/ProjectilePool.ts define ProjectilePool y ProjectileParams.
- packages/gameplay-kit/src/pooling/ProjectilePoolConfig.ts:18-45 define createProjectilePoolConfig con configuración de componentes, límites y extensiones.
- Consumo local: src/games/asteroids/EntityPool.ts:21-123; src/games/geometrywars/EntityPool.ts:23-51; src/games/space-invaders/EntityPool.ts:17-103; src/games/vertical-shmup/EntityPool.ts:5-57; src/games/hitandrun/weapons/HitRunBulletPool.ts y HitRunEnemyBulletPool.ts.
- Las variantes añaden Boundary, CollisionLayers, faction, graze, ExplosivePayload o BeltElevation.

**Conclusión:** reutilización real de pool y configuración base. Lo común está compartido; las extensiones por juego son legítimas. El riesgo actual es de tipado/reset: ProjectilePoolConfig.ts:122-165 vuelve a Record<string, any> en reset e initializer.

### 5.3 Combat genérico

**Estado: shared en varios shooters, parcial en Hit & Run.**

- CombatSystem de gameplay-kit se registra en AsteroidsGame.ts:245-248, ArkanoidGame.ts:273-275, GeometryWarsGameScene.ts:91-95, SpaceInvadersGameScene.ts (registro de la escena) y ShmupGameScene.ts:93-101.
- Hit & Run usa HitRunCombatSystem por su profundidad y su resolución de guardia/armadura.

**Conclusión:** el sistema común ya tiene consumidores reales múltiples. Se debe evaluar la integración de las reglas comunes en Hit & Run, no introducir un CombatFramework general.

### 5.4 Render y VFX

**Estado: shared en la mayoría de los juegos inspeccionados; paridad visual incompleta.**

- SharedVFX registra los mismos nombres de shape para Canvas y Skia en SharedVFX.ts:269-307.
- PixelFxProceduralVFX consume IDrawAdapter; DrawAdapter.ts define un único contrato para CanvasDrawAdapter y SkiaDrawAdapter.
- Asteroids, Platformer, Echo Runner, Vertical Shmup, Geometry Wars y Space Invaders usan registerSharedVFX. Pong, Arkanoid, Frogger y Hit & Run registran PixelFxProceduralVFX directamente, que puede ser suficiente cuando no necesitan el catálogo completo de fondos/figuras.
- Flappy Bird tiene el registro redundante descrito en D10.

**Conclusión:** no mover Canvas/Skia a Core. El código de VFX usa tokens de tema y dependencias de presentación; mantenerlo fuera del engine es correcto. La ubicación actual en src/games/shared/rendering no es aún un paquete reusable independiente.

### 5.5 Audio adapters

**Estado: shared a nivel de reproducción; partial a nivel semántico.**

- BaseGame enruta PlaySFX a IAudioPlayer y resuelve presets: BaseGame.ts:373-380.
- Core exporta IAudioPlayer, WebAudioPlayer, SoundBank y AudioEventMap.
- ExpoAudioPlayer implementa IAudioPlayer en packages/react-native/src/audio/ExpoAudioPlayer.ts.
- Los juegos también hacen llamadas directas al recurso Audio, por ejemplo Geometry Wars y Platformer.

**Conclusión:** el adaptador de plataforma está compartido. La semántica de eventos y la política de qué capa decide el sonido no está completamente normalizada. La evidencia de búsqueda del repositorio no encontró consumo de @tiny-aster/arcade-sound-kit en gameplay runtime; el paquete está disponible como toolkit y Sound Lab, no como backend runtime conectado.

---

## 6. Matriz de reutilización entre juegos

Estados: shared = consume la misma implementación compartida; partial = comparte una parte, pero mantiene rutas o reglas locales; local = comportamiento resuelto por sistemas propios; missing = no se encontró capacidad en el juego; unknown = no quedó verificado en esta pasada.

| Capacidad | Platformer | Echo Runner | Hit & Run | Asteroids | Vertical Shmup |
|---|---|---|---|---|---|
| Locomotion | shared | shared | local | local | local |
| Combat | partial | partial | partial | shared | shared |
| Damage | partial | partial | partial | shared | partial |
| Projectile | missing | missing | partial | shared | shared |
| Juice | partial | partial | partial | partial | partial |
| VFX | shared | shared | partial | shared | shared |
| Audio | partial | partial | partial | partial | partial |
| Animation | partial | shared | partial | partial | unknown |
| Time control | partial | partial | partial | partial | partial |

### Justificación de los estados

- **Locomotion:** Platformer y Echo Runner usan el mismo helper y la misma lista de sistemas (PlatformerGame.ts:341-350; EchoRunnerGame.ts:441-450; platformerSystemRegistry.ts:39-57). Hit & Run usa locomoción Belt 2.5D con profundidad/elevación y no debe clasificarse como la misma mecánica.
- **Combat/Damage:** Asteroids y Vertical Shmup registran CombatSystem compartido. Vertical Shmup mantiene además ShmupSingleHitGuardSystem y ShmupCollisionSystem (ShmupGameScene.ts:93-107). Hit & Run conserva HitRunCombatSystem. Platformer y Echo Runner tienen sistemas locales de daño/reglas junto con infraestructura Core de colisión/detección.
- **Projectile:** Asteroids y Vertical Shmup consumen ProjectilePool/createProjectilePoolConfig. Hit & Run también usa esa infraestructura con extras de Belt y explosivos. No se encontró el uso de ese sistema en Platformer ni Echo Runner; se marca missing para esta capacidad concreta, no para ataques en general.
- **Juice:** los cinco juegos tienen rutas de feedback compartido o de Core, pero no una política única aplicada a cada impacto; Hit & Run, Space Invaders y otros muestran rutas locales/directas.
- **VFX:** Platformer/Echo Runner/Asteroids/Vertical Shmup usan SharedVFX; Hit & Run usa procedural VFX y presentación Sumi-e particular. La palabra shared se refiere al pipeline, no a que todos los efectos artísticos sean iguales.
- **Audio:** IAudioPlayer/BaseGame es común, pero se conservan llamadas directas y claves de audio distintas; Platformer incluye el listener redundante.
- **Animation:** Echo Runner usa SpriteAnimatorSystem; Platformer y Asteroids usan AnimationSystem legacy. Hit & Run registra ambas APIs para conservar entidades legacy y samurai moderno. No se clasificó Vertical Shmup como missing porque no quedó verificado el conjunto completo de animaciones locales; se deja unknown.
- **Time control:** todos ejecutan bajo Schedule/Core, pero el uso de IsPaused, GameplayFreeze, TimeScale y sistemas locales no demuestra un contrato idéntico de pausa/freeze.

---

## 7. Diez oportunidades de reutilización con mayor retorno

Ordenadas por número de consumidores reales, reducción de divergencia y riesgo de introducción de abstracciones nuevas.

| # | Capacidad | Consumidores reales / evidencia | Potencial | Límite de diseño que debe preservarse |
|---|---|---|---|---|
| 1 | Locomotion común | Platformer + Echo Runner; platformerSystemRegistry.ts y sus dos registros | Muy alto; ya está integrada, necesita regresión compartida y tipado sin any | Wall jump, dash, ataques, input y niveles permanecen propios |
| 2 | ProjectilePool y configuración | Asteroids, Geometry Wars, Space Invaders, Vertical Shmup, Hit & Run | Muy alto; reducir any y definir reset/lifecycle con una prueba común | Máscaras, facciones, boundary, graze, belt y payloads especiales siguen siendo extensiones |
| 3 | Resolución base de combate | CombatSystem en shooters; HitRunCombatSystem como segundo consumidor del mismo ciclo | Alto; extracción pequeña de reglas y DTO base común | No borrar profundidad Z, guardia, armadura ni consumo propio de Hit & Run |
| 4 | Contrato semántico de impacto | CombatSystem y HitRunCombatSystem emiten combat:hit/combat:death; Juice, Audio y feedback consumen resultados | Alto; evitar que cada consumidor reconstruya posición, intensidad y severidad | No crear un evento universal; separar hit, death, block, armor-break y eventos propios cuando la semántica difiera |
| 5 | Hit-stop/freeze request policy | JuiceOrchestrator y HitStopSystem consumidos por distintos juegos; rutas directas restantes en Hit & Run y Space Invaders | Alto; una política de arbitraje y un countdown efectivo | Definir comportamiento multiplayer/rollback y pausa antes de cambiarlo |
| 6 | Screen shake | Core Juice.shake + ScreenShakeSystem; productores del catálogo y locales en Asteroids/Geometry Wars/Space Invaders | Alto; una petición por evento y una salida efectiva por cámara | Preservar variación por combo/arma como dato de entrada, no como segunda escritura |
| 7 | Spawn scheduling | SpawnDirectorSystem compartido en Geometry Wars y Space Invaders; Shmup y Asteroids usan spawners particulares | Medio/alto; compartir scheduling, límites y telemetría si la misma forma aparece en dos consumidores más | Mantener formation, toroidal spawn, patrones, ritmo de oleada y boss como diseño específico |
| 8 | Partículas y budgets | ParticleSystem/ParticlePool/SharedParticlePool en varios juegos; Hit & Run tiene sistemas de ambiente propios | Medio/alto; presupuestos, lifecycle, pools y suppression en rollback | No forzar Sumi-e ambient, trails o partículas de identidad de juego dentro de Core |
| 9 | SpriteAnimator | Echo Runner y samurai Hit & Run ya usan SpriteAnimatorSystem; Animator legacy sigue en Platformer/Asteroids | Medio/alto; una API con clip registry y evento de completion | Migración por consumidor, sin cambiar simultáneamente diseño/arte/timing |
| 10 | Audio event routing y recipes | IAudioPlayer + BaseGame + Web/Expo; sound-kit procedural disponible pero no conectado al gameplay | Medio; separar audio semántico de backend y conectar recipes solo si se necesita runtime | No incorporar el sound-kit a Core ni asumir que el sonido generado debe ser determinista con la simulación |

---

## 8. Problemas de propiedad arquitectónica

### 8.1 CoreEvents conoce eventos de dominio de juegos

packages/core/src/events/EventBus.ts:15-100 declara CoreEvents, que incluye engine/net, pero también rock:destroyed y si:kill, entre otros eventos de producto/juego. El EventBus genérico permite registries externos, por lo que no hay dependencia de paquetes de juegos desde Core; sin embargo, el registry por defecto mezcla contrato de motor, progreso de juego y audio.

**Recomendación:** mover eventos concretos de juegos a sus EventRegistry locales o a gameplay-kit cuando exista un consumidor compartido real. Mantener en Core solo eventos del motor y los contratos de servicio de plataforma genuinamente comunes. Migrar sin ruptura de APIs públicas.

### 8.2 JuiceOrchestrator concentra demasiadas fronteras

src/games/shared/rendering/JuiceOrchestrator.ts conecta catálogo, World, Core Juice, HitStopSystem, VFX IR, creación de entidades TTL y políticas de re-simulación. Es útil como fachada, pero todavía no es una capa independiente del motor ni un contrato audiovisual completo.

- JuiceOrchestrator.ts:1-10 importa Core y VFXEffectIR.
- JuiceOrchestrator.ts:214 usa World<TComponents, any, any>.
- VFXEffectIR.ts:1 importa SharedVFXPrimitiveName como type desde JuiceOrchestrator, mientras JuiceOrchestrator importa funciones de VFXEffectIR. Es un acoplamiento circular en el grafo de tipos, aunque el import type se elimina en runtime.
- VFXEffectIR.ts:5-60 define un contrato semántico propio, pero no se ha demostrado que EventBus lo utilice como contrato canónico de los productores de gameplay.

**Recomendación:** mover tipos neutrales de primitivas y contratos semánticos a un módulo propietario pequeño de presentación/feedback; no crear un nuevo orchestrator ni una capa genérica adicional. Eliminar any con los tipos reales de World.

### 8.3 Hit-stop es una política de Juice aplicada de forma incompleta

HitStopSystem ya no posee un countdown paralelo: GameplayFreeze contiene la duración efectiva y el sistema compartido mantiene solo prioridad/cooldown snapshot-backed. Este diseño es coherente con Schedule. El problema actual son los productores que escriben directamente GameplayFreeze y no pasan por esa política.

**Recomendación:** mantener un único contador efectivo en Core y centralizar las peticiones/arbitraje en la API existente. Registrar HitStopSystem únicamente en mundos que utilizan esa política y crear guard contra registro ausente/duplicado.

### 8.4 El feedback visual no es todavía una reacción única al evento

JuiceOrchestrator define perfiles y VFXEffectIR define contextos semánticos, pero algunos juegos todavía llaman de forma local a Juice.shake, construyen entidades de explosión o crean emitters además del perfil. No todas esas respuestas son duplicaciones; hay que revisar output por output y conservar lo que aporte una respuesta distinta.

**Recomendación:** cada evento debe tener un productor de la decisión de shake/hit-stop y consumidores independientes para VFX/audio/animación. Los efectos específicos permanecen como presentación del juego.

### 8.5 Audio tiene adaptador común, pero dos rutas de consumo

BaseGame escucha PlaySFX y llama IAudioPlayer. Algunos sistemas llaman directamente a Audio.playSFX y Platformer añade otro listener para PlaySFX. SoundBank y AudioEventMap administran presets/manifest/voices. arcade-sound-kit genera recetas y audio offline, pero la inspección de referencias no encontró conexión de gameplay runtime.

**Recomendación:** usar EventBus para eventos semánticos cuando el audio deba reaccionar a gameplay, mantener llamadas directas solo para UI/controles locales justificados, y documentar explícitamente la excepción. No mover audio runtime a Core por el mero hecho de reutilizar el sound-kit.

### 8.6 Animation mantiene un contrato legacy activo

AnimationSystem está deprecated, pero Platformer y Asteroids lo siguen registrando. Hit & Run usa SpriteAnimatorSystem junto con AnimationSystem para entidades legacy. El estado actual es migración en progreso, no dos avances simultáneos del mismo componente.

**Recomendación:** exigir SpriteAnimator para nuevas integraciones; migrar por entidades y juego; retirar el legacy cuando la búsqueda de producción y pruebas demuestren cero consumidores.

### 8.7 Renderer y VFX deben seguir fuera de Core

AGENTS.md define renderer-canvas y renderer-skia como paquetes independientes y Core como plataforma-agnóstico. SharedVFX y PixelFxProceduralVFX están actualmente bajo src/games/shared/rendering y conocen Canvas/Skia y tokens de tema.

**Recomendación:** conservar la dirección de dependencia: juegos/presentación -> adaptadores/renderers, nunca Core -> Skia ni Core -> efectos de un juego. Valorar un paquete de presentación compartida solo si hay consumidores independientes suficientes y se puede desacoplar tema y registry sin ciclos.

### 8.8 API shared no significa API type-safe todavía

Ejemplos verificados:
- JuiceOrchestrator.ts:214 declara World con any.
- platformerSystemRegistry.ts:39-40 declara World<any>.
- HitRunCombatSystem.ts:78 y 158 usa any al leer/eliminar Damage.
- ProjectilePoolConfig.ts:122 y 165 usa Record<string, any>.

**Recomendación:** usar estos puntos como unidades pequeñas de tipado del contrato compartido, no como excusa para generalizar todos los componentes ECS.

---

## 9. Grafo actual de dependencias

El siguiente grafo resume los flujos observados y los puntos donde conviven contratos o escritores alternativos.

    Juegos (Platformer / Echo Runner / Hit & Run / Asteroids / Shooters)
      |
      +--> @tiny-aster/core
      |      World / ECS / EventBus / Schedule / Physics / snapshots
      |      IAudioPlayer / Juice / TTL / Particle / Animation systems
      |
      +--> @tiny-aster/gameplay-kit
      |      CombatSystem / SpawnDirector / ProjectilePoolConfig
      |      PlatformerSystemRegistry
      |             |
      |             +--> @tiny-aster/core
      |
      +--> Shared presentation (src/games/shared/rendering)
             |
             +--> JuiceOrchestrator
             |      +--> Core Juice.shake
             |      +--> HitStopSystem.requestHitStop
             |                  |
             |                  +--> GameplayFreeze resource
             |                           |
             |                           +--> Core Schedule
             |
             +--> VFXEffectIR / SharedVFX / PixelFxProceduralVFX
             |      |
             |      +--> IDrawAdapter
             |             +--> Canvas backend
             |             +--> Skia backend
             |
             +--> Game-specific render drawers / theme tokens

    EventBus
      +--> Gameplay producers (CombatSystem, HitRunCombatSystem, locomotion, collisions)
      +--> Juice listeners / JuiceOrchestrator
      +--> BaseGame PlaySFX listener --> IAudioPlayer --> WebAudio / Expo Audio
      +--> Animation completion listeners

    Parallel writers still present:
      Hit & Run / Space Invaders --> GameplayFreeze directly
      Space Invaders / Asteroids / Geometry Wars --> Juice.shake directly
      Space Invaders / other games --> game-specific VFX, explosion and particle helpers
      Platformer --> extra PlaySFX listener

### Observaciones del grafo

- No se ha verificado una dependencia de Core hacia un juego concreto ni una dependencia de Core hacia Skia.
- Sí se ha verificado una inversión de dependencia de tipos entre VFXEffectIR y JuiceOrchestrator (type-only desde IR hacia Orchestrator; import runtime en sentido contrario). No equivale a un ciclo runtime confirmado.
- EventBus es el punto de integración común, pero los contratos de eventos de dominio se reparten entre CoreEvents, registries de juego, gameplay-kit y payloads locales.
- El sonido procedural (arcade-sound-kit) aparece en el flujo de Sound Lab/generación, no en el flujo de runtime de los juegos inspeccionados.

---

## 10. Sistemas particulares justificados: no consolidar por similitud superficial

| Sistema / juego | Particularidad que debe permanecer local | Razón |
|---|---|---|
| Hit & Run | Belt movement, profundidad Z/elevación, guardia, armadura, combos melee, cadenas explosivas | Reglas de combate y locomoción 2.5D con datos específicos. Compartir el ciclo base no significa eliminar estas reglas. |
| Asteroids | Movimiento toroidal, fragmentación por tamaño, loot y selección de spawn/respawn | Las reglas de espacio y fragmentación son parte de su identidad. Compartir física/pool no implica compartir el comportamiento. |
| Vertical Shmup | Graze, bombas, bullet patterns, fases de boss y scrolling vertical | Los patrones y las reglas de presión del shooter son distintos; reutilizar CombatSystem y ProjectilePool es suficiente como base. |
| Geometry Wars | KineticAccumulator, burst radial, steering y spawn geometry | Mecánicas de energía/arena y targeting particulares. Compartir la infraestructura de spawn y proyectiles donde coincida. |
| Space Invaders | Formación en rejilla, escudos destructibles, invasores kamikaze y wave progression | No convertirlo en un SpawnDirector genérico que borre reglas de formación y progresión. |
| Platformer | Wall jump, dash, estructura de nivel y metas | Capas de diseño sobre locomoción compartida. |
| Echo Runner | Ataque echo, enemigos y zonas de muerte | Mecánicas del runner que consumen locomoción común, no copias de locomoción. |
| Sumi-e Hit & Run | VFX de tinta/ambientación y arte procedural específico | Identidad visual y perfiles de tema. Puede consumir el mismo contrato de dibujo, pero no se debe trasladar al Core. |

---

## 11. Riesgos arquitectónicos

| Riesgo | Severidad | Evidencia | Mitigación |
|---|---|---|---|
| Freeze/pause inconsistente | Alta | Schedule.ts:155-224; TimeScale.ts:2-41 | Definir dominios temporales y pruebas de Scheduler antes de cambiar el contrato |
| Feedback con escritores múltiples | Alta | D2-D7 | Una petición de salida por fenómeno; tests de número de llamadas y estado final |
| EventBus con errores de consumidor difíciles de observar | Media/alta | EventBus.ts:251-315; handlers síncronos y buffer diferido | Métricas/diagnostics y pruebas; no silenciar fallos |
| Migración de combat demasiado agresiva | Alta | CombatSystem vs HitRunCombatSystem | Extraer reglas comunes pequeñas, mantener custom resolver y escenarios del juego |
| Rollback + efectos externos | Alta | JuiceOrchestrator suppression y emisiones locales | Definir cada evento como gameplay-authoritative, snapshot-backed o presentación no repetible |
| APIs any en sistemas compartidos | Media | D8 y sección 8.8 | Tipado incremental y contratos mínimos |
| Legacy animation | Media | AnimationSystem deprecated con consumidores activos | Inventario de componentes y migración por juego |
| Paridad Canvas/Skia insuficientemente demostrada | Media | IDrawAdapter común, golden actual sin raster completo declarado | Tests de comando y goldens raster por primitivas representativas |
| Sound kit no integrado a runtime | Baja/media | Búsqueda de referencias y estructura del paquete | Decidir si es una herramienta de autoría o un servicio de runtime; no inferir una integración inexistente |
| Ledgers desfasados | Media | Juice ledger vs HitRunFeedback actual; VFX inventory | Registrar SHA/fecha y revalidar filas antes de declararlas abiertas |

---

## 12. Backlog priorizado

### P0 — Corregir inconsistencias funcionales y temporalidad antes de ampliar arquitectura

| ID | Tarea | Causa raíz | Paquete/propietario | Criterio de cierre |
|---|---|---|---|---|
| P0-01 | Quitar doble consumo de PlaySFX en Platformer | BaseGame y Platformer suscriben el mismo evento | Core/BaseGame + Platformer | Un evento produce exactamente una llamada al player con preset y opciones correctas |
| P0-02 | Decidir el contrato temporal canónico | Schedule acepta TimeScale, GameplayFreeze e IsPaused con relojes/semánticas distintas | Core/Schedule | ADR + tests de fixed step, pause, slow motion, hit-stop, resume, rollback y scene lifecycle |
| P0-03 | Centralizar peticiones de hit-stop de Hit & Run y Space Invaders | Escrituras directas de GameplayFreeze omiten prioridad/cooldown | Shared Juice API + consumidores | Un único contador efectivo; política común probada; perfil de arma/boss conservado |
| P0-04 | Eliminar escritores redundantes de shake por evento | Catálogo y llamadas directas solicitan el mismo ScreenShake | Juegos + JuiceOrchestrator | Un productor de shake por evento; valores contextualizados; resultado cubierto por pruebas |

### P1 — Compartir contratos con varios consumidores reales

| ID | Tarea | Causa raíz | Paquete/propietario | Criterio de cierre |
|---|---|---|---|---|
| P1-01 | Separar boss:hit de boss:destroyed en Space Invaders | Perfil de destrucción usado en cada impacto | Space Invaders + Juice catalog | Evento de hit y evento de muerte diferenciados con tests |
| P1-02 | Normalizar contrato base de CombatHit | CombatTypes y HitRunCombatPayload se solapan | gameplay-kit | DTO base común + extensiones de Hit & Run; sin any; productores/consumidores tipados |
| P1-03 | Extraer únicamente las reglas comunes de HitRunCombatSystem | Duplicación del ciclo Health/Damage/Faction/Dead/eventos | gameplay-kit + Hit & Run | Hit & Run conserva depth/guard/armor y comparte solo piezas probadas |
| P1-04 | Tipar ProjectilePoolConfig y sus reset hooks | any en API usada por cinco juegos | gameplay-kit/Core | Cero any en hooks y test de reset/reuse para cada consumidor |
| P1-05 | Establecer la cobertura de HitStopSystem | Registro inconsistente entre juegos que usan el catálogo | Shared Juice API | Cada productor con hitStop demuestra registro del sistema y freeze real de Schedule |
| P1-06 | Migrar consumidores de AnimationSystem | Dos APIs de animación coexistentes | Core + juegos | Nuevos consumidores usan SpriteAnimator; legacy solo se elimina al demostrar cero uso |

### P2 — Consolidación, observabilidad y regresión de presentación

| ID | Tarea | Causa raíz | Propietario | Criterio de cierre |
|---|---|---|---|---|
| P2-01 | Hacer único el registro de PixelFx en Flappy Bird | registerSharedVFX ya llama al registro procedural | VFX registration | Un registro por backend/renderer; custom drawer no sobrescrito accidentalmente |
| P2-02 | Añadir paridad Canvas/Skia reproducible | Interfaz común no demuestra igualdad visual completa | Renderer/VFX | Golden raster/commands para primitives compartidas y diferencias justificadas |
| P2-03 | Separar CoreEvents de eventos de juego | Registry Core contiene nombres específicos de juego | Core + registries | Core solo conserva eventos del motor y contratos cross-cutting |
| P2-04 | Hacer explícito el dominio temporal de TTL, Juice, particles, animation y shake | DeltaTime raw/scaled y excepciones por className | Core/Schedule | Política por dominio; sin allowlist por nombre de clase |
| P2-05 | Añadir guard de idempotencia/duplicidad de registro | Registro procedural repetido | Renderer/VFX | Tests que detectan registros duplicados o sustituciones inesperadas |
| P2-06 | Revalidar y sincronizar ledgers | Estados históricos no coinciden con source | docs/agents | Cada entrada incluye commit inspeccionado, evidencia y estado actual |

### P3 — Mejoras opcionales, solo cuando se demuestre beneficio

| ID | Tarea | Condición previa |
|---|---|---|
| P3-01 | Integrar recipes de arcade-sound-kit en runtime | Decisión explícita de que el paquete también será proveedor runtime; adapter cross-platform y voz/presupuesto definidos |
| P3-02 | Compartir scheduling de oleadas con Shmup/Asteroids | Encontrar al menos dos consumidores con el mismo algoritmo de scheduling, no solo con la palabra wave |
| P3-03 | Extraer VFX a un paquete reusable | Separar theme tokens, Canvas/Skia adapters y contrato de assets sin introducir dependencia en Core |
| P3-04 | Timeline común para animación/juice/audio | Demostrar que comparten necesidades temporales y que los dominios de reloj siguen siendo distintos y configurables |

---

## 13. Decisiones que requieren aprobación antes de implementar

1. **Tiempo autoritativo:** ¿TimeScale debe convertirse en la única API de pausa/slow motion/freeze o GameplayFreeze debe permanecer como mecanismo de hit-stop específico? En ambos casos, definir qué sucede con countdowns mientras IsPaused y qué fases siguen activas.
2. **Multiplayer y rollback:** ¿hit-stop afecta a la simulación autoritativa de todos los peers o es feedback local de presentación? La decisión afecta hashes, tick count y accesibilidad local.
3. **Prioridad del catálogo:** ¿JUICE_CATALOG es la autoridad del shake/hit-stop de un evento o el juego puede aportar intensidades dinámicas? Recomiendo que el juego aporte metadatos contextuales a una sola petición, no una segunda escritura.
4. **Contrato CombatHit:** ¿mantener una base compartida y permitir extensiones locales tipadas o normalizar todos los campos en gameplay-kit? Recomiendo base mínima y extensiones, sin evento universal.
5. **Límite de Hit & Run:** confirmar que depthZOverlap, guard/armor y combo-finisher seguirán siendo reglas de Hit & Run aunque use primitives compartidas de daño.
6. **Animación:** confirmar SpriteAnimator como API canónica para nuevas integraciones y un plan de retirada gradual de Animator.
7. **Audio:** decidir si el sound-kit seguirá siendo tooling de autoría/export o si debe existir consumo runtime. No introducir el paquete en Core.
8. **VFX compartido:** decidir si shared rendering continúa siendo código de aplicación o si existe una necesidad real de publicarlo como paquete. No trasladar los tokens de Sumi-e ni dependencias de Skia a Core.
9. **Spawn/waves:** aprobar compartir solo el scheduling/budget cuando dos consumidores implementen el mismo algoritmo; mantener patrones, geometría, boss y ritmo específicos.

---

## 14. Secuencia propuesta de PRs

No abrir PRs de implementación hasta validar las decisiones temporales y de propiedad señaladas arriba. Mantener una sola PR activa y evitar unidades que mezclen simulación, gameplay y presentación.

| Orden | PR / unidad | Alcance acotado | Dependencias y regresiones obligatorias |
|---|---|---|---|
| 0 | ADR de tiempo y feedback | Registrar decisión de dominios temporales, política de rollback y autoridad del shake | Aprobación humana antes de tocar Schedule |
| 1 | Platformer PlaySFX | Eliminar listener redundante y test de una sola reproducción | Platformer tests + Core BaseGame audio routing |
| 2 | Hit-stop request consumers | Migrar Hit & Run y Space Invaders a la política existente; no reescribir HitStopSystem | Scheduler/GameplayFreeze tests, HitRun combat/rollback tests, Space Invaders boss/invader tests |
| 3 | Feedback writers | Quitar las peticiones redundantes de shake en Geometry Wars, Space Invaders y Asteroids, conservando variación dinámica | Tests de estado final y pruebas de game feel por evento |
| 4 | Semántica de eventos | Separar boss:hit/boss:destroyed y tipar contrato base CombatHit | Gameplay-kit event tests, consumidores de Juice/Audio/Animation |
| 5 | Hit & Run combat seam | Extraer helper/contrato pequeño compartido, mantener resolver 2.5D y extensiones | HitRunCombatSystem, guard/armor, melee, explosion-chain tests + Asteroids/Shmup Combat tests |
| 6 | Projectile typing/reset | Eliminar any en config hooks y verificar reuse/reset por cinco consumidores | Pool tests y tests específicos de las cinco familias |
| 7 | Animation migration pilot | Migrar un consumidor legacy (preferentemente Platformer) a SpriteAnimator | SpriteAnimator/animation completion tests y visual regression del juego piloto |
| 8 | Renderer registry & parity | Eliminar registro duplicado de Flappy y ampliar prueba Canvas/Skia | Adapter tests, visual lab, golden tests; no actualizar baseline sin aprobación visual |
| 9 | Spawn/particles | Revisar scheduling común y presupuesto de partículas solo con dos consumidores demostrados | Geometry Wars + Space Invaders como base; añadir Shmup si el algoritmo coincide |

### Regla de salida para cada PR

- Una sola unidad reversible.
- Contrato y propietario identificados antes del cambio.
- Consumidor real migrado; un registro/API sin consumo no cuenta.
- Test unitario del paquete propietario y test de integración del juego.
- Fixed timestep, rollback/resimulation y determinismo comprobados cuando haya lógica de simulación.
- Canvas y Skia comprobados cuando se toque presentación.
- Ledger y docs actualizados con SHA, evidencia y estado.
- CI y guardrails ejecutados realmente; no declarar checks verdes por inferencia.

---

## 15. Validación recomendada por subsistema

| Área | Tests/suites a localizar y ejecutar en implementación | Verificación adicional |
|---|---|---|
| Scheduler/time | GameplayFreeze, TimeScale, Schedule, snapshot resources y rollback | Tabla de comportamiento para normal/pause/slow motion/hit-stop/resimulation |
| Juice | HitStopSystem, JuiceOrchestrator, Juice.shake, screen-shake tests | Contar requests y comprobar estado ScreenShake final |
| Combat | gameplay-kit CombatSystem tests y HitRunCombatSystem tests | Mismo input/estado inicial -> mismo Health, Dead, eventos y consumo |
| Locomotion | Core locomotion/profile/material/moving platform tests | Ejecutar mismos escenarios en Platformer y Echo Runner |
| Projectile | Core ProjectilePool y gameplay-kit config tests | Acquire -> configure -> collision/TTL release -> reset -> reacquire |
| Animation | AnimationSystem legacy y SpriteAnimatorSystem tests | Completion events, pause/freeze, loops y rollback |
| VFX/renderer | DrawAdapter, PixelFxProceduralVFX, Visual Lab, goldens | Canvas/Skia contract y golden visual; medir presupuesto |
| Audio | IAudioPlayer, BaseGame routing, SoundBank, WebAudioPlayer y ExpoAudioPlayer | Un evento -> una reproducción; cooldown, pitch, voice budget y app lifecycle |

Los comandos definidos como obligatorios por docs/agents/OPERATING_CONTRACT.md:45-58 son:
- pnpm run check:agent-guardrails
- pnpm run ci
- pnpm run test:ci
- pnpm run test:games:ci
- pnpm run sprites:validate
- pnpm run sprites:build -- --check

**Estado en esta auditoría:** no ejecutados. Son criterios de validación de las futuras unidades, no checks que se puedan declarar aprobados en un informe de lectura.

---

## 16. Estado de los ledgers históricos

| Documento | Estado observado en el documento | Contraste con código actual |
|---|---|---|
| docs/agents/vfx-ledger.md | Fase 0 abierta; duplicación Asteroids del 07-11 corregida el 09-11; efectos 16/11 y 24/11 en progreso | La duplicación de rock:destroyed ya no aparece en el camino actual inspeccionado. Sigue existiendo otro doble request de shake en ship:damage. Los 20 efectos nuevos están registrados, pero el ledger dice que no existe wiring de gameplay. |
| docs/agents/juice-consolidation-ledger.md | Fases de hit-stop, shake y catálogo cerradas parcialmente; Space Invaders/Hit & Run aún con migración pendiente | HitRunScreenShake está declarado deprecated, pero HitRunFeedbackSystem escribe hoy en el componente de cámara. La deuda actual es la ruta directa de hit-stop que no utiliza requestHitStop. Space Invaders sigue usando GameplayFreeze y ufo:destroyed para impacto del boss. |
| docs/agents/pixelfx-vfx-quality-ledger.md | U1 visual recorder/golden implementado; U2/U3 y otras tareas parciales | El merge #1221 añadió 20 drawers adicionales después de las filas iniciales; no se declara aquí que sus raster goldens o paridad visual estén completos. |
| docs/agents/asteroids-gameplay-ledger.md | U0/U0b aprobadas; unidades multiplayer, safe spawn, tiers y UFO siguen pendientes según ledger | Se inspeccionó como contexto de autoridad y muerte de UFO. No se re-auditó toda la campaña Asteroids; sus hipótesis de multiplayer no se convierten en hechos en este documento. |
| docs/JUICE_SWORD_COMBAT_EVOLUTION_ROADMAP.md | Roadmap actualizado 26-10, con hit-stop y feedback como ejes | La sección 3.1 del roadmap describe el HitStop anterior con countdown paralelo en VFXWorldState; el código actual de HitStopSystem dice que GameplayFreeze es el único contador efectivo. Tratar la sección como historia, no como estado de implementación actual. |

---

## 17. Conclusión y recomendación ejecutiva

No se recomienda una consolidación masiva ni la creación de un framework global de combate, locomoción, animación o feedback. El repositorio ya contiene sistemas compartidos que se usan realmente. La prioridad es convertir sus contratos actuales en rutas obligatorias y medibles:

1. Un único punto de reproducción para PlaySFX y un único productor de shake/hit-stop por evento.
2. Una política de tiempo documentada y probada en Schedule, compatible con pause, slow motion, rollback y presentación.
3. Un contrato mínimo común para impactos y resolución de daño, con extensiones locales para Hit & Run y cada shooter.
4. Tipado sin any de los APIs que ya tienen múltiples consumidores.
5. Mantener la locomoción y ProjectilePool existentes, y utilizar tests de integración para impedir regresiones.
6. Completar la migración de animación y verificar Canvas/Skia con pruebas visuales antes de declarar paridad.

**La mayor ganancia inmediata no está en añadir una nueva abstracción, sino en retirar rutas redundantes y hacer cumplir las que ya existen.**

