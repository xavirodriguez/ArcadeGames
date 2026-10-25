# Out Run artwork — plan de implementación y verificación

La fuente visual sigue siendo [`OUTRUN_ARTWORK.md`](./OUTRUN_ARTWORK.md). Este documento registra cómo se está aterrizando esa especificación en incrementos pequeños, sin cambiar la simulación ni la geometría de `projectRoad()`.

## Fases

| Fase | Alcance | PR |
|---|---|---|
| 1 | Base visual previa: preparación del sistema visual y sus contratos. | #838 |
| 2 | Cielo en franjas, astro, nubes, estrellas, montañas y parallax. | #839 (integrada) |
| 3 | Colores de suelo/carretera por profundidad, pianos, marcas, agua costera, arena desértica y rayas de velocidad. | #840 |
| 4 | Árboles, pinos, rocas, palmeras, faros, cactus, arbustos y torres; bruma por profundidad y menor densidad en calidad baja. | #849 (integrada) |
| 5 | Coupé del jugador y tráfico procedural con siluetas de coupé, furgoneta y camión. | #848 (integrada) |
| 6 | Haces de faros nocturnos y HUD responsive con tiempo, tramo/hora, progreso, velocímetro y dial de radio. | #845 (integrada) |
| 7 | Auditoría WCAG de contraste, pruebas de contratos visuales y guía de los controles de calidad pendientes. | #846 (integrada) |
| 8 | Corrección de proporciones: coche del jugador un tercio más bajo, carrocerías/cabinas de tráfico aplanadas y tests que protegen la visibilidad. | #856 (integrada) |
| 9 | Desacoplamiento 100% de la capa visual vía `OutrunVisualMod` y punto de extensión para sprites bitmap (`CanvasSpriteDrawer`/`SkiaSpriteDrawer`). | PR Actual |

Las fases 2–8 ya están integradas. La fase 9 establece la arquitectura modular de Visual Mods analoga a Asteroids (`AsteroidsVisualMod`), permitiendo que mods futuros (como un mod medieval de caballos/carros/camino de tierra) se implementen de forma autocontenida sin tocar la simulación ni los tipos centrales.

## Pruebas automáticas incluidas

- `OutrunVisualMods.test.ts`: registro de mods, resolución agnóstica de decorado en generación de pista, preservación de kinds de decorado personalizados, resolución de siluetas de tráfico, delegación en `initializeOutrunRenderer` y paridad del comportamiento por defecto (`ClassicMod`).
- `OutrunScenery.test.ts`: número de bandas, reducción de detalle, determinismo y parallax.
- `OutrunRoadArtwork.test.ts`: transición near/far, alternancia, agua costera, arena y rayas de velocidad.
- `OutrunRoadsideArtwork.test.ts`: tipos de objeto, proporciones, bruma atmosférica y densidad en calidad baja.
- `OutrunVehicleArtwork.test.ts`: escala relativa a carretera, perfiles bajos del coche del jugador y límites de altura para las tres siluetas de tráfico.
- `OutrunLighting.test.ts`: haces deterministas solo de noche.
- `OutrunHudArtwork.test.ts`: geometría responsive y contenido del HUD.
- `OutrunPaletteAudit.test.ts`: luminancia WCAG y contraste coche/carretera en los cinco momentos del día y los modos normal/para daltónicos.

Canvas y Skia consumen los mismos helpers puros para la geometría y los tokens de color. La verificación de igualdad píxel a píxel requiere una captura de ambos renderizadores, con igual tamaño, estado y semilla; las pruebas de lógica no sustituyen esa comparación visual.

## Arquitectura de Visual Mods (`src/games/outrun/mods/`)

- `types.ts`: Define la interfaz `OutrunVisualMod`, `OutrunBitmapSpriteSpec`, `OutrunRoadsideDrawParams` y `OutrunTrafficDrawParams`.
- `classic/ClassicMod.ts`: Implementa el comportamiento por defecto de Outrun (coches/asfalto/árboles) preservando el comportamiento existente.
- `registry.ts`: Mantiene la tabla `MOD_REGISTRY` (`registerVisualMod`, `resolveVisualMod`, `listVisualMods`).
- `applyVisualMod.ts`: Resuelve el mod activo a partir de `gameOptions.mod` / `gameOptions.visualMod` / `config.VISUAL_MOD` y registra los recursos `"VisualMod"` y `"Theme"` en el `World`.
- `rendering/OutrunRendererManager.ts`: Expone `initializeOutrunRenderer(renderer, visualMod)` para registrar los drawers del mod activo en Canvas y Skia.

## Restricciones de implementación

- Todo lo decorativo pertenece al renderizado/presentación; no cambia posiciones, colisiones, velocidad ni IA de tráfico.
- La geometría de la carretera sigue viniendo de `projectRoad()`; no se genera una segunda proyección.
- Los datos visuales provienen de la configuración existente o del mod activo; no se introducen dependencias de runtime no deseadas.
- No se considera “terminada” una fase sin CI verde y revisión en pantalla.
