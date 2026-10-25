# Samurai enemy — Hit & Run

## Objetivo

Integrar el samurái de armadura roja como enemigo cuerpo a cuerpo en `src/games/hitandrun/`, conservando la dirección artística Neo-Retro Military Pop y los contratos compartidos de sprites para Canvas y Skia.

## Implementación

- **Asset:** `assets/samurai-enemy.png`, spritesheet de 512 × 320 con transparencia, rejilla de 8 × 5 y celdas uniformes de 64 × 64 px. Los fotogramas usan un anclaje constante cerca de los pies.
- **Atlas:** `assets/samurai-enemy.atlas.json` contiene los metadatos tipo TexturePacker; `samurai-enemy.animations.json` documenta las secuencias.
- **Animaciones:** `rendering/SamuraiVisualAssets.ts` declara `idle` (8, loop), `walk` (8, loop), `attack` (8, one-shot), `hurt` (6, one-shot) y `death` (8, one-shot). Hay 38 celdas con fotogramas definidos; las dos celdas no utilizadas de la fila de hurt quedan transparentes.
- **Carga:** `HitAndRunGame.onPreloadAssets()` resuelve el asset empaquetado y lo registra mediante el `AssetLoader` del mundo. Si falla la carga o se ejecuta headless, el enemigo conserva su renderer procedural de reserva.
- **ECS y combate:** `HitRunEnemyArchetypes.ts` añade `samurai` (facción enemy, 5 HP y tags walk). `HitRunEnemyPool` añade `SpriteComponent` y `AnimatorComponent` cuando el asset está listo; la IA usa la FSM telegráfica de melee existente y mantiene collider, transform y punto de anclaje estables.
- **Selección de clips:** `SamuraiAnimationSystems.ts` deriva la animación de la FSM, del hitstun activo y del estado Dead, actualiza `srcRect` y deja completar las secuencias hurt/attack. El cleanup de muerte respeta la duración declarada del clip antes de devolver la entidad al pool.
- **Oleadas:** el samurái aparece en `WAVE_PRESSURE` y en `WAVE_BOSS` de `sectionWaves.ts`.
- **Fallback visual:** cuando la imagen no puede cargarse, `HitRunCanvasVisuals.ts` dibuja una silueta reconocible con máscara, cuernos dorados, armadura roja, katana, sombra de suelo y poses de anticipación/ataque.

## Pruebas añadidas

`src/games/hitandrun/__tests__/HitRunSamuraiEnemy.test.ts` cubre el registro del arquetipo, su presencia en una oleada, la creación de componentes, el cambio de clips, la conservación del retroceso hurt después del hitstun y la animación de muerte.

## Validación pendiente

Los cambios están publicados en `feature/hitandrun-samurai-enemy`. En esta sesión no se ha podido ejecutar Jest, el typecheck ni una prueba visual real de Canvas/Skia; por tanto, estos resultados no se declaran como superados. Esas comprobaciones deben completarse en el entorno del proyecto o en CI antes de dar la integración por validada.

## Criterios de aceptación

- El samurái puede generarse desde una oleada declarativa y entrar en el combate existente.
- Canvas y Skia consumen el mismo `SpriteComponent`, la misma hoja y el mismo `srcRect`.
- Los fotogramas usan dimensiones uniformes, transparencia y un pivote estable.
- El ataque queda visible durante anticipación, golpe y recuperación; hurt y death no se repiten en bucle.
- La retirada al pool espera a que avance la animación de muerte.
- Los arquetipos y las oleadas existentes conservan sus definiciones y el fallback evita una entidad invisible si falla la carga.
