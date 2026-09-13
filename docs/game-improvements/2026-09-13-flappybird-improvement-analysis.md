# Análisis de mejoras — Flappy Bird

**Fecha**: 2026-09-13
**Versión del análisis**: 1
**Juego**: `flappybird`

---

## 1. Diagnóstico actual

### Qué funciona bien
- **Dirección de Arte Neon Void & Hard Sci-Fi**: La estética futurista / industrial de nave "Interceptor" con alas tipo punta de flecha, propulsores termonucleares, megasestructuras espaciales abandonadas en parallax y tubos de contención industrial ("Containment Towers") se aleja brillantemente del clásico pájaro amarillo de caricatura, dándole un tono sobrio y pulido al juego.
- **Sistemas Modernos de Game Feel Integrados**: Cuenta con mecánicas refinadas como Coyote Time en colisiones contra tubos, sistema de Near Miss (rozar tuberías a corta distancia concede puntos de bonificación y chispas cibernéticas) y sistema de estabilización/planeo (Glide system).
- **Paridad Visual Dual (Canvas2D + Skia)**: Ambos renderizadores implementan exactamente las mismas funciones de renderizado, físicas de chispas (`VisualParticle` pool), gradientes en caché y efectos de distorsión por velocidad/warp.
- **ECS Determinista & Netcode Ready**: Arquitectura limpia basada en `@tiny-aster/core`, soporte para snapshot multiplayer interpolation (`syncEntitiesFromServer`), pooling de componentes y `world.gameplayRandom` para spawns procedurales.

### Principales debilidades / oportunidades (priorizadas)

1. **Monotonía en el Core Loop (Falta de Dinamismo en los Obstáculos)**:
   - *Diagnóstico*: Actualmente todas las tuberías se mueven a una velocidad horizontal estática constante (`PIPE_SPEED = 120`) y sólo varían visualmente (`standard`, `damaged`, `rusted`). No existen tuberías móviles verticalmente, compuertas pulsantes, ni peligros dinámicos (torretas láser o barreras de energía).
   - *Impacto*: Tras 15-20 tubos, el gameplay cae en un patrón altamente repetitivo donde la única dificultad es el ritmo mecánico de los impulsos.

2. **Feedback Incompleto en Mecánica de Planeo (Glide System)**:
   - *Diagnóstico*: Mantener presionado para planear (`glide`) aplica una fuerza leve ascendente contraria a la gravedad, pero carece de un feedback visual y sonoro impactante (la estela de propulsión es tenue y sutil). El jugador no siente la resistencia de fluidos aerodinámicos ni la transición de poder.

3. **Falta de Variación de Eventos / Fases de Misión**:
   - *Diagnóstico*: Al igual que otros arcades retro modernos del ecosistema (Space Invaders, Asteroids), carece de sectores de peligro temporales o eventos de oleada ("Void Storms", "Warp Boost Zones", o minijefes de tuberías automatizadas).

4. **Potencial de Meta-progresión y Desafíos Exponenciales**:
   - *Diagnóstico*: Aunque el `ComboSystem` incrementa el multiplicador de puntuación cada 5 tuberías superadas, no hay modificación procedural del entorno en rachas altas (ej. contracción de gap, cambio de iluminación ambiental o distorsión cromática por velocidad extrema).

---

## 2. Mejoras concretas (priorizadas)

### 1. Sistema de Obstáculos Dinámicos y Tipos de Tuberías Industriales
- **Descripción**: Introducir 3 variaciones mecánicas de tuberías manejadas proceduralmente en `FlappyBirdGameStateSystem` mediante tipos de entidad ECS:
  - `OscillatingPipe`: Tubería con movimiento sinusoidal vertical ajustado por fase y amplitud determinista.
  - `LaserGatePipe`: Tubería con barrera láser central que se activa/desactiva rítmicamente.
  - `NarrowGapPipe`: Tubería con gap reducido pero mayor recompensa de puntos y multiplicador de combo (+2x).
- **Impacto esperado**: *Depth*: Alto | *Feel*: Alto
- **Dificultad de implementación**: Media
- **Archivos / sistemas probablemente afectados**:
  - `src/games/flappybird/types/FlappyBirdTypes.ts`
  - `src/games/flappybird/EntityFactory.ts`
  - `src/games/flappybird/systems/FlappyBirdGameStateSystem.ts`
  - `src/games/flappybird/rendering/FlappyBirdCanvasVisuals.ts`
  - `src/games/flappybird/rendering/FlappyBirdSkiaVisuals.ts`
- **Cambios clave**:
  ```typescript
  export interface PipeComponent extends Component {
    type: "Pipe";
    gapY: number;
    gapSize: number;
    scored: boolean;
    visualVariant?: "standard" | "damaged" | "rusted";
    movementType?: "static" | "oscillating" | "laser_gate";
    oscillationSpeed?: number;
    oscillationAmplitude?: number;
    laserActive?: boolean;
  }
  ```

### 2. Juiciness del Glide & Afterburner Energy Meter
- **Descripción**: Agregar una barra de energía o sobrecalentamiento para la habilidad de planeo (`Glide`), acompañada por efectos visuales deslumbrantes (estela de distorsión por calor, chispas traseras continuas y modulación de pitch de sonido).
- **Impacto esperado**: *Feel*: Máximo | *Depth*: Medio
- **Dificultad de implementación**: Baja-Media
- **Archivos / sistemas probablemente afectados**:
  - `src/games/flappybird/systems/FlappyBirdGlideSystem.ts`
  - `src/games/flappybird/types/FlappyBirdTypes.ts`
  - `src/games/flappybird/rendering/FlappyBirdCanvasVisuals.ts`
  - `src/games/flappybird/rendering/FlappyBirdSkiaVisuals.ts`

### 3. Eventos Ambientales Procedurales ("Sector Hazards")
- **Descripción**: Cada 15 tuberías superadas, activar un evento de sector durante 5 segundos:
  - **Solar Flare**: Iluminación rojiza con turbulencia gravitacional leve.
  - **Asteroid Debris Storm**: Pequeños fragmentos voladores en dirección opuesta (destruibles o esquivables con Near Miss).
  - **Hyper-Warp Zone**: Multiplicador de velocidad de tuberías x1.5 con multiplicador de combo x3 y efecto de líneas de velocidad radial (SharedVFX).
- **Impacto esperado**: *Retention*: Alto | *Depth*: Alto
- **Dificultad de implementación**: Media
- **Archivos / sistemas probablemente afectados**:
  - `src/games/flappybird/systems/FlappyBirdGameStateSystem.ts`
  - `src/games/flappybird/rendering/FlappyBirdBackgroundData.ts`

### 4. Sistema de Desafíos y Misiones Intercaladas (Gameplay Kit Integration)
- **Descripción**: Integrar formalmente `src/games/shared/missions/` en Flappy Bird para recompensar desafíos específicos durante las partidas arcade (ej. "Realiza 3 Near Misses seguidos", "Vuela 10 tuberías sin usar Glide", "Consigue combo x4").
- **Impacto esperado**: *Retention*: Máximo | *Meta-prog*: Alto
- **Dificultad de implementación**: Baja
- **Archivos / systems afectados**:
  - `src/games/flappybird/FlappyBirdGame.ts`
  - `src/games/flappybird/systems/FlappyBirdGameStateSystem.ts`

---

## 3. Plan de implementación sugerido

1. **Fase 1: Enriquecimiento de Obstáculos (Core Gameplay Depth)**
   - Extender `PipeComponent` con `movementType` y parámetros de oscilación determinista.
   - Actualizar `FlappyBirdGameStateSystem` para aplicar el movimiento vertical en tuberías de movimiento.
   - Probar en unit tests la integridad de las cajas de colisión AABB y determinismo en snapshots.

2. **Fase 2: Refuerzo de Juice & Visual FX (Glide & Laser Gates)**
   - Añadir dibujadores de barrera láser y chispas de retro-propulsión continua en `FlappyBirdCanvasVisuals` y `FlappyBirdSkiaVisuals`.
   - Agregar respuesta háptica y sonido de resonancia de propulsor.

3. **Fase 3: Eventos Ambientales de Sector & Integración de Misiones**
   - Implementar el estado de sector ambiental en `FlappyState` y disparar eventos de transición con banners HUD.
   - Registrar las mini-misiones en la carga del juego.

---

## 4. Ideas "wow" / diferenciadoras

1. **"Chronos Glide" / Bullet Time Near-Miss**:
   - Al realizar un Near Miss perfecto (distancia < 5px del borde de la tubería), el juego entra momentáneamente en cámara lenta (slo-mo al 40% de velocidad durante 0.4s) mediante distorsión temporal de `World.update`, permitiendo maniobras imposibles y otorgando la sensación de maniobra táctica de combate.

2. **Boss Encounter: "The Void Excavator"**:
   - En el nivel/sector 50, en lugar de tuberías tradicionales, una nave taladradora gigante ("Void Excavator") persigue al jugador o emite rayos destruibles por los cuales el jugador debe volar a través de apertures dinámicas.

3. **Cosmetic Propulsion Trails Unlocks**:
   - Integración con MetaProgressionService para desbloquear estelas de plasma (Plasma Cyan, Thermonuclear Crimson, Antimatter Violet, Solar Gold) según logros y combos alcanzados.

---

## 5. Notas técnicas / riesgos

- **Determinismo e Iteraciones ECS**:
  - Toda oscilación vertical o evento procedural DEBE usar `world.gameplayRandom` o funciones trigonométricas puras basadas en `world.tick` / tiempo acumulado determinista de la simulación. Queda estrictamente prohibido el uso de `Math.random()`.
- **Boundaries del Core**:
  - Ningún nuevo componente o sistema debe importar bibliotecas de renderizado nativo o frameworks de plataforma (`React Native`, `Skia`, `Expo`). Las funciones de renderizado deben permanecer en `rendering/` y suscribirse mediante la interfaz genérica `Renderer`.
- **Pooling y Garbage Collection**:
  - Garantizar que las partículas de chispas y shard creadas por nuevos peligros reutilicen el pool estático `PARTICLE_POOL` de 150 elementos ya configurado en los visuales para evitar asignaciones de memoria en hot-loops de 60 FPS.

---

**Análisis guardado en: `docs/game-improvements/2026-09-13-flappybird-improvement-analysis.md`**
