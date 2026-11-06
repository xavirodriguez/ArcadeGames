# Hit & Run — Fase 1.1 / PR9: Gameplay Lifecycle E2E

Fecha: 6 de noviembre de 2026  
Base: PR8 `fix/hitrun-death-recovery-timescale`  
Rama: `test/hitrun-gameplay-lifecycle-e2e`

## Alcance

La cobertura Playwright existente solo comprobaba que la ruta cargaba y que ArrowRight desplazaba al jugador. Esta PR amplía la API E2E de diagnóstico, sin convertirla en una interfaz de control del juego.

## Instrumentación de solo lectura

Con `EXPO_PUBLIC_E2E_HOOKS=true` y únicamente en web, `window.__hitAndRunDebug` expone snapshots/lecturas de:
- posición y salud del jugador;
- enemigos vivos y enemigos que conservan Health + Collider2D habilitado;
- cursor de eventos, spawns diferidos, totalSpawned y condición spawnComplete;
- estado de DeathFlow, multiplicador TimeScale y contador de muertes;
- estado de entrada melee/fire, fase melee, paso de combo, cooldown y proyectiles activos;
- arma actual.

No se exponen métodos que creen entidades, cambien Health, emitan eventos o escriban recursos ECS. Los escenarios ejercitan teclado, runtime, scheduler, sistemas de combate y UI reales.

## Escenarios Playwright

1. Route + movement: carga directa de `/hitandrun`, canvas visible, ArrowRight cambia X y no aparecen page errors ni errores de consola.
2. Combat isolation: C activa FIRE y genera cooldown/proyectil sin activar melee/combo; F activa melee/combo sin FIRE.
3. Wave lifecycle: espera a que termine la timeline no-loop y comprueba que los spawns diferidos concluyeron, que hubo enemigos y que siguen vivos y con collider de combate.
4. Death recovery: deja que los enemigos/IA del juego real derroten al jugador; observa el slow-motion 0.28 y el contador de muerte; espera a que la UI consuma requestRestart, BaseGame cree un World nuevo y el jugador reaparezca con salud inicial y canvas visible. Comprueba además que el mundo nuevo vuelve a aceptar input y que puede completar un segundo ciclo de muerte/recuperación sin listeners o TimeScale residuales.

## Configuración

Se conserva `playwright.config.ts`: Expo Web en puerto 8081 y `EXPO_PUBLIC_E2E_HOOKS=true`. La configuración ya usaba un worker local y serialización del archivo por defecto; los tests amplían el timeout solo para el escenario de muerte.

## Límites y validación

- No se inyectan enemigos ni se altera directamente el estado de la simulación desde Playwright. El test de wave lifecycle comprueba que los enemigos continúan disponibles para combate tras el último spawn; el pipeline de muerte/score se cubre además por pruebas de sistemas.
- El test de death recovery usa la progresión normal de enemigos y tiene un timeout extendido. Si la IA/combat balance no consigue matar al jugador en ese entorno, el test debe fallar en vez de fabricar una muerte.
- Los E2E y el typecheck no se han ejecutado desde esta sesión; la PR requiere CI verde. El escenario de death recovery tiene timeout ampliado a 100 s para observar dos ciclos naturales.
- La API de diagnóstico solo se instala en el build E2E web, no en builds de producción.

## Dependencias

PR9 está apilada sobre PR8, a su vez sobre PR7 y PR6. Debe integrarse en ese orden después de aprobar los checks de cada antecesora.
