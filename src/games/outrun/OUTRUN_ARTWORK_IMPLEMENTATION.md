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
| 8 | Corrección de proporciones: coche del jugador un tercio más bajo, carrocerías/cabinas de tráfico aplanadas y tests que protegen la visibilidad. | PR correctiva pendiente |

Las fases 2–7 ya están integradas en `master`. Esta fase 8 es una corrección de dirección de arte solicitada tras revisar las proporciones en conjunto; no cambia las reglas de conducción, la escala relativa a la anchura de carretera ni la geometría de proyección.

## Pruebas automáticas incluidas

- `OutrunScenery.test.ts`: número de bandas, reducción de detalle, determinismo y parallax.
- `OutrunRoadArtwork.test.ts`: transición near/far, alternancia, agua costera, arena y rayas de velocidad.
- `OutrunRoadsideArtwork.test.ts`: tipos de objeto, proporciones, bruma atmosférica y densidad en calidad baja.
- `OutrunVehicleArtwork.test.ts`: escala relativa a carretera, perfiles bajos del coche del jugador y límites de altura para las tres siluetas de tráfico.
- `OutrunLighting.test.ts`: haces deterministas solo de noche.
- `OutrunHudArtwork.test.ts`: geometría responsive y contenido del HUD.
- `OutrunPaletteAudit.test.ts`: luminancia WCAG y contraste coche/carretera en los cinco momentos del día y los modos normal/para daltónicos.

Canvas y Skia consumen los mismos helpers puros para la geometría y los tokens de color. La verificación de igualdad píxel a píxel requiere una captura de ambos renderizadores, con igual tamaño, estado y semilla; las pruebas de lógica no sustituyen esa comparación visual.

## Límites y verificación manual pendiente

1. Ejecutar la CI de typecheck, lint y tests sobre la punta final de cada PR; corregir cualquier fallo antes de integrar.
2. Abrir el juego y recorrer los cinco momentos del día en calidad alta y baja, prestando atención a las transiciones, pianos y marcas de carril.
3. Comparar capturas Canvas/Skia con el mismo estado, semilla y viewport; confirmar que los faros no aparecen fuera de la noche y que los objetos no cruzan visualmente la carretera.
4. Verificar en dispositivo rendimiento y legibilidad reales. No se han afirmado FPS ni se ha dado por realizada esta comprobación.
5. Verificar posteriormente el diseño que el documento de arte deja explícitamente abierto: menú/título, emisora de radio real (el dial actual es decorativo), pantalla de resultados, fuente concreta y efectos visuales de freno/choque. No se inventan funcionalidades jugables para cerrar el diseño artístico.

## Restricciones de implementación

- Todo lo decorativo pertenece al renderizado/presentación; no cambia posiciones, colisiones, velocidad ni IA de tráfico.
- La geometría de la carretera sigue viniendo de `projectRoad()`; no se genera una segunda proyección.
- Los datos visuales provienen de la configuración existente; no se introducen dependencias de runtime nuevas.
- No se considera “terminada” una fase sin CI verde y revisión en pantalla.
