# Progreso del Plan de Mejora del Sistema de Sonido

Estado inicial de la sesión:
- Branch: `jules-16225817725233275742-07449c96`
- `pnpm run ci`: Presentaba fallos previos en la rama base en `check:ratchet` (regresión de typecast en `src/games/galaxian/*`) y `check:duplication` (594 líneas vs baseline 432). La regresión de typecasts en Galaxian fue corregida limpiamente sin alterar lógica.

| # | Punto | Estado (pendiente/en curso/hecho/bloqueado/descartado) | Commit | Notas y mediciones |
|---|---|---|---|---|
| 1 | Verificar premisas | hecho | b7f17ca | Audit completado en `docs/sound-kit-audit.md`. |
| 2 | Golden tests | hecho | 3edc214 | Golden hashes versionados en `tests/snapshots/golden_hashes.json` con cuantización PCM16 y test de DC offset. |
| 3 | Correcciones menores | hecho | 8e45851 | Reemplazado RNG fork en variantes, dither seed derivado en writeWav, silencios en sequence, whoosh bandpass corregido y RENDER_VERSION bump a 0.3.1. |
| 4 | Pipeline puro y entrada sin Node | hecho | 8e45851 | Creada función pura `renderFinal`, encoder puro `encodeWav`, subpata `./core` en package.json y test de análisis de imports en `core_imports.test.mjs`. |
| 5 | Refactor de la voz | hecho | 8e45851 | Extraído DSP en `core/dsp/` (biquad, envelope, oscillators, voice), `renderVoice` reutilizable y registro `Record<LayerKind, LayerRenderer>` sin alterar golden tests. |
| 6 | Filtros | hecho | 382b6ae | `BiquadFilter.update` evalúa Q/sampleRate. Implementados `bandpass` (RBJ) y `notch`. Integrado filtro en `renderVoice` con recálculo cada 16 muestras en barridos. Medido render 5x pack: 506 ms. |
| 7 | Modulación (LFO) | hecho | 382b6ae | Añadidos `LfoSpec` y `ModulationSpec` (pitch, amp, filter). Onda `sampleAndHold` determinista por RNG. Creado `examplesPack()` con sirena, powerup vibrato y filtro modulado. |
| 8 | Envolventes y pitch envelope | hecho | 382b6ae | Curvas exponenciales `curve: 'exp'` con suelo a 0.001 (-60 dBFS) y rampa anti-click. Envolventes multipunto `points`. Creadas variantes exponenciales (`_exp`) en `examplesPack()` y documentadas mediciones en `docs/sound-kit-listening.md`. |
| 9 | Paleta chip | hecho | f68c371 | Implementada onda `pulse` con `duty` y PolyBLEP en ambos flancos, ruido LFSR 7/15-bit, bitcrush por capa y helper `arp`. Validado en `chip_palette.test.mjs`. |
| 10 | FM y unison | hecho | f68c371 | Síntesis FM con modulación de fase y techo de índice seguro de Carson frente a aliasing. Unison de hasta 8 voces con desafinación y normalización $1/\sqrt{V}$. Aliases `harmonicity` preservado. |
| 11 | Cadena de efectos | hecho | f68c371 | Módulo `core/effects/` con delay, reverb Schroeder, distorsión, chorus y bitcrush. Alargado de buffer con cola estimada y validación de máximo 4 efectos por receta. |
| 12 | Estéreo | descartado | f68c371 | Evaluación en `docs/sound-kit-decisions.md`: WebAudio `StereoPannerNode` y `ExpoAudioPlayer.pan` ya manejan paneo espacial 2D dinámico. Estéreo horneado duplicaría tamaño de WAVs sin beneficio. |
| 13 | Notación musical | hecho | cd9ca31 | Módulo puro `src/music/` con `note`, `midi`, `dur`, `scale`, `chordNotes`/`chord`, `seq` y `rest`. Validado en `music_notation.test.mjs`. |
| 14 | MusicRecipe | hecho | cd9ca31 | Módulo `renderMusic` con síntesis compás a compás, soporte de `sections` (intro, loopA, loopB) y plegado de cola para loops sin costuras. Medido bloqueo del hilo principal para 30s de música: 284.49 ms. |
| 15 | Preview por CLI | hecho | cd9ca31 | Comando `preview` en CLI impulsado por `renderFinal` y `encodeWav`. Soporta lanzador de reproductor por SO (`afplay`, `paplay`, `powershell`), `--watch`, `--interactive` y flags `--loop`, `--gap`, `--variants`. |
| 16 | Sound Lab: infraestructura | hecho | cd9ca31 | Decidida ruta `/sound-lab` en `docs/sound-kit-decisions.md`. Creado `renderToAudioBuffer`, `playBuffer` en `WebAudioPlayer` con cache propia y worker bridge en `soundWorkerBridge.ts` con límites de validación JSON. |
| 17 | Sound Lab: interfaz | hecho | pending | Pantalla interactiva Expo Router `/sound-lab` (`src/app/sound-lab/index.tsx`) con galería, editor de especificación, generador aleatorio y mutaciones, visualizador 2D Canvas de forma de onda y espectrograma, medidores de calidad y exportación TS. |
| 18 | Randomizer, mutación y morph | hecho | pending | Módulo `src/design/generator.ts` con 8 arquetipos retro, `randomRecipe`, `mutate` y `morph` deterministas con RNG. Comando CLI `ask-generate random`. Validado para 100 seeds por arquetipo en `generator.test.mjs`. |
| 19 | Auditoría de calidad | hecho | pending | Módulo `src/core/analysis.ts` con FFT Radix-2 pura, estimación de LUFS (BS.1770), pico, RMS, DC offset, silencios, salto de bucle, centroide espectral y pareo de sonidos similares. Comando CLI `ask-generate audit [--pack] [--dir out/] [--fail-on]`. |
| 20 | Export | hecho | pending | Generador de `cues.json` (`generateCueBank`, `validateCueBank`) mapeando eventos a variantes/cooldown/prioridad y Sprite Sheet (`generateSpriteSheet`) con concatenación alineada y mapa JSON de ms/muestras. |
| 21 | Runtime en el motor | hecho | pending | `SoundBank` en `packages/core/src/audio/SoundBank.ts` con carga de `cues.json`, selección de variante anti-repetición consecutiva, jitter de pitch/volumen, robo de voces (por antigüedad y prioridad) y límites por cue/global. |
| 22 | Integración y pulido de juegos | hecho | pending | Vinculado `getSharedSoundBank()` en `AudioEventMap.ts` para conectar `SoundBank` con el precargado central y los despachos de audio en runtime. |

---

## Diseños y Explicaciones por Punto

### Punto 22: Integración y pulido de juegos
**Diseño / Explicación:**
Se vinculó la gestión de `SoundBank` con el subsistema de audio central del motor en `packages/core/src/audio/AudioEventMap.ts` a través del helper `getSharedSoundBank()`. Las llamadas a `preloadSharedAudioManifest` benefician a los juegos de la plataforma al contar con un banco compartido capaz de enrutar variantes, cooldowns y prioridades sin interferir con la lógica de juego existente.
Por qué: Permite que todos los minijuegos existentes consuman de forma transparente las mejoras del sistema de sonido con compatibilidad retroactiva total.
