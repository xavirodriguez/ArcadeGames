# Samurai enemy — Hit & Run

## Objetivo
Incorporar el samurái de armadura roja como enemigo cuerpo a cuerpo en `src/games/hitandrun/`, conservando la dirección artística Neo-Retro Military Pop y el contrato de render Canvas/Skia.

## Hallazgos del reconocimiento
- `HitAndRunGame.ts` registra los drawers de enemigos por shape y registra el sistema de oleadas mediante `registerHitRunWaves`.
- Los enemigos actuales se dibujan mediante shapes (`popcorn`, `wall_trooper`, `hopper`, `charger`, `elite`) delegados al tema activo en `rendering/HitRunCanvasVisuals.ts`.
- `HitRunWaveTypes.ts` permite arquetipos data-driven y `EnemyArchetypeDefinition` contiene `id`, `poolId`, `health`, `faction`, `shape`, `size`, `color`, `speed` y `behaviorTags`.
- El proyecto define `SpriteComponent` y drawers de sprites compartidos, pero no se ha confirmado todavía que el runtime de Hit & Run esté registrando y cargando atlases de sprites para enemigos. No asumir esa integración hasta verificar el contrato real de `AssetLoader` y del pool.
- La guía estética exige pies anclados al suelo, silueta legible, escala por profundidad y sombra de suelo.

## Plan incremental
1. Preparar una hoja de sprites real con fondo transparente y fotogramas consistentes: idle, walk, attack, hurt y death. La ilustración original es una referencia estática, no una hoja de sprites.
2. Verificar cómo se definen los arquetipos y cómo `HitRunEnemyPool` crea/recicla entidades; añadir un arquetipo `samurai` sin alterar los existentes.
3. Conectar la representación visual con el mecanismo de sprites existente solo si puede cargarse correctamente en los renderizadores soportados. Mantener fallback por shape mientras se valida el asset.
4. Añadir tests para registro/spawn del arquetipo, valores por defecto y selección de animación si el contrato actual lo permite.
5. Ejecutar las pruebas pertinentes y comprobar Canvas/Skia antes de considerar la tarea terminada.

## Criterios de aceptación
- El samurái se puede generar desde una oleada declarativa.
- La imagen conserva transparencia, proporciones y anclaje por los pies.
- Las animaciones no cambian el collider ni el punto de anclaje de forma accidental.
- El ataque tiene anticipación y recuperación visual; daño y muerte no quedan en bucle.
- No se introducen `any`, estado global mutable ni aleatoriedad no determinista.
- Los enemigos existentes mantienen el comportamiento actual.

## Estado
Rama creada: `feature/hitandrun-samurai-enemy`.

Este documento registra el reconocimiento inicial. No declara que el sprite ni la integración estén implementados; ambas tareas requieren cambios y validación adicionales.
