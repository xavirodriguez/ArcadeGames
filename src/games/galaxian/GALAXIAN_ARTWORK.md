# Galaxian — Art bible (versión moderna, "papel plegado")

Documento de referencia del artwork de la reimaginación moderna de Galaxian.
Reúne en un solo sitio lo que está repartido entre el tablero de concepto y el
prompt de implementación (`GALAXIAN_PROMPT.md`).

**Cómo leerlo.** Los valores marcados como _punto de partida_ son propuestas que
hay que afinar viéndolas en pantalla; no están validadas. Los que no llevan
marca (paleta, geometría, nomenclatura) son decisiones de diseño tomadas. La
sección 15 lista lo que todavía no está diseñado.

---

## 1. Concepto y principios

**Idea central.** El jugador es un avión de papel y los enemigos son aves de
origami. El mundo son capas de papel recortado con sombras duras entre ellas. El
brillo no viene de efectos de luz sino de la materia: las piezas son planas,
facetadas y tienen grosor aparente.

Principios, en orden de prioridad:

1. **Legibilidad antes que estilo.** En un vistazo hay que distinguir el rango
   de un enemigo, qué es una amenaza y dónde está el jugador.
2. **Materia, no luz.** Nada de glow, bloom ni scanlines. El volumen sale de
   facetas planas de dos o tres tonos.
3. **Una sola fuente de luz**, arriba a la izquierda, aplicada con la misma regla
   a todo.
4. **Sin blur ni gradientes** en ninguna pieza. Las sombras son duras y
   desplazadas.
5. **Lo decorativo no toca el gameplay.** Estelas, balanceos, fragmentos y
   parallax son presentación pura.
6. **La firma de Galaxian es el picado**: el diseño se organiza para que la
   curva de ataque se lea bien.

**Anti-referencias** (lo que este juego no debe parecer): neón de línea fina con
glow, filtro CRT con scanlines, rejilla visible, pixel art retro.

---

## 2. Luz, volumen y sombras

- **Dirección de luz:** arriba a la izquierda. Las facetas izquierdas llevan el
  tono `Light`; las derechas llevan `Mid` o `Dark`.
- **Tres tonos por pieza**: `Light`, `Mid`, `Dark`. Nunca más.
- **Sin contorno** en las aves. El volumen lo dan las facetas, no un trazo.
  Solo llevan trazo las capas de papel (borde fino de 1 px) y el pliegue central
  del avión.
- **Sombras duras:** cada capa de papel proyecta una copia de sí misma
  desplazada ≈ 4 px a la derecha y ≈ 6 px abajo, en `strataShadow` al 60 % de
  alpha. Sin desenfoque.
- **Brillo puntual:** el único punto de luz "especular" es el ojo crema de las
  aves.

---

## 3. Paleta

### 3.1 Tokens

| Token                                            | Valor                             | Uso                                           |
| ------------------------------------------------ | --------------------------------- | --------------------------------------------- |
| `paperNight`                                     | `#101A33`                         | Fondo base                                    |
| `strataFar`                                      | `#141F3D`                         | Capa de papel lejana                          |
| `strataNear`                                     | `#1A2A52`                         | Capa de papel cercana                         |
| `strataMid`                                      | `#1E2F5E`                         | Capa intermedia y línea fina del HUD          |
| `strataShadow`                                   | `#0B1226` (60 %)                  | Sombra dura bajo cada capa                    |
| `strataEdgeFar` / `strataEdgeNear`               | `#26396F` / `#2F4585`             | Borde de 1 px de cada capa                    |
| `star`                                           | `#F4EBD9`                         | Estrellas (alpha entre 0.5 y 1)               |
| `droneLight` / `droneMid` / `droneDark`          | `#8CC4FF` / `#5AA7FF` / `#3B7BD6` | Drone                                         |
| `emissaryLight` / `emissaryMid` / `emissaryDark` | `#BE9CFF` / `#9B6BFF` / `#6E45CC` | Emisario                                      |
| `escortLight` / `escortMid` / `escortDark`       | `#FF8C98` / `#FF5B6E` / `#D13A4F` | Escolta                                       |
| `flagshipLight` / `flagshipMid` / `flagshipDark` | `#FFDC8A` / `#FFC145` / `#E39A1E` | Flagship                                      |
| `eye`                                            | `#FFF6E5`                         | Ojo de las aves y núcleo de disparos enemigos |
| `player`                                         | `#FFF6E5`                         | Ala izquierda del avión                       |
| `playerShade`                                    | `#E3D3B3`                         | Ala derecha del avión                         |
| `playerFold`                                     | `#BFAE8E`                         | Cola y pliegue central                        |
| `playerAccent`                                   | `#5CF2C0`                         | Motor, estela del motor y disparo del jugador |
| `enemyFire`                                      | `#FF7A45`                         | Disparos enemigos                             |
| `trail`                                          | `#FFC145`                         | Estelas de picado, anillo de aviso y popups   |
| `hudText`                                        | `#FFF6E5`                         | Texto principal del HUD                       |
| `hudMuted`                                       | `#8FA3C7`                         | Texto secundario del HUD                      |

### 3.2 Reglas de uso

- **El color indica rango, no amenaza.** Azul, púrpura, rojo y dorado dicen
  cuánto vale un enemigo.
- **El naranja saturado es solo para los disparos enemigos.** No se usa en
  ningún otro elemento.
- **El ámbar (`trail`) significa "esto ataca"**: estelas, anillo de aviso y
  popups de puntos.
- **La menta (`playerAccent`) es solo del jugador**: motor y disparo.
- **El crema casi blanco es lo más luminoso de la pantalla** y pertenece al
  jugador. Ningún enemigo usa un tono más claro que `flagshipLight`.
- **Punto débil conocido:** el rojo de las escoltas (`#FF5B6E`) y el naranja de
  los disparos (`#FF7A45`) son tonos vecinos. Se compensan con forma (rombo con
  núcleo crema) y tamaño, pero hay que verificarlo en pantalla (sección 13).

---

## 4. Rangos enemigos y nomenclatura

Orden en el arcade original, de abajo a arriba, que este diseño respeta:

| Rango        | Color   | Formación de referencia | Silueta propia                    |
| ------------ | ------- | ----------------------- | --------------------------------- |
| **Drone**    | Azul    | 3 filas de 10           | La base, sin añadidos             |
| **Emisario** | Púrpura | 1 fila de 8             | Puntas de ala quebradas           |
| **Escolta**  | Rojo    | 1 fila de 6             | Cuernos junto a la cabeza         |
| **Flagship** | Dorado  | 2 en el tope            | Cresta en el dorso y mayor tamaño |

Las escoltas son las que acompañan al Flagship cuando pica. La formación de
referencia suma 46 enemigos en 10 columnas; si no cabe con legibilidad en una
pantalla vertical de móvil, se reduce en la config.

---

## 5. Anatomía de las aves

Geometría de referencia, en unidades locales. El ave **mira hacia +y** (hacia el
jugador) y sus alas están barridas hacia −y. Se escala al ancho del slot de la
formación.

```
cuerpo izq   0,-8   0,10   -4.5,0         Light
cuerpo der   0,-8   4.5,0  0,10           Mid
ala izq sup  -4,-2  -15,-10  -13,2        Light
ala izq inf  -4,-2  -13,2    -4,6         Mid
ala der sup   4,-2   15,-10   13,2        Mid
ala der inf   4,-2   13,2     4,6         Dark
cabeza        0,10  -2.6,5   2.6,5        Dark
ojo           círculo (0,3) r 1.5         eye
```

Añadidos por rango:

```
Emisario  punta ala izq  -15,-10  -19,-4  -13,2        Mid
          punta ala der   15,-10   19,-4   13,2        Dark
Escolta   cuerno izq      -2,6  -6,12  -1,8             Light
          cuerno der       2,6   6,12   1,8             Dark
Flagship  cresta           0,-8  3,-13  0,-18  -3,-13   Light
```

Cada rango usa su propia terna `Light` / `Mid` / `Dark`.

**Construcción.** Cada geometría se crea una vez (Path2D en Canvas, Path cacheado
en Skia) y se transforma por frame con traslación, rotación y escala.

---

## 6. Jugador: el avión de papel

Geometría de referencia, mirando hacia −y:

```
ala izq   0,-16  -14,10  0,4             player
ala der   0,-16   14,10  0,4             playerShade
cola      0,4  -5,13  0,10  5,13         playerFold
pliegue   línea (0,-16)-(0,4), 1 px      playerFold
motor     círculo (0,14) r 3             playerAccent
```

- **Estela del motor:** trazo corto de ≈ 8 unidades bajo el motor, en
  `playerAccent` con alpha baja (≈ 40 %), terminación redonda.
- **Inclinación:** ≈ 8° hacia el lado en que se mueve (_punto de partida_). Solo
  visual.
- **Muerte:** el avión se desmonta en sus facetas (`player`, `playerShade`,
  `playerFold`).
- **Respawn:** parpadeo de alpha durante la invulnerabilidad.
- **Vidas en el HUD:** miniaturas del mismo avión (≈ 0.5 de escala).

---

## 7. Tamaños y proporciones

Unidad de diseño: **ancho del slot de la formación**.

| Elemento                  | Tamaño (_punto de partida_)        |
| ------------------------- | ---------------------------------- |
| Ave normal                | ≈ 0.75 slot de ancho               |
| Flagship                  | ≈ 1.25 × el ave normal             |
| Avión del jugador         | ≈ 0.9 slot de ancho                |
| Disparo enemigo           | ≈ 0.25 slot de ancho × 0.5 de alto |
| Disparo del jugador       | Trazo de ≈ 3 px de grosor          |
| Paso vertical entre filas | ≈ 1.05 slot                        |
| Radio del anillo de aviso | ≈ 0.8 slot                         |
| Estela, tramo reciente    | ≈ 4 px                             |
| Estela, tramo viejo       | ≈ 1.5 px                           |

---

## 8. Estados de pose de un enemigo

| Estado               | Pose                                                                                                                                                                             |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **En formación**     | Reposo. Oscilación visual ≤ 0.05 slot, con fase desplazada por índice de slot.                                                                                                   |
| **Aviso (`windup`)** | Se encoge en vertical y abre las alas: escala ≈ 1.25 de ancho × 0.9 de alto respecto a reposo. Anillo discontinuo en `trail`, radio ≈ 0.8 slot. Dura `dive.windupMs` (≈ 350 ms). |
| **Picado**           | Rota para mirar en la dirección de avance y se estira ≈ 1.1–1.2× en ese eje. Deja estela.                                                                                        |
| **Reingreso**        | Aparece por arriba con un pliegue de entrada: escala ≈ 0.6 → 1 y fundido en ≈ 200 ms.                                                                                            |
| **Destruido**        | Se deshace en facetas (sección 10).                                                                                                                                              |

**Rotación.** El ángulo se deriva del movimiento de los últimos 2–3 ticks y se
suaviza con interpolación angular, para que no sacuda en los puntos de inflexión
de la curva. El collider no rota.

**Legibilidad del aviso sin color.** Se reconoce por la deformación y por la
forma del anillo, no por el tono.

---

## 9. Disparos y estelas

### 9.1 Disparos enemigos

Rombo en `enemyFire` con un rombo interior más pequeño en `eye`:

```
exterior   0,-8   4,0   0,8   -4,0     enemyFire
interior   0,-4   2,0   0,4   -2,0     eye
```

Es la única forma naranja de la pantalla.

### 9.2 Disparo del jugador

Trazo recto de ≈ 3 px con terminaciones redondas en `playerAccent`, ≈ 20 px de
largo. Solo hay uno en pantalla a la vez en modo clásico. Sin retroceso ni
efectos añadidos.

### 9.3 Estela de picado

- Cada enemigo en picado guarda las últimas N posiciones (N ≈ 24, _punto de
  partida_).
- Se dibuja con dos o tres trazos en `trail`: tramo viejo fino y tenue (≈ 1.5 px,
  ≈ 25 % de alpha), tramo reciente grueso (≈ 4 px, ≈ 45 %).
- Terminaciones redondas.
- Todos los que pican comparten el mismo color.
- Se vacía al morir o al reingresar.

---

## 10. Destrucción y efectos

| Evento                 | Efecto                                                                                                                                                                              |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Enemigo destruido**  | Flash crema en el centro, anillo en el tono `Light` de su rango y 5–7 fragmentos triangulares en los tres tonos del rango, que salen en abanico, giran y se desvanecen en ≈ 450 ms. |
| **Flagship destruido** | Igual, con el doble de fragmentos y un anillo dorado.                                                                                                                               |
| **Impacto**            | Flash crema (`Render.hitFlashFrames`).                                                                                                                                              |
| **Popup de puntos**    | Texto en `trail` con la tipografía del HUD. Sube ≈ 14 px y se desvanece en ≈ 600 ms. Más grande para el bonus del Flagship escoltado.                                               |
| **Jugador destruido**  | El avión se desmonta en sus facetas crema, con un screen-shake breve.                                                                                                               |

El enemigo no explota: se deshace como un pliegue que se abre.

---

## 11. Fondo y entorno

- **Base:** `paperNight`.
- **Capas de papel:** 2–3 formas recortadas (elipses rotadas o polígonos suaves)
  en los tonos `strata*`. Cada una con sombra dura desplazada y borde fino de 1 px.
  Ejemplo de la composición del concepto: una capa lejana grande rotada ≈ −20° a
  la izquierda y una cercana alargada rotada ≈ 14° abajo a la derecha.
- **Scroll vertical continuo con parallax:** las capas lejanas más lentas, las
  cercanas más rápidas. Da sensación de movimiento al jugador, que solo se mueve
  en horizontal, y mantiene la referencia al campo de estrellas del original.
- **Estrellas:** dos tipos, puntos pequeños (radio ≈ 1 px) y rombos finos de
  cuatro puntas (≈ 5–6 px de alto), en 2–3 velocidades. Reentran sin salto
  visible.
- **Zona de juego:** sin rejilla visible y sin marco luminoso.

**Orden de capas** (de atrás hacia delante, _propuesta_; mapear a los tokens de
capas del repo si existen):

1. `paperNight`
2. Capas de papel (de lejana a cercana) y sus sombras
3. Estrellas
4. Estelas de picado
5. Enemigos en formación
6. Enemigos en picado
7. Disparos enemigos
8. Jugador y su disparo
9. Fragmentos y anillos
10. Popups de puntos
11. HUD

---

## 12. HUD y tipografía

**Composición de la barra superior:**

- **Izquierda:** puntuación, en `hudText`, tamaño principal. Debajo, el récord en
  `hudMuted`, tamaño secundario.
- **Centro:** oleada ("Oleada 04"), en `hudMuted`.
- **Derecha:** vidas como miniaturas del avión de papel.
- **Debajo:** una línea de 1 px en `strataMid`.

**Tipografía.** Sans redondeada con **cifras tabulares**. Proporción tamaño
principal : secundario ≈ 14 : 12 (como en el tablero). El texto va en frase
normal, no en mayúsculas ("Oleada 04", "Fin de partida"). No se añaden
dependencias de fuentes: se usa una que el repo ya incluya o la sans del sistema,
y se documenta cuál.

**Pantallas de estado.** `level_complete` y `game_over` usan la misma tipografía,
los mismos colores y la misma sobriedad que el HUD.

---

## 13. Accesibilidad y variantes

- **Silueta distinta por rango**: no hace falta distinguir colores para saber
  qué es cada enemigo.
- **Aviso de picado**: se lee por forma (deformación y anillo).
- **Disparos enemigos**: se leen por forma (rombo con núcleo).
- **Modo para daltónicos** (`visual.paletteColorblind`): traduce el rango a una
  rampa de luminosidad (cuanto más alto el rango, más claro) y añade contorno
  claro de ≈ 1.5 px a los disparos enemigos y a las estelas. Los valores
  concretos están por definir.
- **Comprobaciones pendientes de hacer en pantalla:**
  - rojo de las escoltas vs. naranja de los disparos, en escala de grises y con
    simulación de deuteranopía y protanopía;
  - que la estela ámbar se lea sobre las capas de papel más claras;
  - que el avión se lea sobre cualquier capa y cualquier estrella.

---

## 14. Calidad y rendimiento (artwork)

|                            | `high`                  | `low` |
| -------------------------- | ----------------------- | ----- |
| Capas de papel             | 2–3                     | 1     |
| Capas de estrellas         | 2–3                     | 1     |
| Posiciones por estela      | N                       | N / 2 |
| Fragmentos por destrucción | 5–7 (Flagship el doble) | Menos |

- Sin `shadowBlur`, sin `BlurMaskFilter`, sin gradientes recreados por frame.
- Geometrías cacheadas; buffers de estelas y pools de fragmentos preasignados.
- El rendimiento en dispositivo no está medido; no se afirman cifras de FPS.

---

## 15. Lo que todavía no está diseñado

- Pantalla de título y logotipo.
- Visual del tractor beam (opcional, modo Galaga). Propuesta sin dibujar: cono
  de bandas translúcidas en `trail`, y la nave capturada con el mismo avión de
  papel.
- Aspecto del "dual fighter" (propuesta sin dibujar: dos aviones lado a lado).
- Indicador de nivel más allá del texto "Oleada N" (en el arcade eran banderas).
- Transiciones entre oleadas.
- Iconografía de menús y ajustes.
- Valores de la paleta para daltónicos.
- Fuente concreta del HUD (depende de lo que ya haya en el repo).
- Sonido y música (fuera del alcance de este documento).

---

## 16. Procedencia

- Los colores, la geometría y los tamaños salen del tablero de concepto
  diseñado en la conversación. Los tamaños y tiempos son puntos de partida.
- Los rangos, colores y composición de la formación siguen el arcade original,
  según StrategyWiki (_Galaxian/Gameplay_). En el concepto inicial se llamó
  "escolta" al púrpura y "oficial" al rojo; es un error de nomenclatura. Los
  nombres correctos son los de la sección 4.
