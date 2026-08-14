# Scribe Journal 📖

Durable knowledge and lessons learned while maintaining Asteroides documentation:

## Documentation Pipeline
- **Dependencies & Setup**: The documentation pipeline `pnpm docs:build` compiles `@tiny-aster/core` types with `tsup` first. Ensure `pnpm install` has been run and devDependencies are resolved.
- **API Entry Points**: Classes marked with `@public` inside package subdirectories (like `SnapshotRestore.ts`) are not extracted unless they are explicitly exported from the main entry point `src/index.ts`. If a class is missing from `etc/asteroides.api.md`, verify `src/index.ts` exports it.
- **Linking to Internal APIs**: The API Extractor raises warnings if a `@public` API's TSDoc contains a `{@link}` tag referencing an `@internal` API (e.g. `ComponentCloner`). Use simple markdown backticks (e.g. `` `ComponentCloner` ``) for internal references in public documentation.
