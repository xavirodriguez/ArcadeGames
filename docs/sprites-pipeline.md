# [sprites-v2] Pipeline de sprites: decisión de diseño de la Fase 4.1

> **Estado:** Decisión cerrada para iniciar la Fase 4.2.
> **Alcance:** formatos de entrada, normalización, contrato de salida, registro runtime y CI.
> **No incluido:** implementación del build CLI, migraciones de catálogo y cambios de playback en core.

## 1. Objetivo y límites arquitectónicos

El pipeline convierte fuentes artísticas en artefactos de sprites reproducibles y compatibles con el contrato canónico de core:

- PNG listo para cargar mediante el sistema de assets de la plataforma.
- Definición tipada que implementa SpriteSheetDefinition de @tiny-aster/core.
- Índice generado para registrar las definiciones sin mantener una segunda lista manual.

El pipeline es tooling de build. El runtime no importa parsers, dependencias de Aseprite ni código de empaquetado.

La dependencia permitida es unidireccional:

~~~text
Fuentes artísticas
      |
      v
scripts/sprites (parse -> normalize -> validate -> generate)
      |
      +----> PNG de runtime
      |
      +----> SpriteSheetDefinition .generated.ts
                    |
                    v
            índice generado
                    |
                    v
              SpriteRegistry
                    |
               SpriteAnimator
                    |
             +------+------+
             |             |
           Canvas         Skia
~~~

El pipeline puede importar tipos de core en tiempo de build. Core y los juegos no pueden importar código de scripts/sprites.

## 2. Formatos de entrada seleccionados

### 2.1 Aseprite JSON + PNG (prioridad 1)

Formato principal para personajes y sheets animados.

Cada fuente vive en:

~~~text
assets/sprites/sources/<category>/<sheetId>/
  sheet.json
  sheet.png
  config.json
  events.json        # opcional
~~~

Se aceptan los dos modos JSON nativos de Aseprite:

- Array: frames como lista ordenada.
- Hash: frames como objeto; el parser ordena las claves de forma natural y determinista (frame_2 antes de frame_10).

El PNG exportado por Aseprite es la imagen de entrada del runtime. En esta fase no se vuelve a empaquetar ni se reescala: se copia byte a byte al destino generado. Así evitamos introducir otro algoritmo de atlas cuando la fuente ya entrega rectángulos y una imagen coherentes.

Metadatos consumidos:

- meta.size: dimensiones del PNG; obligatorio.
- frames[].frame: rectángulo de origen.
- frames[].duration: duración en milisegundos.
- frames[].rotated y frames[].trimmed: deben ser false o estar ausentes.
- meta.frameTags: clips nombrados con rangos inclusivos y dirección.

Direcciones admitidas:

| Aseprite direction | Secuencia normalizada |
|---|---|
| forward | Orden original |
| reverse | Orden inverso |
| pingpong | Ida y vuelta sin duplicar los extremos |

Cualquier dirección desconocida falla. La dirección determina el orden de reproducción, no la política loop.

El campo repeat no se acepta por ahora: el runtime solo representa loop infinito o reproducción one-shot, no un número finito de repeticiones.

### 2.2 PNG estático + config JSON (prioridad 2)

Formato secundario para props, torres y elementos full-image que no necesitan clips ni extracción de frames:

~~~text
assets/sprites/sources/<category>/<sheetId>/
  image.png
  config.json
~~~

La configuración declara id, frameWidth, frameHeight, anchor y el modo full-image. El PNG se copia a la carpeta generada sin recomprimirlo.

### 2.3 Formatos aplazados

No se implementan en esta versión:

- Carpetas de frames sueltos y packing binario.
- TexturePacker / Free Texture Packer JSON.
- Repacking, trimming, rotación o padding automático.

Se podrán incorporar más adelante mediante adaptadores de entrada. No deben modificar el contrato de salida ni el runtime.

## 3. Configuración y reglas de normalización

Ejemplo de config.json para un personaje:

~~~json
{
  "id": "oni_red",
  "frameWidth": 56,
  "frameHeight": 90,
  "anchor": { "x": 0.5, "y": 1 },
  "animations": {
    "idle": { "loop": true },
    "walk": { "loop": true },
    "attack": { "loop": false },
    "hurt": { "loop": false },
    "death": { "loop": false }
  }
}
~~~

Reglas:

1. id, frameWidth y frameHeight son obligatorios. Las dimensiones lógicas no se deducen del primer frame porque distintos clips pueden tener rectángulos diferentes.
2. anchor es normalizado a [0, 1]. Si se omite, se usa { x: 0.5, y: 1 } (bottom-center).
3. El anchor es una propiedad del sheet, ya que el contrato actual no soporta pivots diferentes por frame o clip. Los pivots/slices de Aseprite no se convierten implícitamente en eventos ni anchors. Un anchor artístico se confirma en config.json.
4. Las claves de animación se normalizan a minúsculas y snake_case. Los nombres normalizados deben ser únicos.
5. animations.<name>.loop prevalece sobre defaultLoop; si no existe override, se conserva la convención actual: attack, hit, hurt, death, die, shoot, jump_end y land son one-shot; los demás clips hacen loop.
6. Los rangos de tags son inclusivos y deben estar dentro del índice de frames. No se recortan ni clipean rangos inválidos.
7. Cada clip debe tener una duración uniforme por frame. La duración se convierte de milisegundos a segundos (ms / 1000). Si los frames de un mismo clip tienen duraciones distintas, el build falla: no se promedian ni se descarta timing. El contrato actual de core contiene un único frameDuration; soportar timings variables exigiría ampliar y probar SpriteAnimator antes de cambiar esta regla.
8. Frames rotados o recortados (rotated / trimmed) se rechazan. SpriteFrameRect no expresa rotación, source-size ni trim offsets. No se aceptan exports que cambien el origen lógico del sprite.
9. Los rectángulos deben ser enteros, positivos y estar dentro de meta.size.

## 4. Eventos por frame

Los eventos de animación son metadatos semánticos del juego, no una interpretación automática de slices geométricas.

La fuente autorizada será un overlay opcional events.json:

~~~json
{
  "animations": {
    "attack": [
      {
        "frame": 3,
        "type": "hit",
        "payload": { "damageWindow": true }
      },
      {
        "frame": 4,
        "type": "sfx",
        "payload": { "cue": "sword_slash" }
      }
    ]
  }
}
~~~

- frame es un índice base cero relativo a la secuencia final de playback, después de aplicar direction.
- type debe ser un string no vacío.
- payload es opcional y debe ser un objeto JSON.
- El clip debe existir y el índice debe estar dentro de frames.
- Los eventos se copian a SpriteAnimationDefinition.events.
- No se derivan eventos de slices, bounds, pivots ni nombres de regiones.
- El parser no ejecuta gameplay ni conoce SFX/VFX concretos.

El soporte de User Data embebido en Aseprite queda aplazado hasta disponer de una convención de export estable y fixtures reales. El overlay evita acoplar semántica de gameplay al documento artístico.

## 5. Contrato de salida

### 5.1 Artefactos generados

Para cada sheet:

~~~text
assets/sprites/generated/<category>/<sheetId>.atlas.png
src/games/shared/sprites/generated/<sheetId>.generated.ts
~~~

Además se genera un índice único:

~~~text
src/games/shared/sprites/generated/index.generated.ts
~~~

El índice exporta las definiciones y GENERATED_SPRITE_SHEETS. SpriteRegistry combinará esa colección con los sheets manuales que aún no se hayan migrado. Añadir una fuente válida no requiere editar el catálogo TypeScript a mano.

### 5.2 Mapeo al contrato canónico

La definición emitida implementa directamente SpriteSheetDefinition de @tiny-aster/core:

| Campo de salida | Fuente |
|---|---|
| id | config.json.id |
| assetPath | Ruta repository-relative del PNG generado |
| imageSource | require() estático generado, compatible con Metro |
| frameWidth, frameHeight | Configuración explícita |
| sourceMode | frames para Aseprite; full-image para PNG estático |
| anchor | Configuración o bottom-center por defecto |
| animations | Tags normalizados y eventos overlay |
| frameDuration | Duración uniforme del clip, en segundos |
| loop | Override de config o convención por nombre |
| events | Overlay validado, cuando exista |

imageSource nunca se deja en null en un artefacto generado obligatorio. El parser produce una representación intermedia de build; el generador de TypeScript añade la referencia estática real al PNG. No se emiten imports dinámicos ni paths construidos durante el runtime.

Ejemplo esquemático:

~~~ts
import type { SpriteSheetDefinition } from "@tiny-aster/core";

export const ONI_RED_SPRITE_SHEET: SpriteSheetDefinition = {
  id: "oni_red",
  assetPath: "assets/sprites/generated/characters/oni_red.atlas.png",
  imageSource: require("../../../../../assets/sprites/generated/characters/oni_red.atlas.png"),
  frameWidth: 56,
  frameHeight: 90,
  sourceMode: "frames",
  anchor: { x: 0.5, y: 1 },
  animations: {
    idle: {
      name: "idle",
      frames: [{ x: 0, y: 0, w: 54, h: 82 }],
      frameDuration: 0.12,
      loop: true
    }
  }
};
~~~

El código real contiene todos los rectángulos y eventos. El require() del ejemplo es relativo al archivo generado y deberá calcularse desde el generador.

## 6. Validación y determinismo

El build valida antes de escribir:

- Fuente y configuración presentes y parseables.
- PNG válido y dimensiones coincidentes con meta.size.
- IDs y claves de animación únicos.
- Rectángulos enteros, positivos y dentro de bounds.
- Duraciones positivas y uniformes por clip.
- Direcciones, rangos y loops soportados.
- Anchors finitos dentro de [0, 1].
- Eventos con tipo, payload y frame válidos.
- Ausencia de trim y rotación.
- Paths relativos que no escapen del repositorio.

La misma entrada debe producir byte-for-byte el mismo PNG y el mismo TypeScript. La copia del PNG Aseprite no debe decodificarlo ni recodificarlo. Los ficheros .generated.ts e index.generated.ts deben tener orden estable y formato determinista.

## 7. Política de CI y control de versiones

**Decisión: commitear fuentes y artefactos generados, y verificar regeneración estricta en CI.**

Se versionan:

- Fuentes de entrada (sheet.json, PNG original, config y events).
- PNG de runtime generado.
- Definiciones .generated.ts e índice.

CI ejecutará, en este orden:

1. pnpm run sprites:build --check
2. pnpm run sprites:validate
3. Tests del parser/generador.

--check genera resultados esperados en memoria o en un directorio temporal, compara los bytes del PNG y el contenido de TypeScript, y falla con código distinto de cero si hay drift. No modifica archivos ni deja cambios en el workspace.

sprites:validate sigue validando el catálogo completo, tanto los sheets compartidos como los de Hit&Run. El porcentaje de autogeneración se calcula sobre ambos grupos (baseline actual: 21 sheets), y se reporta también por separado para sheets animados y full-image.

## 8. Comandos CLI previstos

~~~bash
pnpm sprites:build
pnpm sprites:build --sheet=oni_red
pnpm sprites:build --sheet=tower_basic_art
pnpm sprites:build --dry-run
pnpm sprites:build --verbose
pnpm sprites:build --check
pnpm sprites:validate
~~~

El modo --dry-run valida y muestra los artefactos previstos sin escribirlos. --verbose informa fuente, clips, rects y destinos. --check nunca escribe.

## 9. Responsabilidades manuales

Después de implementar 4.2, el trabajo manual esperado será:

- Crear/editar la fuente artística en Aseprite o preparar el PNG estático.
- Exportar el PNG/JSON y actualizar config/events cuando corresponda.
- Revisar visualmente el diff del PNG y abrir el PR.
- Mantener la selección de clips en los sistemas de state-selection del juego.
- Declarar la semántica de los eventos de gameplay.

No será necesario escribir ni mantener frame rectangles en TypeScript, ni editar el índice generado. SpriteRegistry consumirá el índice generado en 4.2.

## 10. Spike existente y alcance de 4.1

El spike se conserva como parser de build-time bajo scripts/sprites/parsers/AsepriteJsonParser.ts. Los tests cubren Array/Hash, orden determinista, dirección, timing uniforme, overlay de eventos, bounds y rechazo de trim/rotación.

El parser devuelve una representación intermedia sin imageSource ni assetPath. La fase 4.2 es responsable de emitir la definición canónica completa y el require() estático.

## 11. Criterios de aceptación de 4.1

- [x] Aseprite JSON Array/Hash + PNG seleccionado como formato animado primario.
- [x] PNG estático + config seleccionado como formato secundario.
- [x] Carpetas de frames sueltos y TexturePacker aplazados.
- [x] Contrato de salida fijado contra SpriteSheetDefinition.
- [x] Política de tiempos, dirección, anchors, eventos, trim y rotación definida.
- [x] Política de artefactos commiteados y CI --check definida.
- [x] Separación build-time/runtime y registro estático documentados.
- [x] Spike ubicado en tooling y tests de normalización definidos.

**Siguiente fase:** 4.2 — implementar sprites:build, el escritor de artefactos y la validación de regeneración.


## 12. Implementación de la Fase 4.2

La implementación inicial vive en scripts/sprites/ y comparte el validador
canónico de SpriteSheetDefinition. El comando pnpm run sprites:build acepta
fuentes Aseprite (Array/Hash) y PNG estáticos full-image, copia los bytes del
PNG y emite definiciones .generated.ts con require() estático más un índice.

El repositorio todavía no contiene fuentes de producción bajo
assets/sprites/sources/. Por eso el índice generado inicial puede estar vacío:
los fixtures del parser y del pipeline no se registran como assets de runtime.
El primer sheet real se incorporará durante la migración 4.3.

La validación reproducible se ejecuta con:

~~~bash
pnpm run sprites:build -- --check
pnpm run sprites:validate
~~~

El check compara bytes PNG y texto TypeScript, detecta artefactos obsoletos y
no modifica el workspace. El build completo normal elimina únicamente los
.atlas.png y .generated.ts obsoletos de los directorios reservados.
