# ADR-001: Campaign Mode Engine Simulation vs DOM Adapter Architecture

## Status
Accepted

## Context
In the Campaign Mode architecture, minigames can be executed within a narrative progression pipeline.
The `ArcadeGameAdapter` interface (`packages/core/src/story/ArcadeGameAdapter.ts`) requires a DOM `HTMLElement` `host` parameter during `initialize(context: MiniGameRunContext, host: HTMLElement)`.
However, `CampaignScreen` (`components/CampaignScreen.tsx`) runs within a React Native / Expo environment. In React Native Web and mobile builds, `CanvasRenderer` (`components/CanvasRenderer.tsx`) or `SkiaRenderer` renders pure `BaseGame` ECS simulation instances passed directly via React props (`world` and `gameLoop`).

We evaluated two architectural options for campaign minigame execution:

### Option A: Refactor CampaignScreen to DOM ArcadeGameAdapter
- Wrap minigames inside DOM-based `ArcadeGameAdapter` implementations.
- Force `CampaignScreen` to supply a DOM host `HTMLElement`.
- **Drawbacks:** Breaks React Native / Expo Mobile compatibility (where DOM `HTMLElement` host elements do not exist). Creates abstraction mismatch between React component tree lifecycle (`CanvasRenderer` / `SkiaRenderer`) and DOM mounting callbacks. Adds significant complexity and regression risk.

### Option B: Maintain Pure BaseGame Simulation Bridge in CampaignScreen with ArcadeOrchestrator
- Keep minigame execution in `CampaignScreen` using pure `BaseGame` simulations instantiated via `GameDefinition.createSimulation(seed, options)`.
- Pass resolved narrative modifiers directly to simulation creation options.
- Integrate `ArcadeOrchestrator` as state machine to manage run context and evaluate run results (`submitResult(result)`).
- Implement `BaseGame.getMiniGameResult()` to construct structured `MiniGameResult` payloads from real ECS state, duration, metrics, and secrets without DOM element dependencies.
- **Benefits:** Full cross-platform compatibility (Web, React Native, Expo Mobile, Skia, Headless). Zero DOM coupling in core simulation logic. Clean single-pipeline orchestrator integration without breaking existing React Native game components.

## Decision
We choose **Option B**.

`CampaignScreen` will interact with `BaseGame` pure simulations and `ArcadeOrchestrator`. `ArcadeOrchestrator` handles narrative modifier calculation (`MiniGameModifierResolver`), run state transitions, and outcome evaluation (`OutcomeRuleEngine` + `StoryEffectApplier`).

## Impact on P1 & Timeline
- Maintains standard P1 estimation (~8h).
- Avoids risk and overhead of bridging DOM `HTMLElement` mounting in React Native views.
- Establishes pure `BaseGame.getMiniGameResult()` helper across all minigames for real telemetry and victory reporting without score heuristics.
