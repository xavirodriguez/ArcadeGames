# Decisiones del Sistema de Sonido (Punto 12)

## Evaluación de Estéreo Horneado en Archivos SFX

**Pregunta:** ¿Merece la pena hornear canales estéreo en los archivos de sonido offline (WAV) de SFX?

**Análisis del Motor (`packages/core/src/audio/WebAudioPlayer.ts` y `packages/react-native/src/audio/ExpoAudioPlayer.ts`):**
1. Tanto `WebAudioPlayer` (`ctx.createStereoPanner()`) como `ExpoAudioPlayer` (`player.pan`) ya gestionan el paneo y atenuación espacial 2D de forma dinámica en tiempo de ejecución mediante la función `playSpatialSFX(id, x, y, listenerX, listenerY, maxDistance)`.
2. Hornear estéreo en los archivos WAV duplica el tamaño en disco y el consumo de memoria RAM (+100%) de todos los SFX, afectando negativamente los tiempos de carga.
3. El estéreo horneado fijaría un paneo estático en el archivo, anulando la capacidad del motor de adaptar la posición espacial según la cámara o movimiento de entidades.

**Decisión:** **Descartado.** Los SFX se mantienen en mono (1 canal). El posicionamiento espacial dinámico en runtime satisface completamente las necesidades de paneo estéreo. El estéreo horneado sólo se justificará en fases futuras para piezas musicales (`MusicRecipe`) y pistas de ambiente compuestas.
