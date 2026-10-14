# Guía de Uso: Transiciones de Cutscene e Intros de Minijuegos en CampaignScreen

Esta guía explica cómo configurar y aprovechar las transiciones visuales en nodos de tipo `cutscene` y las animaciones de `intro` previas al inicio de minijuegos en la arquitectura de campañas de TinyAster (`CampaignScreen`).

---

## 1. Transiciones de Cutscene (`transitionEffect`)

### ¿Qué son?
Los nodos de tipo `cutscene` (`StoryTypes.Cutscene`) pueden especificar un efecto visual de entrada mediante la propiedad `transitionEffect`. Este efecto se renderiza como un overlay animado breve (≤ 600 ms) impulsado por Reanimated (`CutsceneTransitionOverlay`) antes o durante la presentación del diálogo narrativo.

### Configuración en `StoryGraph`

Para utilizar una transición en un nodo `cutscene`, define la clave `transitionEffect` en la propiedad `cutscene` del nodo:

```typescript
const introCutsceneNode: StoryNode = {
  id: "node_cutscene_kepler_01",
  type: "cutscene",
  title: "campaign.kepler_intro_title",
  cutscene: {
    id: "cs_kepler_01",
    transitionEffect: "CRTGlitchTransition", // Clave del registro o alias
    dialogueQueue: [
      {
        id: "line_1",
        speakerName: "COMMANDER",
        textKey: "campaign.kepler_line_1"
      }
    ]
  },
  transitions: [
    {
      targetNodeId: "node_gameplay_asteroids"
    }
  ]
};
```

### Efectos Soportados (`TransitionRegistry`)

El sistema incluye un adaptador de presentación (`CUTSCENE_TRANSITION_MAP`) que mapea todas las claves de `TransitionRegistry` y sus alias de clase:

| Clave / Alias | Preset Animación | Propósito Recomendado |
|---|---|---|
| `fade` / `FadeTransition` | Fade / Blurring | Transición suave estándar entre escenas narrativas. |
| `crt` / `CRTGlitchTransition` | CRT Glitch & Scale | Interrupciones de transmisión, interferencias o señales alienígenas. |
| `danger` / `DangerPulseTransition` | Flash Rojo / Alerta | Situaciones de peligro inminente, ataques o emergencias. |
| `iris` / `IrisTransition` | Iris Zooming | Enfoque focal en un personaje o punto de interés. |
| `pixelate` / `PixelateTransition` | Pixelated Dither | Fallos de simulación, teletransporte o corrupción de datos. |
| `scanline` / `ScanlineWipeTransition` | Scanline Sweep | Pantallas retro, consolas tácticas o radares. |
| `curtain` / `CurtainTransition` | Curtain Slide | Apertura/cierre de capítulos o fases de historia. |
| `grid` / `RetroGridTransition` | Retro Grid Matrix | Entradas a entornos de realidad virtual o ciberespacio. |
| `diagonal` / `DiagonalSweepTransition` | Diagonal Sweep | Transición dinámica de acción o movimiento rápido. |

### Tolerancia a Fallos y Rendimiento
- **Efectos no reconocidos:** Si se especifica un nombre no registrado (ej. `"UnknownGlitch"`), el sistema emite un aviso en consola (`console.warn`) **una sola vez por nombre de efecto** y degrada automáticamente al perfil `"fade"`, garantizando que la campaña nunca se bloquee.
- **Transición ausente (`undefined`/`""`):** Salta la animación de overlay y presenta directamente el diálogo.
- **Accesibilidad (`reduceMotion`):** Si el usuario tiene activa la preferencia de reducción de movimiento, las animaciones se omiten instantáneamente.

---

## 2. Fase de Intro de Minijuegos (`introEffect` e `introTitle`)

### ¿Qué es?
Antes de iniciar la ejecución de la simulación de cualquier minijuego en `switchGame`, el sistema ejecuta una fase intermedia denominada `intro` (`CampaignScreenPhase` `{ kind: "intro" }`).
Durante esta fase:
1. El minijuego se inicializa (`newGame.init()`) y sus modificadores narrativos son calculados.
2. La simulación **permanece en pausa** (`activeGame` se mantiene en `null` hasta que la intro concluye).
3. Se despliega un banner de presentación animado (`MinigameIntroOverlay`) con una duración breve (≤ 800 ms) indicando `"READY?"` seguido del título del juego y el efecto activo.

### Configuración en `node.meta`

Puedes personalizar el título y el efecto visual de la intro definiendo `introTitle` e `introEffect` en la propiedad `meta` del nodo de tipo `gameplay`:

```typescript
const gameplayKeplerNode: StoryNode = {
  id: "node_gameplay_asteroids",
  type: "gameplay",
  sceneToLoad: "asteroids",
  meta: {
    introTitle: "ESCAPE DE KEPLER-186",
    introEffect: "OVERDRIVE TÁCTICO",
    encounterId: "escape_route_01"
  },
  objective: {
    id: "obj_survive_kepler",
    titleKey: "campaign.obj_survive",
    targetCount: 15,
    currentCount: 0
  }
};
```

### Comportamiento por Defecto
- **Sin `introTitle`:** Muestra el ID del minijuego en mayúsculas (ej. `"ASTEROIDS"`, `"ECHORUNNER"`).
- **Sin `introEffect`:** No muestra la etiqueta secundaria de efecto.
- **Duración:** Banner dinámico de 750 ms (≤ 800 ms) sin alterar la semilla determinista (`seed`) ni el progreso del `ArcadeOrchestrator`.

---

## 3. Ejemplo Completo de Flujo Narrativo

```typescript
import { StoryGraph } from "@tiny-aster/core";

export const sampleCampaignGraph: StoryGraph = {
  id: "sample_campaign_graph",
  entryNodeId: "node_cs_intro",
  nodes: {
    node_cs_intro: {
      id: "node_cs_intro",
      type: "cutscene",
      cutscene: {
        id: "cs_01",
        transitionEffect: "CRTGlitchTransition",
        dialogueQueue: [
          {
            id: "line_1",
            speakerName: "IA DE ANAVEO",
            textKey: "Alerta: Anomalía detectada en el sector Kepler."
          }
        ]
      },
      transitions: [{ targetNodeId: "node_gp_asteroids" }]
    },
    node_gp_asteroids: {
      id: "node_gp_asteroids",
      type: "gameplay",
      sceneToLoad: "asteroids",
      meta: {
        introTitle: "SECTOR KEPLER 186-F",
        introEffect: "ESCUDOS AL 150%"
      }
    }
  }
};
```

---

## 4. Máquina de Estados de Fases (`useCampaignScreenPhase`)

El hook `useCampaignScreenPhase` deriva reactivamente la fase activa de la pantalla de campaña:

```
[ NARRATIVE_INTRO ] ──(Seleccionar / Avanzar)──> [ LOADING ] ──(Minijuego init)──> [ INTRO ] ──(800ms)──> [ GAMEPLAY ]
```

Cada fase aísla responsabilidades de la UI, asegurando que el bucle del juego sólo avance cuando el usuario entra en la fase `gameplay`.
