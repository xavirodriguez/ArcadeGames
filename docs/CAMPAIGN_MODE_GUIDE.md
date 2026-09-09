# Campaign Mode Developer Guide

Campaign Mode orchestrates multi-game arcade progression using a data-driven story runtime engine (`StoryRuntime`), single-pipeline result evaluator (`ArcadeOrchestrator`), and pure simulation instances (`BaseGame`).

---

## 🏗️ Architecture Overview

The campaign pipeline decouples story logic from minigame simulation:

1. **`StoryRuntime`**: Maintains narrative graph state, boolean flags, variables, objectives, and node transitions.
2. **`MiniGameEncounterRegistry`**: Maps `encounterId` or `gameId` to declarative `MiniGameEncounter` definitions containing modifier rules and outcome rules.
3. **`MiniGameModifierResolver`**: Evaluates active `StoryRuntime` state against encounter `modifierRules` to produce pure `MiniGameModifier` objects.
4. **`ArcadeOrchestrator`**: Coordinates run creation (`startRun`), state transitions (`ArcadeKernel`), and result submission (`submitResult`).
5. **`BaseGame`**: Pure ECS simulation instance running the game loop and returning structured `MiniGameResult` via `getMiniGameResult()`.

---

## 📜 Defining a Story Graph

Story graphs are defined using TypeScript or JSON matching the `StoryGraph` interface:

```typescript
import { StoryGraph } from "@tiny-aster/core";

export const myCampaignGraph: StoryGraph = {
  id: "my_campaign",
  title: "Orbital Recon",
  entryNodeId: "intro_dialogue",
  nodes: {
    intro_dialogue: {
      id: "intro_dialogue",
      type: "dialogue",
      title: "Incoming Transmission",
      dialogue: {
        id: "dlg_intro",
        lines: [
          { speakerName: "AI", textKey: "campaign.intro_line_1" }
        ]
      },
      transitions: [{ targetNodeId: "act1_gameplay" }]
    },
    act1_gameplay: {
      id: "act1_gameplay",
      type: "gameplay",
      title: "Asteroid Clearance",
      sceneToLoad: "asteroids",
      checkpoint: true,
      meta: {
        encounterId: "poc-asteroids-1"
      },
      objective: {
        id: "clear_asteroids_obj",
        titleKey: "Clear sector",
        descriptionKey: "Destroy 3 asteroid waves",
        targetCount: 3,
        currentCount: 0,
        completed: false
      },
      transitions: [{ targetNodeId: "victory_ending" }]
    },
    victory_ending: {
      id: "victory_ending",
      type: "cutscene",
      title: "Mission Accomplished",
      isEndNode: true,
      cutscene: {
        id: "cs_victory",
        dialogueQueue: [
          { speakerName: "AI", textKey: "campaign.victory_line" }
        ]
      }
    }
  }
};
```

---

## ⚡ Defining Encounters & Rules

Encounters link narrative story nodes to minigames:

```typescript
import { MiniGameEncounter } from "@tiny-aster/core";

export const myEncounter: MiniGameEncounter = {
  id: "poc-asteroids-1",
  gameId: "asteroids",
  baseConfig: {
    difficulty: "normal"
  },
  modifierRules: [
    {
      id: "heroic_assist_rule",
      condition: (snap) => snap.flags.heroicEntry === false,
      modifier: {
        id: "nav_assist_buff",
        targetProperty: "navigationAssist",
        value: true
      }
    }
  ],
  outcomeRules: [
    {
      id: "asteroids_victory_rule",
      priority: 10,
      condition: {
        field: "completed",
        operator: "==",
        value: true
      },
      effects: [
        { type: "setFlag", flagId: "asteroidsPerfect", value: true }
      ]
    }
  ]
};
```

---

## 🧪 Testing & Validation

Run campaign story graph linter:
```bash
pnpm run story:lint
```

Run campaign unit tests:
```bash
pnpm exec jest src/games/shared/__tests__/CampaignScreen.test.ts
```

Run full CI validation:
```bash
pnpm run ci
```
