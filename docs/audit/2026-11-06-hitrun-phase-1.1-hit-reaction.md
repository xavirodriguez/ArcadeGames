# Hit & Run — Fase 1.1 / PR7: Hit Reaction Integration

Fecha: 6 de noviembre de 2026  
Base: PR6 `fix/hitrun-wave-lifecycle-integrity`  
Rama: `fix/hitrun-hit-reaction-time-consistency`

## Orden confirmado del scheduler

El orden de fases por defecto en `packages/core/src/ecs/Schedule.ts` es Input → Simulation → Transform → Collision → GameRules → Presentation. Dentro de cada fase se ordena por prioridad descendente.

En Hit & Run:
- BeltMovement corre en Simulation priority 10.
- EnemySensor corre en Simulation priority 15.
- StateMachineSystem corre en Simulation priority 16.
- HitRunShootCooldownSystem corre en Simulation priority 17.
- HitRunHurtSystem corre en GameRules priority 15.
- HitRunStaggerSystem es un no-op en Simulation priority 18.

Los eventos `combat:hit` se encolan en CombatHitListenerSystem. HitRunHurtSystem los consume en GameRules, después de que Simulation haya ejecutado movimiento e IA. Por tanto, el bloqueo de control y la reacción física se reflejan desde el siguiente tick, tras el flush del command buffer. Esto evita que el sistema de IA sobrescriba el knockback después de aplicarse.

## Amortiguación

La implementación anterior multiplicaba la velocidad horizontal del enemigo por 0.85 cada actualización. Era una retención por frame, no por segundo, por lo que el resultado dependía de la frecuencia de actualización.

Se conserva exactamente el comportamiento de referencia a 60 Hz usando:

`retention(dt) = 0.85 ^ (dt × 60)`

El delta recibido por GameRules es `scaledDeltaTime` en Schedule. Así, la amortiguación usa segundos de simulación y la cámara lenta conserva coherentemente su efecto sobre el tiempo del combate.

El bloqueo FSM existente envuelve los `onUpdate` de hr_walk, hr_flank, hr_hop, hr_charge, hr_shooter y hr_tank. No se añade otro controlador de movimiento. HitRunStaggerSystem permanece sin escribir Velocity; se conserva como parte del registro actual.

## Cobertura añadida

- Comparación de knockback tras un segundo a 30 Hz frente a 60 Hz.
- Contrato de retención 0.85 por tick de referencia a 60 Hz.
- Un charger en stagger no puede sobrescribir el impulso mediante su FSM.
- El charger reanuda su FSM al terminar el bloqueo.

## Validación

Las pruebas nuevas están en `HitRunHitReactionIntegration.test.ts`. No se ejecutaron localmente en esta sesión; CI debe verificar la suite de Hit & Run y los typechecks. La PR está apilada sobre PR6 y no debe integrarse por delante de ella.
