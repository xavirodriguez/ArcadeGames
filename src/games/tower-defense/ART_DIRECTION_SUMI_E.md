# Dirección de arte — Tower Defense (tinta sumi-e)

Versión 0.1 · 24 de octubre de 2026 · Borrador para iterar

Cómo leer este documento: cada afirmación lleva una etiqueta. [Observado] es lo que se ve en las dos imágenes de referencia. [Propuesta] es una decisión mía que hay que validar. [Pendiente] es una decisión de diseño que no se puede cerrar solo desde el arte. Los colores y los tamaños son valores de partida, no medidas tomadas de las imágenes.

## 1. Visión

Un tower defense pintado en tinta china y acuarela sobre pergamino. Las torres son arquitectura sagrada japonesa (pagodas, una campana, linternas de piedra, un santuario del zorro). Los enemigos son espíritus hechos de tinta que ensucian un paisaje limpio. [Propuesta] Esa idea de mancha contra paisaje limpio puede organizar todo lo demás: la tinta ensucia, las torres limpian.

Tres principios:

- Todo parece hecho a mano. Líneas de grosor irregular, bordes que no cierran del todo, color que se acumula en el borde de cada veladura. Nada se ve vectorial.
- Pocos colores con significado. El fondo es casi monocromo (grises azulados sobre beige), así que los pocos colores saturados se leen solos: rojo = amenaza, azul brillante = ataque, dorado = mejora y dinero. [Observado] en las referencias; [Propuesta] convertirlo en regla estricta.
- Lo jugable pesa más que lo decorativo. Camino, torres y enemigos tienen más contraste tonal que montañas y niebla. Si algo decorativo compite con el camino, gana el camino.

## 2. Supuesto de producción

[Propuesta] Este documento asume que fondo, torres y enemigos son imágenes ráster pintadas (generadas con un modelo de imágenes o dibujadas a mano) y que los efectos se dibujan por código. La razón: las veladuras, el grano de papel y los bordes de pincel no se reproducen bien con trazos de canvas, mientras que las salpicaduras, la niebla en movimiento y el brillo de las flechas se animan mejor por código. Si finalmente todo va por código, las secciones 5, 7, 8 y 12 cambian.

En imagen: fondo del mapa (sin torres, enemigos ni interfaz), torres en cada nivel, enemigos animados, marco con esquinas doradas, casillas del dock.

En código: salpicaduras de impacto, estelas de flechas, rayos de la campana, monedas, niebla, portal de entrada, muerte de enemigos, rangos, textos y números del HUD.

## 3. Referencias

Hoja A, torres y enemigos: seis dibujos de torres sobre pergamino (cinco tipos, con la pagoda en dos niveles) y cuatro enemigos con su nombre en inglés: Wisp, Fast Ink-Spider, Red Oni Boss y Flying Tengu.

Mockup B, pantalla de juego: paisaje de montañas en tinta, camino de piedra en S, portal de tinta arriba a la izquierda, torii y santuario abajo a la derecha, torres y enemigos ya colocados, marco dorado, contador de oleada y dock inferior.

Precedencia: la hoja A manda en el diseño de torres y enemigos. El mockup B manda en composición, marco e interfaz. Donde se contradicen, está en la sección 13.

## 4. Paleta

Valores aproximados [Propuesta]. Hay que confirmarlos con un cuentagotas sobre las imágenes de referencia antes de fijarlos en el código.

- Pergamino #E9DFC6: fondo del marco y paneles.
- Pergamino envejecido #C9B88F: manchas del papel, bordes interiores.
- Tinta negra #1B1B1F: enemigos, contornos, salpicaduras.
- Gris tinta #5E6B73: sombras de piedra y tejados.
- Azul montaña #7F95A6: montañas lejanas, siempre en veladura.
- Niebla #DCE0DD: bandas de niebla.
- Piedra del camino #A9A9A4: adoquines.
- Rojo amenaza #C8372D: oni, ojos y bocas de los enemigos.
- Rojo madera #8E3A2B: pilares de pagodas y torii. Más apagado que el rojo amenaza.
- Dorado #C9A24A: marco, tejado mejorado, monedas.
- Amarillo talismán #E3B93C: papeles ofuda de la torre de sellos.
- Azul energía #5CC8FF: flechas y rayos. Es el único color frío saturado.
- Verde bronce #4F7F78: campana.
- Blanco zorro #F4F1EA: estatua del zorro. Es el único blanco puro del juego.

Riesgo: el torii de la meta es rojo, como la amenaza. Mantenerlo en rojo madera, más anaranjado y apagado que el oni, para que la meta no se lea como un enemigo.

## 5. Técnica de ilustración

- Contorno: tinta negra de grosor irregular, más grueso en la base y en las zonas de sombra, fino en los detalles. La línea puede interrumpirse como un pincel seco.
- Color: veladuras translúcidas que se superponen. El pigmento se acumula en el borde de cada mancha. Sin degradados digitales lisos.
- Textura: grano de papel visible en todo el conjunto, sobre todo en fondos y marco.
- Sombras: lavados gris azulado. Nunca negro sólido, salvo en los enemigos, que son tinta.
- Salpicaduras: gotas irregulares de distinto tamaño alrededor de la fuente (araña, oni, impactos).
- Evitar: bordes vectoriales perfectos, contornos de grosor constante, brillos de plástico, renders 3D, neón (salvo el azul energía), sombras proyectadas duras, texto pintado dentro de las imágenes.

## 6. Cámara, perspectiva y orden de dibujado

[Observado] Las torres están dibujadas en vista de tres cuartos (se ve la fachada y el tejado desde arriba). El mapa es una pintura panorámica con un camino serpenteante. El juego sigue siendo 2D.

- [Propuesta] Un único ángulo de elevación para todos los assets. No mezclar sprites cenitales con sprites de tres cuartos.
- [Propuesta] Orden de dibujado por la coordenada y del punto de apoyo: lo que está más abajo en pantalla se pinta encima. El ancla de cada sprite es el centro de su base.
- [Propuesta] Los tejados sobresalen hacia arriba y pueden tapar enemigos que pasen detrás. Colocar las plazas de construcción de modo que la silueta de la torre no cubra tramos de camino.
- [Pendiente] Dirección de luz. En las referencias no he podido confirmar una dirección consistente. Propongo fijarla arriba a la izquierda, con sombra de contacto suave a la derecha de cada base.

## 7. Torres

[Observado] los diseños de la hoja A. [Propuesta] el rasgo para distinguirlas a tamaño pequeño. [Pendiente] el rol de juego, que el arte sugiere pero no decide.

- tower_pagoda: pagoda de dos tejados grises, pilares rojos y escalera sobre base de piedra. Nivel 2: tejado dorado y flechas con halo azul. Rasgo: el tejado (gris, luego dorado). Rol sugerido: disparo a distancia.
- tower_seal: torre de piedra cubierta de papeles amarillos (ofuda) con lo que parece una máscara en lo alto. Rasgo: franjas amarillas verticales. Rol sugerido: maldición o debilitamiento.
- tower_lantern: torre de piedra estrecha con una ventana encendida y un tejadillo en el remate. Rasgo: la ventana cálida. Rol: sin definir.
- tower_bell: base de piedra con campana verde bronce y arcos de rayos azules alrededor. Rasgo: campana verde y chispas. Rol sugerido: daño en área o aturdimiento.
- tower_fox: santuario pequeño de tejado oscuro con una estatua blanca de zorro. Rasgo: el único elemento blanco puro. Rol sugerido: apoyo o invocación.

El mockup B muestra también tres estructuras que no están en la hoja A: un quiosco con campana de bronce bajo tejado, una estatua guardiana de piedra sobre un pedestal (parece un komainu) y una torre de piedra con un pergamino. [Pendiente] Dibujarlas en la hoja o descartarlas.

Reglas generales:

- [Propuesta] Cada mejora añade un elemento reconocible, como el tejado dorado de la pagoda, y no cambia la silueta. Así el jugador ve el nivel sin leer un número.
- [Propuesta] Estados por torre: colocada, disparando (efecto por código), mejorada, seleccionada.
- [Propuesta] El rango se dibuja como un círculo de pincel con tinta diluida y borde irregular, no como un círculo perfecto.

## 8. Enemigos

- enemy_wisp (Wisp): espíritu negro con forma de llama y cola, ojos y boca rojos. La hoja muestra cuatro variantes del mismo tipo, con expresiones y tamaños distintos. [Propuesta] Usarlas todas, para que un grupo no parezca clones. Movimiento: flotante y ondulante, sin patas.
- enemy_ink_spider (Fast Ink-Spider): araña negra de ojos rojos con salpicaduras de tinta alrededor de las patas. Silueta ancha y plana. Movimiento rápido, de pasos cortos.
- enemy_red_oni (Red Oni Boss): demonio de piel roja, cuernos y taparrabos, con manchas de tinta negra. Es el único enemigo con el cuerpo entero en rojo y el más grande. Se lee como jefe.
- enemy_flying_tengu (Flying Tengu): alas negras, cara roja de nariz larga y ropa gris. [Propuesta] Sombra en el suelo dibujada aparte del sprite, para distinguirlo de los terrestres.

Reglas:

- [Propuesta] Cuanto más rojo, más amenaza: el enemigo común es negro con ojos rojos; la élite o el jefe lleva rojo en el cuerpo. [Pendiente] El tengu tiene la cara roja, así que hay que decidir si es élite.
- [Propuesta] La salpicadura de la araña y del oni va pintada en el sprite, no generada por código.
- [Propuesta] Barra de vida: una pincelada roja fina sobre la cabeza que se acorta. No aparece en las referencias.
- [Pendiente] Direcciones. El wisp y la araña aguantan bien un volteo horizontal. El oni y el tengu seguramente necesiten vistas propias para izquierda y derecha, porque son asimétricos.
- [Propuesta] Animaciones: ciclo de movimiento corto y legible, y una muerte en la que el sprite se deshace en gotas. El número de fotogramas se decide cuando se conozca el coste de producción.

## 9. El mapa

[Observado] Composición:

- Marco de pergamino con esquinas doradas ornamentadas.
- Montañas lejanas en veladura azul grisácea y bandas de niebla entre planos. Rocas más oscuras en los bordes izquierdo y derecho que encuadran la escena.
- Camino de piedra en S, con contorno oscuro y adoquines.
- Portal de entrada: un vórtice de tinta negra arriba a la izquierda.
- Meta: torii rojo, santuario y un pino retorcido sobre roca, abajo a la derecha.
- Sello rojo con caligrafía abajo a la izquierda, como firma.

Capas, de atrás hacia delante [Propuesta]:

1. Papel
2. Montañas lejanas
3. Niebla lejana (animada)
4. Montañas cercanas y rocas laterales
5. Camino y decoración de suelo
6. Torres y enemigos, ordenados por y
7. Niebla frontal (opcional)
8. Efectos
9. Marco e interfaz

Reglas:

- [Propuesta] La niebla nunca cubre el camino ni las plazas de construcción. En el mockup el camino se difumina en la esquina inferior derecha; es un fallo a corregir, no un recurso a repetir.
- [Propuesta] Contorno oscuro continuo en los dos bordes del camino. Las juntas entre adoquines, con menos contraste que los bordes.
- [Propuesta] Plazas de construcción: marcas de piedra plana o un círculo de tinta en el suelo. El mockup no muestra ninguna.
- [Propuesta] Cuando un enemigo llega a la meta, el santuario se mancha de tinta, de modo que el estado de las vidas se ve en el paisaje.
- [Pendiente] Proporción. El mockup mide unos 1264 × 848 píxeles, alrededor de 3:2. Si el lienzo del juego es 4:3, no encaja sin recortar o recomponer. Decidirlo antes de pintar los fondos de otros mapas.

## 10. Efectos (por código)

- Impacto de flecha: [Observado] mancha negra central irregular con gotas dispersas. [Propuesta] Que dure unos segundos y se desvanezca; si se acumulan sin límite acaban tapando el camino.
- Flecha: [Observado] salvas de tres flechas con estela azul. [Propuesta] Núcleo casi blanco y halo azul energía.
- Rayos de la campana: arcos azules cortos que parpadean alrededor de la campana.
- Monedas: [Observado] oro con espiral, sobre el camino. [Propuesta] Brillo breve al recogerlas. [Pendiente] Mecánica.
- Niebla: texturas grandes y translúcidas que se desplazan muy despacio en horizontal, sin ciclo visible.
- Portal: remolino negro que gira lento, con bordes que gotean.
- Muerte del enemigo: [Propuesta] se deshace en gotas que el papel absorbe.
- Daño a la meta: [Propuesta] manchas de tinta sobre el santuario.
- Selección y rango: [Propuesta] círculo de pincel irregular.

Regla común [Propuesta]: las manchas y los trazos se generan con ruido para que sean irregulares, nunca con formas geométricas perfectas. El único color saturado permitido en los efectos es el azul energía; el negro es tinta.

## 11. Interfaz

[Observado]

- Marco de pergamino con esquinas doradas.
- Cartel «Wave Counter» arriba a la derecha, sobre un trazo de pincel.
- Contador de oleada abajo al centro, con un icono de ola de tinta y el número 20.
- Dock inferior con ocho casillas cuadradas de esquinas redondeadas, color piedra oscuro, con siluetas negras de torres: tres a la izquierda del contador y cinco a la derecha.
- Tipografía serif de versalitas.

Problemas del mockup: el contador de oleada aparece dos veces, no hay oro ni vidas, y las siluetas del dock son casi idénticas.

Propuestas:

- Un solo contador de oleada.
- Oro: moneda dorada con espiral y número. Vidas: un torii pequeño con número, en tinta y dorado, no en rojo, para no mezclarlo con la regla de amenaza.
- Dock: casillas disponibles a color, con el rasgo distintivo de cada torre; las bloqueadas, en silueta negra. El precio va debajo, con la moneda.
- Los rótulos y los números son texto del motor, no parte de la imagen. Así se pueden traducir y cambiar sin repintar.
- Tipografía, candidatas gratuitas de Google Fonts: Cinzel o Cormorant SC (versalitas clásicas), Shippori Mincho o Yuji Syuku (toque japonés). Elegir probando a tamaño real y comprobar que los números se leen bien.
- El sello de la esquina es decorativo, no interactivo.
- [Pendiente] Idioma. El mockup está en inglés.

## 12. Especificaciones de assets

Todo [Propuesta], a validar con el tamaño real de celda del juego.

- Formato: PNG con transparencia o WebP. Un fondo opaco por mapa.
- El fondo debe estar limpio: sin torres, enemigos, monedas ni interfaz. El mockup los lleva integrados, así que hay que generar el paisaje otra vez sin ellos.
- Torres: un archivo por torre y nivel, fondo transparente, mismo tamaño de lienzo para todas y ancla en el centro de la base, para que el motor no necesite desplazamientos por torre.
- Enemigos: una hoja de sprites por tipo y animación, con el mismo ancla.
- Resolución: el sprite pintado debe verse nítido al doble de su tamaño en pantalla, para pantallas de alta densidad.
- Marco: cuatro esquinas y bordes repetibles, no una imagen única, para adaptarlo a otras proporciones.
- Nombres: snake_case con prefijo por tipo: tower_pagoda_lv1.png, enemy_wisp_walk.png, map_01_background.webp, ui_frame_corner.png, ui_dock_slot.png.

Prompt de estilo base para un modelo de imágenes (en inglés, que suele funcionar mejor). Usar siempre la hoja A y el mockup B como imágenes de referencia de estilo:

Hand-painted Japanese sumi-e ink wash game asset, three-quarter view, irregular black brush-pen outlines of varying thickness, translucent watercolor washes in muted slate grey-blue and warm parchment beige, visible paper grain, small ink splatters, soft hand-painted shading with no hard black shadows, a single object centered on a plain flat light background, no text, no interface. Color rules: vermilion red only for threats, gold only for upgrades and money, bright cyan-blue only for energy effects.

Negativo: perfect vector lines, smooth digital gradients, 3D render, plastic shine, neon glow, photographic, anime cel shading, text, watermark.

Muchos modelos de imágenes no entregan transparencia real: pedir fondo liso claro y recortar después.

## 13. Decisiones abiertas

1. ¿Imágenes ráster para fondo, torres y enemigos, y efectos por código (el supuesto de este documento), o todo por código?
2. ¿Cinco tipos de torre (la hoja) u ocho (el dock del mockup tiene ocho casillas y el mapa muestra tres estructuras que no están en la hoja)?
3. Rol de cada torre. El arte sugiere arqueros, maldición, área y apoyo, pero no está decidido.
4. Monedas sobre el camino: ¿se recogen a mano o son solo la representación de la economía?
5. Oro y vidas en el HUD.
6. Proporción del lienzo: 3:2 del mockup frente a la del juego.
7. Idioma de los textos.
8. Tengu: ¿élite o enemigo común? ¿Sigue el camino o vuela en línea recta?
9. Dirección de luz.
10. Plazas de construcción: fijas o libres.

## 14. Siguiente paso

Con esta versión ya se puede ampliar la hoja de estilo con las torres que faltan, generar un fondo limpio del primer mapa y especificar los efectos por código. Lo que bloquea más cosas es la decisión 1; el resto se puede ir cerrando mientras se pinta.

## Anexo A. Referencias ampliadas

Tres imágenes más de la misma familia estética, llamadas aquí C, D y E. Parecen pantallas de otros géneros (carrera, plataformas, disparos), no de un tower defense. Por eso se tratan como referencias secundarias: la hoja A sigue mandando en torres y enemigos, el mockup B en composición, marco e interfaz, y C, D y E aportan paisaje, interfaz y efectos. Si una de las tres contradice a A o a B, gana A o B.

### A.1 Qué muestra cada una

- C, carrera a caballo: un jinete con sombrero cónico, visto de espaldas, galopa por un desfiladero entre pinos retorcidos y picos con niebla. Interfaz: posición «2/5» en números grandes de pincel sobre un sello rojo, cronómetro en una tira de papel manchada de tinta, minimapa circular con un torii y una ruta discontinua, y un arco rojo de resistencia alrededor de la silueta de un caballo.
- D, plataformas con jefe: un héroe salta un barranco con puente de cuerdas hacia un tengu gigante que lanza esferas negrorrojas con estela. Interfaz: cinco frascos rojos llenos y cuatro vacíos como vida, barra roja del jefe con salpicaduras en los extremos, tres habilidades con botones X, Y y B, y sellos rojos de fase y de categoría.
- E, disparos: un tirador con arcabuz sobre un torii dispara balas de tinta a esqueletos, onis rojos y azules y un hombre-pájaro de alas rojas. Interfaz: cuatro frascos de tinta llenos, un contador y sellos rojos. Los impactos dejan manchas negras con grietas radiales, hay talismanes amarillos brillando en el aire y un dragón en línea muy pálida ocupa el fondo.

### A.2 Rasgos comunes

[Observado]

- Papel sin pintar como cielo y niebla. Deja aire entre las zonas de detalle.
- Profundidad por valor: lo lejano es más pálido, más azulado y con menos detalle, como en la pintura de paisaje china. La niebla separa los planos.
- Contorno de pincel de grosor variable, pincel seco en rocas y troncos, agujas de pino en racimos radiales, rocas con lavado gris y rayado.
- Rojo con función: sellos, barras de vida, sol, máscara del jefe, banderas, fajín del jinete. Casi todo lo rojo es información o peligro.
- Figura contra fondo por saturación: fondos grises y beige de poco contraste, y lo jugable con más contraste o más color (el caballo marrón de C es lo más cálido del cuadro).
- La tinta como lenguaje de efectos: salpicaduras, estelas de pincel, manchas con grietas, esferas con cola. El daño y la magia usan el mismo vocabulario.
- Interfaz dentro del mundo: sellos con kanji como cabeceras, números de pincel, tiras de papel, frascos como vida, marco fino con grecas, HUD en las esquinas y centro libre.

### A.3 Diferencias y riesgos

- Nivel de acabado. C es limpia, casi acuarela, con papel liso y pocos elementos. D y E son densas: grano y motas sobre todo el papel, más salpicadura, personajes grandes con mucho detalle. E tira hacia el ukiyo-e (onis tatuados, esqueletos, líneas de movimiento).
- Rango cromático. C es casi monocroma más rojo. D suma verde azulado y naranja de farol. E suma azul saturado (el oni), naranja brillante (los talismanes) y tonos de piel.
- Detalle de personajes. El oni de E tiene un nivel de detalle que no sobrevive a unas decenas de píxeles. Como referencia de enemigos sirve la hoja A; E sirve para efectos.
- Texto, según mi lectura: C es coherente (順位 posición, 時間 tiempo, 馬力 caballos de fuerza). D está casi todo bien, pero mezcla chino simplificado (第九关, 数据) con japonés. E tiene secuencias que no parecen palabras reales (二十五大目) y un «COMKO» en letras latinas. Es lo típico de imagen generada, y el texto horneado en la imagen no se puede reutilizar. Esto refuerza la regla de la sección 11: rótulos y números son texto del motor, y los kanji los revisa alguien que lea japonés.

### A.4 Qué se toma de cada una

[Propuesta]

- C, paisaje: pinos retorcidos que enmarcan por los lados, picos en planos escalonados con niebla y un camino que lleva la mirada hacia el centro. Útil para los fondos de mapas nuevos.
- D, interfaz y proyectiles: sellos como cabeceras, barra grande con salpicaduras para los jefes y esferas con estela de tinta como ataque enemigo a distancia.
- E, efectos de impacto y capas de fondo: grietas radiales y manchas, líneas de movimiento, talismanes brillantes.

### A.5 Propuestas nuevas

- Grano de papel único. Elegir una sola textura para todo el juego. Propongo papel liso en los assets y una capa de grano repetible, semitransparente y dibujada por código sobre toda la pantalla. Así el grano es idéntico en todos los mapas y no hay que pintarlo en cada sprite.
- Vidas como frascos llenos y vacíos (D y E), en lugar del torii de la sección 11. Muestran el estado de un vistazo y no usan rojo, así que no chocan con la regla de amenaza. Lleno es tinta negra; vacío, gris.
- Cabeceras con sello: un sello rojo pintado y vacío, con el texto del motor encima. Solo en el HUD; el rojo del sello es información, no decoración.
- Números grandes de pincel para el contador de oleada. Si ninguna fuente rinde bien, diez sprites pintados (0 a 9).
- Tira de papel manchada de tinta como fondo de los números secundarios (oro, temporizador).
- Barra de jefe: barra roja grande arriba, con salpicaduras en los extremos, para las oleadas de jefe. Solo para el oni; los enemigos comunes siguen con la pincelada de la sección 8.
- Capa fantasma: una figura (dragón, montaña o pagoda) en línea muy pálida y baja opacidad como capa de fondo. Se inserta entre las capas 2 y 3 de la sección 9.
- Impacto: a la mancha de tinta se suman grietas radiales cortas sobre el suelo, que se desvanecen igual que la mancha.
- Estela de movimiento: una línea de pincel tras los enemigos rápidos (araña, tengu), dibujada por código.

### A.6 Decisiones abiertas nuevas

Continúan la lista de la sección 13.

11. Nivel de acabado: liso como C o denso como D y E. Mi propuesta es liso en los assets y grano por código.
12. Colores nuevos: el oni azul, el naranja de los talismanes y los tonos de piel de E. Si entran, hay que reescribir la regla de la sección 4 según la cual el azul brillante es solo energía.
13. Vidas: frascos (A.5) o torii (sección 11).
14. Bestiario: ¿se amplía con esqueletos, oni azul y hombre-pájaro? Habría que dibujarlos con el nivel de detalle de la hoja A, no con el de E.
15. Alcance: ¿esta estética es solo del tower defense o la base común de más juegos? Si es común, este documento se convierte en una guía de estilo compartida (paleta, papel, marco, sellos, efectos de tinta) y cada juego añade lo suyo.
