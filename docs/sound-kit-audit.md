# Informe de Auditoría de Premisas (Punto 1)

Documento de verificación de premisas para la mejora del sistema de sonido (`@tiny-aster/arcade-sound-kit` y `@tiny-aster/core/src/audio`).

## Respuestas a Premisas (a - l)

### a. Tipos de datos de muestra y mutación de buffer
- **Confirmado**:
  - `render()` devuelve `Promise<Float32Array>` (`packages/arcade-sound-kit/src/core/render.ts`, línea 182).
  - `writeWav` recibe `samples: Float32Array` (`packages/arcade-sound-kit/src/export/wav.ts`, línea 121).
  - `applyLoudnessNormalization` recibe `samples: Float32Array` (`packages/arcade-sound-kit/src/core/render.ts`, línea 46).
  - `applyLoudnessNormalization` **muta** el buffer `samples` in-place (`samples[i] *= stepGain`, línea 81).

### b. Hash de receta (`computeRecipeHash`)
- **Confirmado**: `computeRecipeHash` (`packages/arcade-sound-kit/src/export/wav.ts`, líneas 49-68) incluye en su payload:
  - `renderVersion: RENDER_VERSION`
  - `targetRmsDb: options.targetRmsDb`
  - `peakCeilingDb: options.peakCeilingDb`
  - `peakDb: options.peakDb`
  - `bitDepth: options.bitDepth ?? 16`
  - `sampleRate`, `seed`, `variantIndex`, `arcadeColor`, `variants`.

### c. Imports I/O e exports en package.json
- **Confirmado**:
  - `packages/arcade-sound-kit/src/index.ts` re-exporta funciones de `export/wav.ts` (`writeWav`, `readManifest`, etc.) que importan `node:fs` y `node:path`.
  - `packages/arcade-sound-kit/package.json` sólo declara `"main": "dist/index.js"` y `"types": "dist/index.d.ts"`, sin un campo `"exports"` con subpatas libres de I/O.

### d. Comprobación de recálculo en `BiquadFilter.update`
- **Confirmado**:
  - `BiquadFilter.update` (`packages/arcade-sound-kit/src/core/render.ts`, línea 129) ejecuta: `if (freq === this.lastFreq && type === this.lastType) return;`
  - Ignora cambios en `Q` y en `sampleRate` al decidir si omitir el cálculo de coeficientes.

### e. Comportamiento del filtro en `whoosh`
- **Confirmado**:
  - En `render.ts` (línea 246), `filterType` para capas whoosh toma por defecto `'bandpass'`: `const filterType = l.filter?.type ?? 'bandpass';`.
  - En el bucle de procesamiento de whoosh (líneas 256-263):
    ```ts
    if (filterType === 'highpass') {
      hpFilter.update('highpass', fFilter, sampleRate);
      sampleVal = hpFilter.process(sampleVal);
    } else {
      lpFilter.update('lowpass', fFilter, sampleRate);
      sampleVal = lpFilter.process(sampleVal);
    }
    ```
  - Cuando `filterType` es `'bandpass'`, entra en la rama `else` y aplica únicamente un filtro pasa-bajo (`lpFilter.update('lowpass', ...)`).

### f. Frecuencia nula y reinicio de fase en `sequence`
- **Confirmado**:
  - `render.ts` (línea 290): `const hz = Math.max(10, Math.min(note.frequency * pitchJitter, sampleRate / 2 - 10));`. Si `note.frequency` es `0`, el `Math.max(10, ...)` fuerza la frecuencia a 10 Hz en vez de producir silencio.
  - `render.ts` (línea 303): `let phase = 0;` se ejecuta al inicio del bucle de cada nota dentro de la secuencia, reiniciando la fase en cada nota.

### g. Colisiones de seeds en variantes
- **Confirmado**:
  - `export/wav.ts` (línea 58): `seed: (options.seed ?? 42) + variantIndex * 9973`.
  - Para `options.seed = 9973` y `variantIndex = 0`: `seed = 9973 + 0 = 9973`.
  - Para `options.seed = 0` y `variantIndex = 1`: `seed = 0 + 1 * 9973 = 9973`.
  - Ambas combinaciones producen exactamente el mismo valor numérico de seed.

### h. Seed fija de dither en `writeWav`
- **Confirmado**:
  - `export/wav.ts` (línea 126): `writeWav` declara `seed = 42` como valor por defecto.
  - Al llamarse sin pasar la seed del sonido (como hace la CLI), usa la seed fija 42 para el generador TPDF dither.

### i. Sample rate por defecto y receta más larga de `arcadePack()`
- **Confirmado**:
  - Sample rate por defecto: `22050` Hz (`DEFAULT_SAMPLE_RATE` en `render.ts`, línea 7).
  - Receta más larga en `arcadePack()`: `'game_over'` (`packages/arcade-sound-kit/src/design/pack.ts`, línea 366) con `duration = 1.0` segundos.
  - Número de muestras: `Math.round(1.0 * 22050) = 22050` muestras.

### j. Duplicación del bucle oscilador × envolvente en `render.ts`
- **Confirmado**:
  - El patrón de acumulación `osc * env * gain` se repite en 3 ramas de `render.ts`:
    1. Rama `sequence` (líneas 304-311)
    2. Rama `chord` (líneas 324-334)
    3. Rama por defecto / tonal / zap / tone (líneas 347-362)

### k. Estado actual de `WebAudioPlayer`
- **Confirmado**:
  - Variantes: No gestiona variantes de forma automática; espera IDs estáticos precargados (`sfxCache`).
  - Límite de voces: No tiene límite de voces global ni por sonido (crea un `BufferSource` individual por cada llamada a `playSFX`).
  - Cooldown: Soporta cooldown por sonido mediante `sfxLastPlayTime` y `opts.cooldownMs`.
  - Ducking: No implementa atenuación automática (ducking) de BGM ante efectos de alta prioridad.
  - Jitter de pitch: Soporta `opts.pitchRange` aplicando una variación aleatoria en `source.playbackRate`.

### l. React Native y reproductor nativo
- **Confirmado**:
  - El proyecto incluye `@tiny-aster/react-native` en `packages/react-native/`.
  - Utiliza `ExpoAudioPlayer` (`packages/react-native/src/audio/ExpoAudioPlayer.ts`) respaldado por `expo-audio` (`createAudioPlayer`). Administra un pool de hasta 4 reproductores por SFX (`MAX_SFX_POOL_SIZE = 4`), atenuación espacial, volumen bus y reanudación ante cambios de `AppState`.

---

## Ajustes Impuestos a Puntos Posteriores

1. **Punto 3 (Correcciones menores)**:
   - **3a (Seeds de variante)**: Sustituir `baseSeed + v * 9973` por `rng.fork(v)` para eliminar colisiones.
   - **3b (Dither)**: Pasar a `writeWav` / `encodeWav` una seed derivada de la del sonido.
   - **3c (Silencios en sequence)**: `frequency: 0` o `rest: true` debe generar buffer con valor 0 sin oscilador.
   - **3d (Fase por nota)**: Medir la discontinuidad al inicio de cada nota antes de decidir cambios.
   - **3e (Whoosh bandpass)**: Corregir `whoosh` para que aplique filtro pasa-banda real (cascada HPF + LPF) cuando `filterType === 'bandpass'`.

2. **Punto 4 (Pipeline puro y entrada sin Node)**:
   - Dado que `render()` devuelve `Float32Array`, `renderFinal` devolverá `Float32Array` sin conversión previa.
   - Descomponer `writeWav` en `encodeWav(samples, opts): Uint8Array` (100% puro, usable en navegador) y `writeWav` (I/O Node).
   - Configurar `package.json` con subpatas de exportación `.` (Node) y `./core` (puro sin I/O).

3. **Punto 12 (Estéreo)**:
   - `WebAudioPlayer` ya provee `createStereoPanner` en tiempo de ejecución para posicionamiento espacial (`playSpatialSFX`), y `ExpoAudioPlayer` soporta `player.pan`.
   - La decisión en `docs/sound-kit-decisions.md` debe evaluar si el estéreo horneado en archivos de SFX es innecesario o si sólo se justifica para música y fondos.

4. **Punto 21 (Runtime en el motor)**:
   - Dado que `WebAudioPlayer` carece de límite de voces global/por cue, selección aleatoria de variantes y ducking de música, la clase `SoundBank` deberá implementar esta orquestación de voces y cues.
