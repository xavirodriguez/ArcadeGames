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
| 6 | Filtros | pendiente | | |
| 7 | Modulación (LFO) | pendiente | | |
| 8 | Envolventes y pitch envelope | pendiente | | |
| 9 | Paleta chip | pendiente | | |
| 10 | FM y unison | pendiente | | |
| 11 | Cadena de efectos | pendiente | | |
| 12 | Estéreo | pendiente | | |
| 13 | Notación musical | pendiente | | |
| 14 | MusicRecipe | pendiente | | |
| 15 | Preview por CLI | pendiente | | |
| 16 | Sound Lab: infraestructura | pendiente | | |
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
- 3c: `sequence` soporta silencios cuando `frequency === 0` o `rest: true`, avanzando el tiempo sin inyectar tono de 10 Hz. Validado en `sequence_rest.test.mjs`.
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
