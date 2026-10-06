# OUTRUN_ART.md — Dirección Artística y Reglas Visuales

Norte visual: «Una postal japonesa de verano que cobra vida a 200 km/h.» Out Run + ilustración japonesa + low-poly estilizado + cel shading + parallax profundo.

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

## 2. Paletas de partida por escenario

### Scenario 1: Costa de Verano (Coast)
- Sky Gradation: `#1a2a6c`, `#b21f1f`, `#fdbb2d` (Sunset coastal gradient)
- Sun: `#ff4e50`
- Mountains / Hills: `#2b580c`, `#639a67`
- Ground / Field: `#f7f06d`, `#d4a373`
- Road Asphalt: `#3a3d40` / `#484b4e`
- Rumble Strip: `#e63946` / `#f1faee`
- Player Vehicle: `#ff0055` (Vibrant Magenta/Red)

### Scenario 2: Desierto Nocturno (Desert)
- Sky Gradation: `#0f0c29`, `#302b63`, `#24243e`
- Moon / Sun: `#f8ffae`
- Mountains / Dunes: `#4a154b`, `#6c2257`
- Ground / Desert Floor: `#2c003e`, `#3d0c5a`
- Road Asphalt: `#1f1f2e` / `#28283d`
- Rumble Strip: `#ff007f` / `#00f0ff`
- Player Vehicle: `#ff0055`

### Scenario 3: Montaña de Otoño (Mountain)
- Sky Gradation: `#2c3e50`, `#bdc3c7`
- Sun: `#e74c3c`
- Mountains: `#8e44ad`, `#d35400`
- Ground: `#e67e22`, `#f39c12`
- Road Asphalt: `#2c3e50` / `#34495e`
- Rumble Strip: `#e74c3c` / `#ecf0f1`
- Player Vehicle: `#ff0055`

---

## 3. Criterios y Pruebas Visuales

1. **Silueta y Legibilidad:** Lectura clara del vehículo y rivales contra la carretera y el fondo.
2. **Valor y Luminancia:** Contraste de luminancia entre carretera y suelo ≥ 2:1.
3. **Paleta:** 0 píxeles renderizados fuera de los tokens configurados por escenario.
4. **Percepción de Velocidad sin HUD:** Diferencia entre 30% y 100% de la velocidad máxima claramente distinguible por la animación visual y movimiento del entorno.
5. **Legibilidad del HUD:** Contraste del HUD respecto al fondo ≥ 4.5:1.
