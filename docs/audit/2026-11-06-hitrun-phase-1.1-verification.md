# Hit & Run — Fase 1.1 / PR6: Wave Integrity Verification

Fecha: 6 de noviembre de 2026  
Base auditada: 6579a7e8b9c8616eee70d355932536bdd9b2c365  
Rama: fix/hitrun-wave-lifecycle-integrity  
Alcance: integridad del ciclo de vida de oleadas y ownership por sección.

## Hallazgos verificados

1. El pool ya recicla entidades. HitRunEnemyPool.acquireEnemy vuelve a escribir BeltSectionEnemy.sectionIndex incluso cuando reutiliza una entidad. No hace falta añadir otro identificador de ownership para el modelo actual de una oleada por sección.
2. BeltCameraSystem ya cuenta exclusivamente entidades con Enemy + BeltSectionEnemy, excluye Dead y no depende de Render. El contador no queda condicionado por la presencia de un sprite.
3. El gate, sin embargo, solo esperaba a que no hubiera enemigos vivos y a que pendingStaggers estuviera vacío. No comprobaba si el cursor del guion había procesado los eventos que todavía estaban programados para más adelante. Por tanto, una pausa entre eventos podía abrir la sección antes de que terminase el timeline.
4. HitRunOrphanEnemyCleanupSystem usaba Render.size como evidencia de invalidez. El tamaño visual no forma parte del contrato de colisión; un enemigo pequeño con Collider2D válido no debe eliminarse por ese motivo.
5. Los scripts con loop=true son deliberadamente continuos y no completan su timeline. No deben utilizarse como scripts de sección que dependan de abrir una barrera al terminar.

## Cambios en PR6

- El gate exige SpawnComplete además de cero enemigos vivos.
- SpawnComplete se deriva del cursor de eventos, de la identidad del script y de que no queden stagger spawns pendientes.
- Un director detenido se considera cancelado: no puede producir más spawns, aunque conserve eventos sin procesar.
- Un script ausente o cuyo identificador no coincide con el estado activo no se considera completo; el gate falla de forma segura.
- Se elimina Render.size como criterio autónomo para marcar un enemigo como huérfano. La limpieza conserva el requisito de Collider2D y no impone una política global sobre Hurtbox, que debe declararse por arquetipo.
- Se añaden pruebas para gaps entre eventos, stagger pendiente, enemigos de secciones anteriores y reciclado de la misma entidad entre secciones.

## Contrato de finalización

SpawnComplete = cursor al final del script AND no quedan stagger spawns pendientes (o el director fue detenido).

CombatComplete = no quedan enemigos vivos asignados a la sección actual.

WaveComplete = SpawnComplete AND CombatComplete.

La resolución de muerte continúa perteneciendo al pipeline de combate: el gate excluye entidades con Dead, y el evento combat:death sigue siendo el responsable de score/combo. La animación de muerte y el retorno al pool pueden continuar después sin mantener la barrera cerrada.

## Validación

Se añadieron pruebas unitarias en HitRunWaveIntegrity.test.ts. No se ha ejecutado typecheck ni Jest desde esta sesión; la rama necesita los checks de CI antes de considerarse validada o mergeable.

Comandos existentes confirmados en package.json:

- pnpm exec jest --runInBand src/games/hitandrun/__tests__/HitRunWaveIntegrity.test.ts
- pnpm exec jest --runInBand src/games/hitandrun/__tests__
- pnpm run typecheck:app
- pnpm run typecheck:core
- pnpm run test:games:ci

## Riesgos pendientes para PR7–PR10

- PR7 debe medir la amortiguación de knockback respecto al delta time y verificar el orden real del scheduler.
- PR8 debe validar que el tiempo de slow motion se mide con la semántica real del delta del scheduler, y que el reinicio es idempotente.
- PR9 debe proporcionar fixtures E2E deterministas de combate, oleadas y muerte/recuperación.
- PR10 debe ejecutar regresión de juegos consumidores y comparar estado simulado determinista.
