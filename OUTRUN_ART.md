# OUTRUN_ART.md — Dirección Artística y Reglas Visuales ("OUT RUN 2049")

Norte visual: «Arquitectura contemporánea vectorial y pulcra a 200 km/h.» Estilo vectorial limpio, hormigón blanco/gris claro, negro mate, coral, cian y lavanda ("OUT RUN 2049"). Prohibido pixel art, estética ochentera synthwave y nubes cartoon densas.

---

## 1. Principios de diseño visual

- **Orden de lectura:** Grandes formas → profundidad → contraste → movimiento → detalle.
- **Detalle condicional:** El detalle solo se incluye si aumenta la profundidad, la velocidad o la identidad visual.
- **Tokens de color:** ~12 tokens de color por escenario expresados estrictamente como datos. Cero colores fuera de tokens en los drawers de render.
- **Cel shading:** 2–3 bandas para vehículos y geometría de carretera; cielo en 4–6 bandas; montañas facetadas generadas mediante hash determinista (`scenarioId` + índice).
- **Línea de horizonte:** ~40% de la altura de la pantalla, ajustable mediante `cameraHeight` y `cameraDepth`.
- **Foco visual:** El coche del jugador es el punto focal principal. Ningún elemento del fondo o del HUD compite en saturación con el vehículo principal.
- **Velocidad perceptible:** La sensación de velocidad debe ser claramente perceptible sin necesidad de consultar el HUD (vía líneas de velocidad, rumble de la carretera y parallax de fondo).

---

## 2. Paletas por escenario ("OUT RUN 2049")

### Scenario 1: Costa (Coast)
- Sky Gradation: `#ff6b6b`, `#ff9e7d`, `#88e1e7`, `#38b6ff`, `#00f0ff` (Coral a Cian)
- Sun: `#ff5252`
- Ground: `#e2dfc8`, `#d1ceb2` (Hierba seca clara)
- Road / Rumble: `#2d3138`, `#ff5252` / `#f8f9fa`
- Side Elements: `palm` (palmera vectorial de tronco curvo) y `lamp` (poste LED delgado)

### Scenario 2: Desierto (Desert)
- Sky Gradation: `#1d1829`, `#3a233b`, `#692a4a`, `#9e3d4c`, `#d96b52` (Desaturado con naranja quemado)
- Sun: `#ff9e7d`
- Ground: `#d0a67a`, `#ba8f62` (Tierra terrosa suave)
- Road / Rumble: `#1c1c28`, `#ff5252` / `#00f0ff`
- Side Elements: `shrub` (arreglos geométricos óvalos) y `wind_tower` (torre eólica estilizada)

### Scenario 3: Montaña (Mountain)
- Sky Gradation: `#120e26`, `#251b47`, `#4b2b5e`, `#7e4075`, `#b8b5ff` (Cielo violeta)
- Sun: `#b8b5ff`
- Ground: `#8d99ae`, `#788596` (Hormigón y hierba fría)
- Road / Rumble: `#20252e`, `#b8b5ff` / `#ffffff`
- Side Elements: `cypress` (ciprés estilizado) y `wall` (muro de contención de hormigón)

---

## 3. Decorado Arquitectónico y Ciclo de Luz

- **Elementos Borde Carretera:** Chevrones corales en curvas (`chevron`), paneles tipográficos de hormigón/cristal (`billboard`), arco de meta ("OUT RUN 2049") y pancartas en checkpoints ("CHECKPOINT").
- **Ciclo de Luz (DayPhase):** Mapeado a 4 fases — `dawn`, `day`, `sunset`, `blue_hour`. En `blue_hour`, farolas y ventanas de la arquitectura se encienden en azul/cian brillante.
- **Efectos Dinámicos:** Sombras suaves bajo vehículos, oscurecimiento del asfalto en lado interior de curvas y estelas de polvo al salirse de la pista.

---

## 3. Criterios y Pruebas Visuales

1. **Silueta y Legibilidad:** Lectura clara del vehículo y rivales contra la carretera y el fondo.
2. **Valor y Luminancia:** Contraste de luminancia entre carretera y suelo ≥ 2:1.
3. **Paleta:** 0 píxeles renderizados fuera de los tokens configurados por escenario.
4. **Percepción de Velocidad sin HUD:** Diferencia entre 30% y 100% de la velocidad máxima claramente distinguible por la animación visual y movimiento del entorno.
5. **Legibilidad del HUD:** Contraste del HUD respecto al fondo ≥ 4.5:1.
