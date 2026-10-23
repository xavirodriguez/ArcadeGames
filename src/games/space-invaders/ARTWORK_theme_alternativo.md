# Aquí hay dragones — Art bible (mod de Space Invaders, "carta náutica")

Documento de referencia de la estética del mod **Aquí hay dragones**: un convoy de
monstruos marinos baja por una carta náutica antigua y un galeón defiende la
costa. Recoge todo lo que se ve en el tablero de concepto y lo que hace falta
diseñar alrededor para que sea un juego completo.

El arte está pensado para servir a dos reglas del mod:

- **El viento** desvía los proyectiles, los tuyos y los enemigos.
- **Las islas** sustituyen a los búnkeres y se erosionan al recibir impactos.

Todo lo demás (formación en bloque, marcha lateral, descenso, un OVNI que cruza
por arriba) es Space Invaders clásico.

---

## 0. Cómo leer este documento

Hay tres niveles de certeza, y cada sección dice cuál aplica:

| Nivel                     | Significado                                                                                 |
| ------------------------- | ------------------------------------------------------------------------------------------- |
| **Dibujado**              | Aparece en el tablero de concepto. Geometría, colores y valores son decisiones tomadas.     |
| **Punto de partida**      | Un tamaño, tiempo o proporción que hay que afinar viéndolo en movimiento. No está validado. |
| **Propuesta sin dibujar** | Diseñado en papel. No lo he visto en pantalla.                                              |

**Sistema de coordenadas del tablero.** El fotograma mide **206 × 420 u**, con el
origen arriba a la izquierda y la `y` hacia abajo. Para pasar a otro tamaño, se
multiplica todo por `ancho_real / 206`. Cuando una medida se da también como
fracción del ancho `W`, es para que se pueda escalar sin recalcular.

La sección 22 lista las **correcciones** respecto al tablero. Léela antes de
copiar geometrías.

---

## 1. Concepto y principios

**Idea central.** Una carta náutica del siglo XVI cobrando vida: pergamino, tinta
parda, lavados de color y un mar lleno de monstruos dibujados a mano. Cada
elemento del juego es un dibujo de tinta con una mancha de color encima, como si
alguien hubiera iluminado el mapa con acuarela.

Principios, en orden de prioridad:

1. **Tinta primero.** Cada cosa es una silueta de tinta parda. El color es un
   lavado semitransparente por encima, nunca el contorno.
2. **Dibujado a mano, impreso en plano.** Sin blur, sin degradados, sin sombras
   suaves. La sensación de mano sale de la forma, el grosor, el pequeño
   desregistro del color y la irregularidad de las líneas.
3. **El mapa informa.** La cuadrícula, la rosa de los vientos, las sondas y las
   líneas de rumbo no son decoración vacía: cuentan el viento y la distancia a
   las islas.
4. **Legibilidad antes que ornamento.** Dentro del área de juego, lo decorativo
   se queda por debajo del 15 % de alpha. Lo que pesa son las criaturas, las
   islas y el galeón.
5. **Tres colores con significado.** Tinta (estructura), rojo (hostil) y verde
   azulado (mar y serpiente).
6. **Lo decorativo no toca el gameplay.** Todo lo que sea ornamento, desregistro,
   manchas o animación de papel es presentación pura.

**Anti-referencias** (lo que no debe parecer):

- Piratas de dibujos animados: calaveras, banderas negras, loro en el hombro.
- Filtro sepia sobre una foto, o textura de papel hecha con ruido fotográfico.
- Tipografías "de mapa de fantasía" recargadas que dificultan leer las cifras.
- Neón, glow, scanlines.

---

## 2. Qué debe poder leer el jugador

| Información                  | Cómo se transmite                                                                                                           |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Qué es hostil                | Rojo en el lavado de las criaturas y en los arpones. Tinta gruesa y silueta propia.                                         |
| Qué es mi barco              | Es el único elemento claro (velas en `parchmentLight`) sobre tinta oscura.                                                  |
| Qué es refugio               | Islas en `land`, el color más "sólido" del mapa, con halo de aguas someras.                                                 |
| Hacia dónde sopla el viento  | Flecha en el HUD, curvatura de las trayectorias, ondas del mar inclinadas e inclinación de las velas. Nunca solo por color. |
| Cuánto queda de una isla     | La silueta de la costa, derivada de la máscara real.                                                                        |
| Qué rango tiene una criatura | La silueta (cabeza con tentáculos, serpiente, aleta), no el color.                                                          |

---

## 3. Técnica gráfica

### 3.1 Cómo se construye una criatura

Cuatro capas, de abajo a arriba:

1. **Silueta de tinta**: forma rellena en `ink`.
2. **Lavado**: la misma forma o parte de ella, en `red` o `teal`, semitransparente
   y **desplazada (−1.2, −1.2) u** respecto a la tinta. El desplazamiento es el
   desregistro de una impresión a dos pasadas, y es lo que da el aspecto de
   iluminado a mano.
3. **Línea de detalle**: trazos con terminación redonda (tentáculos, patas,
   oleaje).
4. **Ojos y reflejos** en `parchment`.

**Regla del lavado:** nunca cubre la tinta por completo. La silueta de tinta tiene
que asomar por el borde en todas las criaturas.

### 3.2 Grosores de línea (en u, tablero de 206 de ancho)

| Elemento                     | Grosor                       | Estado   |
| ---------------------------- | ---------------------------- | -------- |
| Marco exterior               | 1.5                          | Dibujado |
| Marco interior               | 0.6                          | Dibujado |
| Cuadrícula                   | 1 (alpha 0.12)               | Dibujado |
| Contorno de islas            | 1.2                          | Dibujado |
| Aguas someras                | 1 (alpha 0.6)                | Dibujado |
| Ondas del mar                | 1.4 (alpha 0.5)              | Dibujado |
| Cuerpo de la serpiente       | 4 (tinta) y 2 (lavado)       | Dibujado |
| Tentáculos                   | 2                            | Dibujado |
| Aleta, línea de olas         | 1.6                          | Dibujado |
| Patas de la serpiente (cola) | 1.3                          | Dibujado |
| Mástil                       | 1.5                          | Dibujado |
| Contorno de las velas        | 1                            | Dibujado |
| Arpones enemigos             | 1.8 (ver corrección en 15.2) | Dibujado |
| Estela de la bala de cañón   | 1.4, discontinua `3 3`       | Dibujado |
| Palmera                      | 1.3                          | Dibujado |
| Salpicadura                  | 1.2 y 1                      | Dibujado |
| Chorro de la ballena         | 1.3                          | Dibujado |

Todas las terminaciones de línea son **redondas** (`stroke-linecap: round`).

### 3.3 Alphas de referencia

| Uso                                  | Alpha                  | Estado    |
| ------------------------------------ | ---------------------- | --------- |
| Lavado rojo de las criaturas         | 0.6                    | Dibujado  |
| Lavado verde azulado de la serpiente | 0.8                    | Dibujado  |
| Cuadrícula                           | 0.12                   | Dibujado  |
| Ondas del mar                        | 0.5                    | Dibujado  |
| Aguas someras                        | 0.6                    | Dibujado  |
| Anillo exterior de la salpicadura    | 0.4                    | Dibujado  |
| Líneas de rumbo (8.3)                | 0.06, y 0.25 la activa | Propuesta |
| Sondas (8.4)                         | 0.35                   | Propuesta |

### 3.4 Mano alzada

_Propuesta sin dibujar._ Los polígonos de islas y criaturas tienen un temblor
**determinista**: cada vértice se desplaza hasta ±0.6 u con un hash de su
identidad. No se recalcula por frame. Opcionalmente, un "hervor" de dos fotogramas
a 6 fps en las líneas de ondas y las estelas (nunca en las criaturas) para dar
vida a la tinta. Probar antes de aceptarlo: puede leerse como ruido.

### 3.5 Prohibido

- `shadowBlur`, `BlurMaskFilter` o cualquier desenfoque.
- Degradados en cualquier elemento (los bordes del papel se hacen con bandas
  planas apiladas, sección 5.2).
- Texturas de papel hechas con imagen o ruido por píxel.
- Contornos negros uniformes de grosor constante en las criaturas: el contorno es
  la propia silueta de tinta.

---

## 4. Paleta

### 4.1 Tokens

| Token            | Valor     | Uso                                              | Estado    |
| ---------------- | --------- | ------------------------------------------------ | --------- |
| `parchment`      | `#E8D9B5` | Fondo, ojos, color "papel"                       | Dibujado  |
| `parchmentLight` | `#F4E9CC` | Velas                                            | Dibujado  |
| `land`           | `#CDB88A` | Relleno de las islas                             | Dibujado  |
| `ink`            | `#2B2118` | Tinta: siluetas, líneas, marcos, texto principal | Dibujado  |
| `inkMuted`       | `#5A4630` | Etiquetas del HUD                                | Dibujado  |
| `red`            | `#B5332E` | Lavado hostil, arpones, flecha de viento         | Dibujado  |
| `teal`           | `#2E7F7A` | Mar, aguas someras, serpiente, chorro            | Dibujado  |
| `parchmentEdge`  | `#B9A06B` | Bordes quemados del papel (5.2)                  | Propuesta |
| `creaseLight`    | `#FFF6DC` | Lado claro de un pliegue (5.3)                   | Propuesta |
| `stain`          | `#8A6B3A` | Manchas de humedad (5.4)                         | Propuesta |
| `gold`           | `#C9A227` | Gallardete, ojo del dragón, detalles de cartela  | Propuesta |

### 4.2 Reglas de uso

- **Rojo = hostil.** Va en el lavado de las criaturas y en los arpones. Ver la
  corrección del gallardete en la sección 22.
- **Verde azulado = agua.** El mar, las aguas someras, las ondas, el chorro de la
  ballena y el lavado de la serpiente.
- **Tinta = estructura.** Marcos, siluetas, mástil, textos y estela de la bala.
- **El color nunca va solo.** Cada elemento hostil tiene también silueta
  inconfundible.

### 4.3 Contraste

Calculado con la fórmula de luminancia relativa de WCAG. Son cálculos míos;
conviene verificarlos con una herramienta.

| Pareja                                    | Contraste aproximado |
| ----------------------------------------- | -------------------- |
| `ink` sobre `parchment`                   | ≈ 11 : 1             |
| `red` sobre `parchment` (trazo completo)  | ≈ 4.3 : 1            |
| `teal` sobre `parchment` (trazo completo) | ≈ 3.4 : 1            |

Con el alpha de las ondas (0.5), el verde azulado baja a un contraste efectivo
mucho menor: es adrede, porque son decorativas y no deben competir con nada.
Los arpones rojos, en cambio, se dibujan al 100 % porque son información crítica.

---

## 5. El papel

### 5.1 Base _(dibujado)_

Relleno plano `parchment` en todo el fotograma, con esquinas redondeadas de 8 u.
No hay textura.

### 5.2 Bordes quemados _(propuesta sin dibujar)_

Tres marcos concéntricos de 6 u cada uno, pegados al borde, en `parchmentEdge`,
con alpha **0.12, 0.18 y 0.26** de dentro hacia fuera. Son bandas planas: de cerca
se ven escalones y de lejos un oscurecimiento progresivo. Quedan fuera del marco
interior (a menos de 10 u del borde).

### 5.3 Pliegues _(propuesta sin dibujar)_

Un pliegue vertical en `x = 103` (W/2) y uno horizontal en `y = 210` (H/2), como
si el mapa hubiera estado doblado en cuatro. Cada uno son dos líneas paralelas
separadas 1 u: una en `ink` con alpha 0.08 y otra en `creaseLight` con alpha 0.25.
Las criaturas pasan por encima: los pliegues quedan debajo de todo.

### 5.4 Manchas _(propuesta sin dibujar)_

2–3 manchas planas con alpha 0.05–0.06 en `stain`: un anillo (marca de taza) de
14 u de radio y 3 u de grosor, y un óvalo irregular. Fijas, sin animación.

### 5.5 Envejecimiento por oleada _(propuesta sin dibujar)_

Opcional: cada oleada el pergamino se mezcla un 3–4 % más con `parchmentEdge`.
La primera oleada se ve nueva y la décima, amarillenta. Tope en el 30 %.

---

## 6. Marco

### 6.1 Doble línea _(dibujado)_

- Rectángulo exterior: `x = 6, y = 6, 194 × 408`, trazo `ink` de 1.5 u.
- Rectángulo interior: `x = 10, y = 10, 186 × 400`, trazo `ink` de 0.6 u.

### 6.2 Banda graduada _(propuesta sin dibujar)_

En el hueco de 4 u entre las dos líneas, segmentos alternos `ink` y `parchment`
de 6 u de largo, como la banda de un mapa cartográfico. En fotogramas pequeños se
puede omitir.

### 6.3 Esquinas _(propuesta sin dibujar)_

Un adorno discreto en cada esquina del marco interior: un cuarto de círculo de
radio 6 u en `ink` (trazo de 0.6 u) con un punto de 1 u en el centro.

### 6.4 Etiquetas de grado _(propuesta sin dibujar)_

Solo en layouts grandes (más de 400 px de ancho): marcas pequeñas y cifras de
grado sobre la banda graduada, en serif cursiva. En fotogramas de móvil no hay
sitio y se omiten.

---

## 7. Cuadrícula _(dibujado)_

Meridianos y paralelos como líneas finas, trazo `ink` de 1 u con alpha 0.12:

- Verticales en `x = 52, 103, 154` (a W/4, W/2, 3W/4).
- Horizontales en `y = 110, 200, 290, 380`.

Se dibujan entre las dos líneas del marco (desde 10 hasta 196 en `x`, y desde 10
hasta 410 en `y`).

---

## 8. El mar

### 8.1 Ondas _(dibujado)_

Marcas de ola de 16 u de ancho, trazo `teal` de 1.4 u con alpha 0.5 y
terminaciones redondas. Cada una es una curva cuadrática seguida de una repetición
suave: `M x y q4-4 8 0 t8 0`.

Posiciones del tablero, en la esquina izquierda de cada marca:
`(22,140)`, `(150,190)`, `(30,252)`, `(120,262)`, `(70,345)`, `(160,355)`.

### 8.2 Ondas según el viento _(propuesta sin dibujar)_

Las marcas se inclinan según el viento: de −8° a +8°, de modo que "corren" hacia
donde sopla. Con viento fuerte, la marca se alarga hasta un 25 %.

### 8.3 Líneas de rumbo _(propuesta sin dibujar)_

Las cartas portulanas tenían una red de líneas que salían de las rosas de los
vientos. Aquí, 16 líneas rectas desde el centro de la rosa del HUD que cruzan el
área de juego, en `ink` con grosor 0.8 u y alpha **0.06**. La que coincide con la
dirección del viento activa se pinta en `teal` con alpha 0.25. Quedan por debajo de
las ondas.

### 8.4 Sondas _(propuesta sin dibujar)_

Cifras pequeñas (8–9 u, serif cursiva, `ink` con alpha 0.35) repartidas por el mar
como las sondas de profundidad de las cartas náuticas. Valor ≈ `distancia a la isla
más cercana / 6`, redondeado, entre 3 y 40. Posiciones por hash determinista en una
rejilla con ruido. En calidad `low`, se omiten.

---

## 9. Viento y rosa de los vientos

### 9.1 Rosa en el HUD _(dibujado)_

Centrada en `(170, 36)`:

- Círculo de radio 14 u, trazo `ink` de 1 u, sin relleno.
- Estrella de cuatro puntas, relleno `ink`:
  `0,-13  3,-3  13,0  3,3  0,13  -3,3  -13,0  -3,-3`.

### 9.2 Rosa completa _(propuesta sin dibujar)_

Para layouts grandes: 16 rumbos con las cuatro puntas cardinales largas, las
intercardinales medianas y las secundarias cortas. Una flor de lis en el norte.
Una punta cardinal en `red` (la del este y la del oeste, que son las del viento
horizontal). Los demás en `ink`.

### 9.3 Flecha de viento _(dibujado)_

Con la etiqueta "Viento" (12 u, `inkMuted`) encima, en `(110, 22)`. La flecha es un
polígono relleno `red`:

`110,36  130,36  130,32  140,38  130,44  130,40  110,40`

Es decir: un cuerpo de 20 × 4 u y una cabeza triangular de 10 u de largo y 12 de
ancho. Apunta hacia donde sopla.

### 9.4 Fuerza del viento _(propuesta sin dibujar)_

Se asume un viento **horizontal** (izquierda o derecha) de fuerza 1 a 3. La cabeza
de la flecha no cambia; el cuerpo mide **12, 20 y 30 u**. A fuerza 3 se añaden dos
barbas en la cola, como en los barbados de una veleta. Si el diseño de juego
permite 8 direcciones, la flecha rota en pasos de 45°.

### 9.5 Cambio de viento _(propuesta sin dibujar)_

Al empezar cada oleada, la flecha gira con un pequeño rebote (≈ 300 ms) y las
ondas del mar, las velas y la estela de la bala se reajustan a la vez.

### 9.6 Dónde se nota el viento

| Elemento                   | Efecto                        |
| -------------------------- | ----------------------------- |
| Flecha del HUD             | Dirección y fuerza            |
| Estela de la bala de cañón | Se curva hacia donde sopla    |
| Arpones enemigos           | Caen inclinados (15.2)        |
| Ondas del mar              | Se inclinan (8.2)             |
| Velas del galeón           | Se hinchan y se ladean (14.3) |

---

## 10. HUD y tipografía

### 10.1 Composición _(dibujado)_

| Elemento              | Posición           | Estilo           |
| --------------------- | ------------------ | ---------------- |
| "Leguas" (etiqueta)   | `(18, 26)`         | 12 u, `inkMuted` |
| Puntuación (`01 240`) | `(18, 46)`         | 16 u, `ink`      |
| "Viento" (etiqueta)   | `(110, 22)`        | 12 u, `inkMuted` |
| Flecha de viento      | `(110…140, 32…44)` | `red`            |
| Rosa                  | centro `(170, 36)` | `ink`            |

Márgenes: 18 u a la izquierda (≈ 0.087 W). No hay barra ni línea de separación: el
HUD vive sobre el pergamino.

### 10.2 Vidas _(propuesta sin dibujar)_

El tablero no las muestra. Tres galeones en miniatura (escala 0.5) en la esquina
inferior izquierda, `(22, 408)`, `(40, 408)`, `(58, 408)`, sobre el marco interior,
con etiqueta "Tripulación" de 12 u en `inkMuted` encima.

### 10.3 Tipografía _(propuesta, con una nota)_

El tablero usa una sans genérica porque era la que tenía el entorno de dibujo. La
intención de diseño es otra:

- **Etiquetas**: serif en cursiva, 12 u, en `inkMuted`.
- **Cifras**: serif con **cifras de línea y tabulares**, 16 u, en `ink`.
- Texto en frase normal ("Leguas", "Oleada 3"), no en mayúsculas, salvo el
  rótulo de derrota (17.3), que va en versalitas.

**Nota:** Georgia y otras serif de sistema dibujan cifras de estilo antiguo (con
alturas variables) por defecto. Para cifras de línea hay que activar
`font-variant-numeric: lining-nums tabular-nums` en web o `fontVariant:
['lining-nums', 'tabular-nums']` en React Native, y ese soporte varía entre
plataformas. Si no se consigue, usar una sans solo para las cifras.

**No se añaden dependencias de fuentes.** Se usa la serif del sistema o una que el
repo ya incluya, y se documenta cuál.

---

## 11. Criaturas

### 11.1 Formación _(dibujado)_

- 5 columnas, paso horizontal de **34 u** (≈ 0.165 W), con centros en
  `x = 35, 69, 103, 137, 171`.
- 3 filas, paso vertical de **34 u**, con centros en `y = 100, 134, 168`.
- Todas las criaturas se dibujan a **escala 1.1**.
- Una especie por fila, de arriba abajo: kraken, serpiente marina, aleta de
  tiburón.

El tablero reduce la formación original (11 × 5) a 5 × 3 para que se lea el detalle.

### 11.2 Kraken _(dibujado)_

Ojo y cabeza redonda con tres tentáculos que cuelgan. Coordenadas locales (origen
en el centro de la cabeza; se mira hacia abajo, hacia el galeón):

```
cabeza       círculo (0,0) r 7                          ink
lavado       círculo (-1.2,-1.2) r 5.6, alpha 0.6       red
ojos         círculo (-2.5,0) r 1.4                     parchment
             círculo ( 2.5,0) r 1.4                     parchment
tentáculos   M-5 6 q-3 5 -7 4
             M0 7 q0 6 -3 8
             M5 6 q3 5 7 4                              ink, trazo 2, redondo
```

Ancho total aproximado con tentáculos: ≈ 26 u a escala 1.1.

### 11.3 Serpiente marina _(dibujado)_

Cuerpo en S horizontal con cabeza a la derecha y cola bifurcada:

```
cuerpo       M-9 -2 C-5 -9 -1 3 3 -3 C6 -7 9 -4 10 0    ink, trazo 4, redondo
lavado       el mismo trazo, trazo 2, alpha 0.8          teal
cabeza       círculo (10,1) r 3                          ink
ojo          círculo (11,0) r 0.9                        parchment
cola         M-9 -2 l-4 2   M-9 -2 l-4 -3                ink, trazo 1.3, redondo
```

Ancho total aproximado: ≈ 27 u a escala 1.1.

### 11.4 Aleta de tiburón _(dibujado)_

Aleta triangular que sobresale de una línea de olas:

```
aleta        polígono 0,-9  7,4  -7,4                    ink
lavado       polígono 0,-9  7,4  1,4, alpha 0.6          red
olas         M-10 6 q3-3 5 0 t5 0 t5 0 t5 0              teal, trazo 1.6, redondo
```

Ancho total aproximado: ≈ 22 u a escala 1.1.

### 11.5 Marcha _(propuesta sin dibujar)_

Dos fotogramas por criatura, que alternan en cada paso de la formación:

| Criatura  | Fotograma A            | Fotograma B                                                                 |
| --------- | ---------------------- | --------------------------------------------------------------------------- |
| Kraken    | Tentáculos del tablero | `M-5 6 q-1 6 -5 8`, `M0 7 q0 6 3 8`, `M5 6 q1 6 5 8`                        |
| Serpiente | Curva del tablero      | Misma curva con la fase invertida: `M-9 -2 C-5 5 -1 -9 3 -3 C6 2 9 -2 10 0` |
| Aleta     | Olas del tablero       | `M-10 6 q3 3 5 0 t5 0 t5 0 t5 0`                                            |

Además, un cabeceo de ±1.5 u en vertical entre fotogramas.

### 11.6 Estados _(propuesta sin dibujar)_

| Estado                                    | Aspecto                                                                                               |
| ----------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Reposo                                    | Fotogramas A/B.                                                                                       |
| Golpeada (si hay más de un punto de vida) | Parpadeo del lavado a `parchment` durante 2 fotogramas y un trazo de tinta extra (un tachón en cruz). |
| Destruida                                 | Salpicadura y gotas de tinta (16.1).                                                                  |

### 11.7 Variaciones por oleada _(propuesta sin dibujar)_

Las oleadas altas añaden detalle de línea (escamas en la serpiente, ventosas en los
tentáculos) y un tercer tono de lavado. La silueta no cambia.

---

## 12. Nave bonus

### 12.1 Ballena _(dibujado)_

Cruza el carril superior, centrada en `(150, 70)` en el tablero:

```
cuerpo       elipse rx 13, ry 5.5                     ink
cola         polígono 12,0  21,-6  21,6               ink
ojo          círculo (-7,-1) r 1                      parchment
chorro       M-6 -5 q-2 -6 -6 -6   M-6 -5 q2 -6 6 -6  teal, trazo 1.3, redondo, sin relleno
```

### 12.2 Dragón _(propuesta sin dibujar)_

El título del mod promete dragones y el tablero solo tiene una ballena. Hay dos
opciones:

- **A (dibujada): ballena** como nave bonus habitual.
- **B (propuesta): dragón marino** como nave bonus rara (por ejemplo, cada cierto
  número de oleadas), con puntuación mayor.

El dragón sería una silueta de tinta de ≈ 34 u de largo, cuerpo serpentino, alas de
murciélago con tres dedos y borde festoneado, y cuernos en la cabeza. Lavado en
`gold` y `red`. Ojo en `gold`. Sin fuego, para no confundirlo con un proyectil.
Recomiendo la opción B si se quiere que el título se cumpla.

### 12.3 Animación _(propuesta sin dibujar)_

La ballena cruza en ≈ 6 s con un ligero movimiento ondulante. El chorro aparece
cada 1.2 s (dos curvas que se dibujan y se desvanecen en 400 ms).

---

## 13. Islas (los búnkeres)

### 13.1 Geometría _(dibujado)_

Tres islas en el tablero, en `y ≈ 300`, centradas en `x ≈ 45, 103, 161`. Cada una
tiene relleno `land`, contorno `ink` de 1.2 u, y un **halo de aguas someras**: un
polígono mayor, sin relleno, con trazo `teal` de 1 u y alpha 0.6.

**Isla A** (casi entera):

```
costa        28,305  31,296  38,292  46,288  55,293  62,300  58,308  46,310  35,310
aguas someras 22,309  26,294  38,286  47,282  59,289  68,300  62,313  46,316  30,315
```

**Isla B** (muy erosionada):

```
costa        92,304  96,297  103,294  110,298  113,304  106,308  97,308
aguas someras 88,308  92,296  103,290  114,296  118,305  107,312  94,312
```

**Isla C** (partida en dos):

```
costa 1      146,303  150,296  158,294  163,300  158,306  150,307
costa 2      169,304  173,299  178,302  176,307  170,308
aguas someras 142,308  146,296  158,290  167,298  163,310  150,312
```

### 13.2 Palmera _(dibujado, solo en la isla A)_

Tronco `M46 288 V278` y cuatro frondas desde su cima:
`M46 278 q-6 -2 -9 2`, `M46 278 q6 -2 9 2`, `M46 278 q0 -7 -3 -8`,
`M46 278 q0 -7 3 -8`. Trazo `ink` de 1.3 u, redondo.

### 13.3 Fases de erosión _(propuesta sin dibujar, salvo A, B y C)_

Cada isla pasa por cuatro fases a medida que recibe impactos:

| Fase | Aspecto                                                                                  |
| ---- | ---------------------------------------------------------------------------------------- |
| 0    | Entera, con palmera. Costa como la isla A.                                               |
| 1    | Una mordida en la costa y la palmera caída (dos trazos cortos en el suelo).              |
| 2    | Pequeña y sin palmera. Como la isla B.                                                   |
| 3    | Partida en dos islotes. Como la isla C.                                                  |
| 4    | Un arrecife: un punto de tinta de 1.2 u y las aguas someras desvaneciéndose en ≈ 600 ms. |

El halo de aguas someras **se encoge con la isla**: siempre es el contorno de la
costa más un margen de 5–7 u.

### 13.4 Coherencia con la lógica

La silueta de una isla se **deriva de la máscara real** de colisión (por ejemplo, con
un trazado de contornos suavizado) y no se dibuja a mano aparte. Los polígonos del
tablero son un ejemplo de lo que debe parecer el resultado. El temblor de mano
alzada (3.4) se aplica después.

### 13.5 Impacto en una isla _(propuesta sin dibujar)_

Un impacto arranca un trozo de costa con una salpicadura pequeña (anillo de radio
6 u) y 2–3 gotas. La costa se redibuja con el hueco.

---

## 14. El galeón

### 14.1 Geometría _(dibujado)_

Origen en el centro de la línea de flotación; base del tablero en `(103, 396)`:

```
casco        M-14 0 L14 0 L10 8 L-10 8 Z                    ink
mástil       línea (0,0)-(0,-26), trazo 1.5                 ink
vela izq     polígono -1,-4  -1,-22  -12,-6                 relleno parchmentLight, trazo ink 1
vela der     polígono  1,-4   1,-26   12,-6                 relleno parchmentLight, trazo ink 1
gallardete   polígono 0,-26  7,-24  0,-22                   red (ver sección 22)
```

Ancho total: 28 u (≈ 0.136 W). Alto: 34 u.

### 14.2 Posición

Sobre la línea de flotación, centrado en `y = 396`. Se mueve solo en horizontal.

### 14.3 Velas con el viento _(propuesta sin dibujar)_

El ángulo de las velas depende de la fuerza del viento: se ladean `fuerza × 3°`
hacia donde sopla y los vértices de las velas se desplazan `fuerza × 0.8 u` para
hincharlas.

### 14.4 Estados _(propuesta sin dibujar)_

| Estado      | Aspecto                                                                                           |
| ----------- | ------------------------------------------------------------------------------------------------- |
| Navegando   | Reposo, con un balanceo de ±1 u en vertical.                                                      |
| Disparo     | Una nubecilla de humo: tres círculos de tinta con alpha 0.3 que suben y se desvanecen en 300 ms.  |
| Golpeado    | El casco se parte en tres polígonos de tinta, las velas caen en trozos y hay una mancha de tinta. |
| Reaparición | Parpadeo de alpha durante la invulnerabilidad.                                                    |

---

## 15. Proyectiles

### 15.1 Bala de cañón _(dibujado)_

Círculo de radio 2.6 u en `ink`, con una **estela discontinua** (trazo 1.4 u, patrón
`3 3`). La estela es una curva que muestra el efecto del viento. En el tablero:

`M103 380 C106 362 112 346 122 332`, con la bala en `(122, 332)`.

### 15.2 Arpón enemigo _(dibujado, con una corrección)_

Asta de 12 u con una punta de dos barbas, en `red`, trazo 1.8 u, redondo.

**Corrección.** En el tablero las barbas quedaron en la base del asta, no en la
punta. La geometría correcta, en coordenadas locales con la punta en el origen y
el asta saliendo hacia arriba y ligeramente de lado:

```
asta     M-3 -12  L0 0                 (inclinación por el viento)
barbas   M0 0 l-3 -4    M0 0 l3 -4
```

La inclinación del asta es `atan(fuerza_viento × 0.1)`. A fuerza 2 son ≈ 11°.

_Punto de partida:_ a tamaños pequeños, subir el grosor a 2.2 u para que el rojo no
desaparezca contra el pergamino.

### 15.3 Arco de puntería _(propuesta sin dibujar)_

Como ayuda opcional en dificultad baja: una curva de puntos (`2 4`, trazo 1 u,
`ink` con alpha 0.35) desde el galeón que muestra la trayectoria con el viento
actual. Desaparece al disparar.

---

## 16. Efectos

### 16.1 Salpicadura al destruir una criatura _(dibujado en estado final)_

Cuando una criatura es destruida, queda esta marca (en el tablero, en `(103, 134)`):

```
anillo interior   círculo r 8,  trazo ink 1.2
anillo exterior   círculo r 13, trazo ink 1, alpha 0.4
gotas             círculos de tinta: (-4,-14) r 1.4;  (6,-12) r 1.2;  (12,-4) r 1.2
```

**Animación** _(propuesta sin dibujar)_: el anillo interior crece de 3 a 8 u y el
exterior de 6 a 13 u en ≈ 350 ms, con las gotas saliendo despedidas y cayendo en
arco. Al final queda una pequeña mancha de tinta (círculo de radio 2 u) que se
desvanece en 500 ms. El kraken suelta además una nubecilla de tinta (tres círculos
con alpha 0.3).

### 16.2 Marcas de conteo _(propuesta sin dibujar)_

En la esquina inferior derecha, junto al marco, se acumulan **marcas de tinta**
(trazos verticales de 8 u de alto y 1.2 u de grosor, agrupadas de cinco en cinco
con una tachadura diagonal), una por criatura hundida en la oleada. Se reinician al
empezar la siguiente.

### 16.3 Texto de puntos _(propuesta sin dibujar)_

Cifra en serif cursiva, `ink`, 12 u, que sube 12 u y se desvanece en ≈ 600 ms
(`+30`). Más grande (16 u) y con un subrayado de línea ondulada para la nave bonus.

### 16.4 Sello de oleada superada _(propuesta sin dibujar)_

Al limpiar la oleada, un **sello de lacre** `red` (círculo de radio 16 u con borde
irregular de 10–12 vértices y un anillo interior en un tono más oscuro) aparece en
el centro con una pequeña escala de rebote y se desvanece en 1 s. Sin glow.

---

## 17. Estados y pantallas

### 17.1 Inicio de oleada _(propuesta sin dibujar)_

Una **cartela** en el centro: una cinta de pergamino claro (`parchmentLight`) de
150 × 34 u con extremos en cola de golondrina, borde `ink` de 1.5 u y dos líneas
de texto en serif: "Oleada 3" (16 u) y el nombre de la región (12 u, cursiva).
Aparece 1.2 s y se desvanece. Nombres de ejemplo, que son texto de ambientación:
"Mar de las Calmas Falsas", "Estrecho de las Sombras", "Golfo del Último Faro",
"Aguas del Olvido", "Costa de los Cuervos".

### 17.2 Oleada superada _(propuesta sin dibujar)_

Sello de lacre (16.4) y, durante un instante, las criaturas hundidas aparecen
dibujadas en el margen como "trofeos" de tinta, en pequeño.

### 17.3 Derrota _(propuesta sin dibujar)_

Una mancha de tinta (`ink` con alpha 0.85) se extiende desde la costa invadida
hasta cubrir el pergamino y deja, en `parchment`, el rótulo en versalitas **"Hic
sunt dracones"** ("Aquí hay dragones", en latín), con una línea de puntuación
debajo.

### 17.4 Pausa _(propuesta sin dibujar)_

El mapa se pliega: el pliegue central (5.3) se acentúa (alpha de 0.08 a 0.3) y el
contenido se atenúa un 40 %.

---

## 18. Tiempos de animación (resumen)

Todos son **puntos de partida**, salvo que se indique lo contrario.

| Animación                         | Duración                     |
| --------------------------------- | ---------------------------- |
| Cambio entre fotogramas de marcha | En cada paso de la formación |
| Cabeceo de las criaturas          | ±1.5 u, un ciclo por paso    |
| Salpicadura                       | ≈ 350 ms                     |
| Mancha de tinta residual          | ≈ 500 ms                     |
| Texto de puntos                   | ≈ 600 ms                     |
| Cartela de oleada                 | 1.2 s visible                |
| Cambio de dirección del viento    | ≈ 300 ms, con rebote         |
| Ballena cruzando                  | ≈ 6 s                        |
| Chorro de la ballena              | Cada 1.2 s, 400 ms           |
| Humo del cañón                    | ≈ 300 ms                     |
| Desvanecimiento del arrecife      | ≈ 600 ms                     |
| Sello de lacre                    | 1 s                          |

---

## 19. Orden de capas (de atrás hacia delante)

1. Pergamino y bordes quemados
2. Manchas y pliegues
3. Cuadrícula
4. Líneas de rumbo
5. Ondas y sondas
6. Aguas someras
7. Islas y palmeras
8. HUD, rosa y flecha de viento
9. Nave bonus (ballena o dragón)
10. Criaturas
11. Arpones enemigos
12. Estela de la bala y bala
13. Galeón
14. Salpicaduras, humo y manchas de tinta
15. Texto de puntos
16. Cartela, sello y pantallas de estado

En el tablero, el orden real es: cuadrícula, ondas, HUD, ballena, criaturas,
arpones, islas, estela de la bala y galeón. La lista de arriba es la recomendada;
el único cambio es poner las islas debajo de los arpones y las criaturas.

---

## 20. Accesibilidad

- **Silueta distinta por criatura**: cabeza con tentáculos, serpiente ondulada y
  aleta triangular. Se reconocen sin color.
- **El viento se lee de cuatro formas**, ninguna depende solo del color: flecha,
  curvatura de la estela, inclinación de las ondas y de las velas.
- **Contraste** (cifras de la sección 4.3): tinta sobre pergamino ≈ 11 : 1. El
  rojo de los arpones ≈ 4.3 : 1, por encima de 3 : 1 pero sin mucho margen, así que
  no conviene hacerlos más finos.
- **Modo para daltónicos** (propuesta): sustituir `red` y `teal` por dos tonos con
  distinta luminosidad (el rojo más oscuro y el verde azulado más claro) y añadir
  un trazo de tinta de 0.8 u a los arpones.
- **Comprobación pendiente**: que el gallardete y el lavado rojo no se confundan
  con los arpones. Ver sección 22.

---

## 21. Calidad y rendimiento

|                        | `high`    | `low`       |
| ---------------------- | --------- | ----------- |
| Sondas                 | Sí        | No          |
| Líneas de rumbo        | Sí        | No          |
| Pliegues y manchas     | Sí        | No          |
| Hervor de tinta        | Opcional  | No          |
| Temblor de mano alzada | Sí        | Sí          |
| Humo y gotas           | Completos | Menos gotas |

- Sin `shadowBlur`, sin `BlurMaskFilter`, sin degradados.
- Geometrías de criaturas y galeón cacheadas (Path2D en Canvas, Path en Skia) y
  transformadas por frame.
- **Canvas y Skia producen el mismo resultado visual**; ningún elemento puede
  quedar como marcador sin dibujar.
- El rendimiento en dispositivo no está medido; no se afirman cifras de FPS.

---

## 22. Correcciones respecto al tablero

El tablero tiene cuatro cosas que no deben copiarse tal cual:

1. **Barbas de los arpones desplazadas.** Las barbas estaban en la base del asta en
   vez de en la punta. La geometría correcta está en 15.2.
2. **Gallardete rojo.** El rojo significa "hostil" en este mod, y el galeón lleva un
   gallardete rojo. Recomiendo `gold` con un contorno de tinta de 0.8 u. Es una
   decisión pendiente.
3. **Tipografía sans.** El tablero usa una sans genérica por limitación del entorno
   de dibujo. La intención es una serif, ver 10.3.
4. **Sin vidas en el HUD.** El tablero no las dibuja. Propuesta en 10.2.

---

## 23. Lo que todavía no está diseñado

- El dragón marino (12.2): solo hay una descripción.
- Pantalla de título, logotipo y menús.
- Valores concretos de la paleta para daltónicos.
- Una variante "carta nocturna" (papel azul oscuro con tinta clara), si se quisiera
  un modo de noche.
- Diseño de las tres especies de segundo nivel (si el mod añade rangos).
- Un jefe de oleada (un leviatán que ocupe varias casillas).
- Fuente concreta del HUD (depende de lo que ya haya en el repo).
- Sonido y música (fuera del alcance de este documento).

---

## 24. Procedencia

- Los colores, la geometría de criaturas, islas y galeón, los márgenes del HUD y la
  disposición de la formación salen del tablero de concepto diseñado en la
  conversación (fotograma de 206 × 420 u).
- Las proporciones expresadas respecto a `W` se calcularon sobre ese tablero.
- El contraste lo calculé a mano con la fórmula de WCAG; no está verificado con una
  herramienta.
- Todo lo marcado como propuesta (papel, marco graduado, rumbos, sondas, estados,
  efectos, pantallas) es diseño en papel que no se ha visto en pantalla.
