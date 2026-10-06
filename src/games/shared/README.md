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
- `rendering/` → Orquestador de Game Feel (`JuiceOrchestrator`), `HitStopSystem`, `KineticFlowSystem`, cálculos geométricos, utilidades de render y pools de partículas compartidos (`VisualParticlePool`, `CanvasNeonUtils`, `ProceduralShapeUtils`, `SharedVFX`, `geometry.ts`).
- `types/` → Capas de colisión y tipos globales compartidos.

## Juice Orchestrator (Sistema Compartido de Game Feel)

El `JuiceOrchestrator` (`rendering/JuiceOrchestrator.ts`) unifica el Game Feel de todos los minijuegos a una API declarativa basada en primitivas visuales reutilizables.

### Vocabulario Canónico

- **Primitivas Visuales (`SharedVFX`)**: `shockwave`, `shield_bubble`, `thruster_flame`, `laser_beam`, `singularity`, `comet_trail`, `hologram_glitch`, `floating_text`, `screen_border_glow`, `warp_lines`.
- **API `juice.spawn(effectName, options)`**: Spawnea primitivas visuales en 1 sola línea sin gestión manual de entidades TTL (`tint`, `scale`, `intensity`, `ttl`, `hitStopMs`, `shakeIntensity`).
- **Tabla `JuiceMap`**: Mapeo declarativo por juego (`gameId → evento → { efecto, tint, escala }`).
- **Hit-Stop Concurrency Control (`HitStopSystem`)**: Pausa parcial controlada del gameplay. Los hit-stops de mayor prioridad sobrescriben los de menor prioridad; nunca se encadenan ni suman duraciones.
- **Modo Baja Estimulación (`JuiceLevel = 0` / Accesibilidad)**: Desactiva screen shake y hit flashes, convirtiéndolos en variaciones suaves de opacidad en todos los minijuegos de forma automática.
- **Acumulador Cinético (`KineticFlowSystem`)**: Sincroniza la energía almacenada en `KineticAccumulatorComponent` con `VFXWorldState.kineticCharge` para disparar feedback de flujo progresivo.

## Cómo añadir algo nuevo

1. ¿Se usa en más de un juego? → Sí → ponlo aquí.
2. Elige la subcarpeta de dominio más adecuada.
3. Si no existe una subcarpeta de dominio clara, propón una nueva y documenta el motivo en este README.
4. Actualiza este README si añades una nueva categoría.
