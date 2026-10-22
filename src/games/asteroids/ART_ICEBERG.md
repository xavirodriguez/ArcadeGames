Análisis exhaustivo de las guías estéticas de _Galaxian_ y _Out Run_ y propuesta de dirección de arte para un juego arcade de temática ártica inspirado en la jugabilidad clásica de _Asteroids_.

---

## Parte 1: Análisis en profundidad de las guías estéticas

Ambas biblias de arte comparten una filosofía de diseño radicalmente moderna pero profundamente anclada en el rigor geométrico y la claridad visual, rechazando los artificios digitales contemporáneos (_glow_, _bloom_, _scanlines_, desenfoques gaussianos y gradientes suaves).

1. **Galaxian (Versión "Papel Plegado")**:

- **Principio rector:** La materia define el volumen. El volumen tridimensional no nace de la luz difusa ni de los sombreados suaves, sino de **facetas planas y rígidas de dos o tres tonos** (`Light`, `Mid`, `Dark`) bajo una única fuente de luz cenital (arriba a la izquierda).

- **Jerarquía y legibilidad:** El color de los enemigos denota valor/rango en lugar de una amenaza abstracta. La silueta geométrica es inequívoca incluso sin color (accesibilidad estructural).

- **Efectos físicos:** Las sombras son proyecciones duras y desplazadas sin desenfoque (estilo recorte de papel). La destrucción no es una explosión caótica de partículas, sino un desensamblaje ordenado de las facetas que componen el objeto.

2. **Out Run (Versión "Hora Dorada en Bloques de Color")**:

- **Principio rector:** Masas planas de color y bandas rítmicas. La velocidad y la profundidad se comunican mediante el **ritmo geométrico de las franjas** (carretera, pianos, rayas de velocidad) y la perspectiva atmosférica por bloques tonales (_haze_).

- **Coherencia ambiental:** El mundo cambia de paleta según la hora del día, pero los elementos jugables clave (como el coche del jugador en color coral) se mantienen constantes para garantizar un contraste visual estricto (≥ 3:1).

- **Ausencia de texturas:** Todo es puramente procedural mediante vectores y primitivas geométricas (Canvas/Skia), priorizando el rendimiento y una nitidez visual impecable a alta velocidad.

---

## Parte 2: Propuesta Estética — _Borealis: Rompehielos Ártico_ (Estilo Asteroids / Bloques de Cristal y Hielo)

Para adaptar esta dirección de arte a un juego tipo _Asteroids_ donde controlas un barco que explora el Ártico y rompe icebergs, bautizaremos el concepto visual como **"Cristal Glaciar y Bloques Polares"**. Hereda la precisión facetada de _Galaxian_ y la atmósfera de masas de color de _Out Run_.

### 1. Concepto y Principios Visuales

- **Idea central:** El jugador es un robusto rompehielos de proa reforzada visto desde una perspectiva cenital (_top-down_). Los enemigos u objetivos son icebergs masivos de múltiples tamaños que, al ser impactados por el cañón térmico del barco, se fragmentan geométricamente en bloques menores.
- **Prioridades:**

1. **Legibilidad a alta velocidad de rotación:** Diferenciar instantáneamente el barco, los fragmentos de hielo grandes, los icebergs medianos y los peligros secundarios (como ventiscas o corrientes).
2. **Materia gélida, no brillo artificial:** El volumen de los icebergs y del casco se logra mediante facetas planas poligonales (de 3 tonos), evocando bloques de hielo tallado o cristal de roca.

3. **Luz unificada:** Sol polar bajo situado cenitalmente a la izquierda, proyectando sombras duras y desalineadas sobre el agua oscura.

---

### 2. Luz, Volumen y Sombras

- **Dirección de la luz:** Arriba a la izquierda. Las facetas orientadas a la luz reciben el tono `IceLight`; las opuestas llevan `IceMid` o `IceDark`.
- **Sombras duras sobre el agua:** Cada bloque de hielo proyecta una sombra estática desplazada (≈ 4 px a la derecha, 6 px abajo) en un tono azul marino profundo con opacidad fija, sin desdibujarse jamás.

- **Sin gradientes:** Las superficies del hielo son planas y facetadas, reflejando el sol polar mediante cambios bruscos de valor tonal.

---

### 3. Paleta de Color: Tránsito Polar (Noche Glaciar / Crepúsculo Ártico)

| Token        | Valor Hex | Uso principal                                                                                           |
| ------------ | --------- | ------------------------------------------------------------------------------------------------------- |
| `oceanBase`  | `#0E1628` | Fondo del océano ártico (base)                                                                          |
| `icebergFar` | `#1A2C4E` | Capa lejana de banquisa / icebergs distantes                                                            |
| `iceLight`   | `#E8F4F8` | Faceta superior/iluminada del hielo                                                                     |
| `iceMid`     | `#9AC5DB` | Faceta lateral del hielo                                                                                |
| `iceDark`    | `#5A8BA8` | Faceta en sombra del hielo                                                                              |
| `shipHull`   | `#FF6B4A` | Casco del rompehielos (color cálido de alta saturación, inalterable al igual que el coche de _Out Run_) |

|
| `shipShade` | `#D64927` | Sombra/lateral del casco del barco |
| `shipDeck` | `#2D3B4E` | Cubierta metálica del barco |
| `thermalBeam` | `#FFD15C` | Disparo del cañón térmico y estela del motor |
| `hazardAlert` | `#FF455B` | Icebergs peligrosos o núcleos inestables |
| `hudText` | `#FFF6E5` | Texto y marcadores del HUD |

_Reglas de color:_ Al igual que en _Out Run_, el elemento del jugador (`shipHull`) utiliza el tono más cálido y saturado de toda la pantalla para destacar de inmediato sobre la frialdad azul del océano y los icebergs. El naranja térmico se reserva estrictamente para la munición del jugador y los puntos de impacto.

---

### 4. Anatomía de los Objetos (Mecánica Estilo Asteroids)

#### A. El Rompehielos (Jugador)

Diseñado con una silueta geométrica simétrica orientada hacia el eje de avance:

- **Proa:** Doble cuña facetada en `shipHull` y `shipShade` diseñada para romper el hielo.
- **Puente de mando:** Polígono central elevado en `shipDeck`.
- **Estela trasera:** Trazos geométricos cortos en bloques que simulan la estela de espuma y propulsión en `thermalBeam` (con opacidad decreciente).

#### B. Los Icebergs (Objetivos / "Asteroides")

Se dividen en tres categorías según su masa, heredando la lógica de rangos y tamaños:

1. **Glaciar Colosal (Grande):** Bloque poligonal complejo de 8 a 12 facetas. Al recibir impacto, se fragmenta en 2–3 icebergs medianos.
2. **Medano Glaciar (Mediano):** Geometría angulosa y asimétrica de 6 facetas. Al romperse, genera esquirlas afiladas.
3. **Seraf / Bloque Afilado (Pequeño):** Fragmento final de alta velocidad, representado con un polígono triangular afilado.

---

### 5. Entorno y Fondo (Océano Dinámico y Parallax)

- **Fondo marino:** Franjas horizontales sutiles o placas de banquisa estáticas que se desplazan lentamente con efecto _parallax_ vertical/horizontal, recordando el sistema de franjas de carretera de _Out Run_ pero adaptado a la deriva del mar polar.

- **Aurora Boreal Geométrica:** En lugar de efectos de partículas fluidas o nebulosas borrosas, la aurora boreal se representa mediante 3 o 4 bandas poligonales translúcidas en tonos verdosos/cianes (`#4EF2B7` al 15% de alpha) que cruzan el horizonte superior en bloques facetados.

---

### 6. Sistema de Destrucción

- Cuando un iceberg colapsa, **no explota con fuego ni humo**, sino que se fractura limpiamente abriéndose en sus facetas poligonales originales (fragmentos triangulares y romboidales en `iceLight`, `iceMid` e `iceDark`) acompañados de un destello crema central y un anillo expansivo rígido (`thermalBeam`) que se disipa rápidamente.

---

### 7. HUD y Tipografía

- **Estilo:** Cifras tabulares grandes y limpias con tipografía sans-serif geométrica.

- **Disposición:**
- _Esquina superior izquierda:_ Puntuación actual y récord (`hudText`).

- _Esquina superior derecha:_ Oleada de icebergs / Nivel del sector polar.
- _Inferior:_ Barra compacta de integridad estructural del casco y energía del cañón térmico.
