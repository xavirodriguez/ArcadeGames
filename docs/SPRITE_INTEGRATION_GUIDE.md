# Guía de integración de sprites en ArcadeGames

Esta guía describe cómo incorporar personajes, enemigos y props visuales en ArcadeGames sin crear otro pipeline de assets ni acoplar la lógica de animación a un renderer.

## 1. Arquitectura que debes reutilizar

La integración de sprites de este proyecto vive en `src/games/shared/sprites/`:

| Archivo | Responsabilidad |
| --- | --- |
| `SpriteTypes.ts` | Contratos de frames, animaciones, sheets y estado del animator. |
| `SpriteRegistry.ts` | Registro central de IDs, recursos de imagen y definiciones de animación. |
| `SpriteAnimator.ts` | Crea y actualiza el estado de una animación: clip, frame, temporizador, escala y orientación. |
| `SpriteDrawer.ts` | Carga y dibuja el mismo estado con Canvas o Skia. Mantiene cachés por renderer. |
| `index.ts` | Punto de entrada público para importar el sistema. |

El flujo de datos es:

1. **Asset PNG**: el archivo vive en `assets/sprites/<categoría>/`.
2. **Definición**: un `SpriteSheetDef` identifica el PNG y describe el recorte de cada animación.
3. **Registro**: `SpriteRegistry.init()` registra la definición al iniciar el juego.
4. **Estado**: `createSpriteAnimator()` crea el estado de animación. Para personajes animados, cada entidad necesita su propio estado.
5. **Sistema de juego**: convierte movimiento, combate y estado del personaje en nombres de animación.
6. **Render**: el drawer del juego prueba SpriteDrawer; el dibujo previo sigue disponible como fallback.

Esta guía cubre el sistema de aplicación `src/games/shared/sprites` y su contrato `SpriteAnimatorComponent`. No mezcles sus campos con el `SpriteComponent` genérico que existe en los paquetes de renderer/Core: son contratos distintos.

### Principios que no deben romperse

- Mantén una única definición compartida del asset y sus frames; no crees registros paralelos por renderer.
- El gameplay determina el estado; Canvas y Skia solo lo representan.
- Conserva el dibujo procedural/ShapeDrawer mientras validas el sprite y úsalo si la imagen aún no está disponible.
- Usa rutas estáticas de `require(...)` para PNG empaquetados: Metro necesita detectar los assets durante el bundle.
- Mantén tipos estrictos. No añadas `any` para resolver contratos del registro.
- No modifiques ni elimines arte ajeno al sprite que estés integrando.

## 2. Elige el tipo de recurso

Hay dos casos principales.

| Tipo | Uso | Definición |
| --- | --- | --- |
| Spritesheet animado | Jugador, enemigo, NPC con poses o movimiento | Recorta los frames con `animations` y `SpriteFrameRect`. |
| PNG estático | Torre, decoración, icono del mundo, objeto sin animación | Usa `sourceMode: "full-image"`; no inventes filas ni celdas. |

El modo estático `sourceMode: "full-image"`, el anclaje configurable y la precarga Skia forman parte de los cambios incorporados en esta misma línea de trabajo. Si tu rama todavía no incluye esas capacidades, integra primero los cambios correspondientes del sistema compartido.

## 3. Inspecciona el PNG antes de tocar el registro

No decidas las coordenadas mirando solo el nombre del archivo. Abre el PNG en un visor de imágenes o editor gráfico con transparencia y registra:

- **Dimensiones** en píxeles, por ejemplo `924 × 539`.
- **Fondo transparente**: comprueba el canal alfa y si el fondo es realmente transparente o solo parece transparente.
- **Estructura**: filas de animación, columnas, orden de lectura y posibles márgenes.
- **Tamaño de celda**: ancho y alto de cada frame.
- **Paso horizontal**: distancia entre el inicio de un frame y el inicio del siguiente.
- **Padding**: píxeles vacíos dentro de la celda, sombras, armas o efectos que sobresalen.
- **Pivote visual**: pies, centro geométrico o base del objeto.

En macOS puedes consultar las dimensiones con:

```bash
sips -g pixelWidth -g pixelHeight assets/sprites/enemies/my_enemy.png
```

Si tienes ImageMagick instalado, también puedes consultar dimensiones y canales:

```bash
identify -format '%wx%h %[channels]\\n' assets/sprites/enemies/my_enemy.png
```

No asumas que una imagen es un grid regular. Si cada frame tiene un tamaño diferente, mide rectángulos individuales. Si el PNG representa una única torre o un objeto completo, trátalo como imagen estática.

### Cómo leer un rectángulo

`SpriteFrameRect` usa coordenadas de origen arriba a la izquierda:

```ts
interface SpriteFrameRect {
  x: number;
  y: number;
  w: number;
  h: number;
}
```

El rectángulo debe permanecer dentro de los límites de la imagen:

```text
x >= 0
y >= 0
x + w <= imageWidth
y + h <= imageHeight
```

Un frame cortado puede perder armas, cuernos o efectos. Un frame demasiado grande puede incluir parte del frame vecino. Ajusta las medidas tras revisar el sprite dibujado, no solo sobre la cuadrícula.

## 4. Añade el PNG al repositorio

Usa una categoría descriptiva y un nombre estable:

```text
assets/sprites/
├── enemies/
│   ├── oni_red.png
│   └── slime_green.png
├── players/
└── towers/
    ├── tower1.png
    └── tower2.png
```

Es un ejemplo de organización, no una orden para mover assets existentes. Si el PNG ya está en el proyecto, conserva su ubicación salvo que exista una razón clara para cambiarla.

Las referencias Metro deben ser estáticas y relativas al archivo que contiene el `require`. Por ejemplo, desde `src/games/shared/sprites/SpriteRegistry.ts`:

```ts
imageSource: require("../../../../assets/sprites/enemies/slime_green.png")
```

No uses rutas absolutas de tu disco ni construyas la ruta con variables, porque Metro puede no reconocer esos recursos durante el bundle.

## 5. Registra un spritesheet animado

Los contratos se encuentran en `SpriteTypes.ts`. Una definición contiene un ID estable, la imagen, el tamaño lógico de los frames y el mapa de animaciones.

### Hoja regular

El registro actual tiene un helper interno con esta firma:

```ts
makeRowFrames(startX, startY, frameW, frameH, count, spacing)
```

Aunque el último parámetro se llame `spacing`, la implementación lo usa como **paso entre inicios de frames**: `x = startX + index * spacing`. No es solo el hueco transparente entre dos celdas. Si una celda mide 48 píxeles y no hay separación, el paso suele ser 48; con 2 píxeles de separación, suele ser 50.

Añade la definición en `SpriteRegistry.ts`, donde el helper ya está disponible:

```ts
const SLIME_GREEN: SpriteSheetDef = {
  id: "slime_green",
  imageSource: require("../../../../assets/sprites/enemies/slime_green.png"),
  frameWidth: 48,
  frameHeight: 48,
  animations: {
    idle: {
      name: "idle",
      frames: makeRowFrames(0, 0, 48, 48, 4, 48),
      frameDuration: 0.12,
      loop: true,
    },
    walk: {
      name: "walk",
      frames: makeRowFrames(0, 48, 48, 48, 6, 48),
      frameDuration: 0.1,
      loop: true,
    },
    attack: {
      name: "attack",
      frames: makeRowFrames(0, 96, 48, 48, 4, 48),
      frameDuration: 0.08,
      loop: false,
    },
  },
};
```

Las coordenadas del ejemplo son ilustrativas: ajústalas al PNG real. El helper es privado en el registro actual. Si separas la definición en otro archivo, usa rectángulos explícitos o extrae un helper compartido con una API deliberada; no copies un segundo sistema de sprites.

Después registra la hoja dentro de `SpriteRegistry.init()`:

```ts
init() {
  this.register(ONI_RED);
  this.register(SLIME_GREEN);
  // Conserva aquí los registros existentes.
}
```

No reemplaces el contenido actual de `init()`: añade el nuevo registro junto a los demás. Los IDs deben ser únicos, estables y descriptivos; no tienen por qué coincidir con el nombre físico del PNG.

### Clips y tiempos

- `idle`, `walk` y `run`: normalmente `loop: true`.
- `attack`, `hurt` y `death`: normalmente `loop: false`.
- `frameDuration` está expresado en **segundos por frame**. Por ejemplo, `0.1` equivale a 10 frames por segundo.
- No cuentes una fila como una animación hasta revisar que todos sus frames pertenecen a la misma acción.
- Si los frames son irregulares, escribe el array de `{ x, y, w, h }` manualmente. No fuerces una cuadrícula que no existe.

### Referencia existente: `oni_red`

El registro actual de `oni_red` contiene estas medidas configuradas para una hoja original de 924 × 539 píxeles. Sirven como referencia del código existente, pero hay que comprobar visualmente el resultado cuando se cambie el PNG o se corrijan los recortes.

| Clip | Inicio X | Inicio Y | W × H | Frames | Paso |
| --- | ---: | ---: | ---: | ---: | ---: |
| `idle` | 128 | 19 | 54 × 82 | 8 | 96 |
| `walk` | 128 | 124 | 54 × 86 | 8 | 96 |
| `attack` | 128 | 236 | 54 × 91 | 8 | 96 |
| `hurt` | 128 | 352 | 54 × 83 | 6 | 96 |
| `death` | 128 | 467 | 54 × 63 | 8 | 96 |

La diferencia entre el ancho de recorte (54) y el paso (96) es intencionada solo si la imagen realmente distribuye así las celdas. No copies ese paso a otro sheet sin medirlo.

## 6. Registra un PNG estático

Para una ilustración completa, utiliza el modo `full-image`. El drawer lee las dimensiones originales al cargar, mantiene la proporción y ajusta la imagen al cuadro lógico indicado por `frameWidth` y `frameHeight`. En este modo no se necesitan rectángulos de frames.

Ejemplo basado en el patrón empleado para las torres:

```ts
const TOWER_BASIC_ART: SpriteSheetDef = {
  id: "tower_basic_art",
  imageSource: require("../../../../assets/sprites/towers/tower1.png"),
  frameWidth: 34,
  frameHeight: 34,
  sourceMode: "full-image",
  anchor: { x: 0.5, y: 0.5 },
  animations: {
    idle: {
      name: "idle",
      frames: [],
      frameDuration: 1,
      loop: true,
    },
  },
};
```

La caja lógica de 34 × 34 no afirma que el PNG original mida 34 × 34 píxeles; es el tamaño visual de referencia. Ajusta ese tamaño a la escala del juego y define un anclaje centrado para props situados en el centro de una celda.

El patrón de torres desarrollado en esta línea de trabajo asigna `tower1.png` a `tower_basic_art` y `tower2.png` a `tower_sniper_art`. El cuerpo de la torre se dibuja con el sprite; el arma sigue siendo procedural. El tema Paper Dusk conserva su dibujo previo para no mezclar estilos visuales.

## 7. Inicializa el registro durante el arranque

Llama a `SpriteRegistry.init()` al inicializar el juego, antes de que su drawer intente buscar los IDs:

```ts
import { SpriteRegistry } from "../shared/sprites";

protected override async onRegisterSystems(): Promise<void> {
  SpriteRegistry.init();
  // Conserva la configuración y el registro de sistemas del juego.
}
```

Ajusta el path del import según el directorio del juego. Echo Runner realiza la inicialización después de `await super.onRegisterSystems()`; Tower Defense la realiza al inicio de su método. No llames a `init()` cada frame ni desde el drawer. El mapa de registro sobrescribe por ID, pero el arranque del juego es el lugar correcto para organizarlo.

## 8. Usa y actualiza el animator

Para una entidad animada, crea un estado independiente:

```ts
import {
  createSpriteAnimator,
  playAnimation,
  updateSpriteAnimator,
} from "../../shared/sprites";

const animator = createSpriteAnimator("slime_green", "idle");
world.addComponent(entity, {
  type: "SpriteAnimator",
  ...animator,
});
```

Si el juego ya crea entidades con un blueprint, añade el componente allí o sigue el patrón de su sistema de sprites. La forma exacta de registrar componentes depende del tipo ECS del juego; `EchoRunnerSpriteSystem.ts` es el ejemplo concreto del repositorio para este puente.

En el sistema de actualización:

1. Lee velocidad, estado de suelo, acciones de combate u otros datos de gameplay.
2. Elige el clip objetivo, por ejemplo `idle`, `walk` o `attack`.
3. Llama a `playAnimation(animator, targetAnim)` cuando cambie el estado.
4. Llama a `updateSpriteAnimator(animator, deltaTime)` para avanzar el clip.
5. Escribe el estado actualizado en el componente siguiendo el patrón de mutación del juego.

`playAnimation` reinicia el clip al cambiar de nombre, o si se llama con `forceRestart: true`. No fuerces el reinicio en cada tick: una animación que siempre vuelve al frame 0 parecerá congelada. Para reiniciar un ataque, utiliza el evento de entrada al ataque, no el estado sostenido durante todos los frames. `updateSpriteAnimator` devuelve `true` cuando un clip no cíclico termina; úsalo cuando tengas que volver a idle o gestionar el fin de una muerte.

Los animators de personajes son estado de runtime por entidad. No compartas uno global entre enemigos que necesitan frames, temporizadores, dirección o animaciones diferentes. Un estado compartido puede servir para un dibujo estático sin animación, como las torres; aun así, actualiza su escala inmediatamente antes de dibujarlo si el tamaño depende de la entidad.

## 9. Integra el dibujo con Canvas y Skia

En el drawer Canvas, intenta dibujar el sprite y conserva la representación anterior cuando no pueda hacerlo:

```ts
const spriteDrawn = drawSpriteCanvas(ctx, animator, 0, 0);

if (!spriteDrawn) {
  drawPreviousProceduralShape(ctx, world, entity);
}
```

En el drawer Skia, utiliza el mismo ID y el mismo estado de animación:

```ts
const spriteDrawn = drawSpriteSkia(canvas, animator, 0, 0);

if (!spriteDrawn) {
  drawPreviousSkiaShape(canvas, world, entity);
}
```

Los nombres `drawPreviousProceduralShape` y `drawPreviousSkiaShape` son marcadores explicativos; sustitúyelos por los drawers existentes. En un `ShapeDrawer` que ya transforma el canvas al origen de la entidad, `0, 0` significa dibujar en ese origen. Si tu drawer recibe coordenadas de mundo, pasa las coordenadas que correspondan al contrato de ese drawer.

Ambas funciones devuelven un booleano: `true` cuando dibujaron el frame y `false` si falta el sheet, la imagen aún está cargando o no existe un frame válido. Este retorno es el que permite conservar el fallback.

### Carga de imágenes

- `drawSpriteCanvas` inicia una carga Canvas si la imagen todavía no está en caché.
- `drawSpriteSkia` inicia la decodificación Skia si la imagen todavía no está en caché.
- Los recursos se almacenan en cachés separadas para imágenes específicas de cada renderer; la definición y el estado de animación son compartidos.
- `preloadSpriteSheetCanvas(sheetId)` y `preloadSpriteSheetSkia(sheetId)` están disponibles si el juego necesita precargar antes de mostrar la entidad.
- `setSkiaImage` permite colocar en la caché una imagen Skia ya decodificada por un loader específico.

La primera renderización puede mostrar el fallback mientras se carga el PNG. Si el asset falla, revisa el path, el bundle Metro y los logs; corrige el recurso y recarga la aplicación antes de evaluar otra vez.

## 10. Escala y origen visual

El origen del dibujo no es necesariamente el centro del PNG. El anclaje se expresa con valores normalizados entre 0 y 1:

| Anclaje | Valor | Ejemplo |
| --- | --- | --- |
| Centro | `{ x: 0.5, y: 0.5 }` | Torre situada en el centro de una celda. |
| Pies abajo-centro | `{ x: 0.5, y: 1 }` | Personaje cuyo origen de gameplay está en los pies. |

El anclaje inferior-centro es el fallback del sistema compartido. Usa `anchor` en la definición del sheet cuando el asset tenga otro pivote; no introduzcas offsets globales para compensar una sola imagen.

Para sheets animados, el drawer dibuja cada rectángulo con su tamaño multiplicado por `animator.scale`. Para imágenes `full-image`, calcula una escala de ajuste que conserva la relación de aspecto dentro de la caja lógica y después aplica `animator.scale`. Si la entidad ofrece un tamaño dinámico, establece la escala correspondiente antes del dibujo; no supongas que el tamaño lógico del registro coincide con los píxeles del PNG.

Si las animaciones parecen saltar, compara los pies/pivotes de sus frames. Si cambia la posición aparente del personaje, quizá las celdas necesitan el mismo tamaño lógico o un recorte/offset consistente.

## 11. Pruebas y validación visual

Valida primero en web, donde Canvas permite iterar rápido, y luego comprueba Skia en el entorno nativo cuando el cambio vaya a usarse allí.

### Comandos recomendados

Prueba del registro de sprites compartido:

```bash
pnpm exec jest --config src/games/shared/jest.config.cjs --runInBand --runTestsByPath src/games/shared/sprites/__tests__/SpriteRegistry.test.ts
```

Typecheck de la aplicación:

```bash
pnpm run typecheck:app
```

Arranque de web tras compilar paquetes del monorepo:

```bash
pnpm exec turbo run build
pnpm exec expo start --web
```

Para una PR, ejecuta también las validaciones de build, lint, typecheck y tests indicadas en `.github/workflows/ci.yml`. Si el sprite pertenece a un juego que tiene Jest config propio, añade o ejecuta pruebas relevantes de ese juego.

### Checklist funcional

- [ ] El juego arranca sin errores ni excepciones en consola.
- [ ] El PNG se carga; los logs no muestran errores de URI o decodificación.
- [ ] La silueta no aparece cortada y la transparencia es correcta.
- [ ] El sprite se alinea con la colisión y el origen de gameplay.
- [ ] Idle y locomoción se repiten; ataque y muerte terminan cuando corresponde.
- [ ] Cambiar de animación no reinicia el clip en todos los ticks.
- [ ] La orientación izquierda/derecha es correcta.
- [ ] No hay regresiones al iniciar el juego o interactuar por primera vez.
- [ ] El fallback procedural sigue funcionando si el sprite no está disponible.
- [ ] Canvas y Skia muestran el mismo recorte, escala y anclaje.
- [ ] Temas alternativos, como Paper Dusk en Tower Defense, conservan el estilo esperado.
- [ ] La prueba de registro, el typecheck y las pruebas pertinentes pasan.

Una prueba unitaria que confirma el registro no demuestra que el arte se vea bien. La revisión visual en el juego sigue siendo obligatoria para validar recortes, escala, composición y pivote.

## 12. Diagnóstico rápido

| Síntoma | Qué revisar |
| --- | --- |
| Solo aparece el dibujo procedural | Confirma que `SpriteRegistry.init()` se ejecutó, que el ID coincide exactamente y que el PNG existe en la ruta del `require`. |
| El sprite no carga en web | Inspecciona la URL resuelta, el error de red, el path relativo y que `Image` haya podido decodificar el PNG. |
| Canvas funciona, Skia no | Comprueba `localUri/uri`, la decodificación de `Skia.Data.fromURI` y `Skia.Image.MakeImageFromEncoded`. |
| Skia funciona, Canvas no | Revisa la fuente de imagen, la carga de `Image` y los errores de Canvas. |
| Frame cortado o incluye al vecino | Mide otra vez `x`, `y`, `w`, `h` y el paso horizontal. |
| Personaje flota o queda hundido | Ajusta el pivote con `anchor` y revisa la caja de recorte; no cambies la colisión para compensar un error visual sin comprobarlo. |
| Animación congelada en el primer frame | Comprueba que `updateSpriteAnimator` se llama cada tick y que no ejecutas `playAnimation(..., true)` continuamente. |
| Ataque se queda en su último frame | Usa el retorno de `updateSpriteAnimator` cuando termine el clip y decide explícitamente la animación siguiente. |
| Tamaños distintos entre entidades | Asegúrate de que la escala se establece antes del dibujo y no dejes que un animator global represente a varios personajes animados. |
| Se ve bien en un tema pero no en otro | Verifica la condición del tema, el fallback y que el nuevo arte no sustituya accidentalmente un estilo alternativo. |

## 13. Referencias concretas dentro del repositorio

Lee estos archivos antes de crear lógica nueva:

- `src/games/shared/sprites/SpriteTypes.ts`: contratos actuales.
- `src/games/shared/sprites/SpriteRegistry.ts`: registro y medidas actuales de `oni_red` y los sprites estáticos de torre.
- `src/games/shared/sprites/SpriteAnimator.ts`: semántica de reproducción y avance de clips.
- `src/games/shared/sprites/SpriteDrawer.ts`: cachés, carga de imágenes y dibujo dual.
- `src/games/echorunner/systems/EchoRunnerSpriteSystem.ts`: ejemplo de adaptación del movimiento del jugador a clips.
- `src/games/echorunner/EchoRunnerGame.ts`: inicialización del registro e integración del sistema en un juego.
- `src/games/tower-defense/rendering/TowerDefenseCanvasVisuals.ts` y `TowerDefenseSkiaVisuals.ts`: integración incremental del arte de torre con fallback procedural.
- `src/games/hitandrun/rendering/SamuraiVisualAssets.ts`: ejemplo de asset de spritesheet gestionado con Expo Asset en un camino específico de ese juego.

## Receta final para cada nuevo sprite

1. Inspecciona el PNG y anota dimensiones, alfa, filas, celdas, paso y pivote.
2. Colócalo en `assets/sprites/<categoría>/` o reutiliza la ubicación existente.
3. Decide si es un sheet animado o una imagen completa.
4. Añade un ID y una definición a `SpriteRegistry.ts`, con rectángulos medidos o `sourceMode: "full-image"`.
5. Regístralo en `SpriteRegistry.init()`.
6. Inicializa el registro al arrancar el juego.
7. Si está animado, crea un animator por entidad y conecta estados de gameplay con clips.
8. Integra Canvas y Skia sin borrar el ShapeDrawer anterior.
9. Ejecuta pruebas y typecheck.
10. Abre el juego en web y revisa la escala, los recortes, el pivote, las animaciones y la primera interacción; después comprueba Skia.

El objetivo es que el siguiente sprite requiera una definición y una integración pequeñas, no un nuevo sistema de assets ni una reescritura del renderer.
