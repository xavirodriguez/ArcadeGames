# Análisis de mejoras — Pong Cyberpunk / Neon Arena

**Fecha**: 2026-09-14
**Versión del análisis**: 1
**Juego**: `pong`

---

## 1. Diagnóstico actual

### Qué funciona bien
- **Física de Spin & Transmitancia de Inercia**: El cálculo de efecto (`spinFactor`) derivado de la velocidad relativa de la paleta al momento del impacto agrega una capa táctica donde el jugador puede imprimir curva y aceleración angular a la bola.
- **Micro-Juice & Sensación de Impacto**: Implementación sólida de hit-stop (60ms freeze), deformación elástica de paletas (`Juice.squash`), temblor de pantalla focalizado (`Juice.shake`) y partículas de colisión cibernética vectoriales con paridad en renderizadores duales (Canvas2D + Skia).
- **Red de Reducción & Netcode Authoritative Ready**: Integración con `NetworkController`, sincronización por deltas/ticks en multijugador online, y soporte para guardrails de velocidad máxima en la bola (`PongVelocityGuardrailSystem`).
- **Escudo Temporal & Transición de Gol**: La congelación de transición de 1.2 segundos tras un anotado (`scoreFreezeRemaining`) evita reinicios abruptos y la mecánica de `shieldPulseRemaining` (modificador de mutador) le da un matiz defensivo único.

### Principales debilidades / oportunidades (priorizadas)

1. **Monotonía y Rigidez del Campo de Juego (Core Loop Staticity)**:
   - *Diagnóstico*: El campo de juego es una cancha rectangular estática sin obstáculos interactivos, zonas de aceleración gravitacional o barreras sectoriales. A niveles de combo elevados o tras varios puntos, la dinámica se mantiene idéntica salvo por el incremento lineal de velocidad de bola (`BALL_ACCELERATION = 1.05`).
   - *Impacto*: Las partidas prolongadas caen en monotonía y fatiga visual, restándole rejugabilidad arcade.

2. **Inexistencia de Habilidades Activas / Disparos Tácticos**:
   - *Diagnóstico*: El jugador únicamente se desplaza en el eje Y. No existen habilidades activas con cooldown (ej. `Dash` vertical rápido, `Energy Shield` síncrono, o `Overcharge Slam` para devolver bolas hiper-veloces).

3. **Subutilización del Sistema de Combos y Meta-progresión**:
   - *Diagnóstico*: Aunque `ComboSystem` incrementa el multiplicador (`multiplier = 1 + floor(combo / 5)`), el valor actual de racha solo otorga puntos pasivos. No desencadena cambios de arena ("Hyper Zone"), distorsiones visuales dramáticas ni desbloqueo de modifiers dinámicos durante el intercambio rally.

4. **Feedback de Eventos de Gol & Audio Sostenido**:
   - *Diagnóstico*: La animación de gol consiste en una explosión de partículas en el borde, pero falta un flash estroboscópico de victoria/derrota de rally, banner de anuncio tipo arcade retro en HUD y variación armónica progresiva del audio de rebote a medida que sube la velocidad del intercambio (rally count pitch shift).

---

## 2. Mejoras concretas (priorizadas)

### 1. Zonas del Campo Modificables Proceduralmente ("Cyber Arenas & Kinetic Hazards")
- **Descripción**: Introducir peligros y zonas kinetic en el centro del campo de juego en modos arcade/campaña:
  - `GravityWell`: Núcleo en el centro del campo que curva la trayectoria de la bola por atracción gravitacional determinista.
  - `WarpPortalPair`: Pareja de portales vectoriales que teletransportan la bola conservando vector de velocidad.
  - `BumperNode`: Nodos de rebote neon en la línea media que aceleran la bola y cambian su color al ser impactados.
- **Impacto esperado**: *Depth*: Máximo | *Feel*: Alto | *Retention*: Alto
- **Dificultad de implementación**: Media
- **Archivos / sistemas probablemente afectados**:
  - `src/games/pong/types.ts`
  - `src/games/pong/EntityFactory.ts`
  - `src/games/pong/systems/PongCollisionSystem.ts`
  - `src/games/pong/rendering/PongCanvasVisuals.ts`
  - `src/games/pong/rendering/PongSkiaVisuals.ts`
- **Cambios clave (pseudocódigo)**:
  ```typescript
  export interface FieldHazardComponent extends Component {
    type: "FieldHazard";
    hazardType: "gravity_well" | "warp_portal" | "bumper";
    radius: number;
    forceStrength?: number;
    targetPortalId?: string;
  }
  ```

### 2. Habilidad Activa: "Cyber Dash" & "Overcharge Block"
- **Descripción**: Añadir una acción secundaria por jugador (teclas `Shift` / `Space` o botón dedicado):
  - `Cyber Dash`: Impulso vertical instantáneo de corta distancia con cooldown de 3 segundos y estela de sombra cromática.
  - `Overcharge Impact`: Si se presiona justo en el micro-instante del impacto contra la bola, devuelve una "Hyper Ball" con ráfaga de fuego azul/magenta que ignora los rebotes normales y viaja a 1.5x de velocidad.
- **Impacto esperado**: *Feel*: Máximo | *Depth*: Alto
- **Dificultad de implementación**: Media
- **Archivos / sistemas probablemente afectados**:
  - `src/games/pong/types.ts`
  - `src/games/pong/systems/PongInputSystem.ts`
  - `src/games/pong/systems/PongCollisionSystem.ts`
  - `src/games/pong/rendering/PongCanvasVisuals.ts`

### 3. Sistema Dinámico de Modulación de Pitch en Audio ("Rally Pitch Escalation")
- **Descripción**: Interceptar el evento `PlaySFX` para la señal `"hit"` en `PongCollisionSystem` modulando el parámetro `pitch` exponencialmente en función de la longitud del rally actual (`combo.combo`), elevando la tensión armónica a medida que el intercambio se prolonga.
- **Impacto esperado**: *Feel*: Alto | *UX*: Alto
- **Dificultad de implementación**: Baja
- **Archivos / sistemas probablemente afectados**:
  - `src/games/pong/systems/PongCollisionSystem.ts`
  - `@tiny-aster/core` (`AudioEventMap.ts` integration via `resolveAudioOptions`)

### 4. Integración de Mini-Misiones Arcade (Gameplay Kit MissionSystem)
- **Descripción**: Conectar `MissionSystem` de `src/games/shared/missions/` en `PongGame.ts` proponiendo misiones en tiempo real:
  - "Logra un rally de 15 rebotes sin anotar ni recibir gol."
  - "Ejecuta 3 rebotes con spin máximo (> 1.5 spinFactor)."
  - "Anota un gol mientras el escudo defensivo esté activo."
- **Impacto esperado**: *Retention*: Máximo | *Meta-prog*: Alto
- **Dificultad de implementación**: Baja
- **Archivos / sistemas probablemente afectados**:
  - `src/games/pong/PongGame.ts`
  - `src/games/pong/systems/PongGameStateSystem.ts`

---

## 3. Plan de implementación sugerido

1. **Fase 1: Mecánicas de Campo Dinámico & Hazards (Core Gameplay Depth)**
   - Crear componentes de `FieldHazard` y `GravityWellSystem`.
   - Modificar `PongCollisionSystem` para detectar rebotes en bumper nodes y portales de distorsión.
   - Probar determinismo con tests de física en `src/games/pong/__tests__/`.

2. **Fase 2: Habilidad Activa "Cyber Dash" & Estelas Visuales**
   - Extender `PongInput` para soportar acciones de Dash (`p1Dash`, `p2Dash`).
   - Implementar la lógica de impulso en `PongInputSystem` y añadir sombras de movimiento en `PongCanvasVisuals` / `PongSkiaVisuals`.

3. **Fase 3: Refuerzo Audiovisual de Rally & Misiones Arcade**
   - Modular el pitch del audio de colisión por racha de rally.
   - Registrar `PongMissions` e integrarlas en el ciclo de vida de `PongGame`.

---

## 4. Ideas "wow" / diferenciadoras

1. **"Multiball Surge" Overdrive**:
   - Al alcanzar un combo de rally de 20 impactos, la bola principal se divide en 3 bolas espectrales con colores neon diferenciados. Anotar con cualquiera suma puntos, pero el rally exige reflejos sobrehumanos en ambos lados del campo.

2. **"Cyber Wall Shatter" Arena**:
   - En lugar de límites rectos superior e inferior, los bordes están compuestos por bloques de energía destructibles (estilo Arkanoid / Breakout). Romper un bloque de borde abre grietas gravitacionales donde la bola reacciona en ángulos impredecibles.

3. **Dynamic Synthwave Visual Theme Sync**:
   - La iluminación de la rejilla de fondo (`drawPongBackground`) y las líneas del campo laten al ritmo del tempo y velocidad de la bola, acelerando las pulsaciones vectoriales conforme el rally se vuelve épico.

---

## 5. Notas técnicas / riesgos

- **Determinismo e Iteraciones en Física**:
  - La atracción de `GravityWell` o el cálculo de vectores en portales DEBEN usar matemática vectorial pura basada en float32/64 determinista sin invocar `Math.random()`. Si se requieren desvíos de ángulo, deben ser generados exclusivamente mediante `world.gameplayRandom`.
- **Boundaries de Arquitectura Core**:
  - Ningún nuevo componente debe romper la independencia del motor (`@tiny-aster/core`). Mantener la lógica de dibujado en `rendering/PongCanvasVisuals.ts` y `rendering/PongSkiaVisuals.ts` con paridad total de características.
- **Prevención de fugas de memoria & Pooling**:
  - Toda estela visual o fragmentación de partículas generada por el `Cyber Dash` debe canalizarse a través de `createEmitter` con componentes de `TTL` para asegurar recolección limpia en el buffer ECS.

---

**Análisis guardado en: `docs/game-improvements/2026-09-14-pong-improvement-analysis.md`**
