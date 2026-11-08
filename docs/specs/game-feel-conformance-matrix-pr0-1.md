# Matriz de conformidad Game Feel (PR0.1)

**Fecha:** 2026-11-08  
**Estado:** Propuesta para Gate 0  
**Dependencias:** [Game Feel Architecture Contract](../architecture/GAME_FEEL_ARCHITECTURE.md), [ADR-003 PresentationGateway](./adr-003-presentation-gateway.md), [Roadmap v2](../roadmaps/game-feel-architecture-v2.md)

## 1. Propósito y convenciones

Esta matriz fija comportamientos observables para el contrato de Game Feel. Es criterio de salida de Fase 0 y guion de tests del piloto.

### Canales

- **Temporal autoritativo:** hit-stop. Lo resuelve la política temporal mediante GameplayFreeze. No pasa por PresentationGateway y se repite/restaura según el contrato de rollback.
- **Temporal de presentación:** impulso de shake. Pasa por PresentationGateway, canal \`shake\`.
- **Visual:** emisión VFX. Pasa por PresentationGateway, canal \`vfx\`.
- **Audio:** emisión/playback. Pasa por PresentationGateway, canal \`audio\`.

Los consumidores VFX, audio y Juice se suscriben directamente al EventBus. El Gateway solo decide admisión/supresión; no distribuye eventos ni ejecuta efectos.

### Estados de cada celda

- **Esperado:** comportamiento contractual verificable.
- **No aplica:** el estado no afecta a ese canal o no existe emisión configurada.
- **Pendiente:** depende de una decisión o capacidad futura; no se declara soportado.

### Severidad

El resolver de combate es el único dueño de \`ImpactSeverity\` (PR7). La calcula a partir del resultado/regla de combate y la añade solo a eventos para los que tenga significado de dominio, como \`combat:impact\`. No es obligatoria en \`combat:death\`. Los consumidores no la recalculan.

No se inventan magnitudes en PR0.1. Duraciones, amplitudes y tolerancias salen de catálogos o decisiones posteriores y se marcan por fijar.

## 2. Matriz 1 — Severidad de impacto

Aplica a eventos de combate que contengan \`ImpactSeverity\`, no a cualquier evento de muerte.

| Severidad | Hit-stop | Shake | Descriptor/perfil VFX | Cue audio |
|---|---|---|---|---|
| \`light\` | Nivel 0, por fijar | Nivel 0, por fijar | \`impact.light\` | \`impact.light\` |
| \`normal\` | Nivel 1, por fijar | Nivel 1, por fijar | \`impact.normal\` | \`impact.normal\` |
| \`heavy\` | Nivel 2, por fijar | Nivel 2, por fijar | \`impact.heavy\` | \`impact.heavy\` |
| \`critical\` | Nivel 3, por fijar | Nivel 3, por fijar | \`impact.critical\` | \`impact.critical\` |

Los identificadores de perfiles son distintos; pueden reutilizar samplers, curvas, assets y recursos internos. No se exige una implementación completamente independiente por severidad.

### Invariantes verificables

1. Las dimensiones configuradas como monotónicas no decrecen de \`light\` a \`critical\`. PR3/PR5/PR8/PR10 comprobarán las dimensiones que realmente existan (duración, intensidad, escala, densidad o nivel).
2. Cada severidad tiene un descriptor/perfil VFX y cue audio identificables y distintos.
3. Ningún consumidor recalcula severidad: todos consumen el valor semántico del evento.
4. El hit-stop no depende de que exista VFX; VFX no depende de que exista hit-stop.
5. Nivel 0 representa ausencia efectiva de respuesta en ese canal, no una magnitud indefinida.
6. Las escalas de temporal, visual y audio no se comparan entre sí; cada dominio mantiene unidades propias.

### Tests

- Resolver de combate produce la clasificación esperada.
- Tablas de respuesta de Juice, VFX y audio cubren los cuatro valores.
- Los tres resolvers reciben el mismo input semántico.
- Se prueba monotonicidad solo para atributos definidos como monotónicos.
- Evento sin \`ImpactSeverity\` válido no inventa un valor por defecto.

## 3. Matriz 2 — Estado del mundo

| Estado | Hit-stop autoritativo | Shake | VFX | Audio |
|---|---|---|---|---|
| Normal / local autoritativo | Solicitud resuelta por política temporal y GameplayFreeze | Gateway admite y se aplica una vez por emisión | Gateway admite y crea la emisión | Gateway admite y reproduce/programa el cue |
| Hit-stop activo | Permanece vigente según GameplayFreeze; no se crea otro reloj | Continúa según la política temporal de shake | \`advance\`: TTL/progreso avanzan con tiempo de presentación; el efecto puede expirar mientras la simulación está congelada | No se interrumpe por hit-stop |
| Resimulación / replay completo | Se repite/restaura según snapshot y contrato temporal | Suprimido (\`resimulating\`) | Suprimido (\`resimulating\`) | Suprimido (\`resimulating\`) |
| Misma emisión lógica entregada dos veces en una ejecución | No debe duplicar aplicación autoritativa; EventBus no garantiza exactly-once | Segunda admisión suprimida (\`duplicate\`) | Segunda admisión suprimida (\`duplicate\`) | Segunda admisión suprimida (\`duplicate\`) |
| Dos emisiones lógicas distintas de una ocurrencia | No aplica salvo que la política temporal las modele por separado | Ambas pueden admitirse | Ambas pueden admitirse | Ambas pueden admitirse |
| Dos ocurrencias reales distintas en el mismo tick | Ambas se resuelven según política temporal; no se deduplican solo por tick | Ambas admitidas | Ambas admitidas | Ambas admitidas |
| Sin consumidores registrados | El gameplay y la autoridad temporal permanecen correctos | No aplica | No aplica | No aplica |
| Renderer/drawer ausente | No se ve afectado | El gameplay no se ve afectado | La emisión lógica no invalida el hecho; no dibujar no equivale a fallo de gameplay | No se ve afectado |
| Renderer/drawer con error | No se ve afectado | No se ve afectado | El error se aísla en la salida visual; no invalida el evento ni impide otros consumidores | No se ve afectado |
| Error en un consumidor | No se ve afectado salvo que sea el propio consumidor temporal autoritativo | No debe impedir VFX/audio | No debe impedir audio/temporal | No debe impedir VFX/temporal |
| Pausa explícita | Política de GameplayFreeze independiente de la pausa; el scheduler actual suspende el contador de freeze | Pendiente: definir reloj y política de shake en pausa | Pendiente: TTL actual retorna durante \`IsPaused\`; decidir contrato de tiempo visual | Pendiente: definir comportamiento de playback/colas en pausa |
| Políticas \`freeze\` y \`scale(factor)\` durante hit-stop | No aplica | No aplica | Pendiente: requieren soporte del ciclo ECS y pruebas de progreso + TTL coherentes | No aplica |
| Predicción invalidada / rollback | Se restaura desde snapshot según modo de replay | Pendiente de confirmación/retractación PR16 | Pendiente de cancelación/retractación de emisiones especulativas PR16 | Confirmación por defecto; cancelación solo si voice programada admite cancelación PR16 |

### Precisiones contractuales

#### 3.1. Replay no es doble entrega

Se distinguen tres casos:

1. **Resimulación:** se reejecuta el mismo hecho al reconstruir el estado. El hit-stop sigue el contrato autoritativo; salidas de presentación suprimidas por Gateway.
2. **Doble entrega en la misma ejecución:** EventBus no ofrece exactly-once. El consumidor temporal debe respetar la idempotencia/propiedad de la solicitud autoritativa; Gateway deduplica emisiones de presentación.
3. **Dos ocurrencias distintas:** tienen identidad diferente aunque compartan tick, nombre de evento o entidades relacionadas; ambas pueden producir su respuesta.

No se utiliza \`tick\` como única clave de deduplicación.

#### 3.2. Unidad de deduplicación

La clave es \`(channel, occurrenceId, emissionId)\`.

Una ocurrencia puede producir varias emisiones legítimas en un mismo canal. El Gateway no deduplica cada partícula, primitiva o sample de audio; deduplica una emisión lógica.

La identidad de ocurrencia debe ser estable durante replay. EventBus no tiene hoy metadatos tick/sequence, así que la prueba queda bloqueada hasta aprobar e implementar el contexto lateral descrito por ADR-003.

#### 3.3. Dominios temporales

| Dominio | Responsabilidad | Durante hit-stop |
|---|---|---|
| Simulation time | Movimiento, física, gameplay y estado autoritativo | Congelado por GameplayFreeze/scheduler |
| Presentation time | Progreso visual y sistemas de presentación | Avanza con \`advance\` |
| Effect lifetime | Límite de existencia mediante TTL ECS | Decrementa con el mismo delta de presentación para \`advance\` |

No se elimina el tiempo de presentación al unificar la autoridad de hit-stop. Se eliminan relojes paralelos de hit-stop.

La inspección del código confirma que TTLSystem declara \`runsWhileFrozen\`, recibe frame delta durante GameplayFreeze y decrementa TTL; durante \`IsPaused\` retorna sin decrementarlo. \`freeze\` y \`scale\` no se consideran capacidades implementadas.

#### 3.4. Aislamiento de consumidores

Un fallo de renderer, drawer, audio player o consumidor de presentación no altera destrucción, daño, score, movimiento, drops ni estado autoritativo. EventBus ya captura excepciones de handlers durante el despacho inmediato; además, las fronteras internas de cada consumidor deben contener errores de backend y no convertirlos en fallos de gameplay.

## 4. Matriz 3 — Paridad del contrato de dibujo y fidelidad de adaptadores

Los tests de contrato se realizan sobre \`IDrawAdapter\` con un adaptador grabador, no comparando píxeles. Cada adaptador real se prueba aparte para comprobar que traduce las llamadas con fidelidad.

| Aspecto | Verificación | Tolerancia |
|---|---|---|
| Geometría y proporciones | Mismo descriptor y progreso producen la misma secuencia normalizada de primitivas | Exacta para datos normalizados; numérica donde exista conversión |
| Orden de capas | Misma secuencia de dibujo | Ninguna |
| Transformaciones y escala | Matrices equivalentes | Numérica, por fijar por operación |
| Alpha y color semántico | Mismo valor semántico por llamada | Exacta tras normalización; conversión backend documentada |
| Muestras de progreso | Inicio, pico, disipación y expirado | Ninguna en la muestra del contrato |
| Entidad ausente o expirada | No dibuja y no lanza error | Ninguna |
| Drawer con excepción | Error aislado; no invalida gameplay ni otros consumidores | Ninguna |
| Fidelidad Canvas | Cada llamada del contrato se traduce a la operación nativa esperada | Según contrato de cada operación |
| Fidelidad Skia | Cada llamada del contrato se traduce a la operación nativa esperada | Según contrato de cada operación |
| Snapshot visual | Informativo; útil para revisión, no bloqueante | Visual, por fijar |

Esta matriz demuestra paridad del contrato y fidelidad de adaptadores, no igualdad rasterizada de píxeles. Antialiasing, composición y pequeñas diferencias de rasterización pueden variar entre backends.

## 5. Casos del piloto — Asteroids \`combat:death\`

### Estado observado antes de migración

La muerte de una roca recorre \`AsteroidCollisionSystem.onCombatDeath\`. La auditoría previa identifica:

- Solicitud de explosión directa mediante \`spawnExplosionParticles\`.
- Segunda solicitud de la misma explosión mediante \`JuiceOrchestrator.triggerEvent("asteroids", "rock:destroyed")\`.
- Shake solicitado por el perfil de catálogo y de nuevo mediante \`Juice.shake\` directo.
- No hay aún consumidor/cue de audio de muerte de roca integrado a través de Gateway.
- El handler de muerte no tiene todavía una frontera única de admisión para todos los side-effects.

### Flujo objetivo

\`\`\`
combat:death
   ├── temporal consumer
   │     ├── hit-stop → GameplayFreeze (sin Gateway)
   │     └── shake → PresentationGateway("shake")
   ├── VFX consumer → PresentationGateway("vfx") → ECS VFX lifecycle
   └── Audio consumer → PresentationGateway("audio") → audio player
\`\`\`

Cada consumidor mantiene su suscripción directa al EventBus.

### Casos

| Caso | Resultado esperado |
|---|---|
| Una muerte de roca | Una emisión lógica de explosión, un impulso lógico de shake y el cue de audio configurado |
| La explosión contiene múltiples partículas/primitivas | Permitido; la cantidad interna la determina el perfil, no la deduplicación |
| La misma ocurrencia durante replay | Cero nuevas emisiones VFX, impulsos shake o audios |
| Dos muertes reales en el mismo tick | Dos emisiones lógicas independientes por canal configurado |
| Mismo evento repetido con la misma identidad | La segunda emisión por canal se suprime |
| Consumidores de presentación ausentes | La roca se destruye y el estado autoritativo permanece correcto |
| Renderer ausente | No dibuja; no invalida el evento |
| Drawer con error | No impide audio/temporal ni altera gameplay |
| Canvas y Skia | Pasa el contrato y la fidelidad de adaptadores |
| Rutas directas | Ninguna ruta pública crea VFX, aplica shake o reproduce audio sin consultar Gateway |
| Hit-stop en replay | Sigue restaurándose/ejecutándose según contrato temporal |

El piloto no debe exigir literalmente una sola entidad ECS: exige una emisión lógica de explosión. El descriptor puede materializarse en una o varias entidades internas sin cambiar la identidad de la emisión.

## 6. Criterios de salida de Fase 0

- [ ] El contrato normativo describe Gateway como guardia, no router.
- [ ] ADR-003 resuelve la identidad de ocurrencia contra la API real del EventBus.
- [ ] La clave de deduplicación incluye canal, ocurrencia y emisión lógica.
- [ ] Se separan replay, doble entrega y dos ocurrencias distintas.
- [ ] PR2 está reconciliado contra la implementación/test existentes sin duplicar trabajo.
- [ ] Predicción local y full replay están diferenciados por modo de producción.
- [ ] El inventario de audio identifica productores y consumidores actuales.
- [ ] Los estados \`freeze\`, \`scale\`, pausa y retractación no se declaran soportados prematuramente.
- [ ] El ledger registra evidencia de código y ejecución de tests por separado.
- [ ] Gate 0 recibe aprobación humana explícita.

## 7. Estado de verificación inicial (2026-11-08)

| Área | Estado | Evidencia |
|---|---|---|
| EventBus typed dispatch | Verificado | Handler \`(payload, event)\`; buffers guardan \`{event,payload}\`; sin metadata |
| World tick | Verificado | Getter público \`World.tick\`; no enlazado al EventBus |
| Hit-stop | Implementación localizada | GameplayFreeze snapshot resource, HitStopSystem y tests de scheduler |
| Tiempo VFX durante hit-stop | Verificado para \`advance\` | TTLSystem recibe frame delta durante GameplayFreeze; pausa explícita retorna |
| Predicción de producción | Parcialmente verificada | LocalPredictionSystem reconcilia transform/velocity y reproduce inputs por entidad |
| Full rollback en producción | No demostrado | RollbackSimulation existe y se ejercita en tests; no se localizó composición productiva en la búsqueda revisada |
| Audio | Parcial | BaseGame enruta PlaySFX directamente; hay consumidores de juego específicos; inventario completo pendiente |
| Piloto Asteroids | Gap | Explosión y shake duplicados; falta admisión común y cue audio |
| Canvas/Skia | Parcial | IDrawAdapter y adaptadores existen; falta conformidad de esta matriz |
