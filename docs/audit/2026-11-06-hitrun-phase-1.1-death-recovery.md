# Hit & Run — Fase 1.1 / PR8: Death Recovery Integration

Fecha: 6 de noviembre de 2026  
Base: PR7 `fix/hitrun-hit-reaction-time-consistency`  
Rama: `fix/hitrun-death-recovery-timescale`

## Hallazgos

- `Schedule.update` espera que `TimeScale` sea un objeto con propiedad numérica `scale`; `HitRunDeathFlowSystem` estaba guardando números (`0.28` y `1`). Con ese valor, el scheduler no podía leer el multiplicador.
- El scheduler pasa `scaledDeltaTime` a sistemas ordinarios de Simulation, pero pasa delta sin escalar a sistemas con `runsWhileFrozen = true`.
- DeathFlow calculaba `deltaTime / scale`, suponiendo que recibía tiempo escalado. Además de partir de un recurso incompatible, la primera actualización posterior a activar slow motion recibía el delta anterior a la activación. Esta combinación hacía impreciso el intervalo.
- `BaseGame.restart` destruye EventBus y World, crea un World nuevo y vuelve a inicializar los sistemas. La recuperación no necesita un reset manual de cada sistema en el mismo World.

## Cambios

- HitRunDeathFlowSystem se marca `runsWhileFrozen`: su transición de presentación usa tiempo de pared, aunque el resto del juego esté en slow motion.
- El sistema comprueba `IsPaused` antes de modificar el estado; una pausa explícita suspende el timer.
- La escala se escribe mediante el contrato de TimeScale (objeto con `scale` y `remainingDuration`), preservando una instancia existente o creando `new TimeScale(scale)`.
- El countdown resta directamente el delta sin escalar y no divide de nuevo por el multiplicador.
- La guarda de eventos conserva una sola muerte durante flow activo o requestRestart.
- Se añade cobertura de temporizador, objeto TimeScale, eventos letales duplicados, evento obsoleto y pausa/reanudación.

## Contrato verificado

ALIVE → DEATH_PENDING → DEATH_SLOW_MOTION → RESTART_REQUESTED → ALIVE (nuevo World).

`RunState.deaths` aumenta cuando la muerte se consume, no por cada evento duplicado. El reinicio permanece solicitado hasta que la UI consume `requestRestart`; `BaseGame.restart` reconstruye World y EventBus.

## Validación

Pruebas nuevas: `HitRunDeathRecoveryIntegration.test.ts`. No ejecutadas localmente. Requiere CI, typechecks de app/core y las suites de Hit & Run. No se debe fusionar antes de PR6 y PR7.
