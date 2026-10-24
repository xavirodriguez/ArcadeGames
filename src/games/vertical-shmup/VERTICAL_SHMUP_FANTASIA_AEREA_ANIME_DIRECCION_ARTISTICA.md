# Dirección artística: Fantasía aérea anime

**Documento de diseño visual para un vertical shoot ’em up (shmup)**  
**Versión:** 1.0  
**Estado:** guía de producción inicial  
**Objetivo:** convertir la estética de fantasía aérea anime en un sistema visual coherente, legible, escalable y viable para producción.

---

## 1. Resumen ejecutivo

El juego presenta un mundo de fantasía suspendido en el cielo: archipiélagos flotantes, templos sobre las nubes, jardines en altura, árboles en flor, cascadas que se pierden en el vacío y máquinas voladoras de inspiración anime. El jugador pilota una nave pequeña, estilizada y reconocible que asciende visualmente a través de ese mundo mientras esquiva patrones de proyectiles y combate contra formaciones enemigas y jefes de gran tamaño.

La dirección artística combina cuatro ingredientes:

1. **Paisajes luminosos y evocadores:** cielos profundos, nubes volumétricas, islas flotantes y arquitectura fantástica.
2. **Diseño anime de siluetas claras:** naves, enemigos y jefes con formas expresivas, perfiles reconocibles y acentos de color controlados.
3. **Efectos de combate vivos:** disparos luminosos, estelas, impactos, explosiones y señales de peligro que transmiten energía sin ocultar amenazas.
4. **Legibilidad arcade:** el decorado puede ser rico, pero el jugador, los enemigos, los proyectiles hostiles y las zonas de daño siempre deben distinguirse de inmediato.

**Principio central:** el fondo invita a mirar; los elementos jugables indican qué hacer. El espectáculo nunca debe impedir que el jugador entienda el combate.

## 2. Pilares artísticos

### 2.1 Fantasía vertical y sensación de altura

El mundo debe transmitir que el jugador atraviesa varias capas de un cielo inmenso. Las nubes no son solo una textura: ayudan a sugerir escala, profundidad, altura, velocidad y cambios de escenario. Los elementos verticales —cascadas, torres, corrientes de viento, columnas de luz y formaciones de islas— refuerzan el desplazamiento ascendente.

### 2.2 Anime con personalidad, no una mezcla arbitraria

Las naves y criaturas utilizan contornos elegantes, piezas exageradas, detalles ornamentales y puntos de luz. Las formas pueden ser fantásticas, pero cada categoría debe seguir reglas compartidas: grosor de contorno similar, tratamiento coherente de sombras, dirección de la luz consistente y una escala común de detalles.

### 2.3 Color que comunica gameplay

El color no debe ser puramente decorativo. Cada familia de elementos jugables mantiene un código estable:

- **Jugador:** cian, blanco frío y azul intenso.
- **Disparo del jugador:** cian o azul claro, con un núcleo blanco pequeño.
- **Enemigos comunes:** índigo, violeta, azul oscuro, gris azulado o verde profundo; pequeños acentos cálidos para identificar zonas vulnerables.
- **Proyectiles enemigos:** coral, rojo anaranjado, magenta o ámbar, con forma y movimiento diferenciados por tipo.
- **Peligros ambientales:** naranja/ámbar o rojo, según severidad.
- **Objetos de recuperación:** verde menta o dorado suave, sin confundirse con los disparos.
- **Jefes:** mezcla de colores del bioma y una señal inequívoca para su núcleo vulnerable.

El color ayuda a reconocer, pero nunca es el único indicador: la forma, el contorno, la animación y el patrón de movimiento también deben comunicar la función.

### 2.4 Riqueza en el fondo, simplicidad en el combate

El fondo utiliza detalle, gradación y profundidad. Los objetos interactivos usan bordes más definidos, contrastes controlados y animaciones legibles. Cuando la pantalla se llena de balas, los elementos decorativos deben perder protagonismo de forma natural: menos contraste, menor nitidez y menos partículas en la zona de acción.

## 3. Composición y cámara

### 3.1 Formato de referencia

Diseñar inicialmente sobre un área de referencia vertical de **720 × 1280 píxeles** (relación 9:16). Todas las proporciones deben expresarse también en porcentaje del área jugable para adaptarse a pantallas distintas.

- El área de combate debe quedar libre de elementos de interfaz invasivos.
- Reservar una franja superior para puntuación, vidas, bombas y estado del jefe.
- Mantener el centro y la zona inferior suficientemente limpios para leer al jugador y los proyectiles que se aproximan.
- Evitar información crítica cerca de los bordes, donde pueden intervenir recortes, marcos o variaciones de pantalla.
- En pantallas más anchas, ampliar el campo visual o la decoración lateral antes que estirar los sprites.

### 3.2 Perspectiva

Usar una **vista cenital ligeramente estilizada**. La nave del jugador se contempla desde arriba y desde atrás solo en la medida necesaria para sugerir motores y profundidad. No mezclar arbitrariamente perspectivas laterales, isométricas y cenitales.

Los fondos pueden utilizar perspectiva artística para crear profundidad, pero los elementos que interactúan con el jugador deben mantener una lógica espacial coherente. Las balas, las áreas de daño y las colisiones deben corresponder con lo que el jugador ve.

### 3.3 Jerarquía visual

Orden de atención recomendado durante el combate:

1. Nave del jugador y peligro inmediato.
2. Proyectiles enemigos y zonas de daño.
3. Enemigos activos y objetivo vulnerable del jefe.
4. Recompensas y avisos de gameplay.
5. Fondo y elementos ornamentales.

La jerarquía se consigue mediante tamaño, contraste local, nitidez, animación, saturación y posición; no mediante brillo máximo en todos los elementos.

## 4. Sistema de color

Los siguientes valores son una paleta inicial de producción. Deben validarse en capturas reales del juego y ajustarse en conjunto, no elemento por elemento sin control.

### 4.1 Paleta del mundo

| Token | Color | HEX | Uso |
|---|---|---|---|
| `sky.deep` | Azul noche | `#14294F` | Cielo profundo, huecos entre nubes y fondos lejanos |
| `sky.mid` | Azul cobalto | `#3477B8` | Cielo medio y bruma distante |
| `sky.light` | Azul cielo | `#8FD6F5` | Áreas luminosas y reflejos de nube |
| `cloud.shadow` | Azul lavanda | `#777FBE` | Sombras de nube y niebla fría |
| `cloud.light` | Blanco marfil | `#FFF4E6` | Nubes iluminadas y brillos suaves |
| `foliage.deep` | Verde bosque | `#235A58` | Vegetación en sombra |
| `foliage.mid` | Verde jade | `#4BAA91` | Árboles, musgo y vegetación fantástica |
| `foliage.light` | Verde menta | `#A4E5B6` | Hojas iluminadas y pequeños acentos |
| `blossom` | Rosa flor | `#F5A6D2` | Flores, pétalos y árboles ornamentales |
| `architecture` | Azul pizarra | `#394A70` | Tejados, piedra y estructuras antiguas |
| `gold.sunlight` | Oro suave | `#FFD18A` | Sol, magia benigna y detalles ceremoniales |

### 4.2 Paleta de combate

| Token | Color | HEX | Uso |
|---|---|---|---|
| `player.primary` | Cian brillante | `#55E8FF` | Contorno energético del jugador y disparos principales |
| `player.core` | Blanco frío | `#F3FCFF` | Centro de brillo, foco del motor y puntos de alto contraste |
| `player.secondary` | Azul eléctrico | `#3F8DFF` | Motor, escudos y disparos alternativos |
| `enemy.primary` | Índigo oscuro | `#302B72` | Masa principal de enemigos |
| `enemy.accent` | Magenta | `#F25DBB` | Detalles, ojos, núcleos o ataques especiales |
| `bullet.warm` | Coral | `#FF6B65` | Proyectiles hostiles básicos |
| `bullet.hot` | Naranja fuego | `#FFAA45` | Proyectiles rápidos, ataques de alto peligro y explosiones |
| `bullet.special` | Rosa eléctrico | `#FF4FBF` | Ataques especiales que deben diferenciarse del patrón común |
| `warning` | Ámbar | `#FFD166` | Avisos, rayos cargados y peligro inminente |
| `pickup` | Verde menta | `#76F7C5` | Recuperación, mejoras y recompensas |
| `ui.primary` | Blanco azulado | `#EAF5FF` | Texto principal de interfaz |
| `ui.secondary` | Azul pálido | `#A6C3DE` | Etiquetas, información secundaria y marcos |

### 4.3 Reglas de contraste

- El jugador debe separarse del fondo con un contorno, halo o sombra corta. No depender solo del color del fuselaje.
- Evitar colocar una nave blanca sobre una nube blanca sin un recurso de separación.
- Los proyectiles hostiles necesitan un borde o núcleo claramente legible incluso cuando coinciden con un fondo luminoso.
- Evitar que todos los efectos utilicen el mismo cian y el mismo brillo: el jugador perdería prioridad visual.
- Reducir la saturación de los fondos detrás de las zonas con más actividad, mediante diseño de escena, bruma o un ajuste sutil de contraste.
- Probar las capturas en escala de grises. Si jugador, balas y fondo colapsan en valores parecidos, el color por sí solo no resolverá el problema.
- Evitar destellos blancos a pantalla completa y parpadeos rápidos. Las explosiones pueden ser intensas sin cubrir todo el campo de visión.

## 5. Lenguaje de formas

### 5.1 Formas del jugador

Usar siluetas estrechas, direccionales y fáciles de localizar. La punta o morro apunta hacia la parte superior de la pantalla; los motores y la estela refuerzan el sentido de avance.

Rasgos recomendados:

- Silueta triangular o de flecha con alas cortas y asimétricas en detalles, pero equilibradas en conjunto.
- Un elemento central reconocible —cristal, núcleo mágico, emblema o cabina—.
- Dos o tres acentos luminosos, no una red de luces por toda la nave.
- Motores separados visualmente del cuerpo.
- Forma secundaria simplificada que siga siendo reconocible cuando el sprite mida pocos píxeles en pantalla.

### 5.2 Formas de enemigos

Asignar una gramática de siluetas por función:

- **Explorador ligero:** pequeño, angular, con alas puntiagudas; se mueve rápido.
- **Interceptor:** estrecho y agresivo, con morro largo y acento frontal.
- **Acorazado:** ancho, pesado y con placas grandes; se mueve despacio y aguanta más daño.
- **Artillero:** cuerpo compacto, cañones visibles y orientación clara de ataque.
- **Invocador o mago aéreo:** silueta ornamental, anillos o talismanes flotantes, pero con un punto de daño identificable.
- **Unidad de apoyo:** formas redondas o simétricas y señal visual de su habilidad.

No distinguir arquetipos solo por color o por cantidad de detalles. Deben leerse en silueta plana.

### 5.3 Forma de los proyectiles

Los proyectiles deben diferenciarse por **silueta, tamaño, velocidad, trayectoria y color**. Cada tipo debe tener una firma inequívoca.

| Tipo | Forma sugerida | Lectura de juego |
|---|---|---|
| Bala básica | Esfera pequeña con borde cálido | Amenaza frecuente y predecible |
| Bala rápida | Dardo estrecho con cola corta | Reacción inmediata; trayectoria directa |
| Bala pesada | Orbe grande con núcleo y halo | Lenta, peligrosa por espacio ocupado |
| Bala teledirigida | Gota o rombo alargado con estela | Persigue al jugador; obliga a reposicionarse |
| Bala en abanico | Proyectiles redondos idénticos en arco | Control del espacio; huecos entre balas |
| Rayo cargado | Línea o franja continua con preaviso | Zona de peligro; requiere telegráfico claro |
| Mina aérea | Forma geométrica con pulso | Amenaza persistente o de activación diferida |
| Bala de jefe | Forma característica del jefe, con contorno reforzado | Patrón de alta relevancia que debe aprenderse |

El brillo de un proyectil no debe confundirse con su área real de colisión. El arte debe reservar una forma central legible para que el jugador pueda aprender el tamaño aproximado de la amenaza.

## 6. Diseño de la nave del jugador

### 6.1 Concepto

Una nave ligera de fantasía tecnológica: fuselaje blanco nacarado o azul pálido, bordes azul marino, pequeñas placas doradas y un núcleo cian. Las alas pueden recordar a plumas, pétalos o cristales, pero el diseño debe seguir pareciendo una máquina pilotable.

### 6.2 Escala y composición

En la referencia de 720 × 1280 px:

- **Tamaño visual inicial:** aproximadamente 64–88 px de alto y 48–72 px de ancho.
- **Contorno reconocible:** visible incluso con efectos de motor reducidos.
- **Área de colisión:** menor que el volumen artístico; no dibujar el hitbox como si ocupase toda la nave.
- **Núcleo de daño del jugador:** pequeño y de lectura clara, opcionalmente visible cuando el juego muestra hitboxes o durante estados de invulnerabilidad.

Estos tamaños son valores de partida y deben ajustarse mediante pruebas en dispositivos reales. El sprite no debe crecer de forma arbitraria para hacerlo “más espectacular”.

### 6.3 Estados visuales

Preparar al menos los estados siguientes:

1. **Vuelo normal:** motor estable y pequeña animación de energía.
2. **Movimiento lateral:** inclinación moderada hacia el lado del movimiento, sin rotación excesiva.
3. **Disparo:** destello corto y localizado en las bocas de los cañones.
4. **Daño:** parpadeo breve o contorno de energía, manteniendo la nave visible.
5. **Invulnerabilidad temporal:** patrón visual repetible, no destello blanco permanente.
6. **Mejora de arma:** nueva geometría de disparo y un pequeño cambio de acento en la nave o en sus módulos.
7. **Destrucción:** separación en fragmentos luminosos controlados y una explosión de duración limitada.

### 6.4 Motores y estelas

Los motores usan cian y azul, con núcleo blanco reducido. Las estelas deben ser cortas y desvanecerse rápido; una cola larga puede ocultar balas o sugerir una posición incorrecta de la nave.

El motor puede tener 2–3 fases de animación con variación de longitud y luminosidad. Evitar un ruido constante de partículas: la nave debe seguir siendo fácil de leer en combate intenso.

## 7. Diseño de enemigos y formaciones

### 7.1 Silueta y detalle

Cada enemigo necesita tres niveles de lectura:

- **A distancia:** forma global y dirección de movimiento.
- **A media distancia:** familia o función reconocible.
- **Cerca del jugador:** núcleo, arma o zona vulnerable visible.

El nivel de detalle no debe aumentar tanto que la silueta pierda claridad. Es preferible una placa grande, un patrón de ala y un núcleo luminoso que docenas de microdetalles.

### 7.2 Estados de animación

Cada enemigo debe poder representar, de manera coherente:

- Entrada en pantalla.
- Vuelo o flotación.
- Preparación del ataque.
- Ejecución del ataque.
- Daño recibido.
- Destrucción.
- Retirada o transición de fase, cuando proceda.

Las animaciones deben anticipar el comportamiento. Si un enemigo va a disparar, su cañón, núcleo o alas deben emitir una señal antes de generar el proyectil.

### 7.3 Lenguaje de formaciones

Las formaciones también forman parte de la composición:

- **V o flecha:** indica avance coordinado.
- **Línea horizontal:** crea una barrera de presión.
- **Dos columnas:** deja un corredor que exige posicionamiento.
- **Espiral o arco:** marca un patrón ornamental, sin convertirlo en ruido.
- **Entrada desde laterales:** amplía el uso del espacio, pero debe anunciarse con suficiente anticipación.

No colocar simultáneamente todos los grupos en el mismo plano de contraste. Las formaciones activas deben destacar; la decoración debe retroceder.

## 8. Jefes y enemigos de gran tamaño

### 8.1 Silueta memorable

Los jefes son las piezas visuales centrales de cada bioma. Deben poder reconocerse por una silueta global, incluso cuando el jugador solo ve parte de ellos en pantalla.

Conceptos adecuados para esta estética:

- Dragón mecánico que serpentea entre nubes.
- Guardián de santuario con alas de cristal o plumas metálicas.
- Nave-templo flotante protegida por anillos mágicos.
- Gólem de piedra suspendido por cristales.
- Reina de las tormentas con velos, rayos y alas de nube.

### 8.2 Núcleo vulnerable

El punto débil necesita un contraste deliberado con la armadura. Recomendación: núcleo dorado o magenta cálido sobre una estructura azul/violeta. La zona vulnerable debe tener una animación de pulso que no se confunda con el aviso de un ataque.

### 8.3 Fases visuales

Definir una gramática de cambios por fase:

- **Entrada:** la cámara compositiva y el fondo abren espacio; aparece una señal de jefe clara.
- **Fase 1:** formas y ataques básicos; paleta estable.
- **Fase 2:** cambia el patrón de alas, los anillos o el color del núcleo.
- **Fase crítica:** el jefe pierde partes o revela un núcleo, pero el efecto no debe esconder los proyectiles.
- **Destrucción:** secuencia breve con fragmentos y luz; conservar una zona de lectura para el jugador.

No cambiar todos los colores a la vez. La evolución debe ser legible y mantener la identidad del jefe.

### 8.4 Tamaño y encuadre

Como referencia inicial, el jefe puede ocupar entre el 30 % y el 55 % del ancho del área jugable según su tipo y fase. Debe quedar espacio suficiente para sus proyectiles, sus animaciones y las maniobras del jugador. El tamaño final depende de la mecánica, no solo de la ilustración.

## 9. Escenarios: biomas del cielo

Los escenarios deben sentirse parte del mismo mundo. Cada bioma cambia la arquitectura, la vegetación, la luz y la atmósfera, mientras mantiene constantes las reglas de combate.

### 9.1 Bioma I — Archipiélago de las nubes

**Identidad:** aventura luminosa, descubrimiento y amplitud.

- Islas flotantes con hierba, cascadas y rocas suspendidas.
- Nubes volumétricas de bordes suaves y sombras lavanda.
- Árboles de copa redondeada y pequeñas flores rosas.
- Ruinas o puentes a escala lejana para sugerir civilizaciones.
- Luz de mañana, azul claro y acentos verde jade.

**Riesgo de diseño:** demasiadas nubes blancas pueden camuflar proyectiles claros. Reservar el centro de combate para cielos de valor medio y desplazar las nubes más luminosas a los laterales o a zonas de baja actividad.

### 9.2 Bioma II — Jardines celestes

**Identidad:** naturaleza mágica y delicadeza anime.

- Árboles en flor, pétalos que atraviesan el plano y pequeñas plataformas vegetales.
- Santuarios y pabellones con tejados curvos.
- Hilos de luz, polen y partículas muy sutiles.
- Tonos jade, turquesa, rosa, marfil y azul profundo.

Los pétalos ambientales deben diferenciarse de los proyectiles hostiles por su tamaño, opacidad, trayectoria, velocidad y comportamiento. No usar el mismo rojo o magenta saturado para ambos.

### 9.3 Bioma III — Templos sobre el vacío

**Identidad:** antigüedad, misterio y escala monumental.

- Columnas flotantes, arcos, campanas, puertas y plataformas ceremoniales.
- Sellos mágicos dibujados como líneas geométricas y círculos.
- Luz dorada filtrándose entre nubes oscuras.
- Contraste entre piedra azul pizarra y energía ámbar.

Los símbolos del decorado no deben parecer indicadores de hitbox ni telegráficos de ataques. Mantenerlos en planos de baja intensidad.

### 9.4 Bioma IV — Tormenta de cristal

**Identidad:** peligro, energía y ritmo creciente.

- Nubes azul oscuro, relámpagos lejanos y cristales flotantes.
- Reflejos cian y violeta, con advertencias ámbar.
- Fragmentos que giran lentamente en zonas alejadas de las rutas principales.
- Siluetas grandes y simples para compensar la mayor intensidad atmosférica.

Los relámpagos ambientales deben ser breves, poco frecuentes y nunca coincidir constantemente con señales de peligro de gameplay.

### 9.5 Bioma V — Palacio del amanecer

**Identidad:** clímax épico, serenidad y luz cálida.

- Torres suspendidas sobre un mar de nubes rosadas.
- Rayos solares, círculos ceremoniales y plataformas escalonadas.
- Oro pálido, coral, violeta y azul oscuro para equilibrar zonas luminosas.
- Arquitectura más simétrica que en los biomas anteriores, reforzando el final del viaje.

### 9.6 Cómo evitar que el fondo compita con el combate

- Crear una franja central de valores relativamente estables.
- Reservar las formas más detalladas para laterales y capas lejanas.
- Disminuir contraste y saturación conforme aumenta la distancia.
- No mantener partículas decorativas justo encima de los patrones de mayor densidad.
- Usar cambios de bioma progresivos: transición de color, aparición de arquitectura y cambio de luz, evitando cortes arbitrarios.
- Permitir que los fondos se simplifiquen durante jefes o momentos de dificultad extrema.

## 10. Parallax, profundidad y movimiento del mundo

### 10.1 Capas recomendadas

1. **Capa lejana:** cielo, gradientes, luna o sol distante; desplazamiento muy lento.
2. **Capa atmosférica:** nubes grandes y bruma; movimiento lento y deriva horizontal suave.
3. **Capa media:** islas, montañas flotantes y templos; scroll más perceptible.
4. **Capa próxima decorativa:** pétalos, pequeñas hojas o fragmentos; uso moderado y sin confundirlos con balas.
5. **Capa de gameplay:** jugador, enemigos, disparos, pickups y elementos de colisión.
6. **Capa de efectos:** impactos, explosiones y avisos claramente asociados a la acción.
7. **Interfaz:** HUD y mensajes.

### 10.2 Reglas de movimiento

- La dirección y la velocidad del scroll deben sentirse coherentes entre capas.
- Usar velocidades distintas para dar profundidad, no movimientos aleatorios constantes.
- El desplazamiento del fondo no debe cambiar la posición aparente de un objeto jugable de forma engañosa.
- Los elementos próximos pueden cruzar el borde, pero no deben tapar al jugador durante tiempo prolongado.
- Cuando el jugador se mueve lateralmente, el fondo puede reaccionar muy sutilmente para reforzar la velocidad; no debe seguirlo como una cámara nerviosa.

### 10.3 Lectura de velocidad

Para sugerir ascenso, se pueden combinar nubes desplazándose, motas de luz en deriva y cascadas verticales. No hace falta acelerar todas las capas a la vez. Una variación escalonada del scroll suele resultar más elegante y menos agotadora.

## 11. Proyectiles, telegráficos y patrones

### 11.1 Regla de anticipación

Los ataques relevantes deben tener una fase visual previa. La anticipación puede expresarse con un cañón que se carga, un círculo que aparece, alas que se abren, un núcleo que pulsa o una línea de advertencia.

Secuencia general de un ataque:

1. **Preparación:** el enemigo anuncia intención.
2. **Telegráfico:** la trayectoria o zona peligrosa se hace comprensible.
3. **Ejecución:** el proyectil o rayo aparece con una forma definida.
4. **Desvanecimiento:** el peligro desaparece sin dejar residuos confusos.

No todos los ataques necesitan una animación larga, pero los ataques capaces de causar daño importante deben ofrecer señales que el jugador pueda aprender.

### 11.2 Densidad de balas

- Mantener un contraste constante entre balas hostiles y decorado.
- Evitar muchos tipos de bala con siluetas casi idénticas.
- Mantener la saturación y luminosidad de las balas dentro de una escala estable.
- Usar patrones geométricos intencionales: abanicos, anillos incompletos, ondas o corredores.
- No sumar estelas gruesas a todas las balas. Las estelas se reservan para proyectiles rápidos o especiales.
- Los ataques de gran tamaño deben ocupar espacio visual suficiente para justificar su peligro, sin tapar por completo el entorno inmediato.

### 11.3 Hitbox y justicia visual

El sprite de una bala puede tener resplandor mayor que su núcleo, pero el centro visual debe corresponder razonablemente con su área de amenaza. La colisión real puede ser más pequeña que la imagen; la presentación debe ser consistente y verificable durante el juego.

Se recomienda disponer de un modo de depuración que muestre hitboxes y trayectorias. Ese modo es una herramienta interna de desarrollo, no necesariamente una función para el jugador final.

## 12. Efectos visuales (VFX)

### 12.1 Filosofía

Los VFX transmiten causa y consecuencia. Cada efecto debe responder a una pregunta: ¿qué ha ocurrido?, ¿dónde?, ¿con qué intensidad? El brillo por sí solo no sustituye una forma bien diseñada.

### 12.2 Biblioteca mínima de efectos

| Efecto | Lenguaje visual | Duración orientativa | Restricción |
|---|---|---|---|
| Disparo del jugador | Destello en boquilla + núcleo cian | Muy breve | No ocultar la nave |
| Impacto enemigo | Chispa blanca y fragmentos del color del enemigo | Breve | El enemigo debe seguir visible si sobrevive |
| Enemigo destruido | Explosión compacta, fragmentos y halo | Corta | Evitar nubes opacas persistentes |
| Golpe a jefe | Destello localizado en armadura o núcleo | Breve | No tapar el patrón actual |
| Carga de rayo | Anillo o línea de aviso creciente | Variable | El área peligrosa debe ser exacta |
| Recogida de mejora | Partículas convergentes y sonido visual de pulso | Breve | Diferenciar de balas y explosiones |
| Activación de bomba | Barrido circular o pulso de energía | Controlada | Preservar referencias espaciales |
| Escudo del jugador | Contorno cian translúcido | Mientras esté activo | No convertir la nave en una mancha luminosa |
| Daño del jugador | Golpe corto de luz + retroceso visual limitado | Muy breve | No bloquear el siguiente patrón |
| Transición de bioma | Bruma y cambio de luz gradual | Varios segundos | No ocultar amenazas activas |

Las duraciones deben medirse en tiempo de juego y ajustarse con pruebas, no depender de un número fijo de fotogramas si el motor admite distintas frecuencias.

### 12.3 Partículas

Usar pocas familias, bien diferenciadas:

- Pétalos para biomas naturales.
- Polvo luminoso para magia ambiental.
- Chispas cortas para impactos mecánicos.
- Fragmentos geométricos para destrucción de máquinas.
- Motas de energía para pickups.

Definir límites por efecto y un máximo global. Si el rendimiento cae, reducir primero partículas decorativas y la cantidad de fragmentos secundarios antes de sacrificar la legibilidad de los proyectiles.

### 12.4 Bloom y glow

El resplandor sirve para separar fuentes de energía del mundo, no para convertir cada objeto en una fuente luminosa. Mantener un núcleo nítido y un halo moderado. Los bordes importantes deben seguir existiendo cuando el glow se desactive o se reduzca.

## 13. Animación

### 13.1 Principios

- **Anticipación:** una fracción de segundo de preparación puede hacer un ataque mucho más justo.
- **Acento:** movimientos breves y claros son preferibles a oscilaciones constantes.
- **Elasticidad controlada:** enemigos mágicos pueden flotar o expandirse sutilmente; las naves mecánicas necesitan una sensación de masa coherente.
- **Lectura por función:** la animación de ataque debe distinguirse de la de vuelo.
- **Economía:** no animar cada detalle si eso complica la producción o reduce el rendimiento.

### 13.2 Frecuencias recomendadas

La simulación debe mantener una actualización estable. La animación visual puede usar ciclos de 2–6 poses para motores, alas y flotación, con variación de escala o luminosidad moderada. Las animaciones de impacto deben ser cortas y perceptibles; las de entrada de jefe pueden ser más elaboradas porque ocurren en momentos controlados.

### 13.3 Movimiento enemigo

Los movimientos deben comunicar intención:

- Desplazamiento lateral suave para enemigos básicos.
- Picado o giro corto para interceptores.
- Movimiento amplio y lento para unidades pesadas.
- Ondulación deliberada para seres mágicos.
- Cambios de dirección precedidos de una señal cuando afecten a la lectura de sus disparos.

Evitar que todos los enemigos floten con la misma frecuencia y amplitud. La variedad surge de perfiles de movimiento distintos, no de ruido aleatorio.

## 14. Interfaz (HUD) y lenguaje gráfico

### 14.1 Estilo

La interfaz combina formas geométricas limpias con pequeños motivos de talismán o cristal. Evitar marcos ornamentales gruesos que reduzcan el área de combate. Los adornos culturales o mágicos deben permanecer secundarios frente a los datos de partida.

### 14.2 Información prioritaria

- Puntuación.
- Vidas o intentos restantes.
- Nivel de arma o mejora activa.
- Bombas o habilidad especial disponible.
- Indicador de jefe y progreso de su vida cuando corresponda.
- Pausa y acceso a opciones.

La información que cambia constantemente debe tener un lugar estable. No desplazar el HUD ni variar su jerarquía entre biomas.

### 14.3 Tipografía

- Utilizar una sans serif legible, de formas abiertas, para cifras y etiquetas.
- Reservar una tipografía más ornamental para títulos, nombres de biomas y pantallas de transición.
- Evitar texto fino, condensado en exceso o con bajo contraste.
- Mantener tamaños mínimos que puedan leerse en móvil sin ampliar la pantalla.
- Diferenciar números y letras de forma inequívoca; especialmente `0/O`, `1/I` y `5/S`.

### 14.4 Iconos

Los iconos de vida, bomba, mejora, escudo y pausa deben tener una silueta reconocible a tamaño pequeño. Cada icono debe funcionar en monocromo antes de aplicar color. Evitar depender de etiquetas textuales para funciones que necesitan una reacción rápida.

### 14.5 Menús y pantallas no jugables

- **Título:** una nave en primer plano, paisaje de islas flotantes al fondo y una composición que sugiera ascenso.
- **Selección de nivel:** miniaturas de biomas con una paleta identificable.
- **Pausa:** panel sencillo con fondo atenuado, sin tapar innecesariamente toda la escena.
- **Victoria:** un momento de calma, luz cálida y lectura clara de la recompensa.
- **Derrota:** contraste más frío y composición contenida, sin castigar visualmente al jugador con flashes intensos.
- **Mejora o recompensa:** icono grande, animación breve y texto breve.

## 15. Tipos de recursos gráficos

### 15.1 Lista inicial de assets

**Jugador**
- Nave principal.
- Variantes o módulos de arma, si modifican la silueta.
- Motores o estelas en capas separadas cuando sea útil.
- Efecto de daño y destrucción.

**Enemigos**
- 3–5 enemigos básicos.
- 2 enemigos de ataque especial.
- 1 unidad pesada.
- 1 unidad de apoyo o invocación.
- 1 jefe por bioma inicial, empezando por uno completamente jugable.

**Combate**
- Disparos del jugador.
- Al menos 3 familias de proyectiles enemigos.
- Impacto pequeño, impacto pesado y explosión.
- Aviso de rayo o área de peligro.
- Pickup de mejora, recuperación y habilidad especial.

**Entorno**
- 2–3 cielos o gradientes base.
- 3 tamaños de nubes.
- Islas flotantes grandes y pequeñas.
- Ruinas o templos en varias siluetas.
- Árboles, flores y pétalos.
- Elementos atmosféricos por bioma.

**Interfaz**
- Iconos del HUD.
- Medidor de jefe.
- Paneles, marcos ligeros y botones.
- Logotipo o emblema del juego.
- Elementos de victoria, derrota y pausa.

No es obligatorio dibujar todos los recursos antes del primer prototipo. Priorizar un conjunto vertical reducido que demuestre la estética de forma integrada.

## 16. Especificaciones de producción de assets

### 16.1 Formatos

- **PNG con transparencia:** opción inicial para sprites con bordes y canales alfa.
- **SVG:** apropiado para iconos e interfaz vectorial cuando el pipeline lo admita.
- **WebP:** opción para fondos o ilustraciones si el flujo de build conserva buena calidad, transparencia cuando sea necesaria y compatibilidad entre plataformas.
- **Atlas o sprite sheet:** agrupar recursos relacionados para reducir cambios de textura y simplificar animaciones si el motor lo soporta.

Elegir un formato por función. No convertir todos los assets al mismo formato sin considerar transparencia, escalado, memoria y herramientas de carga.

### 16.2 Resolución y escalado

- Trabajar con una resolución de referencia y definir cómo se escala en cada densidad de pantalla.
- Dibujar el asset a un tamaño que permita reducirlo sin perder silueta ni contorno.
- Evitar reescalar repetidamente una imagen ya reducida.
- Mantener márgenes transparentes consistentes para evitar recortes de estelas y explosiones.
- Separar los efectos que requieran una escala distinta del sprite principal.
- Comprobar el resultado en el tamaño real de juego; una imagen ampliada en un editor puede ocultar problemas de lectura.

### 16.3 Convención de nombres

Usar nombres descriptivos, estables y agrupados por función. Por ejemplo:

```text
assets/shmup/
  player/
    player_ship_idle.png
    player_ship_damage.png
    player_engine_cyan_01.png
  enemies/
    scout_idle.png
    interceptor_idle.png
    armored_gunner_idle.png
  bullets/
    player_shot_cyan.png
    enemy_bullet_coral.png
    enemy_bullet_seeker.png
  effects/
    hit_small_01.png
    explosion_medium_01.png
    pickup_glow_01.png
  backgrounds/
    sky_archipelago_far.png
    clouds_archipelago_mid.png
    island_archipelago_near.png
  ui/
    icon_life.png
    icon_bomb.png
    icon_upgrade.png
```

El ejemplo ilustra una convención, no impone una estructura técnica. Adaptar las rutas al proyecto y evitar duplicar recursos ya existentes.

### 16.4 Capas separadas

Separar un recurso en capas cuando facilite reutilizarlo o animarlo: fuselaje, motor, aura, sombra o puntos de emisión. No dividir un sprite en numerosas piezas si la animación no lo necesita; la modularidad tiene un coste de integración.

### 16.5 Atlas y márgenes

- Dejar padding suficiente entre sprites para evitar bleeding de textura.
- Añadir margen para partículas y glow que excedan el contorno del sprite.
- No empaquetar en un mismo atlas recursos con escalados incompatibles si el motor tiene limitaciones.
- Mantener una referencia de rectángulos y pivotes para animaciones.

## 17. Guía para ilustración y generación de assets

Todos los assets deben parecer parte del mismo juego, incluso si se producen en tandas separadas.

### 17.1 Brief visual común

Cada encargo debe especificar:

- Vista cenital o cenital ligeramente trasera.
- Silueta claramente legible en un juego vertical.
- Paleta asignada según función de gameplay.
- Fuente de luz principal.
- Nivel de detalle compatible con el tamaño final.
- Contorno y tratamiento de sombras coherentes con el resto del juego.
- Fondo transparente para sprites aislados.
- Ausencia de texto, marcas de agua y elementos ajenos al diseño.
- Espacio transparente alrededor del objeto para no cortar el glow o la animación.

### 17.2 Plantilla de prompt para un sprite

```text
Diseña un sprite 2D para un vertical shoot 'em up de fantasía aérea anime.
Elemento: [describir nave/enemigo/proyectil].
Función en el juego: [jugador, enemigo rápido, enemigo pesado, pickup, etc.].
Vista: cenital, orientado hacia la parte superior de la imagen.
Silueta: [forma y proporciones], reconocible a tamaño pequeño.
Paleta: [tokens y colores autorizados].
Iluminación: consistente, con núcleo luminoso localizado y sombras definidas.
Acabado: ilustración 2D limpia, formas controladas, detalle selectivo y bordes nítidos.
Salida: objeto aislado, fondo transparente, sin texto, sin marcas de agua,
sin perspectiva lateral, sin elementos cortados y con margen alrededor.
Debe leerse claramente sobre cielos azules, nubes y vegetación luminosa.
```

### 17.3 Plantilla de prompt para un fondo

```text
Crea un fondo 2D vertical para un vertical shoot 'em up de fantasía aérea anime.
Bioma: [archipiélago de nubes / jardín celeste / templo / tormenta / amanecer].
Composición: capas profundas de cielo, nubes, islas flotantes y arquitectura fantástica.
Zona de combate: deja una franja central de contraste moderado y formas relativamente simples.
Detalles: concentra los motivos más complejos en laterales y planos lejanos.
Paleta: [paleta del bioma].
Iluminación: una fuente coherente y atmósfera luminosa.
No incluir nave del jugador, enemigos, balas, interfaz, texto ni símbolos que parezcan hitboxes.
Evitar ruido de detalle, contraste excesivo en el centro y elementos que se confundan con proyectiles.
```

### 17.4 Revisión de assets generados o dibujados

Antes de integrar un asset, comprobar:

- ¿La silueta es correcta y se reconoce a tamaño real?
- ¿La orientación coincide con el resto del juego?
- ¿La iluminación respeta la dirección global?
- ¿El contorno queda limpio sobre fondos claros y oscuros?
- ¿El color comunica una función correcta?
- ¿El recorte tiene suficiente margen?
- ¿El recurso contiene detalles deformes o inconsistentes que destaquen al animarlo?
- ¿Su complejidad coincide con la de los sprites existentes?

La dirección artística requiere selección y corrección. No integrar automáticamente cada imagen producida.

## 18. Rendimiento y escalabilidad visual

La estética debe seguir funcionando en dispositivos con recursos limitados.

- Mantener el número de partículas bajo control y permitir su reducción.
- Evitar demasiadas capas de transparencia superpuestas en la misma zona.
- Reservar blur, glow y composición costosa para efectos de alto valor visual.
- Preferir animaciones breves o reutilizables para elementos frecuentes.
- Reutilizar texturas y atlas cuando resulte adecuado.
- Evitar fondos gigantes duplicados si pueden componerse con capas repetibles.
- Definir un nivel de efectos reducido que conserve las señales esenciales de combate.
- Medir rendimiento con un patrón de balas intenso, un jefe y varias explosiones, no solo con una pantalla vacía.

La prioridad de degradación visual debe ser: partículas ornamentales, detalles secundarios del fondo, glows amplios y fragmentos decorativos. No reducir antes el contraste o el tamaño de lectura de las balas peligrosas.

## 19. Accesibilidad y opciones visuales

Incluir, cuando sea posible:

- Intensidad de efectos: estándar y reducida.
- Reducción de sacudidas de cámara.
- Reducción de destellos y flashes.
- Ajuste de brillo de los efectos sin oscurecer el juego completo.
- Formas diferenciadas para las familias principales de proyectiles.
- Señales redundantes de peligro mediante forma, movimiento y sonido, no solo color.
- Opción de mostrar hitboxes durante prácticas o en modo de entrenamiento.
- Texto con contraste suficiente y controles visuales consistentes.

Evitar parpadeos rápidos repetitivos, destellos blancos a pantalla completa y vibraciones sostenidas. En caso de usar un efecto de pantalla, mantenerlo corto, opcional y alejado de la información crítica.

## 20. Qué evitar

1. **Saturación constante:** si todo brilla, nada destaca.
2. **Fondos demasiado detallados:** roban atención y dificultan anticipar patrones.
3. **Sprites sin una escala compartida:** hacen que el juego parezca un collage de recursos.
4. **Perspectivas incompatibles:** rompen la sensación de un mundo coherente.
5. **Proyectiles decorativos ambiguos:** generan dudas sobre qué puede causar daño.
6. **Estelas demasiado largas:** ocultan la posición de las balas y la nave.
7. **Explosiones que ocultan ataques siguientes:** recompensan menos la habilidad y perjudican la lectura.
8. **Animación constante en todos los objetos:** produce ruido visual y consume rendimiento.
9. **HUD ornamental en exceso:** reduce el espacio jugable.
10. **Paletas diferentes en cada asset:** destruyen la identidad del juego.
11. **Jefes grandes sin espacio de maniobra:** obligan a esquivar sin información suficiente.
12. **Usar el mismo magenta para flores y balas peligrosas:** crea falsas señales de amenaza.

## 21. Proceso de producción recomendado

### Fase 1 — Prototipo de lectura

Crear solo los recursos necesarios para comprobar el combate: fondo temporal, nave del jugador, dos enemigos, dos familias de proyectiles, impacto, explosión y HUD básico.

**Objetivo:** demostrar que el jugador puede distinguir amenazas y reaccionar a los patrones en movimiento.

### Fase 2 — Vertical slice visual

Producir un fragmento corto del primer bioma con:

- Fondo completo de varias capas.
- Nave final o casi final.
- Tres enemigos con siluetas diferenciadas.
- Variantes de disparo del jugador y enemigos.
- Un miniboss o jefe sencillo.
- Efectos y HUD integrados.
- Transición de entrada y destrucción.

**Objetivo:** validar la dirección artística completa antes de multiplicar el volumen de assets.

### Fase 3 — Sistema de biomas

Definir tokens y reglas de iluminación para cada bioma, reutilizando componentes compatibles. Crear variaciones de cielo, nubes, arquitectura y vegetación sin cambiar el lenguaje general del combate.

### Fase 4 — Jefes y momentos espectaculares

Desarrollar primero la silueta y las fases jugables de cada jefe. Añadir efectos después de validar las zonas vulnerables y los patrones.

### Fase 5 — Optimización y pulido

Probar densidad máxima de balas, equipos modestos, diferentes relaciones de aspecto, brillo reducido y efectos de accesibilidad. Ajustar el arte según evidencia real de juego.

## 22. Criterios de aceptación visual

Un recurso no se considera terminado solo porque tenga buen aspecto en una ilustración aislada. Debe aprobar las comprobaciones siguientes.

### 22.1 Nave del jugador

- Se localiza inmediatamente en medio de enemigos y proyectiles.
- Mantiene una silueta reconocible al reducir la escala.
- Se distingue sobre nubes claras, cielo oscuro y vegetación.
- Los motores no ocultan las balas cercanas.
- Los estados de daño e invulnerabilidad no se confunden.

### 22.2 Enemigos

- Cada clase se reconoce por forma, no solo por color.
- La preparación de un ataque resulta visible.
- El punto vulnerable del jefe se distingue de la decoración.
- El sprite no se confunde con una explosión o un pickup.

### 22.3 Proyectiles

- Se diferencian por tamaño, forma, trayectoria y color.
- El borde o núcleo permanece visible en todos los biomas.
- El glow no multiplica visualmente el tamaño aparente de la hitbox.
- Se puede leer el patrón completo en movimiento.

### 22.4 Fondo

- Mantiene profundidad sin dominar la zona central.
- Las capas se desplazan de forma coherente.
- Las partículas ambientales no parecen balas.
- El cambio entre biomas conserva la identidad del juego.

### 22.5 Efectos y rendimiento

- Cada efecto tiene inicio, punto máximo y desaparición claros.
- Las explosiones no ocultan amenazas que deban anticiparse.
- El juego conserva el rendimiento objetivo durante una escena intensa.
- El modo de efectos reducidos mantiene todas las señales de gameplay necesarias.

## 23. Matriz de pruebas visuales

Registrar capturas de juego y evaluar cada caso como **Correcto**, **Necesita ajuste** o **Bloqueante**.

| Escenario de prueba | Qué verificar | Fallo bloqueante |
|---|---|---|
| Fondo claro con muchas nubes | Contraste de nave y balas hostiles | Un proyectil peligroso se vuelve difícil de ver |
| Fondo oscuro con templo | Bordes y silueta de enemigos | Enemigos activos desaparecen visualmente |
| Pantalla con alta densidad de balas | Prioridad del jugador y lectura de huecos | No se puede identificar una ruta razonable de esquiva |
| Explosión durante patrón activo | Duración y opacidad del VFX | El efecto tapa proyectiles o avisos críticos |
| Aparición del jefe | Jerarquía entre jefe, balas y jugador | El jefe oculta al jugador o el HUD esencial |
| Cambio de bioma | Continuidad de color y scroll | La transición parece un corte accidental |
| Escala de grises | Separación por valores y formas | Jugador, fondo y amenaza colapsan en un solo nivel visual |
| Pantalla pequeña | Legibilidad de sprites, HUD y pickups | Los elementos esenciales pierden su forma |
| Efectos reducidos | Conservación de señales de peligro | Desaparecen avisos necesarios para esquivar |
| Carga intensa | FPS, transparencias y partículas | El combate pierde fluidez durante una pelea importante |

## 24. Prioridad por retorno visual (ROI)

Orden sugerido para invertir el tiempo artístico:

1. **Nave del jugador:** aparece durante toda la partida y define la identidad inmediata.
2. **Proyectiles y efectos de impacto:** mejoran la legibilidad y la sensación de respuesta.
3. **Enemigos básicos:** aportan variedad constante y hacen reconocibles las formaciones.
4. **Fondo del primer bioma:** da contexto y convierte el prototipo en un mundo.
5. **HUD:** mejora comprensión, acabado y confianza del jugador.
6. **Primer jefe:** ofrece un hito visual y permite comprobar el lenguaje de los grandes enemigos.
7. **Variaciones atmosféricas:** elevan la riqueza del mundo sin exigir nuevos sistemas de gameplay.
8. **Biomas adicionales:** solo después de validar las reglas de arte en una escena completa.
9. **Detalles secundarios y adornos:** deben llegar al final, una vez resueltas lectura, consistencia y rendimiento.

La prioridad se basa en frecuencia de exposición, claridad de combate y reutilización; no en el tamaño o complejidad de una ilustración.

## 25. Lista de control para cada pull request gráfico

- [ ] El recurso respeta la vista y la orientación del juego.
- [ ] Utiliza la paleta aprobada y comunica la función correcta.
- [ ] Conserva una silueta clara a escala real.
- [ ] Se prueba sobre al menos un fondo claro y uno oscuro.
- [ ] No añade ruido visual innecesario en el centro del combate.
- [ ] Los márgenes, pivotes y áreas transparentes son correctos.
- [ ] Las animaciones o ciclos mantienen continuidad visual.
- [ ] No se confunde con balas, pickups, avisos o elementos del HUD.
- [ ] Se revisa en un dispositivo o emulador con la resolución objetivo.
- [ ] Se comprueba el impacto en rendimiento cuando añade partículas o transparencias.
- [ ] Se registra cualquier desviación intencional de la guía.

## 26. Decisiones que deben mantenerse estables

Para impedir que el estilo se diluya durante el desarrollo, conviene tratar como decisiones de dirección artística:

1. El juego utiliza fantasía aérea anime en vista cenital vertical.
2. El jugador conserva una paleta fría y una silueta ligera.
3. Las amenazas utilizan formas y acentos cálidos claramente definidos.
4. Los biomas aportan variedad atmosférica sin alterar el lenguaje básico de combate.
5. Los fondos reducen contraste en zonas de alta actividad.
6. Cada ataque importante cuenta con anticipación visual suficiente.
7. El detalle se concentra en siluetas, puntos focales y arte de gran tamaño.
8. Los efectos no sustituyen a las animaciones, las formas o las señales de gameplay.
9. El HUD mantiene posición y jerarquía entre niveles.
10. La optimización nunca debe eliminar la información visual necesaria para jugar.

Las desviaciones son válidas si mejoran una meta concreta y se aplican de forma coherente; no si aparecen de forma aislada en un asset.

## 27. Resultado esperado

El juego debe sentirse como un viaje por un mundo de islas flotantes, templos en las nubes y criaturas mecánico-mágicas dibujadas con sensibilidad anime. La nave del jugador debe parecer elegante y veloz; los enemigos, variados y fáciles de leer; los jefes, memorables; y los fondos, amplios y atmosféricos.

El objetivo no es llenar cada píxel de detalle. Es crear una imagen en la que **el mundo sea hermoso, el combate sea comprensible y cada elemento tenga una función visual reconocible**.

La primera validación debe concentrarse en una única escena de 30–60 segundos: un fondo de archipiélago, la nave del jugador, tres familias de enemigos o patrones, una pequeña secuencia de jefe y el HUD. Cuando esa escena funcione en movimiento, servirá como referencia para el resto de los niveles.

## Presentación de jefes y HUD

### Entrada y lectura del jefe

- El jefe debe distinguirse del resto de enemigos por tamaño, silueta y un sello orbital dorado/magenta de movimiento lento. El efecto debe reforzar su presencia sin cubrir proyectiles ni zonas vulnerables.
- Los arcos luminosos deben conservar suficiente transparencia para que la forma principal del jefe y los patrones de ataque sigan siendo legibles.
- La presentación del jefe se identifica por el arquetipo de la entidad, no por inferencias basadas en tamaño o trayectoria.
- La barra de salud del jefe aparece solo mientras existe un jefe activo y refleja sus valores reales de salud actual y máxima. El tratamiento visual usa ámbar para la alerta y magenta para la salud enemiga.

### Jerarquía del HUD

- **Nivel primario:** puntuación, oleada y vidas, alineadas en un panel compacto y de alto contraste.
- **Nivel de encuentro:** aviso y barra de salud del jefe, visibles solo durante ese encuentro.
- Las superficies deben usar azul noche translúcido, bordes finos y tipografía monoespaciada; el cian identifica información del jugador, el dorado indica alerta y el magenta identifica al jefe.
- Mantener la interfaz fuera del centro de la zona de combate y evitar efectos intermitentes de alta frecuencia en la interfaz.
- Canvas y Skia deben compartir el mismo lenguaje visual para los elementos del jefe. Los detalles de presentación no alteran salud, daño, movimiento, patrones ni colisiones.
