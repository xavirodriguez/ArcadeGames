# ADR-003 — PresentationGateway como guardia de admisión

**Fecha:** 2026-11-08  
**Estado:** Propuesto · dirección arquitectónica aprobable; identidad de ocurrencia bloqueada hasta validar la extensión de EventBus  
**Ámbito:** Game Feel Architecture · PR3  
**Relacionado:** `docs/architecture/GAME_FEEL_ARCHITECTURE.md`, `docs/specs/game-feel-conformance-matrix-pr0-1.md`, `docs/roadmaps/game-feel-architecture-v2.md`

## Contexto

El contrato de Game Feel separa EventBus, coordinación temporal, VFX, audio y backends Canvas/Skia. Los consumidores VFX, audio y temporal deben reaccionar de forma independiente al mismo hecho de gameplay. Sin embargo, la admisión de efectos de presentación está repartida entre comprobaciones de `world.isReSimulating`, llamadas directas como `spawnExplosionParticles` o `Juice.shake`, y la ruta `PlaySFX`.

Una guarda olvidada puede duplicar una salida durante resimulación. La deduplicación por sí sola tampoco puede resolver rutas de producción duplicadas que representen dos veces la misma emisión lógica: la arquitectura debe evitar las rutas redundantes y el guardia debe proteger la frontera de side-effects.

La propuesta del roadmap v1 describía el Gateway como router entre EventBus y consumidores. Esa forma contradice el contrato de consumidores paralelos y convierte el Gateway en un segundo bus. Este ADR resuelve esa ambigüedad.

## Evidencia de la API actual

La revisión del código de la rama base confirma:

- `EventBus.on` entrega actualmente `(payload, event)`; `EventHandler` no recibe metadatos de ocurrencia.
- `emit` y `emitDeferred` solo aceptan evento y payload.
- Los buffers de EventBus almacenan `{ event, payload }`; el despacho diferido no conserva tick ni secuencia.
- `EventBus` no conoce `World`.
- `World.tick` es un getter público, pero no existe un enlace actual que lo proporcione a EventBus como contexto de publicación.
- `World.isReSimulating` existe como estado de ejecución.
- EventBus no ofrece entrega exactly-once, historial durable ni compensación de rollback.

Por tanto, **la identidad sugerida como metadatos de EventBus no existe todavía en la API actual**. No se debe implementar una deduplicación fiable fingiendo que esos datos están disponibles.

## Decisión propuesta

Introducir PresentationGateway como **guardia de admisión consultado por cada consumidor**, nunca como router.

Cada consumidor sigue suscrito directamente al EventBus. Antes de materializar un side-effect, consulta al Gateway y ejecuta la salida únicamente si la decisión es `admit`.

~~~ts
type PresentationChannel = "vfx" | "audio" | "shake";

interface OccurrenceRef {
  eventName: string;
  occurrenceId: string;
  tick: number;
}

interface PresentationEmissionRef {
  occurrence: OccurrenceRef;
  /** Stable logical output identifier within the occurrence and channel. */
  emissionId: string;
}

type AdmissionDecision =
  | { kind: "admit" }
  | {
      kind: "suppress";
      reason: "resimulating" | "duplicate" | "paused";
    };

interface PresentationExecutionContext {
  readonly isResimulating: boolean;
  readonly isPaused: boolean;
  readonly currentTick: number;
}

interface PresentationGateway {
  admit(
    channel: PresentationChannel,
    emission: PresentationEmissionRef
  ): AdmissionDecision;
}
~~~

La forma final de los tipos puede ajustarse a las convenciones del repositorio, pero las siguientes propiedades son contractuales:

1. El Gateway decide solamente admitir o suprimir.
2. No escoge efectos, sonidos, colores, perfiles, intensidades, duraciones ni composiciones.
3. No despacha eventos, no se suscribe al EventBus, no tiene cola ni reloj.
4. No escribe ni restaura estado de gameplay.
5. No depende de Juice, VFX, audio, Canvas ni Skia.
6. El estado de ejecución se inyecta como contexto de solo lectura (`isResimulating`, `isPaused` y tick actual). Los consumidores no replican consultas a `world.isReSimulating` ni deciden localmente si un evento de gameplay se admite durante una pausa.
7. Cada consumidor produce su propio resultado tras una admisión positiva. El Gateway no ejecuta el efecto ni enruta la ocurrencia.

### Consumidores y canales

| Consumidor | Suscripción | Consulta | Side-effect protegido |
|---|---|---|---|
| Juice / cámara | Directa al EventBus | Canal `shake` | Aplicar impulso de shake |
| VFX | Directa al EventBus | Canal `vfx` | Crear emisión/entidades visuales |
| Audio | Directa al EventBus | Canal `audio` | Reproducir o programar audio |

La admisión es independiente por canal. Admitir `vfx` no bloquea `audio` ni `shake`.

**Hit-stop autoritativo no pasa por el Gateway.** Se resuelve por la política temporal y GameplayFreeze; debe repetirse según el contrato de rollback. Solo las salidas de presentación (impulso de shake, VFX y audio) se suprimen durante resimulación.

## Identidad de ocurrencia y emisión

Deben distinguirse:

- **Ocurrencia:** un hecho lógico de gameplay publicado una vez en la historia autoritativa.
- **Emisión:** una salida lógica concreta que un consumidor deriva de esa ocurrencia.

Una ocurrencia puede generar varias emisiones legítimas en un canal. Por tanto, deduplicar solamente por `(channel, occurrenceId)` puede suprimir efectos válidos.

La clave de deduplicación es:

`(channel, occurrenceId, emissionId)`

Ejemplo: la ocurrencia de muerte puede solicitar `death-explosion`, `death-flash` y `death-ring` como emisiones VFX distintas, o puede producir una única emisión lógica agregada que contenga toda la composición. No se deduplican partículas/primitivas internas; se deduplica la unidad lógica de salida.

### Requisito para EventBus

La identidad no debe añadirse al payload de gameplay, porque el payload describe hechos y semántica de dominio, no metadatos de transporte o política de presentación.

La dirección propuesta es transportar metadatos laterales de publicación:

- `eventName`
- `tick` capturado al publicar
- `sequence` determinista dentro del tick
- `occurrenceId` estable, derivado de esos metadatos

La extensión debe cumplir:

1. El ordinal se asigna cuando se publica el evento.
2. `emitDeferred` conserva los metadatos originales al encolar; no los genera durante `flushDeferred`.
3. La reproducción del mismo estado inicial, tick y orden de productores reconstruye la misma identidad.
4. La secuencia se reinicia/reconstruye correctamente cuando el replay vuelve a un tick anterior.
5. Los eventos inmediatos y diferidos tienen semántica definida y no comparten accidentalmente identidades.
6. Los eventos emitidos fuera de un tick de simulación tienen un contrato explícito; no se les asigna silenciosamente una identidad de gameplay.
7. EventBus no importa World. El tick se proporciona mediante un contexto/proveedor inyectado desde la frontera World/runtime.
8. Los tests prueban igualdad de identidades entre ejecución original y replay, incluidos nested emits y deferred flush.

El tick público de World demuestra que el dato existe, pero no resuelve por sí solo cómo se inyecta ni cómo se conserva la secuencia. Esa integración sigue **bloqueada hasta definir el cambio mínimo de API y probarlo**. PR3 incluye esta dependencia; no puede declarar deduplicación completa sin ella.

La secuencia solo es válida si el orden de publicación de productores es determinista. Si los productores concurrentes o callbacks externos pueden variar su orden, el ordinal global no es suficiente y debe diseñarse una identidad estable por origen antes de implementar.

## Política de la primera versión

Modo local autoritativo:

- Admitir una emisión válida cuando el mundo no está resimulando.
- Suprimir cualquier solicitud durante resimulación con razón `resimulating`.
- Suprimir nuevas emisiones de presentación derivadas de gameplay durante pausa explícita con razón `paused`. La admisión de audio UI/menú pertenece a su ruta independiente y no se bloquea por este estado.
- Suprimir una segunda admisión de la misma clave `(channel, occurrenceId, emissionId)` con razón `duplicate`.
- Mantener entradas de deduplicación por tick de ocurrencia, no por TTL de pared. Retenerlas mientras la ocurrencia pueda ser entregada dentro de su ciclo síncrono/diferido y limpiar cuando el tick autoritativo haya avanzado más allá de la ventana contractual.
- No asumir exactly-once en EventBus: el Gateway ofrece idempotencia de emisión en la frontera de presentación, no una garantía de entrega del bus.
- No admitir automáticamente eventos predichos como confirmados por el mero hecho de recibir un snapshot. La ruta actual de ACK de versión/tick no confirma causalmente una ocurrencia individual.

Los estados `defer` y `retracted` no se publican en la interfaz inicial. Se incorporarán en PR16 solo junto a semánticas implementadas de confirmación, retención y cancelación. Una emisión ya audible no se puede deshacer; VFX especulativo necesita identidad y ciclo de vida cancelables.

## Alternativas consideradas

| Opción | Ventajas | Inconvenientes |
|---|---|---|
| A. Comprobación local por API (`isReSimulating`) | Sin infraestructura nueva | Frágil; no centraliza deduplicación ni evita que una nueva API olvide la guarda |
| B. Gateway como router entre EventBus y consumidores | Un punto de flujo | Rompe consumidores paralelos; añade dispatch/orden de suscripción; deja fuera o acopla Juice; tiende a convertirse en un segundo bus |
| C. Guardia consultado por cada consumidor (propuesta) | Preserva suscripciones paralelas; cubre VFX, audio y shake; no despacha | Requiere enforcement arquitectónico en las fronteras de side-effect |
| D. Middleware/filtro dentro de EventBus | Un punto antes de los handlers | EventBus tendría que interpretar política de presentación; suprimir el evento entero impediría que hit-stop reciba el hecho durante replay |
| E. Solo proteger VFX y audio | Menor alcance inicial | Deja shake expuesto a duplicación pese a que es salida de presentación |

## Enforcement

La disciplina de consumidores no es suficiente. PR3 requiere:

1. APIs de side-effect de VFX/audio/shake encapsuladas como internas o protegidas por una capability de admisión que gameplay no pueda falsificar.
2. Tests arquitectónicos que enumeren las fronteras públicas de creación VFX, reproducción audio y aplicación de shake.
3. Tests de consumidor para comprobar que ninguna ruta se ejecuta cuando Gateway devuelve `suppress`.
4. Aislamiento de errores: fallo de un consumidor no impide que EventBus entregue el hecho a los demás ni altera gameplay.

No se consulta el Gateway por partícula, primitiva gráfica o llamada interna de un mismo efecto compuesto. Se consulta una vez por emisión lógica.

## Consecuencias

### Positivas

- EventBus sigue siendo distribución de hechos, no política de presentación.
- Juice, VFX y Audio permanecen consumidores independientes.
- La misma frontera de admisión protege los tres canales de salida.
- La deduplicación no confunde dos ocurrencias reales del mismo tick ni dos emisiones diferentes de una ocurrencia.
- Hit-stop conserva su ruta autoritativa y no queda bloqueado por la admisión visual/audio.
- Los backends y drawers no conocen rollback ni PresentationGateway.

### Negativas y riesgos

- La API actual del EventBus no tiene metadatos de ocurrencia; se necesita una extensión lateral.
- El ordinal por tick solo es correcto si el orden de publicación es determinista.
- Debe protegerse la superficie pública de efectos para que el guardia no se convierta en una convención voluntaria.
- La retención de claves debe cubrir la ventana real de entrega sin crecer indefinidamente.
- La confirmación y retractación de predicciones continúan fuera de alcance hasta PR16 y requieren evidencia de uso en producción.

## Verificación requerida para PR3

- Admisión local normal.
- Supresión durante resimulación para VFX, audio y shake.
- Supresión durante pausa explícita para nuevas emisiones de gameplay con razón `paused`; la ruta de audio UI/menú permanece independiente.
- Deduplicación de la misma emisión.
- Dos emisiones legítimas distintas de una misma ocurrencia admitidas en el mismo canal.
- Mismo evento y tick con dos occurrence IDs distintos: ambas ocurrencias admitidas.
- Canales independientes.
- Identidades idénticas en ejecución original y replay.
- `emitDeferred` conserva identidad asignada al publicar.
- Emisiones anidadas no colisionan.
- Fallo de VFX no impide audio ni temporal; fallo de audio no impide VFX.
- Hit-stop autoritativo se sigue solicitando durante replay.
- Gateway no importa World, Juice, VFX runtime, audio, Canvas ni Skia.
- Ninguna ruta pública de side-effect elude la admisión.

## Estado

La decisión arquitectónica de guardia frente a router queda propuesta para aprobación. La identidad basada en metadatos laterales es la dirección preferida, pero **no se considera validada contra la API actual**: EventBus carece hoy de esos metadatos. Gate 0 debe cerrar el contrato de integración antes de autorizar PR3.
