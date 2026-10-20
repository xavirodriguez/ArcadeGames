# Progreso del Plan de Mejora del Sistema de Sonido

Estado inicial de la sesión:
- Branch: `jules-16225817725233275742-07449c96`
- `pnpm run ci`: Presentaba fallos previos en la rama base en `check:ratchet` (regresión de typecast en `src/games/galaxian/*`) y `check:duplication` (594 líneas vs baseline 432). La regresión de typecasts en Galaxian fue corregida limpiamente sin alterar lógica.

| # | Punto | Estado (pendiente/en curso/hecho/bloqueado/descartado) | Commit | Notas y mediciones |
|---|---|---|---|---|
| 1 | Verificar premisas | hecho | b7f17ca | Audit completado en `docs/sound-kit-audit.md`. |
| 2 | Golden tests | hecho | 3edc214 | Golden hashes versionados en `tests/snapshots/golden_hashes.json` con cuantización PCM16 y test de DC offset. |
| 3 | Correcciones menores | hecho | pending | Reemplazado RNG fork en variantes, dither seed derivado en writeWav, silencios en sequence, whoosh bandpass corregido y RENDER_VERSION bump a 0.3.1. |
| 4 | Pipeline puro y entrada sin Node | hecho | pending | Creada función pura `renderFinal`, encoder puro `encodeWav`, subpata `./core` en package.json y test de análisis de imports en `core_imports.test.mjs`. |
| 5 | Refactor de la voz | hecho | pending | Extraído DSP en `core/dsp/` (biquad, envelope, oscillators, voice), `renderVoice` reutilizable y registro `Record<LayerKind, LayerRenderer>` sin alterar golden tests. |
| 6 | Filtros | hecho | pending | `BiquadFilter.update` evalúa Q/sampleRate. Implementados `bandpass` (RBJ) y `notch`. Integrado filtro en `renderVoice` con recálculo cada 16 muestras en barridos. Medido render 5x pack: 506 ms. |
| 7 | Modulación (LFO) | hecho | pending | Añadidos `LfoSpec` y `ModulationSpec` (pitch, amp, filter). Onda `sampleAndHold` determinista por RNG. Creado `examplesPack()` con sirena, powerup vibrato y filtro modulado. |
| 8 | Envolventes y pitch envelope | hecho | pending | Curvas exponenciales `curve: 'exp'` con suelo a 0.001 (-60 dBFS) y rampa anti-click. Envolventes multipunto `points`. Creadas variantes exponenciales (`_exp`) en `examplesPack()` y documentadas mediciones en `docs/sound-kit-listening.md`. |
| 9 | Paleta chip | hecho | pending | Implementada onda `pulse` con `duty` y PolyBLEP en ambos flancos, ruido LFSR 7/15-bit, bitcrush por capa y helper `arp`. Validado en `chip_palette.test.mjs`. |
| 10 | FM y unison | hecho | pending | Síntesis FM con modulación de fase y techo de índice seguro de Carson frente a aliasing. Unison de hasta 8 voces con desafinación y normalización $1/\sqrt{V}$. Aliases `harmonicity` preservado. |
| 11 | Cadena de efectos | hecho | pending | Módulo `core/effects/` con delay, reverb Schroeder, distorsión, chorus y bitcrush. Alargado de buffer con cola estimada y validación de máximo 4 efectos por receta. |
| 12 | Estéreo | descartado | pending | Evaluación en `docs/sound-kit-decisions.md`: WebAudio `StereoPannerNode` y `ExpoAudioPlayer.pan` ya manejan paneo espacial 2D dinámico. Estéreo horneado duplicaría tamaño de WAVs sin beneficio. |
| 13 | Notación musical | hecho | pending | Módulo puro `src/music/` con `note`, `midi`, `dur`, `scale`, `chordNotes`/`chord`, `seq` y `rest`. Validado en `music_notation.test.mjs`. |
| 14 | MusicRecipe | hecho | pending | Módulo `renderMusic` con síntesis compás a compás, soporte de `sections` (intro, loopA, loopB) y plegado de cola para loops sin costuras. Medido bloqueo del hilo principal para 30s de música: 284.49 ms. |
| 15 | Preview por CLI | hecho | pending | Comando `preview` en CLI impulsado por `renderFinal` y `encodeWav`. Soporta lanzador de reproductor por SO (`afplay`, `paplay`, `powershell`), `--watch`, `--interactive` y flags `--loop`, `--gap`, `--variants`. |
| 16 | Sound Lab: infraestructura | hecho | pending | Decidida ruta `/sound-lab` en `docs/sound-kit-decisions.md`. Creado `renderToAudioBuffer`, `playBuffer` en `WebAudioPlayer` con cache propia y worker bridge en `soundWorkerBridge.ts` con límites de validación JSON. |
| 17 | Sound Lab: interfaz | pendiente | | |
| 18 | Randomizer, mutación y morph | pendiente | | |
| 19 | Auditoría de calidad | pendiente | | |
| 20 | Export | pendiente | | |
| 21 | Runtime en el motor | pendiente | | |
| 22 | Integración y pulido de juegos | pendiente | | |

---

## Diseños y Explicaciones por Punto

### Punto 1: Verificar premisas (solo lectura)
**Diseño / Explicación:**
Se realizó un análisis estático de código sin modificar lógica de renderizado ni recetas. Se verificaron las 12 premisas formuladas (a-l) inspeccionando los archivos `packages/arcade-sound-kit/src/core/render.ts`, `export/wav.ts`, `design/pack.ts`, `index.ts`, `package.json`, `packages/core/src/audio/WebAudioPlayer.ts` y `packages/react-native/src/audio/ExpoAudioPlayer.ts`.
Todas las respuestas, evidencias con archivo y líneas, y ajustes impuestos sobre los puntos 3, 4, 12 y 21 se han documentado de forma exhaustiva en `docs/sound-kit-audit.md`. Se descartó cualquier alternativa de modificación de código en este paso por ser un punto estrictamente de auditoría de solo lectura.

### Punto 2: Red de seguridad: golden tests
**Diseño / Explicación:**
Se implementó una red de seguridad basada en snapshots de regression para todas las recetas de `arcadePack()`. Los buffers sintetizados se cuantizan a PCM Int16 antes de calcular el hash SHA-256 para evitar fluctuaciones de precisión de flotantes entre versiones de V8 o plataformas (Windows vs Linux). Para recetas con `variation`, se prueban 3 variantes (variantIndex 0, 1, 2) deterministas. Los hashes se guardan en `packages/arcade-sound-kit/tests/snapshots/golden_hashes.json` y se actualizan de forma explícita mediante el nuevo script `pnpm sound:golden:update` (`packages/arcade-sound-kit/tests/scripts/update_golden.mjs`). Adicionalmente, se extendió la suite de tests de propiedades en `base_recipes.test.mjs` validando que el offset DC no excede del umbral medido de 0.05 (5%).
*Alternativas descartadas:* Hashear Float32Array directamente (descartado por variabilidad entre entornos) y permitir que el test sobrescriba los snapshots automáticamente al fallar (descartado para evitar falsos positivos y actualizaciones involuntarias en CI).

### Punto 3: Correcciones menores
**Diseño / Explicación:**
Se aplicaron las correcciones confirmadas en el informe de auditoría:
- 3a: Sustituido `baseSeed + v * 9973` por `new RNG(baseSeed).fork(v)` en la derivación de variantes para garantizar que no existan colisiones de seeds entre combinaciones distintas. Validado en `variant_fork.test.mjs` (100% de unicidad en 5005 combinaciones).
- 3b: `writeWav` recibe una seed de dither derivada determinísticamente de la del sonido (`rng.fork('dither_seed').next()`), en lugar de fijar 42 para todos los archivos. Validado en `dither_seed.test.mjs`.
- 3c: `sequence` soporta silencios cuando `frequency === 0` o `rest: true`, advancing el tiempo sin inyectar tono de 10 Hz. Validado en `sequence_rest.test.mjs`.
- 3d: Se midió el salto máximo entre muestras en onsets de notas de secuencias con attack de 2 ms (medido: 0.4448) frente al resto del pack (medido: 1.1519). Al quedar por debajo del máximo del pack, no se alteró el código de fase por nota y se documentó el resultado.
- 3e: Corregido el filtro pasa-banda en capas `whoosh` para que cuando `filterType === 'bandpass'` aplique la cascada pasa-alto + pasa-bajo correspondiente al barrido en lugar de actuar únicamente como pasa-bajo. Validado en `whoosh_bandpass.test.mjs`.
- 3f: Se incrementó `RENDER_VERSION` a `0.3.1` y se actualizaron los snapshots en `golden_hashes.json`.

### Punto 4: Pipeline puro y entrada sin Node
**Diseño / Explicación:**
Se extrajo la función pura `renderFinal(recipe, options, variantIndex)` devolviendo `{ samples: Float32Array, sampleRate, norm }` sin operaciones de sistema de archivos. Se separó la codificación WAV pura de PCM16/32 y dither en `encodeWav(samples, options)` devolviendo `Uint8Array` sin I/O, en `src/export/encoder.ts`. `writeWav` fue desacoplado como la combinación de `encodeWav` e I/O de disco (`fs.writeFileSync`). Se agregó la subpata de exportación `./core` en `package.json` reexportando los componentes puros desde `src/core_entry.ts`. El tipo de muestra `Float32Array` se mantuvo en toda la ruta de renderizado para maximizar el rango dinámico antes de la cuantización final a WAV.
*Alternativas descartadas:* Mantener `encodeWav` mezclado con `fs` (descartado por romper compatibilidad con ejecuciones en navegador/web workers) y convertir a Int16Array antes de la normalización (descartado para evitar pérdida de resolución durante mezcla de capas).
Validado en `core_imports.test.mjs` escaneando transitivamente los módulos de `./core` para asegurar 0 imports de `fs`, `path` o `node:*`.

### Punto 5: Refactor de la voz
**Diseño / Explicación:**
Se modularizó la síntesis DSP trasladando las primitivas a `packages/arcade-sound-kit/src/core/dsp/`:
- `biquad.ts`: Clase `BiquadFilter` con test unitario `dsp_biquad.test.mjs`.
- `envelope.ts`: Función `computeEnvelope` con test unitario `dsp_envelope.test.mjs`.
- `oscillators.ts`: `evalWave` y `polyBlep` con test unitario `dsp_oscillators.test.mjs`.
- `voice.ts`: Interfaz `Voice` y función `renderVoice(samples, voice, ctx)` para consolidar el bucle `osc * env * gain` duplicado.
- `renderers/`: Registro `Record<LayerKind, LayerRenderer>` dividiendo las ramas de `render.ts` en renderizadores especializados (`noiseRenderer`, `sequenceRenderer`, `chordRenderer`, `tonalRenderer`).
*Alternativas descartadas:* Mantener los bucles `osc * env * gain` duplicados en un único archivo monolítico (descartado por dificultar la reusabilidad y extensibilidad en sintetizadores futuros).
Se confirmó que el refactor produce resultados idénticos byte por byte mediante los 44 tests de la suite y que no se introduce regresión de duplicación en el proyecto.

### Punto 6: Filtros
**Diseño / Explicación:**
Se actualizó `BiquadFilter.update` para que evalúe `Q` y `sampleRate` en la verificación de recálculo de coeficientes. Se añadieron las respuestas pasa-banda (RBJ 0 dB peak gain) y notch en `biquad.ts`. Se añadió `q?: number` en `FilterSpec`, validado en `validator.ts` dentro del rango [0.1, 30] (justificación: Q < 0.1 produce respuesta casi plana sin filtrado, Q > 30 genera resonancia excesiva e inestabilidad cerca de Nyquist). El filtro biquad se integró directamente en la voz sintetizada de `renderVoice` permitiendo filtrado opcional en cualquier capa tonal. En barridos de frecuencia de corte (`minHz` -> `maxHz`), los coeficientes se recalculan cada 16 muestras.
*Medición de rendimiento:* Renderizar 5 iteraciones completas de `arcadePack()` con la optimización de recálculo cada 16 muestras requirió **506.08 ms** en total (frente a >1200 ms al recalcular por muestra).
*Alternativas descartadas:* Recalcular coeficientes por cada muestra individual en sweeps (descartado por sobrecoste CPU innecesario sin beneficio audible).
Validado en `biquad_advanced.test.mjs` (recálculo por Q/sampleRate, atenuación a 4·fc, resonancia Q en fc, estabilidad sin NaN cerca de Nyquist) y `biquad_sweep_perf.test.mjs`.

### Punto 7: Modulación (LFO)
**Diseño / Explicación:**
Se definieron las estructuras `LfoSpec` y `ModulationSpec` permitiendo modular pitch (en semitonos), amplitud (0..1) y filtro (en octavas). Se implementó la onda `sampleAndHold` utilizando el generador determinista RNG de la capa por paso. La fase inicial se aleatoriza por variante utilizando el RNG de capa a menos que se fije explícitamente `phase`. La modulación se aplica directamente dentro de `renderVoice`: pitch multiplicativo en escala logarítmica ($2^{S/12}$), amplitud acotada en [0, 1] y filtro en octavas ($2^O$). Se creó `examplesPack()` en `src/design/examplesPack.ts` conteniendo 3 recetas de demostración (`siren`, `powerup_vibrato`, `filter_modulated`).
*Alternativas descartadas:* Aplicar modulación fuera del bucle de síntesis de voz (descartado porque requiere re-evaluar la frecuencia e índice de filtro por muestra).
Validado en `lfo_modulation.test.mjs` (comprobando variación de densidad de cruces por cero en vibrato y oscilación de energía en trémolo).

### Punto 8: Envolventes y pitch envelope
**Diseño / Explicación:**
Se extendió `computeEnvelope` en `dsp/envelope.ts` para soportar segmentos exponenciales (`curve: 'exp'`). Para evitar tomar logaritmos de 0 durante caídas a cero, se estableció un suelo de atenuación a 0.001 (-60 dBFS) acoplado a una rampa lineal corta de 0.5 ms al final del release para garantizar transiciones suaves sin clicks. Se implementó la evaluación de envolventes multipunto mediante arrays `points: [{ t, level, curve }]`. Se agregaron 3 recetas en `examplesPack()` reescritas con envolvente exponencial (`shoot_exp`, `explosion_small_exp`, `jump_exp`).
*Mediciones y comparativa de escucha (registradas en `docs/sound-kit-listening.md`):*
- `shoot` vs `shoot_exp`: Peak = 0.4463 vs 0.5135, RMS = 0.1446 vs 0.1498, Duración efectiva = 104.6 ms vs 104.6 ms (transitorio más incisivo).
- `explosion_small` vs `explosion_small_exp`: Peak = 0.9074 vs 0.8868, RMS = 0.1806 vs 0.1280, Duración efectiva = 262.4 ms vs 244.5 ms (cuerpo de graves más seco).
- `jump` vs `jump_exp`: Peak = 0.3054 vs 0.3157, RMS = 0.1654 vs 0.0972, Duración efectiva = 113.3 ms vs 113.3 ms (caída más ligera).
*Alternativas descartadas:* Envolventes exponenciales puras sin rampa final anti-click (descartado por producir saltos bruscos al término del tiempo de release).
Validado en `envelope_advanced.test.mjs` (verificando valores en t=0 y final, monotonía en decay y límite de salto entre muestras < 0.5).

### Punto 9: Paleta chip
**Diseño / Explicación:**
Se añadió la onda `pulse` en `oscillators.ts` con ciclo de trabajo `duty` configurable (0.125, 0.25, 0.5 y flotantes libres) y suavizado antialiasing PolyBLEP en ambos flancos. Se incorporó la clase `LfsrNoise` ofreciendo generadores de ruido retro de 7 bits (período de 127 pasos) y 15 bits. Se añadió el ajuste de `bitcrush` por capa (reducción de bits y submuestreo por retención) y la función primitiva `arp` para arpegios monófonos de acordes.
*Alternativas descartadas:* Generación de pulsos rectangulares sin PolyBLEP (descartado por producir ruido de aliasing en frecuencias altas).
Validado en `chip_palette.test.mjs` (simetría de armónicos impares a duty 0.5, periodicidad exacta de 127 pasos en LFSR 7-bit y niveles cuantizados de bitcrush).

### Punto 10: FM y unison
**Diseño / Explicación:**
Se implementó síntesis FM mediante modulación de fase de un portador seno impulsado por un modulador con envolvente de índice opcional y retroalimentación (feedback). Se aplicó el techo automático del índice FM basado en la regla de ancho de banda de Carson ($I_{\text{max}} = \frac{0.45 f_s - f_c}{f_m} - 1$) para evitar distorsión por aliasing sobre Nyquist. Se añadió Unison de hasta 8 voces con desafinación en centésimas de semitono (`detuneCents`) y normalización de ganancia $1/\sqrt{V}$. El campo `harmonicity` fue conservado como alias en desuso asignado a `fm.ratio`. Se agregaron 4 recetas en `examplesPack()` (`coin_fm`, `bell_fm`, `metallic_hit_fm`, `short_pad_unison`).
*Alternativas descartadas:* Permitir índices FM arbitrariamente altos sin límite por sample rate (descartado por generar frecuencias espejo indeseadas).
Validado en `fm_unison.test.mjs` (bandas laterales en FM, normalización de pico en unison y retrocompatibilidad de `harmonicity`).

### Punto 11: Cadena de efectos
**Diseño / Explicación:**
Se estructuró la cadena de efectos master `SoundRecipe.effects?: EffectSpec[]` ejecutada de forma secuencial tras la mezcla de capas y antes de la normalización. Se implementaron los efectos puros en `src/core/effects/`:
- `delay`: Línea de retardo con filtro pasa-bajo opcional en el bucle de realimentación.
- `reverb`: Reverberador Schroeder (4 filtros peine + 2 filtros pasa-todo con amortiguación de alta frecuencia).
- `distortion`: Conformador de onda `tanh` con control de ganancia de entrada (`drive`).
- `chorus`: Retardo modulado por LFO.
- `bitcrush`: Cuantización de amplitud y submuestreo por retención.
El buffer sintetizado extiende automáticamente su duración en función de la cola estimada de delay/reverb (acotada a un máximo de 2.0 s). La validación limita la cadena a un máximo de 4 efectos por receta.
*Alternativas descartadas:* Reverberador de convolución por respuesta a impulsos (descartado por requerir archivos de audio externos e incrementar el footprint).
Validado en `effects_chain.test.mjs` (decaimiento de delay, energía en la cola del reverb < 0.001 y procesamiento sin NaN).

### Punto 12: Estéreo
**Diseño / Explicación:**
Se realizó la evaluación documentada en `docs/sound-kit-decisions.md`: los reproductores del motor en tiempo de ejecución (`WebAudioPlayer` con `StereoPannerNode` y `ExpoAudioPlayer` con `player.pan`) ya proveen posicionamiento dinámico estéreo 2D en runtime. Hornear estéreo en los archivos de sonido offline duplicaría el tamaño de los WAVs y el consumo de RAM sin aportar beneficio en emisores puntuales de juegos arcade. Se marcó el punto como **descartado** para mantener los archivos SFX en mono (1 canal).

### Punto 13: Notación musical
**Diseño / Explicación:**
Se creó el módulo puro `src/music/` ofreciendo funciones de utilidad musical sin dependencias de I/O ni del renderizador:
- `noteToHz` / `note` y `midiToHz` / `midi`: Conversión de notas ('C4', 'C#4', 'Db3') o notas MIDI a Hz con A4 configurable (440 Hz por defecto).
- `durToSeconds` / `dur`: Conversión de notación rítmica ('1n', '2n', '4n', '8n', '16n', '32n', con puntillo '.' y tresillo 't') a segundos según el BPM.
- `scale` y `chordNotes` / `chord`: Generación de frecuencias para escalas (major, minor, pentatonic, dorian, harmonic_minor) y acordes (major, minor, dim, aug, maj7, min7, 7).
- `seq` y `rest`: Construcción de arrays `SequenceNote[]` con soporte de swing, humanización de micro-timing/volumen determinista con RNG y silencios integrados.
*Alternativas descartadas:* Importar librerías externas de teoría musical como Tone.js o Teoria (descartadas para mantener el paquete ligero y libre de dependencias pesadas).
Validado en `music_notation.test.mjs` (comprobando A4 = 440 Hz, C4 ≈ 261.63 Hz, '4n' a 120 BPM = 0.5 s, puntillos y tresillos).

### Punto 14: MusicRecipe y bucles sin costuras
**Diseño / Explicación:**
Se definieron la estructura `MusicRecipe` y la función `renderMusic(musicRecipe, options)` en `src/music/renderMusic.ts`. Soporta renderizado compás a compás sobre pistas (`tracks`) y secciones (`sections`: intro, loopA, loopB). Cuando `recipe.loop === true`, el derramamiento de colas de release y reverberación que excede la longitud exacta de la pieza ($B \times \text{barSeconds}$) se pliega sobre el inicio del buffer, garantizando bucles musicales sin costuras ni discontinuidades espectrales. Se incluyeron 3 piezas musicales demostrativas en `musicExamplesPack()` dentro de `examplesPack.ts` (`music_menu`, `music_tense_level`, `music_game_over`).
*Medición de rendimiento:* Renderizar una pieza de música de 30 segundos (15 compases a 120 BPM, 661.500 muestras a 22,050 Hz) bloqueó el hilo principal durante **284.49 ms**.
*Alternativas descartadas:* Renderizar compases como archivos WAV individuales y encadenarlos en runtime (descartado porque no permite el plegado continuo de colas de reverberación entre compases).
Validado en `music_recipe.test.mjs` (verificando longitud exacta del buffer, continuidad en el límite del bucle y renderizado de jingles sin loop).

### Punto 15: Preview por CLI (`ask-generate preview`)
**Diseño / Explicación:**
Se añadió el comando `preview` a la herramienta de línea de comandos `ask-generate` (`src/cli.ts`), utilizando la canalización pura `renderFinal` y `encodeWav`.
- Reproducción nativa multiplataforma en `src/export/playerLauncher.ts`: `afplay` en macOS, `paplay`/`aplay` en Linux, y `SoundPlayer` de PowerShell en Windows, con eliminación automática de archivos WAV temporales al salir o recibir `SIGINT`.
- Soporte de flags `--seed`, `--sample-rate`, `--variants`, `--loop <n>` y `--gap <ms>`.
- Modo `--watch`: Observa el archivo de receta y re-sintetiza al guardar. Si la receta actualizada contiene errores de validación, muestra los avisos del validador y conserva la versión previa funcional.
- Modo `--interactive`: Consola interactiva Readline con comandos `seed <n>`, `pitch <hz>`, `variants <n>`, `play`, `save` y `exit`.
*Alternativas descartadas:* Incluir binarios nativos o bibliotecas C/C++ vinculadas (descartado para evitar dependencias nativas y fallos de instalación multiplataforma).
Validado en `cli_preview.test.mjs` (probando detección de lanzadores del sistema operativo según `os.platform()`).

### Punto 16: Sound Lab: infraestructura
**Diseño / Explicación:**
Se definió la arquitectura de Sound Lab en `docs/sound-kit-decisions.md`, seleccionando la ruta `/sound-lab` en la aplicación Expo Router existente. Se construyó la infraestructura base:
1. `renderToAudioBuffer(ctx, samples, sampleRate)` en `src/export/audioBuffer.ts` utilizando `createBuffer` y `copyToChannel` (con fallback a `set`).
2. `playBuffer(buffer, key, options)` en `WebAudioPlayer` (`packages/core/src/audio/WebAudioPlayer.ts`) administrando un caché `bufferCache` independiente de la caché de URLs.
3. `soundWorkerBridge.ts` en `src/worker/` para ejecutar síntesis desacoplada en Web Workers con mensajes tipados (`render`, `cancel`, `render_success`, `render_error`) y soporte de cancelación por ID (`activeRenderId`).
4. Validación estricta de recetas externas en JSON con límites de seguridad de la Regla 6: duración $\le 10.0$ s, máximo 10 capas y máximo 4 efectos.
Validado en `sound_lab_infra.test.mjs` (testeando conversión a AudioBuffer, mensajes del worker y límites de seguridad en JSON).
