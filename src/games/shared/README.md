# src/games/shared/

Código compartido entre múltiples juegos.

## Reglas de oro

1. **Solo código usado por ≥ 2 juegos** pertenece aquí.
2. Código específico de un solo juego se queda dentro de `src/games/<juego>/`.
3. No crear nuevas carpetas de “utils”, “common”, “lib” o “helpers” fuera de esta estructura.
4. Preferir funciones puras y sin dependencias de estado global.

## Estructura actual

- `arcade/blueprints/` → Blueprints y configuraciones de entidades de juegos arcade.
- `arcade/builders/` → Builders fluidos reutilizables (p.ej. `ArcadeEntityBuilder`).
- `arcade/helpers/` → Helpers puros de lógica de arcade (input, movimiento, `spawnScorePopup`, etc.).
- `arcade/powerups/` → Registros y efectos de power-ups compartidos.
- `arcade/systems/` → Sistemas ECS de arcade reutilizables (Loot, PowerUp, Achievement, DifficultyDirector).
- `arcade/types/` → Schemas y tipos comunes de configuración arcade.
- `combat/` → Componentes, sistemas y tipos de combate compartidos.
- `spawn/` → Componentes, sistemas y tipos del director de generación (spawn) compartido.
- `story/helpers/` → Helpers de encuentros, narrativa y story systems (`encounterHelpers`).
- `story/` → Grafos de historia, diálogos y componentes narrativos compartidos.
- `rendering/` → Cálculos geométricos y utilidades de render compartidas (`CanvasNeonUtils`, `ProceduralShapeUtils`, `SharedVFX`, `geometry.ts`).
- `types/` → Capas de colisión y tipos globales compartidos.

## Cómo añadir algo nuevo

1. ¿Se usa en más de un juego? → Sí → ponlo aquí.
2. Elige la subcarpeta de dominio más adecuada.
3. Si no existe una subcarpeta de dominio clara, propón una nueva y documenta el motivo en este README.
4. Actualiza este README si añades una nueva categoría.
