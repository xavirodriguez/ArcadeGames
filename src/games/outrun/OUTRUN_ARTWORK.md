# Out Run — Art bible (versión moderna, "hora dorada en bloques de color")

Documento de referencia del artwork de la reimaginación moderna de Out Run.
Reúne en un solo sitio lo que está en el tablero de concepto y lo que hace falta
para implementarlo (`OUTRUN_PROMPT.md` lo toma como fuente de verdad visual).

**Cómo leerlo.** Hay tres niveles de certeza:

- **Dibujado**: aparece en el tablero de concepto (tarde, decorado de sierra
  suave). Los valores son decisiones tomadas.
- **Punto de partida**: tamaños, tiempos y proporciones que hay que afinar viendo
  el juego en movimiento.
- **Propuesta sin probar**: diseñado en papel, no dibujado ni visto en pantalla
  (las otras tres horas, los decorados de costa y desierto, los estados del
  coche, la noche).

La sección 18 lista lo que todavía no está diseñado.

---

## 1. Concepto y principios

**Idea central.** Un viaje por carretera hecho de masas de color planas. Cada
tramo ocurre a una hora distinta del día y cambia la paleta entera, pero hay
constantes (el coche, el texto, el ritmo de las franjas) que mantienen la
lectura.

Principios, en orden de prioridad:

1. **Legibilidad a velocidad.** En un vistazo hay que distinguir tu coche, el
   tráfico, el borde de la carretera y qué viene (curva, bifurcación).
2. **Bloques de color, no texturas.** Cielo en franjas, capas que se aclaran con
   la distancia, siluetas geométricas. Sin degradados suaves, sin blur, sin
   texturas.
3. **El color es la dirección de arte.** El ambiente lo da la paleta de la hora
   del día, no el detalle.
4. **El ritmo de las franjas es la velocidad.** Lo que da sensación de ir rápido
   es la alternancia de franjas de la carretera, los pianos y los objetos que
   crecen al pasar. Hay que cuidarlo más que cualquier adorno.
5. **Lo decorativo no toca el gameplay.**

**Anti-referencias** (lo que no debe parecer): atardecer rosa y violeta con sol
rayado (synthwave), neón con glow, filtro CRT con scanlines, 3D low-poly,
pixel art retro.

---

## 2. Qué significa "2D" aquí

Out Run ya era 2D en el fondo: la carretera es una pila de franjas horizontales
que se estrechan hacia el horizonte, y el resto son sprites escalados. Este
diseño conserva ese truco.

- **Carretera:** franjas horizontales. En un suelo plano, el ancho de cada franja
  es proporcional a su distancia vertical al horizonte. La geometría real sale
  siempre de `projectRoad()`; las cifras de este documento son referencias
  visuales, no una segunda fuente de verdad.
- **Objetos** (árboles, coches, señales): formas planas escaladas según su
  profundidad. No hay geometría 3D, ni cámara 3D, ni texturas.
- **Todo se dibuja de forma procedural** en Canvas y en Skia, con el mismo
  resultado.

---

## 3. Sistema de color: dos ejes

- **Hora** (paleta): amanecer, mediodía, tarde, crepúsculo, noche. Define cielo,
  astro, montañas, suelo, carretera, follaje y piano oscuro.
- **Decorado** (siluetas y objetos): costa, desierto, sierra. Define qué perfil
  tienen las capas lejanas y qué objetos hay al borde de la carretera.

Cualquier decorado se puede ver a cualquier hora. Un tramo es una pareja
(decorado, hora).

### 3.1 Jerarquía de color

| Elemento | Regla |
|---|---|
| **Tu coche** | Lo más saturado y cálido de la pantalla (coral). Nunca cambia de color con la hora. |
| **Carretera** | La masa más oscura y neutra del suelo. |
| **Tráfico** | Tonos apagados (mostaza, lila, azul grisáceo), siempre menos saturados que tu coche. |
| **Decorado** | Valores escalonados: cuanto más lejos, más claro y más teñido por el color del horizonte. |
| **Texto y marcas** | Crema. |

### 3.2 Constantes y variantes

| Token | Valor | Cambia con la hora |
|---|---|---|
| `car` | `#FF5A4F` | No |
| `carShade` | `#E8443C` | No |
| `carRoof` | `#FF7D70` | No |
| `carGlass` | `#162B3F` | No |
| `carLightBar` | `#FFE9E4` | No |
| `carLightEnd` | `#FF2D46` | No |
| `cream` | `#FFF1D6` | No (texto, marcas, piano claro) |
| `trafficA` / `trafficB` / `trafficC` | `#D9B45A` / `#A58BD1` / `#6E8CB8` | No |
| `shadow` | `#0F1F2E` (≈ 40–55 % de alpha) | No |
| `kerbB` (piano oscuro) | Ver paletas | **Sí**: en mediodía es azul marino, porque el verde azulado se confundía con el césped |

---

## 4. Paletas por hora

Cada hora define 15 tokens. La **tarde** está dibujada en el tablero. Las demás
son propuestas sin probar en escena.

| Token | Amanecer | Mediodía | Tarde | Noche |
|---|---|---|---|---|
| `skyHigh` | `#3A4A8C` | `#2A7DE1` | `#1B3F6B` | `#0B1030` |
| `skyMid` | `#8A88BE` | `#6FB0EE` | `#4F7EA0` | `#22246A` |
| `skyLow` | `#D9A9B8` | `#A9D4F5` | `#C7C09A` | `#4A2F8A` |
| `horizon` | `#FFD2AC` | `#D9EEF7` | `#FFCB7E` | `#8C3FA0` |
| `sun` (astro) | `#FFF1D0` | `#FFE98A` | `#FFE7A8` | `#DDE6FF` |
| `mtnFar` | `#B493B8` | `#7FA6C9` | `#7B9BA2` | `#2A2F6E` |
| `mtnMid` | `#8B76A6` | `#5D8DB8` | `#4C7480` | `#1E2358` |
| `mtnNear` | `#5E5688` | `#3F6F9C` | `#2F5560` | `#141846` |
| `groundFar` | `#8E86B2` | `#78CBA3` | `#C2A765` | `#26306A` |
| `groundNear` | `#6A6598` | `#3E9C74` | `#7F6C3A` | `#121842` |
| `roadFar` | `#6F6A93` | `#6A7585` | `#7C8A8C` | `#232759` |
| `roadNear` | `#34325A` | `#2F3644` | `#34444F` | `#0A0D26` |
| `foliage` | `#3F6F86` | `#1F6F6A` | `#1F6F6A` | `#17405E` |
| `foliageLight` | `#6FA3B5` | `#3FA39A` | `#3FA39A` | `#2F7F8F` |
| `kerbB` | `#2FB8B0` | `#24408E` | `#2FB8B0` | `#1E8F8A` |

**Crepúsculo** no tiene tokens propios: se genera mezclando al 50 % las paletas
de tarde y noche.

**Pendiente de verificar en pantalla:** el piano azul marino de mediodía contra
una carretera gris azulada oscura (luminosidad parecida; confía en la alternancia
con el crema para el ritmo).

### 4.1 Franjas del cielo

El cielo son **7 franjas planas** que van del cielo alto al horizonte. Alturas de
partida, como proporción del cielo (del borde superior al horizonte): 0.231,
0.192, 0.154, 0.135, 0.115, 0.096, 0.077.

Colores: la franja 1 es `skyHigh`, la 3 es `skyMid`, la 5 es `skyLow` y la 7 es
`horizon`. Las franjas 2, 4 y 6 son la mezcla al 50 % de sus vecinas.

Las 7 franjas de la tarde dibujada, ajustadas a mano (se desvían un poco de esa
regla): `#1B3F6B`, `#2D5C8A`, `#4F7EA0`, `#86A3A8`, `#C7C09A`, `#EFB86A`,
`#FFCB7E`.

---

## 5. Carretera

### 5.1 Franjas de suelo y carretera

- Cada segmento de carretera se dibuja como una franja. Las franjas **alternan**
  con la anterior: las impares se mezclan un 5 % con blanco.
- **Haze lineal con la profundidad.** El color de una franja de suelo es
  `lerp(groundNear, groundFar, f)` con `f` entre 0 (cerca) y 1 (distancia de
  dibujo). La carretera igual, con `roadNear` y `roadFar`.
- Las franjas cercanas son las más oscuras y contrastadas; las lejanas se
  funden con el color del horizonte.

Referencia de proporciones del tablero, para un frame de 300 px de ancho
(horizonte a 46 % de la altura, carretera con medio ancho de 135 px abajo):

| Franja | 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 (borde) |
|---|---|---|---|---|---|---|---|---|---|---|
| Distancia vertical al horizonte, normalizada | 0 | .013 | .037 | .07 | .12 | .193 | .30 | .45 | .667 | 1 |

El tablero dibuja una curva a la derecha desplazando el centro de cada franja
de forma cuadrática con la distancia; en el juego esa curvatura la dicta
`projectRoad()`.

### 5.2 Pianos (bordes)

- Franjas a ambos lados de la carretera, hacia fuera, de ancho ≈ 0.12 del medio
  ancho de la carretera en cada profundidad.
- Alternan `cream` y `kerbB`. En el tablero, los segmentos impares llevan el
  crema y los pares el `kerbB`.
- Se omiten cuando el ancho es inferior a un píxel (las franjas más lejanas).

### 5.3 Marcas de carril

- Línea central discontinua en `cream`, de ancho total ≈ 0.08 del medio ancho
  de la carretera.
- Va en los segmentos pares (el mismo ritmo que el piano oscuro).

### 5.4 Efectos de velocidad

- **Rayas de velocidad**: trazos rectos de 2 px, con terminaciones redondas,
  en `cream` al 28 % de alpha. Se colocan sobre el suelo fuera de los pianos,
  alineados radialmente con el punto de fuga, y se desplazan hacia fuera.
- Sin blur ni estelas. La velocidad se lee por las franjas, los pianos, los
  objetos y estas rayas.
- Cuanto más rápido vas, más aparecen (punto de partida: cero por debajo de
  cierta velocidad).

---

## 6. Cielo, astro y montañas

### 6.1 Cielo y nubes

- Siete franjas (4.1).
- **Nubes**: píldoras horizontales planas en `cream` al 22 % de alpha (altura
  6–8 px, ancho 48–76 px en un frame de 300), en 4–5 posiciones. Derivan muy
  despacio en horizontal.

### 6.2 Astro

- Disco plano en `sun` (radio ≈ 0.127 del ancho del frame) con un halo de un
  círculo del mismo color al 22 % de alpha (radio ≈ 1.37 × el del disco).
- Centro ≈ 18 px por encima del horizonte (en un frame de 300), medio tapado
  por las montañas lejanas.
- De día es el sol; de noche es la luna (`#DDE6FF`). Al amanecer y de tarde
  queda bajo.

### 6.3 Noche

*Propuesta sin probar:* 10–20 estrellas como puntos de 1 px en `cream` con
alpha entre 0.5 y 0.9, solo en las dos franjas altas del cielo. El haz de los
faros se describe en 8.4.

### 6.4 Montañas

Tres capas que se aclaran con la distancia: `mtnFar`, `mtnMid`, `mtnNear`.

Perfil de referencia del tablero (decorado **sierra suave**), dado como altura
sobre el horizonte en px para un frame de 300 de ancho, con la posición x
relativa al borde izquierdo:

| Capa | Perfil (x → alto) |
|---|---|
| Lejana | 0→28, 38→42, 80→24, 125→50, 175→28, 218→45, 260→30, 300→38 |
| Media | 0→14, 30→24, 65→10, 110→28, 155→8, 200→20, 250→6, 300→16 |
| Cercana | 0→7, 50→11, 100→4, 160→9, 220→3, 300→8 |

Parallax: cada capa se desplaza en horizontal según la curvatura de la
carretera y la velocidad, más despacio cuanto más lejos. *Punto de partida:*
lejana al 20 %, media al 40 %, cercana al 70 % del desplazamiento de referencia.

---

## 7. Decorados

Cada decorado define el perfil de las tres capas, el suelo y los objetos del
borde. Los objetos se dibujan sobre la franja a la profundidad que les
corresponde, de lejos a cerca.

### 7.1 Reglas de tamaño y posición de objetos

Todo se expresa respecto al **medio ancho de la carretera** (`hw`) a la
profundidad del objeto:

| Objeto | Regla |
|---|---|
| Altura de un árbol | ≈ 0.57 × `hw` |
| Ancho del coche del jugador | ≈ 0.47 × `hw` |
| Ancho de un coche de tráfico | ≈ 0.47 × `hw` |
| Distancia lateral al borde exterior del piano | ≈ 0.2–0.3 × `hw` |

Los objetos pueden salirse del frame por los lados: es normal.

### 7.2 Árbol redondo (dibujado, decorado sierra)

Con `H` = altura total:

- Tronco: rectángulo de ancho ≈ 0.10 × `H` y alto ≈ 0.355 × `H`, en `#4A3A2A`.
- Copa: elipse de radio horizontal ≈ 0.32 × `H` y vertical ≈ 0.355 × `H`, en
  `foliage`, apoyada sobre el tronco.
- Brillo: elipse de ≈ 0.4 de la copa en cada eje, desplazada arriba a la
  izquierda (≈ 0.35 del radio horizontal y 0.32 del vertical), en
  `foliageLight` al 85 %.

### 7.3 Sierra *(dibujado el árbol y las tres capas; el resto, propuesta)*

- Suelo: `groundNear` / `groundFar` de la hora, sin cambios.
- Capas: el perfil de 6.4.
- Objetos: árbol redondo, **pino** (tres triángulos apilados con la mitad
  izquierda en `foliageLight` y la derecha en `foliage`) y **roca** (polígono de
  5 vértices en dos tonos entre `mtnMid` y `mtnNear`).
- Picos nevados en la capa lejana, con la cima en `cream` al 80 %.

### 7.4 Costa *(propuesta sin dibujar)*

- **Mar** a un lado de la carretera, en el lado del horizonte. Es un plano de
  franjas con la misma regla de haze que el suelo, entre `waterNear = skyMid` y
  `waterFar = skyLow`. Refleja el cielo.
- Suelo del otro lado: el de la hora.
- Capas lejanas bajas: islas y acantilados suaves (alturas de 0.3 a 0.6 de las
  de la sierra).
- Objetos: **palmera** (tronco ligeramente curvado más cinco hojas triangulares
  desde la cima, en dos tonos de follaje) y **faro** (rectángulo alto con
  bandas `cream` y `kerbB`).

### 7.5 Desierto *(propuesta sin dibujar)*

- Suelo: `mix(groundHora, #E0B870, 0.6)`, con el haze de siempre.
- Capas lejanas: **dunas** como curvas suaves y **mesas** como trapecios. Más
  anchas y menos altas que la sierra.
- Objetos: **cactus** (rectángulo vertical redondeado con dos brazos en L, en
  `foliage` y `foliageLight`) y arbustos secos bajos.

### 7.6 Aerial perspective de los objetos

*Propuesta sin probar:* los objetos lejanos se mezclan con `horizon` en un
`f × 0.4` (donde `f` es la profundidad normalizada), para que se fundan con el
fondo igual que el suelo.

---

## 8. Coche del jugador

Vista trasera de un **coupé deportivo muy bajo y ancho**, con proporciones inspiradas
en un Ferrari moderno: techo bajo, cabina corta y una carrocería que ocupa más ancho
que alto. La silueta no debe tapar innecesariamente la carretera que queda delante.
Geometría de referencia en unidades del tablero (origen en el centro de la base del
coche, `y` hacia arriba en el dibujo; ancho total 64):

```
sombra       elipse (0,0)  rx 42  ry 4.5                   shadow @55 %
ruedas       rect x -33,y -9,w 10,h 9,rx 2                 shadow
             rect x  23,y -9,w 10,h 9,rx 2                 shadow
carrocería   rect x -32,y -20,w 64,h 17,rx 7               car
sombra baja  rect x -32,y -11,w 64,h 8,rx 4.5              carShade
cabina       polígono (-20,-20)(20,-20)(14,-33)(-14,-33)   car
techo        polígono (-14,-33)(14,-33)(12,-36)(-12,-36)   carRoof
luneta       polígono (-17,-21)(17,-21)(12,-31)(-12,-31)   carGlass
reflejo      polígono (-12,-21)(-4,-21)(4,-31)(-4,-31)     cream @18 %
barra luz    rect x -28,y -17,w 56,h 4,rx 2                carLightBar
extremos     rect x -28,y -17,w 10,h 4,rx 2                carLightEnd
             rect x  18,y -17,w 10,h 4,rx 2                carLightEnd
matrícula    rect x -9,y -11,w 18,h 5,rx 1.2              cream
```

La altura máxima del perfil se reduce de 54 a 36 unidades (un tercio menos), sin
reducir su ancho de 64. La escala en pantalla conserva el objetivo de ≈ 0.47 × `hw`
de ancho. La cabina, las ruedas y la barra luminosa también se aplanan; la prioridad
es una silueta deportiva legible que preserve visibilidad hacia el horizonte.

### 8.1 Estados *(propuesta sin probar)*

| Estado | Aspecto |
|---|---|
| Recto | Reposo. |
| Curva | Inclinación de ≈ 4° hacia el lado de la curva y sombra desplazada. |
| Freno | Barra de luz a `#FFFFFF` y extremos un 20 % más grandes. |
| Fuera de pista | Vibración vertical de ±2 px. |
| Choque | Parpadeo de alpha y sacudida breve de cámara. |

---

## 9. Tráfico

Vehículos vistos por detrás, con dimensiones en función del ancho `w` (para
`w` = 27, el valor del tablero). Las tres variantes se mantienen bajas y anchas;
furgoneta y camión se distinguen con cambios moderados en la cabina, no con techos
exageradamente altos.

```
sombra       elipse rx 0.55·w, ry 0.07·w, shadow @40 %
carrocería   rect de ancho w y alto 0.27·w, rx 0.07·w
cabina       trapecio: base 0.74·w, techo 0.56·w, alto base 0.16·w, encima de la carrocería
luneta       trapecio inscrito en la cabina, en carGlass
barra luz    rect de ancho 0.89·w y alto 0.074·w, a 0.15·w del borde superior de la carrocería, en #FFE0D8
```

Colores: carrocería en `trafficA/B/C`; cabina un 12 % más oscura. La furgoneta
y el camión siguen teniendo cabinas proporcionalmente algo más altas que el coupé,
pero todas las variantes deben conservar una altura total inferior a 0.53 × su ancho.

---

## 10. HUD y tipografía

Valores para un frame de 300 px de ancho; escalan con él.

| Elemento | Posición y estilo |
|---|---|
| **Tiempo** | Arriba a la izquierda, margen 16 px. Etiqueta "Tiempo" (12 px, `#BFD3E6`) y cifras de 26 px en `cream`. |
| **Tramo y hora** | Arriba a la derecha, alineado a la derecha. "Tramo 3 de 5" (12 px, `#BFD3E6`) y nombre de la hora (14 px, `cream`; "Hora dorada" para la tarde). |
| **Línea de progreso** | Línea de 3 px bajo el bloque superior, de margen a margen. Pista en `cream` al 25 %, progreso en `cream`. Marcadores: coche (círculo de 5 px de radio, `car`) y bifurcación (círculo de 4 px, `kerbB`). |
| **Velocímetro** | Píldora abajo a la izquierda (margen 12 px; alto 36, ancho 92, radio 12, `shadow` al 60 %). Cifras de 24 px en `cream` y "km/h" en 12 px. |
| **Radio** | Píldora abajo a la derecha (80×36, mismo estilo). Cinco marcas de 2 px: cuatro en `#BFD3E6` de 8–10 px de alto y la activa en `car`, de 14 px y 3 px de ancho. Etiqueta "Radio" de 12 px. |

**Tipografía.** Grotesca geométrica con **cifras tabulares** y grandes.
`font-variant-numeric: tabular-nums` en web; `fontVariant: ['tabular-nums']` en
React Native. No se añaden dependencias de fuentes: se usa una que el repo ya
incluya o la del sistema, y se documenta cuál. El texto va en frase normal
("Tramo 3 de 5", "Hora dorada"), no en mayúsculas.

---

## 11. Bifurcación

Pórtico plano sobre la carretera con dos flechas diagonales y la distancia.

- Panel de fondo `#142B40`, borde de 1.5 px en `cream`.
- Dos flechas rotadas ±35°, en el color de acento de cada rama: costa `#2FB8B0`,
  sierra `#FF8A5B`, desierto `#E8B04A` *(este último, propuesta)*.
- Texto central con la distancia ("300 m") en 12 px.
- Debajo de cada flecha, el nombre del decorado en `#C9D6E6`.
- Cada rama anticipa la paleta del tramo siguiente, con el acento como pista.

---

## 12. Transiciones de hora

*Propuesta sin probar.*

- Secuencia por defecto de 5 tramos: amanecer, mediodía, tarde, crepúsculo,
  noche. Configurable por tramo.
- La paleta no cambia de golpe. Se mezcla con la del tramo siguiente durante el
  último ≈ 15 % del tramo, con una curva suave, para que el cambio se sienta
  como avanzar y no como un corte.
- La mezcla es sobre los tokens (cálculo en color), no un fundido de pantalla.

---

## 13. Orden de capas (de atrás hacia delante)

1. Franjas del cielo
2. Estrellas (solo noche)
3. Nubes
4. Astro (halo y disco)
5. Montañas: lejana, media, cercana
6. Suelo (y agua, en costa), de lejos a cerca
7. Carretera, de lejos a cerca
8. Pianos
9. Marcas de carril
10. Haz de los faros (solo noche)
11. Rayas de velocidad
12. Objetos del borde y tráfico, ordenados por profundidad
13. Sombra y coche del jugador
14. HUD

---

## 14. Accesibilidad

- **Contraste coche/carretera ≥ 3 : 1** en las cinco horas, calculado con la
  fórmula de luminancia relativa de WCAG, entre `car` y `roadNear`. En la tarde
  del concepto mi cálculo da ≈ 3.3 : 1, así que el margen es estrecho; hay que
  verificarlo con una herramienta.
- El tráfico se distingue de tu coche por **saturación y forma**, no solo por
  tono: sus barras de luz son más pequeñas y sin extremos rojos.
- Los pianos alternan por **luminosidad** (crema claro frente a un tono oscuro),
  no solo por tono.
- Modo para daltónicos (`visual.paletteColorblind`): sustituye el contraste
  de tono por contraste de luminosidad entre coche, carretera y decorado.
  Valores por definir.
- Comprobaciones pendientes en pantalla: coche coral contra el césped verde de
  mediodía cuando sale de la carretera; pianos azul marino de mediodía; legibilidad
  de las cifras sobre el cielo de cada hora.

---

## 15. Calidad y rendimiento (artwork)

| | `high` | `low` |
|---|---|---|
| Franjas del cielo | 7 | 4 |
| Nubes | 4–5 | 2 |
| Objetos del borde | Densidad completa | La mitad |
| Rayas de velocidad | Sí | No |
| Estrellas (noche) | 10–20 | 5 |

- Sin `shadowBlur`, sin `BlurMaskFilter`, sin gradientes recreados por frame.
- Formas de los objetos cacheadas (Path2D en Canvas, Path en Skia) y
  transformadas por frame.
- El rendimiento en dispositivo no está medido; no se afirman cifras de FPS.

---

## 16. Reglas de los drawers

- Canvas y Skia producen el mismo resultado visual.
- No hay drawers de marcador: ninguno puede ser un literal de relleno ni estar
  vacío.
- La geometría de la carretera sale de `projectRoad()` y no se recalcula.

---

## 17. Procedencia

- Colores, geometría y proporciones salen del tablero de concepto diseñado en
  la conversación (la tarde, decorado de sierra suave). Los tamaños y los
  tiempos son puntos de partida.
- Las proporciones de objetos respecto a `hw` se midieron sobre ese tablero.
- Las demás horas, los decorados de costa y desierto, los estados del coche y
  las transiciones son propuestas de diseño que no se han visto en pantalla.

---

## 18. Lo que todavía no está diseñado

- Pantalla de título, logotipo y menús.
- Selección de emisora de radio (solo hay un dial decorativo).
- Siluetas definitivas de furgoneta y camión.
- Valores de la paleta para daltónicos.
- Fuente concreta del HUD (depende de lo que ya haya en el repo).
- Pantalla de resultados al final de cada tramo y del recorrido.
- Rival o "compañera" en el coche (el original tenía copiloto).
- Sonido y música (fuera del alcance de este documento).
