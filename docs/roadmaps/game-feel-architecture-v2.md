# Roadmap Game Feel Architecture v2

**Fecha de línea base:** 2026-11-08  
**Estado:** Fase 0 documental en curso · Gate 0 no aprobado  
**Sustituye:** roadmap Game Feel v1 (PR0–PR16)  
**Documentos normativos:** [Game Feel Architecture Contract](../architecture/GAME_FEEL_ARCHITECTURE.md), [ADR-003 PresentationGateway](../specs/adr-003-presentation-gateway.md), [Matriz PR0.1](../specs/game-feel-conformance-matrix-pr0-1.md)  
**Evidencia de implementación:** [Game Feel Architecture Ledger](../agents/game-feel-architecture-ledger.md)

## 1. Propósito y reglas de ejecución

Este roadmap organiza la consolidación de gameplay events, coordinación temporal, VFX, audio y presentación Canvas/Skia en ArcadeGames. No presume que una capacidad descrita por un contrato ya esté implementada.

Principios:

- Un contrato aprobado no equivale a una capacidad implementada. El ledger registra evidencia, estado y límites.
- Se valida un flujo vertical temprano antes de generalizar las abstracciones.
- Consolidar antes de abstraer, migrar antes de eliminar y probar antes de extender.
- No se introduce infraestructura sin un ADR que compare alternativas.
- Cada PR tiene una sola responsabilidad, alcance reversible y criterios propios.
- La evidencia de código, los tests existentes y la ejecución real de esos tests se reportan por separado.
- Ningún PR se fusiona sin autorización explícita.
- Ningún gate se considera superado por inferencia: requiere evidencia y aprobación humana.
- Todo consumidor de presentación conserva su suscripción directa al EventBus y consulta el PresentationGateway en su frontera de efectos. El Gateway no es router ni segundo bus.
- El hit-stop autoritativo se mantiene fuera del Gateway. Shake, VFX y audio sí pasan por él.

### Estados del ledger

| Estado | Significado |
|---|---|
| \`verified\` | Comportamiento observado directamente en el código revisado. |
| \`implemented\` | Implementación localizada; no implica que todos los tests estén ejecutados. |
| \`partial\` | Hay evidencia parcial, pero falta completar el contrato o inventario. |
| \`gap\` | El código observado contradice la frontera objetivo. |
| \`blocked\` | No se debe avanzar hasta resolver una dependencia o decisión. |
| \`unknown\` | No se ha reunido evidencia fiable; no equivale a ausencia. |
| \`not run\` | El test existe o está previsto, pero no se ha ejecutado en esta revisión. |
| \`not authorized\` | El trabajo runtime queda fuera del gate aprobado actualmente. |

## 2. Fase 0 — Contrato, evidencia y decisiones previas

**Objetivo:** reconciliar el contrato con el repositorio, validar las decisiones arquitectónicas y cerrar los inventarios antes de iniciar el piloto runtime.

| Unidad | Trabajo | Resultado / aceptación | Estado de línea base |
|---|---|---|---|
| PR0 | Revisar y aceptar el contrato (#1144) y reconciliar el ledger con el repositorio | Contrato coherente con la API real; filas unknown/blocked relevantes resueltas o justificadas | En curso |
| PR0.1 | Aprobar la matriz de conformidad | Casos objetivos por canal, evento y estado del mundo; suite trazable a la matriz | En curso |
| ADR-003 | PresentationGateway como guardia de admisión | Decisión guard-vs-router; identidad y emisión validadas contra EventBus/World reales | Dirección aprobable; identidad bloqueada por falta de metadatos actuales |
| Auditoría de rollback | Buscar reconciliación, replay y predicción en composiciones de producción (incluido Arkanoid) | Distinguir predicción local por entidad de replay completo que reejecuta productores | Evidencia inicial: predicción local en composición; replay completo en pruebas, uso de producción no demostrado |
| Auditoría de audio | Inventariar productores, suscriptores, llamadas de reproducción, límites de voz y guardas de replay | Mapa completo de productores/consumidores y rutas legacy | Parcial |

### Gate 0

Se supera únicamente cuando:

1. El contrato normativo, ADR y matriz no se contradicen.
2. La identidad de ocurrencia tiene un diseño implementable probado contra EventBus y World.
3. Se ha completado la auditoría de rutas de producción de rollback/predicción y audio.
4. Se ha actualizado el ledger con evidencia, estado de tests y desconocidos restantes.
5. Existe aprobación explícita de la Fase 0.

**No empieza ningún piloto runtime antes de Gate 0.** La rama documental de revisión no cambia comportamiento de juego.

## 3. Fase 1 — Tipos neutrales y tiempo fiable

### PR1 — Extraer contratos de identidad visual

Mover \`SharedVFXPrimitiveName\` y cualquier identidad compartida fuera de \`JuiceOrchestrator\`.

Criterios:

- \`VFXEffectIR\` no importa tipos ni comportamiento de \`JuiceOrchestrator\`.
- No se crea un módulo neutral genérico por anticipado: cada símbolo compartido debe tener al menos dos consumidores independientes reales.
- El módulo de contratos no importa Juice, VFX runtime, Canvas ni Skia.
- Sin cambio de comportamiento.
- Verificación por typecheck, pruebas de importación y búsqueda arquitectónica de dependencias.

### PR2 — Hit-stop canónico: revalidar y cerrar, no duplicar trabajo existente

La revisión inicial del código ya encuentra:

- \`World\` registra \`GameplayFreeze\` para snapshots.
- \`HitStopSystem\` mantiene prioridad/cooldown en \`JuiceHitStopPolicy\` y usa \`GameplayFreeze\` como único reloj de duración activa.
- \`Schedule\` congela fases autoritativas y permite las rutas de TTL/Presentation necesarias durante hit-stop.
- Existe \`GameplayFreeze.test.ts\` con cobertura de expiración, pausa, \`TimeScale=0\`, freeze indefinido y ejecución de Presentation/TTL/Juice durante freeze.
- El ledger de Juice registra pruebas adicionales de política y snapshot, pero no todas sus ejecuciones están acreditadas en esta revisión.

Por tanto, PR2 comienza como **revalidación de conformidad y cierre de gaps**. No se reimplementa el reloj si la evidencia del HEAD confirma que ya está resuelto.

Aceptación:

- Un solo reloj autoritativo de simulación: \`GameplayFreeze\`.
- Prioridad, extensiones y cooldown deterministas y snapshot-safe.
- El tick que consume el tiempo restante sigue congelado; la reanudación ocurre en el siguiente tick.
- La pausa explícita suspende el reloj de hit-stop según el contrato actual.
- El tiempo de presentación sigue siendo un dominio separado: la política \`advance\` continúa TTL/progreso durante hit-stop.
- Replay y restauración de estado temporal comprobados en los modos que usan full replay.

**No confundir «un solo reloj de hit-stop» con «un solo reloj para simulación y presentación».** Las políticas \`freeze\` y \`scale(factor)\` siguen siendo objetivo, no capacidad soportada, hasta que el ciclo ECS las implemente y pruebe.

### Gate 1

GameplayFreeze es la única autoridad para congelar la simulación; el ciclo de presentación mantiene su tiempo independiente; los tests requeridos están ejecutados y el ledger refleja resultados reales.

## 4. Fase 2 — Guardia y piloto vertical

**Caso:** Asteroids \`combat:death\` / destrucción de roca. La línea base identifica dos solicitudes de \`pixelfx_explosion\` y dos solicitudes de shake (catálogo y llamada directa).

### PR3 — PresentationGateway mínimo

Implementar un guardia de admisión, no un router.

Canales: \`vfx\`, \`audio\`, \`shake\`.

Contrato inicial:

- \`admit(channel, emission)\` devuelve \`admit\` o \`suppress\`.
- Supresión por resimulación y por emisión ya admitida.
- Deduplicación por \`(channel, occurrenceId, emissionId)\`; no solo por ocurrencia ni por tick.
- Una ocurrencia puede originar varias emisiones lógicas legítimas por canal.
- El contexto de ejecución se inyecta desde el runtime. Los consumidores no consultan cada uno \`world.isReSimulating\`.
- El Gateway no se suscribe al EventBus, no despacha, no encola, no tiene reloj y no modifica estado de gameplay.
- Hit-stop autoritativo no consulta el Gateway.
- VFX, audio y Juice siguen suscritos directamente al EventBus.
- La primera versión no publica \`defer\` ni \`retracted\` sin comportamiento implementado. Esos estados pertenecen a la ampliación condicionada de PR16.
- El enforcement incluye encapsulación de APIs de side-effect y tests arquitectónicos para VFX, audio y shake.

#### Dependencia técnica de identidad

El EventBus actual expone handlers \`(payload, event)\`, y sus buffers diferidos almacenan \`{ event, payload }\`; no adjunta tick, secuencia ni occurrence ID. \`World.tick\` sí existe como getter público, pero no está conectado al EventBus.

Antes de activar la deduplicación, PR3 debe incorporar o reutilizar un contexto de emisión que:

1. Capture el tick en el momento de \`emit\` / \`emitDeferred\` (no al vaciar el buffer).
2. Asigne una secuencia determinista por tick.
3. Entregue la identidad como metadato lateral al payload, sin introducir política en los hechos de gameplay.
4. Reconstruya la misma identidad al reproducir el mismo estado inicial, tick y orden determinista de emisiones.
5. Defina el comportamiento de emisiones fuera del ciclo de simulación.

La forma exacta de enlazar el proveedor de tick a EventBus queda como decisión técnica de PR3; EventBus no debe importar World. Si no puede garantizarse determinismo de la secuencia, PR3 no puede declarar deduplicación por ocurrencia como completada.

### PR10 — Consumidor de audio (adelantado como dependencia del piloto)

El identificador PR10 se conserva para trazabilidad, pero su ejecución se adelanta a después de PR3 y antes de PR4 para que el piloto pueda verificar los tres canales de presentación.

- Suscriptor de audio independiente, directo al EventBus.
- Consulta PresentationGateway antes de playback.
- \`PlaySFX\` queda clasificado como comando de presentación/compatibilidad, no como hecho de gameplay.
- El resolver de audio elige cue y opciones; no introduce selección de assets en el Gateway.
- Se inventarían antes las rutas legacy y se migrarían con tests.
- La ruta interna de playback no queda expuesta a productores gameplay sin admisión.

### PR4 — Piloto de extremo a extremo

- Un hecho tipado de gameplay.
- Consumidor temporal para hit-stop y solicitud de shake; hit-stop fuera del Gateway, shake dentro.
- Consumidor VFX independiente y ciclo de vida ECS existente.
- Consumidor audio independiente.
- El mismo contrato/drawer compartido se prueba con Canvas y Skia; la paridad completa se cierra en PR9.
- Escenario reproducible en Visual Lab.
- Se elimina la doble emisión de explosión y el shake directo redundante solo tras demostrar la ruta canónica.
- Una emisión lógica de explosión por muerte; el número interno de partículas/entidades lo define el perfil y no se confunde con la unidad de deduplicación.
- La ausencia/error de un consumidor o drawer no altera destrucción, score, drop ni otro resultado autoritativo.

### Gate 2

La matriz del piloto pasa para hit-stop, shake, VFX y audio; replay suprime las salidas de presentación; dos ocurrencias distintas del mismo tick no se confunden; Canvas y Skia ejecutan el mismo contrato; revisión humana aprobada.

Tras el primer efecto de una familia nueva (travesía, interacción o entorno), se detiene la migración y se valida la familia antes de extenderla.

## 5. Fase 3 — Consolidación temporal y eventos

| PR | Trabajo | Aceptación |
|---|---|---|
| PR5 | Screen shake canónico: API de solicitud, unidades normalizadas, prioridad, duración y atenuación | Una frontera de conversión de unidades; multiplicador de accesibilidad aplicado una sola vez; fallbacks conservados hasta migración completa |
| PR6 | Catálogo temporal de Juice: perfiles reutilizables y presets, separados del catálogo visual | No existe pipeline paralelo; Juice no crea entidades VFX ni selecciona primitivas |
| PR7 | Semántica de eventos de dominio | Resolver de combate es el único dueño de \`ImpactSeverity\`; solo aparece en hechos donde tenga significado de dominio; death no exige severidad de impacto |

### Gate 3

Los canales temporales están separados de los perfiles VFX/audio; la severidad se deriva una sola vez; shake usa unidades canónicas y respeta el multiplicador de accesibilidad.

## 6. Fase 4 — VFX y renderizado

| PR | Trabajo | Aceptación |
|---|---|---|
| PR8 | Ciclo de vida VFX: descriptor, entidad ECS, TTL y drawer, política temporal por efecto | Una ruta de emisión protegida por Gateway; usa ECS/TTL existente; expone punto de escala de intensidad/densidad para accesibilidad |
| PR9 | Paridad Canvas y Skia | Samplers/curvas compartidos; tests de contrato en \`IDrawAdapter\` con adaptador grabador; fidelidad de cada adaptador real probada aparte; tolerancias explícitas; sin exigir igualdad de píxeles |

Políticas de tiempo durante hit-stop:

| Política | Comportamiento | Estado |
|---|---|---|
| \`advance\` | Progreso y TTL avanzan a velocidad normal de presentación | Vigente en el camino TTL existente; revalidar |
| \`freeze\` | Progreso y TTL se congelan | Objetivo; requiere soporte ECS y tests |
| \`scale(factor)\` | Progreso y TTL avanzan proporcionalmente | Objetivo; requiere soporte ECS y tests |

El tiempo de presentación durante una pausa explícita se decide por separado. No se deduce de la política de hit-stop.

**PR10 ya se ejecutó antes del piloto**; en esta fase solo se incorporan correcciones de integración descubiertas durante PR8/PR9, si quedan justificadas y en un PR específico.

### Gate 4

Ciclo de vida VFX y audio conformes; paridad de contrato y fidelidad de Canvas/Skia verificadas; las capacidades no implementadas siguen marcadas como objetivo en el ledger.

## 7. Fase 5 — Migración por juego

Un PR por juego, pruebas propias y posibilidad de revertir. El orden definitivo sale del inventario actualizado.

| PR | Juego | Trabajo principal |
|---|---|---|
| PR11 | Arkanoid | Rutas de reconciliación, temporalidad y protección de side-effects |
| PR12 | Pong | Eliminar escrituras directas de freeze, partículas y audio |
| PR13 | Space Invaders | Normalizar productores y consumidores; verificar el contrato fuera del piloto |
| PR14 | Hit & Run | Confirmar que el shake existente tiene representación efectiva; retirar rutas huérfanas |
| PR15 | Otros juegos | Orden según auditoría e impacto, un juego por PR |

Regla de migración: no retirar fallbacks hasta demostrar la ruta nueva con tests de comportamiento y búsqueda de referencias. Si aparece full replay o evento predicho en producción, aplicar la condición de PR16 antes de migrar esa ruta.

### Gate 5

Cada juego migrado conserva sus invariantes autoritativos; ningún productor elude las fronteras compartidas; el ledger indica claramente qué juegos siguen legacy o parciales.

## 8. Fase 6 — Robustez y cierre

### PR16 — Rollback y confirmación (condicionado a evidencia)

Solo se implementa para un camino que reejecute productores o emita eventos predichos en producción.

Dependencias:

- Identidad de ocurrencia estable por tick y secuencia determinista.
- Deduplicación de PR3.
- Capacidad de cancelar/retractar VFX de PR8.
- Reproducción/confirmación de audio de PR10.
- Protocolo de confirmación causal por ocurrencia; un ACK genérico de snapshot/tick no confirma por sí solo un hecho concreto.

Alcance posible: deduplicación tras replay, retractación de VFX especulativos, audio confirmado por defecto y cancelación de voz programada solo si el backend realmente la soporta.

La auditoría de Fase 0 encuentra predicción local por entidad y reconciliación de transform/velocidad en producción. Eso no equivale a full replay del EventBus. La construcción de \`RollbackSimulation\`/\`MultiplayerReconciler\` está localizada en tests en la búsqueda revisada; su uso de producción no está demostrado. Por ello PR16 no se adelanta globalmente con la evidencia actual. Si un juego tiene una ruta real, esa migración queda bloqueada hasta que PR16 y sus dependencias estén listas.

### PR17 — Accesibilidad y preferencias

- Fuente de preferencias única en aplicación/settings.
- Intensidad de shake y reducción de movimiento.
- Supresión/reducción de destellos y densidad VFX.
- Audio independiente (gain/dynamic range) donde lo permita el backend.
- Usa los puntos de enganche de PR5 y PR8; no cambia gameplay ni duración autoritativa de hit-stop.

### PR18 — Presupuestos y rendimiento

Medir entidades activas, concurrencia, draw calls, CPU y GC en escenarios representativos. Pooling y degradación adaptativa solo si el profiling lo justifica.

### PR19 — Cierre

Eliminar fallbacks y APIs obsoletas, auditar referencias y actualizar el ledger. Ningún juego evita las fronteras compartidas.

### Gate 6

Rollback aplicado solo donde la evidencia lo exige; accesibilidad integrada; profiling basado en medidas; fallbacks retirados con evidencia; documentación y ledger completos.

## 9. Plantilla obligatoria por PR

Cada PR debe documentar:

1. Alcance explícito y responsabilidad única.
2. Archivos afectados y mapa de escritores/lectores/consumidores.
3. Invariantes de gameplay y presentación que deben preservarse.
4. Tests concretos y su comando.
5. Resultados separados: código, tests escritos, tests ejecutados, CI e integración visual.
6. Riesgos y plan de reversión.
7. Estado del ledger: verificado, parcial, unknown, bloqueado y no ejecutado.

Antes de implementar: auditar escritores, lectores y consumidores. Al terminar: actualizar el ledger. No declarar completado un criterio cuyo test no se haya ejecutado.

## 10. Registro de ejecución de esta línea base

| Fecha | Unidad | Evidencia / resultado | Estado |
|---|---|---|---|
| 2026-11-08 | Fase 0 — revisión inicial | Revisados EventBus, World.tick, Schedule, TTLSystem, HitStopSystem, GameplayFreeze, Asteroids death path, BaseGame audio y ledgers existentes | En curso |
| 2026-11-08 | PR2 | GameplayFreeze snapshot-registered; HitStopSystem usa GameplayFreeze como reloj único; existen tests de scheduler. La ejecución completa de la suite no se ha acreditado aquí | Implementación localizada; revalidación pendiente |
| 2026-11-08 | ADR-003 | EventBus no adjunta metadatos de ocurrencia; Gateway del contrato normativo estaba descrito como router y requiere corrección | Bloqueado hasta reconciliar contrato e identidad |
| 2026-11-08 | Runtime | Sin cambios runtime en esta línea base; Gate 0 aún no aprobado | No autorizado |
