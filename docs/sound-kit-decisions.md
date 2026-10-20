# Decisiones del Sistema de Sonido

## 1. Evaluación de Estéreo Horneado en Archivos SFX (Punto 12)

**Pregunta:** ¿Merece la pena hornear canales estéreo en los archivos de sonido offline (WAV) de SFX?

**Análisis del Motor (`packages/core/src/audio/WebAudioPlayer.ts` y `packages/react-native/src/audio/ExpoAudioPlayer.ts`):**
1. Tanto `WebAudioPlayer` (`ctx.createStereoPanner()`) como `ExpoAudioPlayer` (`player.pan`) ya gestionan el paneo y atenuación espacial 2D de forma dinámica en tiempo de ejecución mediante la función `playSpatialSFX(id, x, y, listenerX, listenerY, maxDistance)`.
2. Hornear estéreo en los archivos WAV duplica el tamaño en disco y el consumo de memoria RAM (+100%) de todos los SFX, afectando negativamente los tiempos de carga.
3. El estéreo horneado fijaría un paneo estático en el archivo, anulando la capacidad del motor de adaptar la posición espacial según la cámara o movimiento de entidades.

**Decisión:** **Descartado.** Los SFX se mantienen en mono (1 canal). El posicionamiento espacial dinámico en runtime satisface completamente las necesidades de paneo estéreo. El estéreo horneado sólo se justificará en fases futuras para piezas musicales (`MusicRecipe`) y pistas de ambiente compuestas.

---

## 2. Arquitectura de Sound Lab: Ruta vs Paquete (Punto 16)

**Pregunta:** ¿Cómo debe montarse la aplicación de Sound Lab, como ruta `/sound-lab` en la aplicación web existente o como paquete `packages/sound-lab`?

**Análisis de la Estructura de la App:**
1. La aplicación principal utiliza Expo Router (`app/` / `expo-router/`), donde residen todas las interfaces de los minijuegos y herramientas interactivas.
2. Montar Sound Lab como ruta `/sound-lab` dentro de la aplicación principal permite la ejecución inmediata en el navegador mediante `http://localhost:8081/sound-lab`, compartiendo los componentes UI (`shadcn/ui`), el `AudioContext` de la app y el paquete `@tiny-aster/arcade-sound-kit` sin sobrecoste de compilación ni dependencias circulares.

**Decisión:** **Ruta `/sound-lab` en la App.** Se implementa la interfaz en la ruta de Expo Router `/sound-lab` aprovechando la infraestructura de renderizado en Web Worker exportada por `@tiny-aster/arcade-sound-kit`.
