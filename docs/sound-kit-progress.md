# Progreso del Plan de Mejora del Sistema de Sonido

Estado inicial de la sesión:
- Branch: `jules-16225817725233275742-07449c96`
- `pnpm run ci`: verde (todos los tests pasando).

| # | Punto | Estado (pendiente/en curso/hecho/bloqueado/descartado) | Commit | Notas y mediciones |
|---|---|---|---|---|
| 1 | Verificar premisas | hecho | b7f17ca | Audit completado en `docs/sound-kit-audit.md`. |
| 2 | Golden tests | hecho | 3edc214 | Golden hashes versionados en `tests/snapshots/golden_hashes.json` con cuantización PCM16, cobertura de `arcadePack`, `examplesPack` y `musicExamplesPack`, y test de DC offset. |
| 3 | Correcciones menores | hecho | 8e45851 | Reemplazado RNG fork en variantes, dither seed derivado en writeWav, silencios en sequence, whoosh bandpass corregido y RENDER_VERSION bump a 0.3.1. |
| 4 | Pipeline puro y entrada sin Node | hecho | 8e45851 | Creada función pura `renderFinal` con escalado de pico, encoder puro `encodeWav`, subpata `./core` en package.json (sin `crypto` ni Node I/O) y re-exportación de `generator`. |
| 5 | Refactor de la voz | hecho | 8e45851 | Extraído DSP en `core/dsp/` (biquad, envelope, oscillators, voice), `renderVoice` reutilizable y registro `Record<LayerKind, LayerRenderer>`, con cobertura en `.jscpd.json`. |
| 6 | Filtros | hecho | 382b6ae | `BiquadFilter.update` evalúa Q/sampleRate. Implementados `bandpass` (RBJ) y `notch`. Integrado filtro en `renderVoice` y en capas de ruido con recálculo cada 16 muestras en barridos. |
| 7 | Modulación (LFO) | hecho | 382b6ae | Añadidos `LfoSpec` y `ModulationSpec` (pitch, amp, filter, pulseWidth). Trémolo sinusoidal suave sin clipping, `rateJitter` dedicado e independencia de RNG en voces sin LFO. |
| 8 | Envolventes y pitch envelope | hecho | 382b6ae | Curvas exponenciales `curve: 'exp'` en tonos y ruido con suelo a 0.001 (-60 dBFS) y rampa anti-click. Envolventes multipunto `points` con validación de nivel 0 final. Mediciones actualizadas en `docs/sound-kit-listening.md`. |
| 9 | Paleta chip | hecho | f68c371 | Implementada onda `pulse` con `duty` y PolyBLEP en ambos flancos, ruido LFSR 7/15-bit en capas de ruido, bitcrush por capa y helper `arp`. |
| 10 | FM y unison | hecho | f68c371 | Síntesis FM con modulación de fase y techo de índice seguro de Carson frente a aliasing. Unison de hasta 8 voces con desafinación y normalización $1/\sqrt{V}$. Aliases `harmonicity` preservado. |
| 11 | Cadena de efectos | hecho | f68c371 | Módulo `core/effects/` con delay, reverb Schroeder, distorsión, chorus y bitcrush. Cola estimada a -60 dBFS incluida en la duración del manifest. |
| 12 | Estéreo | descartado | f68c371 | Evaluación en `docs/sound-kit-decisions.md`: WebAudio `StereoPannerNode` y `ExpoAudioPlayer.pan` ya manejan paneo espacial 2D dinámico. Estéreo horneado duplicaría tamaño de WAVs sin beneficio. |
| 13 | Notación musical | hecho | cd9ca31 | Módulo puro `src/music/` con `note`, `midi`, `dur`, `scale`, `chordNotes`/`chord`, `seq` y `rest`. Validado en `music_notation.test.mjs`. |
| 14 | MusicRecipe | hecho | cd9ca31 | Módulo `renderMusic` con síntesis compás a compás nota por nota (percusión en rejilla), apoyo de `sections` (intro, loopA, loopB), salida normalizada ($\le 0.95$) y plegado de cola de loop con margen. Medido bloqueo del hilo principal para 30s de música: 284.49 ms. |
| 15 | Preview por CLI | hecho | cd9ca31 | Comando `preview` en CLI impulsado por `renderFinal` y `encodeWav`. Lanzador secuencial por SO (`afplay`, `paplay`/`aplay`, `powershell`), validación de `--name`, apoyo de `--examples`, `--watch`, `--interactive` y comandos en help. |
| 16 | Sound Lab: infraestructura | hecho | cd9ca31 | Creado `renderToAudioBuffer`, `playBuffer` en `WebAudioPlayer` con cache propia y worker bridge en `soundWorkerBridge.ts` con límites de validación integrados en `validator.ts`. |
| 17 | Sound Lab: interfaz | hecho | pending | Pantalla interactiva Expo Router `/sound-lab` (`src/app/sound-lab/index.tsx`) compilada exitosamente con Expo Web. Incluye galería, editor spec, generador aleatorio y mutante, visualizador 2D Canvas de forma de onda y espectrograma, medidores de calidad, descarga WAV y exportación TS. |
| 18 | Randomizer, mutación y morph | hecho | pending | Módulo `src/design/generator.ts` con 8 arquetipos retro, `randomRecipe`, `mutate` y `morph` deterministas con RNG. Comando CLI `ask-generate random`. Validado para 1000 seeds por arquetipo en `generator.test.mjs`. |
| 19 | Auditoría de calidad | hecho | pending | Módulo `src/core/analysis.ts` con FFT Radix-2 pura, sonoridad K-weighted LUFS real (ITU-R BS.1770), pico, RMS, DC offset, silencios, salto de bucle, centroide espectral y pareo de sonidos similares. Comando CLI `ask-generate audit [--pack] [--dir out/] [--fail-on]`. |
| 20 | Export | hecho | pending | Generador de `cues.json` (`generateCueBank`, `validateCueBank`) mapeando eventos a variantes/cooldown/prioridad, Sprite Sheet Howler (`[startMs, durationMs, loop]`) con normalización y comandos CLI `cues` y `spritesheet`. |
| 21 | Runtime en el motor | hecho | pending | `SoundBank` en `packages/core/src/audio/SoundBank.ts` con carga de `cues.json`, selección de variante anti-repetición consecutiva, jitter de pitch/volumen, robo de voces (por antigüedad y prioridad), cooldowns y límites de voces. |
| 22 | Integración y pulido de juegos | hecho | pending | Vinculado `getSharedSoundBank()` en `AudioEventMap.ts` e inventario/propuesta de juice por juego documentada en `docs/sound-kit-game-identity.md`. |

---

## Diseños y Explicaciones por Punto

### Punto 14: MusicRecipe
**Diseño / Explicación:**
Se ajustó `renderMusic` en `src/music/renderMusic.ts` para renderizar pistas compás a compás y nota por nota en secuencias y rejillas de percusión (`gridPattern`). Para evitar la saturación al sumar múltiples pistas, la salida final se normaliza con un techo de pico $\le 0.95$ (-0.45 dBFS). El plegado de la cola de release/reverb para bucles sin costuras se realiza sintetizando con un margen de desbordamiento de 1 compás adicional y plegando el excedente sobre el inicio del buffer (`finalBuffer[foldIndex] += rawBuffer[i]`). Se incluyó la pieza `music_sections_demo` con secciones (`intro`, `loopA`) y se validó en `music_recipe.test.mjs` comprobando la detección de onsets de energía en los instantes exactos del pulso.

### Punto 17: Sound Lab: interfaz
**Diseño / Explicación:**
La interfaz interactiva de Sound Lab en la ruta `/sound-lab` (`src/app/sound-lab/index.tsx`) se desacopló por completo de librerías con dependencias Node (`node:fs`, `node:path`), importando estrictamente desde `@tiny-aster/arcade-sound-kit/core`. Se confirmó la compilación y exportación web limpia mediante `npx expo export --platform web` (23 rutas estáticas generadas sin errores). Utiliza un único `AudioContext` reutilizado en reproducción web, renderizado con debounce al modificar parámetros, controles de seed y variantes, visualización Canvas2D de osciloscopio/espectrograma, medidores LUFS/centroide/DC y descarga directa de archivos WAV.

### Punto 19: Auditoría de calidad
**Diseño / Explicación:**
Se implementó en `packages/arcade-sound-kit/src/core/analysis.ts` el cálculo de sonoridad K-weighted LUFS real conforme al estándar ITU-R BS.1770 (utilizando dos etapas de filtrado biquad: etapa 1 de acentuación de altas frecuencias a 1500 Hz y etapa 2 de filtro pasa-alto a 38 Hz). Se extrajeron los objetivos y umbrales por categoría (`combat`, `movement`, `progression`, `ui`) al archivo de configuración `src/core/auditConfig.ts`. El comando CLI `ask-generate audit` analiza tanto `arcadePack()` como `examplesPack()`, evalúa el audio normalizado final y falla la ejecución en modo `--fail-on` ante silencios iniciales excesivos (> 20 ms), saltos anómalos de bucle (> 0.25) o desbalance DC offset.

### Punto 20: Export
**Diseño / Explicación:**
Se unificó la especificación de `CueSpec` entre `@tiny-aster/core` y `@tiny-aster/arcade-sound-kit`, mapeando el valor `pitchJitter` en semitonos. Se añadieron los comandos de línea de comandos `ask-generate cues` y `ask-generate spritesheet`. El generador de sprite sheet (`generateSpriteSheet`) produce archivos audio con pico normalizado $\le 0.95$ y especificaciones JSON formateadas en las tuplas estándar de Howler.js (`[startMs, durationMs, loop]`). Se documentó en `docs/sound-kit-decisions.md` el descarte de la exportación nativa OGG para prevenir imprecisiones de padding de códecs con pérdida en bucles musicales y de efectos.
