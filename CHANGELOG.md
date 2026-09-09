# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Changed
- **Story Campaign:** Promoted Campaign Mode from Proof-of-Concept to production-ready architecture.
- **Pipeline Unification:** Refactored `CampaignScreen.tsx` to route minigame outcome evaluation through `ArcadeOrchestrator.submitResult()`, eliminating duplicate evaluation logic.
- **Label Update:** Menu campaign label updated from "STORY CAMPAIGN (POC)" to "STORY CAMPAIGN".

### Fixed
- **MiniGameResult Heuristics:** Replaced score-based victory heuristics (`score >= 1000`) with real simulation telemetry via `BaseGame.getMiniGameResult()`.
- **Localization & i18n:** Wrapped narrative dialogue, cutscenes, choices, and overlays with `getLocalizedText()` and locale dictionaries (`en.ts`, `es.ts`).
- **Accessibility:** Added `accessibilityRole="button"`, `accessibilityLabel`, and `accessibilityHint` props to all campaign UI buttons.
- **Cutscene Rendering:** Added rendering support for `type: "cutscene"` nodes with speaker names and dialogue queues.
- **Checkpoint Restoration:** Integrated `StoryRuntime.forkAt(checkpointId)` during retry flows to clear ghost state from failed attempts.

### Added
- **MiniGameEncounterRegistry:** Centralized encounter registry (`packages/core/src/story/MiniGameEncounterRegistry.ts`) supporting dynamic encounter resolution by `encounterId` or fallback `gameId`.
- **Domain Modifier Resolution:** Integrated `MiniGameModifierResolver` in `switchGame()` to pass resolved domain modifiers to minigame simulations.
- **ADR-001:** Documented architecture decision (`docs/ADR-001-campaign-adapter-architecture.md`) choosing pure `BaseGame` simulation management with `ArcadeOrchestrator`.
- **Campaign Mode Guide:** Created developer guide (`docs/CAMPAIGN_MODE_GUIDE.md`) detailing campaign graph construction and encounter rule definitions.
