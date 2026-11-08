# Matriz de conformidad Game Feel (PR0.1) — v2

**Fecha:** 2026-11-08  
**Estado:** Propuesta para revisión · Gate 0 abierto  
**Reemplaza:** versión 1 de PR0.1  
**Dependencias:** [Game Feel Architecture Contract](../architecture/GAME_FEEL_ARCHITECTURE.md), [ADR-003 PresentationGateway](./adr-003-presentation-gateway.md), [Roadmap v2](../roadmaps/game-feel-architecture-v2.md)

## 1. Propósito y alcance

Esta matriz define resultados observables para los canales de Game Feel ante hechos de gameplay y estados del mundo. Es criterio de aceptación de Fase 0 y guion de pruebas del piloto.

No afirma que todas las capacidades estén implementadas. Separa:

- el comportamiento ya observado en código;
- el comportamiento normativo que deben cumplir las implementaciones;
- las capacidades pendientes de una decisión o de trabajo runtime.

La matriz no fija duraciones, amplitudes, volúmenes, cantidades de partículas ni tolerancias numéricas sin una fuente de diseño o una medición. Esos valores pertenecen a los catálogos y perfiles propietarios y se incorporan a sus pruebas cuando estén definidos.

### 1.1. Canales y propiedad

| Canal | Propietario | Frontera de admisión | Observación |
|---|---|---|---|
| Hit-stop autoritativo | Juice / política temporal + GameplayFreeze | Fuera de PresentationGateway | Reconstruye el estado temporal autoritativo durante replay |
| Shake | Consumidor temporal Juice | PresentationGateway, canal shake | El Gateway decide admisión; Juice aplica su política temporal |
| VFX | Consumidor VFX | PresentationGateway, canal vfx | El consumidor resuelve descriptor, composición y entidades ECS |
| Audio | Consumidor Audio | PresentationGateway, canal audio | El consumidor resuelve cue, opciones y playback |

Los cuatro consumidores reaccionan de forma independiente al hecho tipado y conservan su suscripción directa al EventBus. PresentationGateway es un guardia consultado por cada consumidor; no se suscribe al bus, no distribuye eventos, no ejecuta efectos y no decide perfiles.

**Hit-stop autoritativo no consulta PresentationGateway.** El impulso de shake sí es una salida de presentación y debe consultar el canal shake. No debe existir una API pública de shake que permita eludir esa admisión.

### 1.2. Vocabulario de conformidad

- **Ocurrencia:** un hecho lógico concreto de gameplay, identificado de forma estable dentro de la historia de simulación.
- **Emisión:** una salida lógica concreta derivada de una ocurrencia para un canal.
- **occurrenceId:** identidad estable de la ocurrencia. Debe reconstruirse igual al reproducir la misma historia determinista.
- **emissionId:** identidad de una salida lógica dentro de una ocurrencia y canal. Una composición puede tener varias emisiones legítimas.
- **Admisión:** decisión del Gateway; no equivale a creación, dibujo o playback satisfactorio.
- **Entrega duplicada:** la misma ocurrencia y la misma emisión lógica llegan más de una vez.
- **Ocurrencias distintas:** hechos diferentes, aunque compartan tick, nombre de evento o entidades.

Estados usados en las celdas:

- **Esperado:** requisito observable y verificable.
- **No aplica:** el canal no participa en el caso.
- **Pendiente — decisión:** falta aprobar una política.
- **Pendiente — implementación:** la política está definida, pero el runtime aún no la soporta.
- **Condicional:** solo se prueba en una modalidad que realmente ejecuta ese comportamiento.

## 2. Matriz 1 — Severidad de impacto

Aplica solo a eventos cuyo significado de dominio incluya una clasificación de impacto. No debe extenderse automáticamente a todos los eventos combat:death.

El resolver de combate que confirma el resultado del impacto es el único propietario de ImpactSeverity. PR7 debe identificar el productor/resolver concreto y la regla de clasificación. Los consumidores reciben el valor semántico ya resuelto; no lo calculan a partir de daño, escala de entidad, color, VFX o sonido.

El tipo objetivo es:

    type ImpactSeverity = "light" | "normal" | "heavy" | "critical";

La forma y el evento concreto que lo transportará se cierran en PR7. El contrato actual de CombatHitEvent contiene amount, remainingHealth y category, pero no ImpactSeverity; CombatDeathEvent tampoco lo contiene. No se debe afirmar que el campo existe en runtime.

| Severidad | Perfil hit-stop | Perfil shake | Perfil/descriptor VFX | Cue de audio |
|---|---|---|---|---|
| light | impact.light o none, según catálogo | impact.light o none, según catálogo | impact.light | impact.light |
| normal | impact.normal o none, según catálogo | impact.normal o none, según catálogo | impact.normal | impact.normal |
| heavy | impact.heavy o none, según catálogo | impact.heavy o none, según catálogo | impact.heavy | impact.heavy |
| critical | impact.critical o none, según catálogo | impact.critical o none, según catálogo | impact.critical | impact.critical |

Los identificadores semánticos por severidad son distintos cuando el canal participa. Pueden reutilizar samplers, curvas, assets, capas y recursos internos. No se exige una implementación independiente por perfil. Un canal puede declarar explícitamente none para una severidad; no se interpreta como un valor numérico desconocido.

### Invariantes verificables

1. Cada canal define por separado qué atributo, si alguno, es monotónico de light a critical. Por ejemplo: duración o prioridad temporal; amplitud de shake; una medida de escala, densidad o energía visual; familia/tier de cue de audio.
2. Solo se prueba monotonicidad para atributos declarados monotónicos en el catálogo. No se exige que todos los canales aumenten en toda severidad.
3. Las unidades de hit-stop, shake, VFX y audio no se comparan entre sí. No existe una escala universal de intensidad.
4. Los perfiles semánticos por severidad tienen identificadores distinguibles, aunque reutilicen recursos internos.
5. Audio no tiene que aumentar decibelios con la severidad. Su prueba compara el cue/tier declarado, no loudness subjetiva.
6. Ningún consumidor recalcula ImpactSeverity.
7. Un evento sin severidad no recibe un valor por defecto inventado por un consumidor.
8. Hit-stop no depende de que exista VFX; VFX tampoco depende de que exista hit-stop.
9. combat:death no exige ImpactSeverity. Una muerte puede transportar otras clasificaciones de dominio —por ejemplo, causa o tier de destrucción— solo si gameplay las define.

### Tests de severidad

- El resolver de combate produce la clasificación esperada para entradas de dominio representativas.
- Las tablas temporales, VFX y audio cubren todos los valores admitidos.
- Los tres consumidores reciben exactamente el mismo valor semántico.
- Se comprueba la monotonicidad de cada atributo declarado, con unidades propias.
- Un evento sin severidad no activa una clasificación inferida.
- La prueba no exige que una muerte de asteroide se convierta en un impacto critical por ser grande o visualmente espectacular.

## 3. Matriz 2 — Estado del mundo

| Estado | Hit-stop autoritativo | Shake | VFX | Audio |
|---|---|---|---|---|
| Normal / local autoritativo | La solicitud entra en la política canónica; GameplayFreeze es el único reloj activo | Gateway admite una vez cada emisión lógica; Juice aplica la respuesta | Gateway admite la emisión; VFX crea la composición declarada | Gateway admite la emisión; Audio resuelve y reproduce/programa el cue |
| Hit-stop activo | Las nuevas solicitudes entran en arbitraje de prioridad/cooldown; no se crea un reloj paralelo ni se suman duraciones automáticamente | El envelope/TTL de shake avanza con tiempo de presentación según su perfil | Con advance, TTL y progreso avanzan con el mismo delta de presentación; el efecto puede expirar mientras gameplay sigue congelado | El audio ya iniciado no se interrumpe por hit-stop |
| Replay / resimulación completa | Se restaura el snapshot y se reejecutan las decisiones temporales autoritativas necesarias para reconstruir el estado | Nuevos impulsos suprimidos (resimulating) | Nuevas emisiones suprimidas (resimulating) | Nuevos playbacks suprimidos (resimulating) |
| Misma emisión lógica entregada dos veces en una ejecución | La solicitud temporal no debe extender ni duplicar la misma respuesta; idempotencia en la frontera temporal, no en Gateway | Segunda admisión suprimida (duplicate) | Segunda admisión suprimida (duplicate) | Segunda admisión suprimida (duplicate) |
| Dos emisiones lógicas distintas de una ocurrencia | No crean hit-stops adicionales salvo que el contrato declare solicitudes temporales distintas | Ambas pueden admitirse si sus emissionId son distintos | Ambas pueden admitirse si sus emissionId son distintos | Ambas pueden admitirse si sus emissionId son distintos |
| Dos ocurrencias reales distintas en el mismo tick | Ambas solicitudes entran en arbitraje; prioridad/cooldown determina cuáles se aplican. No se suman por defecto | Ambas emisiones llegan al Gateway; la composición del canal decide el resultado visual | Ambas emisiones se admiten si tienen identidades distintas | Ambas emisiones se admiten si tienen identidades distintas, sujetas a una política explícita de voces |
| Sin consumidor registrado para un canal | La corrección de gameplay no depende de que exista el consumidor temporal; la respuesta temporal configurada puede no materializarse si ese consumidor falta | Sin consumidor, no hay salida de shake | Sin consumidor, no hay salida VFX | Sin consumidor, no hay playback |
| Renderer/drawer ausente | No se ve afectado | No se ve afectado | La emisión puede estar admitida pero no dibujarse; no lanza error ni invalida el hecho de gameplay | No se ve afectado |
| Error en renderer/drawer | No se ve afectado | No se ve afectado | El fallo se diagnostica y queda aislado; no impide otros consumidores | No se ve afectado |
| Error en un consumidor | Un fallo temporal no debe invalidar el hecho de gameplay; se registra el fallo | No debe impedir VFX ni Audio | No debe impedir shake ni Audio | No debe impedir shake ni VFX |
| Pausa explícita | El contador activo de GameplayFreeze se suspende | Objetivo: congelar envelope y duración; no admitir nuevos impulsos de gameplay | Objetivo: congelar TTL y progreso; se conserva el último frame | Objetivo: no admitir nuevos cues de gameplay. Las voces one-shot activas se pausan/reanudan si el backend lo soporta; si no, se detienen y no se reproducen tarde. Audio UI/menú mantiene una política independiente |
| Políticas freeze y scale(factor) durante hit-stop | No aplica | No aplica salvo que un perfil de shake las declare | Pendiente — implementación: requieren soporte ECS y pruebas de progreso + TTL coherentes | No aplica |
| Corrección de predicción local solo de transform/velocidad | No aplica si no reejecuta productores de gameplay | No se generan eventos nuevos por el mero hecho de reconciliar transforms | No se generan eventos nuevos por el mero hecho de reconciliar transforms | No se generan eventos nuevos por el mero hecho de reconciliar transforms |
| Evento predicho invalidado por full rollback | Condicional: se restaura/reconstruye según snapshot y replay | Condicional: cualquier salida especulativa previa debe poder cancelarse por identidad o esperar confirmación | Condicional: salida especulativa solo si puede retractarse por identidad; por defecto confirmed-only si no existe contrato de cancelación | Confirmed-only por defecto; speculative solo si una voz programada puede cancelarse antes de ser audible |

### 3.1. Replay, doble entrega y ocurrencias distintas

Son tres casos diferentes y no deben compartir una única prueba:

1. **Replay:** el mundo restaura un snapshot y reejecuta la simulación. El hit-stop participa en la reconstrucción autoritativa; shake, VFX y audio no producen side-effects nuevos durante resimulación.
2. **Doble entrega en una misma línea de ejecución:** EventBus no ofrece exactamente-una-vez. El productor debe evitar publicar dos veces el mismo hecho; la política temporal debe ser idempotente y Gateway deduplica las emisiones de presentación.
3. **Dos ocurrencias distintas:** ambas tienen identidades distintas aunque compartan tick, event name o entidades. No se suprimen por compartir tick.

El estado de deduplicación no puede ser un caché global no restaurado que impida reconstruir hit-stop después de restaurar un snapshot. La idempotencia temporal debe respetar el ámbito de la línea de simulación y su restauración.

### 3.2. Unidad de deduplicación de presentación

La clave del Gateway es:

    (channel, occurrenceId, emissionId)

Reglas:

- Una ocurrencia puede generar varias emisiones legítimas dentro del mismo canal.
- Dos emisiones con emissionId distintos no se deduplican entre sí.
- Repetir la misma clave en el mismo ámbito de ejecución se suprime.
- Dos occurrenceId distintos nunca se fusionan por compartir tick.
- La deduplicación no se aplica a cada partícula, primitive, draw call o sample de audio interno. Se aplica a la emisión lógica.
- La admisión es independiente por canal: admitir shake no admite automáticamente VFX ni audio.
- Un fallo posterior al resultado admit se registra y queda aislado. La v1 no define reintentos automáticos de una emisión fallida.

El Gateway no deduplica hit-stop. La política temporal necesita su propia identidad de solicitud/idempotencia para no prolongar o duplicar una solicitud repetida. Esa protección debe ser snapshot-safe y no puede impedir la reconstrucción de la línea temporal durante replay.

### 3.3. Identidad de ocurrencia: dependencia de EventBus

La identidad debe viajar como metadato lateral de publicación, no como campo artificial añadido a cada payload de dominio.

La dirección de ADR-003 requiere como mínimo:

- nombre de evento;
- tick capturado al publicar;
- secuencia determinista en el ámbito acordado;
- occurrenceId estable derivado del contexto de publicación.

emitDeferred debe conservar los metadatos asignados al publicar; no puede generarlos al ejecutar flushDeferred. EventBus no debe importar World; el contexto de tick debe inyectarse desde la frontera World/runtime. El diseño final debe cubrir emisión inmediata, diferida, nested emits y eventos emitidos fuera de un tick.

**Bloqueo actual:** la API revisada de EventBus entrega (payload, event) y almacena { event, payload } en el buffer diferido. No expone tick, secuencia ni occurrenceId. World.tick existe, pero no está conectado a EventBus. No se puede afirmar deduplicación por ocurrencia hasta implementar y probar ese contexto.

### 3.4. Orden determinista de pares y publicación

Una secuencia global por tick solo reconstruye identidades estables si los productores publican en un orden determinista. La identidad no puede corregir un orden de entrada que varía entre ejecución normal y replay.

La auditoría de Asteroids del 2026-11-08 encontró que BroadPhase usa Shell sort por minX sin desempate por entity ID. Shell sort no es estable; con varios bounds de igual minX, el orden de recorrido puede variar respecto al orden de entrada. Los tests actuales de pares normalizan/ordenan el conjunto y, por tanto, no prueban el orden de producción.

Antes de declarar estable la secuencia de ocurrencias en este camino, las pruebas deben:

1. Crear entidades cuyo minX coincida, con IDs y orden de inserción conocidos.
2. Capturar y afirmar la secuencia exacta de pares producidos; no ordenar el resultado antes del assert.
3. Capturar la secuencia exacta de publicaciones combat:hit y combat:death.
4. Repetir el escenario con ejecución normal y full replay; comparar ambas secuencias exactamente.
5. Caracterizar que el test detecta el comportamiento actual y que pasa con un comparador total candidato como (minX, entityId).

El comparador candidato no se declara implementado ni aprobado por esta matriz. La corrección del orden debe revisarse y entregarse como unidad runtime independiente. Hasta entonces, la asignación por secuencia global queda bloqueada para los eventos de Asteroids cuyo orden dependa de esa enumeración.

### 3.5. Dominios temporales

| Dominio | Responsabilidad | Durante hit-stop | Durante pausa explícita |
|---|---|---|---|
| Simulation time | Movimiento, física, reglas y estado autoritativo | Congelado por GameplayFreeze/scheduler | Congelado |
| Presentation time | Progreso de sistemas y animaciones de presentación | Avanza con advance | Objetivo: congelado |
| Effect lifetime | Existencia ECS mediante TTL | Decrementa con el mismo delta que el progreso para advance | Congelado |
| Audio playback time | Reproducción de voces y cues | Continúa | Gameplay one-shots pausados/reanudados si es posible; de lo contrario se detienen y descartan |

No se elimina el tiempo de presentación al unificar la autoridad de hit-stop. Se eliminan relojes paralelos de hit-stop.

La inspección actual confirma que TTLSystem declara runsWhileFrozen, recibe frame delta durante GameplayFreeze y decrementa TTL; con IsPaused === true, retorna sin decrementarlo. freeze y scale no se consideran capacidades implementadas.

La pausa explícita no equivale a hit-stop. La política objetivo congela también shake y animaciones Juice; debe probarse que todos los sistemas de presentación observan el mismo estado de pausa. El contrato de admisión debe exponer el estado paused y una decisión de supresión para nuevos cues de gameplay. Esta ampliación debe quedar reflejada en ADR-003 antes de cerrar Gate 0. El audio de UI/menú es una ruta separada y no debe bloquearse por la pausa del gameplay.

### 3.6. Aislamiento de consumidores

Un fallo en renderer, drawer o audio player no puede alterar destrucción, daño, score, movimiento, drops ni estado autoritativo.

Cada consumidor debe contener sus errores de presentación y reportarlos. Un error en VFX no impide que Audio y Juice reciban el mismo hecho; un error en Audio no impide VFX y Juice. La admisión positiva no garantiza que el backend haya dibujado o reproducido con éxito.

No basta con probar que EventBus captura excepciones en un tipo de despacho: deben verificarse también las rutas inmediatas, diferidas y las excepciones internas de cada consumidor/backend.

## 4. Matriz 3 — Paridad del contrato de dibujo y fidelidad de adaptadores

La conformidad tiene dos niveles separados:

1. **Contrato común del drawer:** el mismo descriptor y progreso producen la misma secuencia normalizada de llamadas sobre IDrawAdapter.
2. **Fidelidad de cada backend:** Canvas y Skia traducen las llamadas del contrato a sus operaciones nativas correctamente.

Los tests del contrato usan un adaptador grabador. No comparan píxeles. Cada adaptador real se prueba aparte con contextos controlados.

| Aspecto | Verificación | Tolerancia |
|---|---|---|
| Geometría y proporciones | Mismo descriptor/progreso produce la misma secuencia normalizada de primitivas | Exacta tras normalización; epsilon numérico por operación cuando haya conversión |
| Orden de capas | Misma secuencia de dibujo y mismo orden de composición | Ninguna |
| Transformaciones y escala | Matrices y transformaciones equivalentes | Numérica, definida por operación y escala de coordenadas |
| Alpha y color semántico | Mismo valor semántico en cada llamada | Exacta tras normalización; conversión backend documentada |
| Muestras de progreso | Inicio, instante de pico definido por el perfil, disipación y expirado | Exacta para la secuencia de llamadas; valores numéricos según tolerancia de cada propiedad |
| Entidad ausente o expirada | No dibuja y no lanza error | Ninguna |
| Drawer con excepción | Excepción diagnosticada y aislada; no invalida gameplay ni otros canales | Ninguna |
| Fidelidad Canvas | Cada llamada semántica se traduce a la operación Canvas esperada; transform/save/restore y alpha se verifican | Según contrato de cada operación |
| Fidelidad Skia | Cada llamada semántica se traduce a la operación Skia esperada; transform/save/restore y alpha se verifican | Según contrato de cada operación |
| Snapshot visual | Útil para inspección y revisión perceptual; no bloqueante para igualdad de contrato | Visual, por fijar |

Notas:

- El instante de pico y las muestras intermedias se obtienen del perfil/curva del efecto. La matriz no impone que todos los efectos tengan su pico en el mismo progreso numérico.
- No se exige igualdad rasterizada de píxeles. Antialiasing, composición y detalles del rasterizador pueden variar.
- Un adaptador grabador prueba el contrato común, no la fidelidad de Canvas ni de Skia.
- Las tolerancias numéricas deben declararse por propiedad/operación; no usar un epsilon global que oculte divergencias de escala.

## 5. Caso piloto — Asteroids combat:death

### 5.1. Línea base observada

La auditoría de AsteroidCollisionSystem.onCombatDeath confirma estas rutas:

- spawnExplosionParticles solicita directamente pixelfx_explosion.
- Después, triggerEvent("asteroids", "rock:destroyed") resuelve el mismo primitive desde JUICE_CATALOG y vuelve a solicitar pixelfx_explosion.
- El perfil de catálogo también solicita shake y, después, el handler llama directamente a Juice.shake: existe una solicitud redundante.
- spawnExplosionParticles invoca además el hook del mod visual/de gameplay o spawnLayeredExplosion. Esa composición puede ser deliberada y debe contabilizarse separadamente; no se debe borrar por el hecho de deduplicar el efecto principal.
- El handler emite un comando PlaySFX de muerte. La ruta completa de admisión de ese cue a través del Gateway no está verificada.
- El mismo handler también resuelve score/combo, drops, fragmentación y eliminación. No debe suprimirse la ejecución completa del handler durante replay para evitar side-effects visuales.

### 5.2. Contrato objetivo del piloto

Una muerte produce una ocurrencia lógica de destrucción. De ella se derivan emisiones independientes por canal:

- una emisión lógica principal de explosión, por ejemplo asteroid-death-main;
- cero o más sub-emisiones visuales deliberadas, cada una con identidad estable o agrupadas como composición interna de la emisión principal;
- una emisión lógica de shake;
- un cue de audio seleccionado por el consumidor de Audio.

El número interno de partículas, draw calls o entidades ECS no define el número de emisiones lógicas. La deduplicación opera sobre las emisiones declaradas, no sobre sus primitivas internas.

### 5.3. Casos de prueba

| Caso | Resultado esperado |
|---|---|
| Una muerte de roca | Una ocurrencia de dominio; gameplay de destrucción se procesa una sola vez en la línea autoritativa |
| Explosión principal | Una única admisión/emisión lógica de pixelfx_explosion; no dos rutas que creen el mismo efecto principal |
| Subcomposición visual | Hooks de mod o spawnLayeredExplosion se conservan solo si el perfil los declara; se verifican como sub-emisiones distintas |
| Shake | Una única emisión lógica admitida por canal shake; no hay llamada directa paralela a Juice.shake |
| Audio | Un único cue lógico de muerte admitido por canal audio; el resolver escoge el cue según el hecho/clasificación de dominio |
| Misma emisión repetida con la misma clave | Segunda admisión del mismo (channel, occurrenceId, emissionId) suprimida |
| Dos emisiones visuales distintas de la misma muerte | Ambas admitidas si tienen emissionId distintos y están declaradas en el perfil |
| La misma ocurrencia en replay | Cero nuevas emisiones VFX, impulsos shake y playbacks; el hit-stop se reconstruye por su ruta autoritativa |
| Dos muertes distintas en el mismo tick | Ambas ocurrencias y emisiones se conservan; el hit-stop entra en arbitraje y no se suma automáticamente |
| Sin consumidores de presentación | Destrucción, score/combo, drops, fragmentación y eliminación conservan su resultado autoritativo |
| Renderer ausente | No dibuja; la ocurrencia y otros canales no se invalidan |
| Drawer con error | Error aislado; Audio, temporal y gameplay continúan |
| Canvas y Skia | Cumplen el contrato común y las pruebas de fidelidad de cada adaptador |
| Orden de colisiones/eventos | La secuencia exacta de pares y de combat:hit/combat:death es estable entre ejecución normal y full replay |
| Búsqueda de rutas directas | Ninguna API pública crea VFX, aplica shake o reproduce audio sin consultar la frontera de admisión |

### 5.4. Invariante de separación gameplay/presentación

El handler de muerte puede ejecutar gameplay autoritativo y publicar el hecho incluso durante la reconstrucción de una simulación. No debe usar un return global por world.isReSimulating para suprimir también score, drops, fragmentación o destrucción.

La supresión de side-effects de presentación ocurre en la frontera de admisión de cada canal. Esta separación es condición explícita del piloto.

## 6. Organización de las pruebas

No se crea una suite monolítica que importe todos los juegos, backends y sistemas. La matriz es común; las pruebas viven junto al comportamiento propietario.

| Nivel | Ubicación/responsabilidad | Casos mínimos |
|---|---|---|
| EventBus / identidad | Tests de packages/core | Metadatos inmediatos/diferidos, nested emits, tick/sequence, replay estable |
| Orden de colisiones | Tests de BroadPhase/Collision y caracterización de Asteroids | Empates minX, orden exacto de pares y publicación, ejecución normal vs replay |
| Gateway | Tests del módulo compartido PresentationGateway | Admit, resimulating, duplicate, paused, canales independientes, claves distintas |
| Consumidor temporal | Tests de Juice/HitStopSystem | Idempotencia de hit-stop, replay snapshot-safe, prioridad/cooldown; shake consultando Gateway |
| Consumidor VFX | Tests del resolver y ciclo ECS | Una emisión lógica, composición, TTL/progreso, cancelación solo cuando exista soporte |
| Consumidor Audio | Tests del resolver/player | Admisión, deduplicación, voz activa durante pausa y aislamiento de errores |
| Draw contract | Tests de drawers con adaptador grabador | Secuencia de comandos, muestras y expiración |
| Adaptadores | Tests específicos Canvas y Skia | Traducción fiel de cada operación |
| Piloto | Integración en src/games/asteroids | Muerte real, replay, duplicado, mismo tick, ausencia/error de consumidores |

Los tests de orden deben afirmar secuencias exactas; no ordenar ni convertir a sets los resultados antes de comparar. Los tests de replay comparan tanto el orden como el contenido de las publicaciones relevantes.

## 7. Criterios de salida de PR0.1 / Gate 0

- [ ] Contrato, ADR-003 y matriz describen Gateway como guardia consultado por consumidores, no router.
- [ ] ADR-003 incluye el estado explícito de pausa y la decisión suppress: paused, o documenta una alternativa equivalente aprobada.
- [ ] La unidad de deduplicación de presentación es (channel, occurrenceId, emissionId).
- [ ] Hit-stop tiene una regla de idempotencia propia, fuera del Gateway y compatible con snapshots/replay.
- [ ] Se diferencian replay, doble entrega, varias emisiones de una ocurrencia y dos ocurrencias distintas.
- [ ] La propuesta de identidad de EventBus conserva metadatos en emitDeferred y no genera identidad al hacer flush.
- [ ] Se prueba que el orden de publicación requerido para la identidad es determinista. En Asteroids, el caso de minX coincidentes compara orden exacto de pares y de combat:hit/combat:death en normal y replay.
- [ ] El diseño de severidad especifica el propietario de dominio y no exige ImpactSeverity en combat:death.
- [ ] La política objetivo de pausa distingue gameplay, presentación y audio UI; las diferencias actuales de JuiceSystem/ScreenShakeSystem quedan registradas como gaps hasta verificarlas.
- [ ] advance está respaldado por el ciclo TTL existente; freeze y scale siguen como capacidades pendientes hasta implementarse y probarse.
- [ ] Canvas/Skia se prueban en contrato común y fidelidad individual, sin exigir igualdad de píxeles.
- [ ] El piloto distingue emisión principal, subcomposición, shake y audio; preserva el resultado autoritativo de gameplay.
- [ ] El ledger separa código localizado, tests escritos, tests ejecutados y CI.
- [ ] Gate 0 recibe aprobación humana explícita.

Gate 0 no afirma que el runtime ya pase todas las pruebas del piloto. Autoriza el inicio del trabajo runtime solo cuando los contratos, dependencias y criterios son inequívocos. Las pruebas de implementación se ejecutan en sus PR propietarios.

## 8. Estado de evidencia de la línea base

| Área | Estado | Evidencia y limitación |
|---|---|---|
| EventBus | Verificado parcialmente | Entrega (payload, event) y almacena { event, payload } en deferred; no expone tick, secuencia ni ocurrencia |
| World.tick | Verificado | Getter público; no está enlazado actualmente a EventBus |
| Secuencia de publicación Asteroids | Gap caracterizado | BroadPhase Shell sort no estable para minX coincidente; el comparador actual no desempata por entity ID |
| Orden de pares en tests existentes | Insuficiente | Tests existentes normalizan/ordenan el conjunto y no prueban orden de recorrido |
| Hit-stop | Implementación localizada | GameplayFreeze es reloj activo snapshot-registered; HitStopSystem conserva política de prioridad/cooldown. La ejecución de toda la suite no se acredita por esta matriz |
| TTL durante hit-stop | Verificado para advance | TTLSystem corre durante GameplayFreeze y recibe frame delta |
| Pausa explícita | Parcial | Schedule suspende el contador de GameplayFreeze; TTLSystem retorna con IsPaused; la política de JuiceSystem, shake y Audio requiere conformidad explícita |
| Predicción de producción | Parcialmente verificada | LocalPredictionSystem reconcilia transform/velocity y reproduce inputs por entidad; no reejecuta el pipeline completo de eventos |
| Full replay en producción | No demostrado en las composiciones revisadas | RollbackSimulation existe y se prueba; no se localizó en la búsqueda revisada una composición productiva que reejecute productores de gameplay |
| Audio | Parcial | Existen productores PlaySFX y consumidores directos/game-specific; la admisión común todavía no está integrada en todas las rutas |
| Piloto Asteroids | Gap | Doble solicitud del efecto principal y shake redundante; cue de muerte emitido como PlaySFX sin ruta Gateway verificada |
| Canvas/Skia | Parcial | IDrawAdapter y adaptadores existen; falta conformidad de esta matriz y fidelidad de cada adaptador probada por separado |

Esta tabla refleja evidencia de inspección del repositorio a 2026-11-08. No afirma que los tests se hayan ejecutado en esta actualización documental.

## 9. Historial de revisión

### v2 — 2026-11-08

- Separa la idempotencia de hit-stop de la deduplicación VFX/Audio/shake del Gateway.
- Distingue ocurrencia, emisión lógica, varias emisiones de una ocurrencia y ocurrencias distintas en un mismo tick.
- Define una política objetivo para pausa explícita y exige reflejarla en ADR-003.
- Aclara que severidad es propiedad del dominio de combate y que combat:death no la requiere automáticamente.
- Añade el requisito de orden determinista de pares y publicaciones para que la identidad por secuencia sea reproducible; incluye el caso Asteroids de minX coincidente.
- Corrige el piloto para contar la emisión principal separada de subefectos, shake y audio, preservando gameplay durante replay.
- Separa contrato común de dibujo y fidelidad de los adaptadores Canvas/Skia.
- Mantiene rollback de eventos predichos como condicional hasta que exista un camino productivo demostrado.
