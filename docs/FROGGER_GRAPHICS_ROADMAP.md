# Frogger — roadmap de evolución gráfica «Hora punta»

## Objetivo

Llevar Frogger a una estética arcade vectorial, cálida y legible, basada en la referencia **«Hora punta»**: escenario visto desde arriba, geometría redondeada, atardecer, vehículos compactos, agua con profundidad y un HUD integrado. La intervención debe ser principalmente de presentación: **no cambiar las reglas de movimiento, colisión, transporte sobre troncos, puntuación ni determinismo** para conseguir el aspecto visual.

## Diagnóstico del código actual

Rutas principales examinadas:

- `src/games/frogger/rendering/FroggerCanvasVisuals.ts`: dibujos Canvas de rana, coches, camiones, troncos, tortugas, cocodrilo, nenúfares y fondo.
- `src/games/frogger/rendering/FroggerSkiaVisuals.ts`: versión Skia de esos dibujos.
- `src/games/frogger/rendering/FroggerPresentation.ts`: registro de shapes y efectos por backend.
- `src/games/frogger/rendering/FroggerRenderUtils.ts`: contexto de dibujo y colores.
- `src/games/frogger/EntityFactory.ts` y `src/games/frogger/types/FroggerTypes.ts`: geometría de entidades y estado disponible para dibujarlas.
- `src/app/frogger/index.tsx`: HUD, pantalla de juego y controles.
- Tests existentes: `FroggerPresentation.test.ts`, `FroggerRenderUtils.test.ts`, `FroggerLifecycle.test.ts` y `FroggerFeatures.test.ts`.

La base jugable ya existe y no hace falta reescribirla. El aspecto actual se compone de formas simples, colores de alto brillo/neón y fondos planos. Canvas y Skia no muestran el mismo nivel de detalle; por ejemplo, la rama Canvas registra `drawTurtleCanvas` para la forma `crocodile`, mientras Skia utiliza `drawCrocodileSkia`. La prueba de registro actual tampoco comprueba explícitamente ese shape. El HUD vive fuera de los drawers, en la ruta de la aplicación, y debe evolucionar coordinadamente con el escenario.

**Restricción de composición que hay que resolver al inicio:** el juego utiliza una rejilla lógica de 20 columnas por 15 filas y `GRID_SIZE = 40` por defecto. La referencia es un mockup vertical de 390 × 844 px, con HUD de 90 px y campo de 754 px. Esas dimensiones son una referencia de composición y no deben convertirse automáticamente en dimensiones de simulación. Primero hay que comprobar cómo `CanvasRenderer` escala el mundo y asegurar que el campo completo queda visible en móvil.

## Dirección visual y paleta

Aplicar esta paleta como tokens semánticos compartidos por ambos backends. No sustituirla por valores neón procedentes de fallbacks del tema.

| Elemento | Color / tratamiento |
|---|---|
| Rana | Verde lima `#B6F23C`; ojos marfil `#F2EEE3`; pupilas `#232338` |
| Asfalto | `#232338` |
| Márgenes / bancos | Amarillo cálido `#E9B949` |
| Agua | Degradado `#0F6E7A` → `#17A3A3` |
| HUD | `#1B1B2E` |
| Troncos | `#B9824A`; anillos `#C99560` |
| Tortugas | `#2F8F7A`; estado sumergido `#1E5E5C` |
| Nenúfares | `#3FA373` |
| Cocodrilo | Cuerpo `#4C7F5E`; banda dorsal `#3A6648` |
| Coches | Variantes controladas: `#5B6FB5`, `#8B63A8`, `#9A9AB8`, `#C07A9A`, `#7FA6D6` |
| Cristales de vehículos | `#14142A`, con opacidad aproximada del 55 % |
| Faros y haces | Luz `#FFF4D0`; haz `#FFF0C4` |
| Coral de alerta | `#FF5A4F`, reservado para pilotos traseros, ojos/avisos del cocodrilo y tortuga en advertencia |
| Sombras | Suaves, desplazadas unos 5 px hacia abajo; sin contornos negros gruesos |

Principios: lectura instantánea desde móvil; siluetas redondeadas y compactas; textura discreta; contraste de luminancia entre cada tipo de superficie; ningún negro puro como color decorativo, ningún glow neón y ningún detalle que confunda las hitboxes con el arte.

## Plan de entrega

### Fase 0 — Baseline visual y contrato de viewport
**Prioridad: P0 · Dependencia: ninguna**

1. Capturar una referencia reproducible del estado actual en Canvas y Skia.
2. Verificar la escala real del mundo, la relación de aspecto y el encuadre del campo de juego en una ventana móvil de 390 × 844; revisar también una pantalla más pequeña.
3. Definir una escena visual de prueba determinista que represente el nivel 3 al atardecer. La composición de referencia incluye cinco metas y dos metas ocupadas (primera y cuarta), una rana saltando sobre un tronco y tráfico visible. Esos valores son del fixture gráfico, no deben forzarse durante una partida normal.
4. Confirmar qué área ocupan el HUD y los controles táctiles. Ningún control debe ocultar filas críticas del río o de la carretera.

**Criterios de aceptación**
- Se puede ver la rejilla completa en móvil, sin recortes accidentales ni cambios en la lógica de colisión.
- Las capturas iniciales de ambos backends quedan guardadas o documentadas para comparar el resultado.
- La escena de prueba se puede repetir con la misma semilla/fixture.

### Fase 1 — Sistema de arte compartido y paridad de renderizadores
**Prioridad: P0 · Depende de la fase 0**

1. Centralizar la paleta y las constantes visuales en un módulo de presentación de Frogger, sin introducir dependencias de arte nuevas.
2. Acordar helpers pequeños para sombras, rectángulos redondeados y capas visuales; mantener las diferencias de API entre Canvas y Skia detrás de sus drawers.
3. Corregir el registro de cocodrilo en Canvas para que use su propio drawer y ampliar `FroggerPresentation.test.ts` para verificar explícitamente todas las formas, incluido `crocodile`.
4. Evitar la duplicación de reglas de color: ambos backends deben utilizar los mismos tokens y representar el mismo estado ECS.

**Criterios de aceptación**
- Los registros Canvas/Skia cubren rana, coche, camión, tronco, tortuga, cocodrilo, nenúfar y fondo.
- Tests de presentación verdes; ninguna modificación en simulación ni en orden de actualización de sistemas.
- El uso del color no depende de que un tema global introduzca valores de neón.

### Fase 2 — Escenario, agua, carretera y profundidad
**Prioridad: P1 · Depende de la fase 1**

1. Redibujar el fondo en capas: zona de metas superior, río, mediana segura, cinco carriles de carretera y banco de salida. Respetar las filas lógicas actuales (río 1–5, mediana 6, carretera 7–11 y salida 12–14).
2. Sustituir las superficies planas por agua con degradado, ondas/rizos de baja intensidad y textura de grano muy sutil.
3. Dar al asfalto una base azul tinta, separadores de carril claros y discretos, y a los márgenes un tono dorado de atardecer.
4. Añadir sombras suaves bajo entidades y elementos de profundidad donde ayuden a distinguir qué objetos flotan sobre el agua.
5. Asegurar que el degradado y las decoraciones tienen equivalentes visuales aceptables en Canvas y Skia. Si alguna API no ofrece la misma primitiva, construir un resultado equivalente, no eliminar el efecto en uno de los backends.

**Criterios de aceptación**
- El jugador diferencia de un vistazo agua, carriles, zonas seguras y metas.
- La textura no dificulta el seguimiento de vehículos ni la lectura de colisiones.
- La versión Skia no se queda como una colección de bloques planos frente al fondo Canvas.

### Fase 3 — Vehículos compactos con dirección y luces
**Prioridad: P1 · Depende de las fases 1 y 2**

1. Rediseñar los coches como siluetas bajas y aerodinámicas; distinguir las variantes por paleta y detalles de carrocería, no por glow.
2. Redibujar los camiones por separado, con cabina, caja y cristales legibles desde arriba.
3. Usar la dirección real del vehículo para orientar faros y pilotos traseros: los haces de luz deben extenderse hacia delante, en la dirección de circulación.
4. Mantener los faros cálidos y los haces suaves, limitando los elementos coral a las luces traseras.
5. Revisar tamaños y separación visual a escala de móvil. El dibujo no debe parecer una colisión más grande que el collider real.

**Criterios de aceptación**
- Coches y camiones se reconocen como tipos diferentes sin leer el color.
- Los faros apuntan correctamente en ambos sentidos de circulación.
- Se conserva el movimiento y el collider existentes; el arte no añade colisiones.

### Fase 4 — Rana, troncos, tortugas, cocodrilo y metas
**Prioridad: P1 · Depende de la fase 1; se integra sobre la fase 2**

1. **Rana:** pasar de círculo con ojos a una silueta reconocible de rana, con cuerpo lima, ojos marfil y pupilas tinta. Representar la orientación con `FroggerComponent.facing`. Dar sensación de salto con una pose/animación de presentación que no modifique posiciones ni tiempos de simulación.
2. **Troncos:** madera cálida, extremos con anillos, vetas cortas y sutiles; variar el detalle sin llenar la superficie.
3. **Tortugas:** caparazón segmentado, patas/cabeza legibles y estados de inmersión. El componente `Log` ya contempla `divePhase`; aprovechar sus estados `float`, `warning` y `submerged`. Reservar coral para la advertencia y oscurecer la tortuga al sumergirse.
4. **Cocodrilo:** sustituir el bloque redondeado por una silueta alargada, banda dorsal, ojos visibles y boca animable. Leer el estado `mouthOpen` existente para que la señal visual corresponda al peligro jugable.
5. **Metas/nenúfares:** redibujar los cinco huecos con bordes vegetales claros, variación suave de tonos y estados ocupados/libres inequívocos. Si existe cocodrilo en una meta o mosca de bonus, dar prioridad visual al peligro/objeto interactivo sin ocultar la meta.

**Criterios de aceptación**
- Cada tipo de entidad se distingue por silueta incluso con el color desaturado.
- El estado visual de tortuga y cocodrilo sigue el estado ECS real.
- Los estados ocupados de las metas se leen sin utilizar un brillo neón.

### Fase 5 — HUD y composición de la pantalla
**Prioridad: P1 · Depende de la fase 0 y de la paleta de la fase 1**

Ruta principal: `src/app/frogger/index.tsx`.

1. Cambiar el HUD actual —fila con SCORE/LIVES/LEVEL/PADS, fondo negro semitransparente y borde verde neón— por un panel compacto en `#1B1B2E` integrado con el atardecer.
2. Mostrar puntuación con agrupación de seis dígitos (referencia: `004 250`), etiqueta de nivel en español (referencia: `NIVEL 3 · ATARDECER`), vidas como siluetas de rana activas/atenuadas y una barra de tiempo.
3. Calcular el progreso de la barra a partir de `timeRemaining` y del límite de tiempo vigente; el 68 % es el valor de la imagen de referencia, no un valor fijo.
4. Mantener datos dinámicos: puntuación, nivel, vidas, metas ocupadas y tiempo deben proceder del estado del juego.
5. Ajustar safe areas, posición y controles táctiles para que el HUD no se solape con el campo y no tape la acción.

**Criterios de aceptación**
- El HUD cabe en el ancho móvil sin truncar textos ni solapar elementos.
- Cada indicador refleja el estado real y se actualiza durante la partida.
- Se mantiene accesibilidad suficiente: texto legible, contraste y estados que no dependan solo del color.

### Fase 6 — Movimiento y pulido ambiental
**Prioridad: P2 · Depende de las fases 2–5**

1. Animar de forma sutil ondas del agua y detalles ambientales, con parámetros derivados de tiempo/ticks existentes y sin aleatoriedad global.
2. Añadir variación controlada a luces y sombras sin flashes rápidos ni partículas abundantes.
3. Pulir poses de salto/aterrizaje, transiciones de tortuga y señalización de boca del cocodrilo.
4. Limitar efectos caros por fotograma; evitar crear arrays, paints o gradientes innecesariamente en cada llamada de dibujo cuando puedan reutilizarse de forma segura.

**Criterios de aceptación**
- Animación estable y legible en móvil; el jugador puede seguir objetos en movimiento.
- No aparecen cambios de comportamiento por el simple hecho de activar efectos visuales.
- Canvas y Skia mantienen una dirección artística coherente.

### Fase 7 — QA visual, regresión y cierre
**Prioridad: P0 para cada entrega; cierre de todas las fases**

1. Extender las pruebas de presentación para registrar todas las formas y efectos en los dos backends.
2. Mantener las pruebas de ciclo de vida y características actuales como red de seguridad de gameplay.
3. Comparar capturas de la escena de referencia en Canvas y Skia, tanto en móvil vertical como en una vista más amplia.
4. Ejecutar typecheck/lint y la suite focalizada de Frogger; abrir la pantalla, empezar partida, mover la rana, montar troncos, pasar por una tortuga en advertencia/sumergida, entrar en una meta, perder una vida y reiniciar.
5. Registrar cualquier diferencia visual pendiente; no dar por terminada una fase por compilar si los elementos se recortan, desaparecen o contradicen su estado.

**Definition of Done**
- Estética de atardecer aplicada con la paleta acordada.
- Fondo, rana, vehículos, troncos, tortugas, cocodrilo, nenúfares y HUD terminados.
- Paridad funcional/visual aceptable entre Canvas y Skia.
- Sin errores al abrir el juego ni al realizar las interacciones principales.
- Pruebas existentes de simulación siguen pasando y el comportamiento jugable no cambia accidentalmente.

## Orden recomendado de PRs

1. **PR 1 — Contrato visual + tokens + corrección del registro del cocodrilo** (fases 0–1).
2. **PR 2 — Fondo de atardecer y encuadre móvil** (fase 2).
3. **PR 3 — Coches/camiones y luces direccionales** (fase 3).
4. **PR 4 — Rana, río, tortugas, cocodrilo y metas** (fase 4).
5. **PR 5 — HUD adaptable y controles sin obstrucción** (fase 5).
6. **PR 6 — Animación ambiental, optimización y QA visual final** (fases 6–7).

Cada PR debe ser revisable de forma aislada, mantener TypeScript estricto, evitar `any` nuevo y no incorporar librerías de renderizado ni paquetes de assets hasta demostrar que las primitivas existentes no son suficientes.
