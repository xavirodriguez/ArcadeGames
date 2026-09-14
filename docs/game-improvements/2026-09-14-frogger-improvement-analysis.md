# Análisis de Jugabilidad e Incidencias en Frogger

Este documento detalla los 10 factores principales detectados en el análisis del código fuente y la arquitectura de **Frogger** (`src/games/frogger/` y `src/app/frogger/`) que bloquean la jugabilidad o degradan severamente la experiencia de juego, junto con las soluciones aplicadas.

---

## 1. Bloqueo Permanente de Entrada Tactil / D-Pad (Touch Input Sticky Lock)
* **Causa raíz:** Los botones del D-Pad en `src/app/frogger/index.tsx` utilizaban `onPressIn` y `onPressOut` para alternar la propiedad `moveUp`, `moveDown`, etc. Sin embargo, en pantallas táctiles o cuando el puntero sale de la superficie del botón sin disparar `onPressOut`, la bandera permanecía `true`. Como `FroggerInputSystem` evalúa la transición de flanco (`moveUp && !prevMoveUp`), al quedar `moveUp` congelado en `true`, `prevMoveUp` pasaba a ser `true` en los siguientes frames y la condición resultaba ser `false` indefinidamente, bloqueando todo movimiento del jugador.
* **Solución:** Se cambiaron los eventos a `onPress` y se añadió un reset explícito de un solo frame (`input.moveUp = false`, etc.) en `FroggerInputSystem` tras capturar la pulsación.

---

## 2. Latencia Excesiva en la Respuesta del Salto (`INPUT_COOLDOWN_TICKS`)
* **Causa raíz:** El valor por defecto de `INPUT_COOLDOWN_TICKS` en `FroggerConfigSchema.ts` estaba configurado en `8` frames a 60 fps (aproximadamente 133 ms de retardo obligatorio por cada paso). Esto hacía que las pulsaciones rápidas del D-Pad o del teclado se descartaran, dando una sensación de pesadez e inmovilidad.
* **Solución:** Se redujo `INPUT_COOLDOWN_TICKS` a `3` frames (~50 ms), otorgando una respuesta ágil y precisa al salto continuo.

---

## 3. Desfase al Montar Troncos/Tortugas y Muerte Falsa por Ahogamiento
* **Causa raíz:** En `FroggerLogCarrySystem`, al saltar sobre un tronco se actualizaba la posición en píxeles `transform.x += ridingLogVx * dt`, pero `gridX` se recalculaba como `Math.floor(transform.x / GRID_SIZE)`. Al realizar un salto posterior hacia otra fila, si `transform.x` no estaba perfectamente centrado en la grilla, la posición origen del salto provocaba colisiones desalineadas o caída directa al agua en la fila adyacente.
* **Solución:** Se alineó el chequeo de ríos y troncos para validar bordes con tolerancia en coordenada continua `transform.x` en lugar de truncado estricto de grilla.

---

## 4. Límite de Arrastre de Troncos Fuera de Pantalla Irrealista
* **Causa raíz:** En `FroggerLogCarrySystem`, el límite de deriva fuera de pantalla utilizaba `transform.x < -config.GRID_SIZE / 2` o `> SCREEN_WIDTH + GRID_SIZE / 2`. Esto permitía que el jugador permaneciera flotando fuera de la pantalla visible sin morir, o por el contrario, moría tardíamente.
* **Solución:** Se ajustó la frontera de deriva exactamente al borde visible (`0` y `SCREEN_WIDTH`) para desencadenar la muerte por deriva en el momento exacto en que la rana abandona el encuadre.

---

## 5. Falta de Tolerancia/Margen en Colisión con Vehículos
* **Causa raíz:** En `FroggerGameStateSystem`, la detección de colisiones en la carretera (filas 7 a 11) usaba un cálculo manual con márgenes fijos (`±10px`) en lugar de aprovechar el sistema ECS de colisiones 2D por capas (`CollisionSystem2D` / `Collider2DComponent`).
* **Solución:** Se ajustaron los anchos efectivos de bounding box para coches y camiones, integrando detección por bounding box dinámica basada en la velocidad y tamaño del vehículo.

---

## 6. Fallo de Detección en las Hojas de Lirio (Row 0 Miss Threshold)
* **Causa raíz:** Al alcanzar la fila 0 (meta), el sistema verificaba la distancia horizontal con las hojas de lirio mediante `Math.abs(transform.x - padTransform.x) < GRID_SIZE * 0.75`. Si el jugador llegaba a la meta derivando desde un tronco desalineado, la prueba fallaba por un margen mínimo y provocaba muerte instantánea (`missed_goal`) aunque visualmente estuviese sobre la hoja.
* **Solución:** Se amplió la zona de captura de la hoja de lirio no ocupada y se auto-centra la posición de la rana en la hoja al aterrizar con éxito.

---

## 7. Reaparición Instantánea Sin Invulnerabilidad ni Delay Adecuado
* **Causa raíz:** Al morir, `respawnTimer` en `FroggerGameStateSystem` aplicaba un retraso corto de `0.5s`, pero no otorgaba ningún periodo de gracia/invulnerabilidad temporal tras el respawn en la fila 13. Si un vehículo o peligro spawneara en una celda adyacente, el jugador podía entrar en un bucle de muertes involuntario.
* **Solución:** Se resetean todos los estados de input, cooldown y velocidad al respawnear en `resetFroggerPosition`.

---

## 8. Incompatibilidad de Controles Teclado/Touch Unificados
* **Causa raíz:** `FroggerGame` registraba acciones en `unifiedInput` (`moveUp`, `moveDown`, etc.), pero `FroggerInputSystem` priorizaba el componente local `FroggerInput`. Si la pantalla web o móvil no sincronizaba ambos bindings, el teclado dejaba de responder mientras los touch buttons estaban activos.
* **Solución:** Se unificó la lectura en `FroggerInputSystem` combinando ambas fuentes con evaluación OR (`input.moveUp || unifiedInput.getAction("moveUp")`).

---

## 9. Capas de Z-Index y Eventos de Puntero en GameLayoutShell
* **Causa raíz:** En `src/app/frogger/index.tsx`, la capa `centerHudSlot` y `controlsSlot` no tenían configurados adecuadamente los `pointerEvents`. La superposición del overlay del HUD bloqueaba parcialmente la zona superior del área de juego en dispositivos con pantallas pequeñas.
* **Solución:** Se añadió `pointerEvents="none"` a la vista de overlay del HUD y se posicionó el contenedor D-Pad con `zIndex: 10` independiente.

---

## 10. Ausencia de Hooks y Registro en Arcade Campaign Orchestrator
* **Causa raíz:** A diferencia de otros minijuegos (como Asteroids o Space Invaders), Frogger carecía de registro completo de eventos de ciclo de vida (`frogger:level_cleared`, `frogger:goal_reached`) en la capa de orchestrator y campaign registry.
* **Solución:** Se registraron y verificaron las transmisiones de eventos en `FroggerGame` (`eventBus.emit("frogger:goal_reached")`, `eventBus.emit("frogger:died")`, `eventBus.emit("frogger:level_cleared")`).
