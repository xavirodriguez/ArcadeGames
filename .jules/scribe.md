# Scribe Journal 📖

Durable knowledge and lessons learned while maintaining Asteroides documentation:

## Documentation Pipeline
- **Dependencies & Setup**: The documentation pipeline `pnpm docs:build` compiles `@tiny-aster/core` types with `tsup` first. Ensure `pnpm install` has been run and devDependencies are resolved.
- **API Entry Points**: Classes marked with `@public` inside package subdirectories (like `SnapshotRestore.ts`) are not extracted unless they are explicitly exported from the main entry point `src/index.ts`. If a class is missing from `etc/asteroides.api.md`, verify `src/index.ts` exports it.
- **Linking to Internal APIs**: The API Extractor raises warnings if a `@public` API's TSDoc contains a `{@link}` tag referencing an `@internal` API (e.g. `ComponentCloner`). Use simple markdown backticks (e.g. `` `ComponentCloner` ``) for internal references in public documentation.
- **TSDoc Arrow Character Escaping**: API Extractor warns on unescaped `>` or `->` characters in TSDoc annotations (`tsdoc-escape-greater-than`). Always escape `->` as `-\>` when listing phase transitions in parameter comments or `@remarks`.
- **Runtime Subsystem TSDoc Standards**: Public types and methods in `packages/core/src/runtime/` (`BaseGame`, `ArcadeKernel`, `GameSession`, `GameDefinition`, `IGame`, `Simulation`) require comprehensive TSDoc comments explaining lifecycle guarantees (Template Method `onRegisterSystems` -\> `onInitializeEntities`), state machine rules (`ArcadeState`), and external ticker deactivation (`GameSession.stopInternalLoop()`). Non-English JSDoc comments should be converted to standard English TSDoc.
- **Story & Encounter DSL Schemas**: All exported Zod schemas (such as `MiniGameEncounterSchema`, `StoryEffectSchema`, `OutcomeConditionSchema`), constants, and validation context interfaces exported in `packages/core/src/story/` require explicit `@public` release tags to prevent API Extractor `ae-missing-release-tag` warnings during documentation compilation.
- **TSDoc HTML & Math Character Escaping**: API Extractor interprets raw `<` or `>` characters (e.g. `(vy < 0)`) as malformed HTML tags (`tsdoc-malformed-html-name`) and raw LaTeX/math brackets (`$v_{t+1}$`, `[0, 1]`) as malformed inline tags. Avoid unescaped angle brackets or LaTeX brackets in TSDoc remarks, using plain descriptive text or backticks instead.
