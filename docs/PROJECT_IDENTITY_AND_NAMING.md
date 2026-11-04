# Project identity and naming contract

This document defines the names used by the Tiny Aster project. It separates the product identity, repository name, workspace package names and legacy Expo identifiers so they are not changed interchangeably.

## Canonical identities

| Scope | Canonical value | Usage |
| --- | --- | --- |
| Product and engine brand | **Tiny Aster** | Human-facing project name in documentation, proposals and descriptions. |
| Code identifier | `TinyAster` | Use in TypeScript symbols, internal architecture descriptions and established code names. |
| GitHub repository | `ArcadeGames` | Repository name; it is not the engine or product brand. |
| npm package scope | `@tiny-aster` | Prefix for reusable workspace packages. |
| Root Expo workspace package | `asteroides` | Private application workspace name in the root `package.json`; retained as a legacy identifier. |
| Default Expo app identity | name `asteroides`, slug `asteroids`, scheme `asteroides` | Existing root application identifiers in `app.json` and `app.config.ts`. |
| Native application IDs | `com.ensable.asteroids` | Existing Android package and iOS bundle identifier. Treat as compatibility-sensitive identifiers. |
| Expo owner | `ensable` | Existing Expo/EAS account owner. |
| EAS project ID | `73fa3f33-9fb8-472b-a676-868aaac4e963` | Existing Expo Application Services project identity. |
| Server workspace package | `asteroides-server` | Existing internal server package name. |

**Do not rename the root package or Expo/native identifiers as a documentation cleanup.** Changes to the Expo scheme, slug, Android package, iOS bundle identifier or EAS identity can affect app installation, deep links, updates and distribution. A future product rebrand must use a separate migration plan that checks both stores, EAS, deep links, persisted app data and all deployment environments.

The root `package.json` is private and represents the Expo application workspace. Its `asteroides` package name is not the public engine brand and is not published as a reusable package.

## Naming rules

### Workspace packages

- Directory names use lowercase kebab-case: `packages/<package-name>`.
- The package manifest name must match the directory as `@tiny-aster/<package-name>`.
- New reusable engine capabilities belong in a focused workspace package only when they have a clear boundary and independent responsibility.
- Do not create a per-game npm package just to make the directory naming look uniform.

### Game modules and routes

- A game directory ID is a stable internal identifier used by imports, manifests, routes, tests and tooling. Treat existing IDs as API-like names.
- Keep current legacy compact IDs (`echorunner`, `flappybird`, `geometrywars`, `hitandrun`) unchanged until a dedicated route/manifest migration includes aliases and reference updates.
- New multiword game IDs use lowercase kebab-case (for example, `space-invaders`, `tower-defense`, `vertical-shmup`). Single-word IDs remain a single lowercase word.
- Display names belong in game manifests and UI labels; do not infer a display name by splitting or rewriting a directory ID.
- `src/games/shared/` is shared infrastructure, not a game ID.

### Scripts

- Use the existing namespaced format: `<area>:<action>[-<qualifier>]`, with lowercase kebab-case within each segment.
- Examples: `check:agent-guardrails`, `test:games:ci`, `sprites:validate`, `architecture:check`.
- Prefer one canonical command per operation. Do not add aliases that only duplicate another script unless a real compatibility requirement exists.
- `story:lint` is the canonical story validation command. `validate:story` was removed because it only forwarded to that command.
- `architecture:check` is the canonical architecture analysis command. The misspelled `arquitecture` alias was removed because repository search found no callers.

### Documentation and naming changes

- Use **Tiny Aster** in human-facing prose and `TinyAster` only where the code identifier or established technical wording requires it.
- Use `@tiny-aster/...` for workspace package names.
- Mention `ArcadeGames` only when referring to the GitHub repository.
- Before changing a game ID, package name, root application name or native identifier, search all imports, route paths, manifests, tests, build configuration and deployment references. Record a migration plan and compatibility strategy in the pull request.

## Sources of truth

- Root package and scripts: `package.json`.
- Default Expo identity and EAS project: `app.json` and `app.config.ts`.
- Server workspace identity: `server/package.json`.
- Workspace package identities: `packages/*/package.json`.
- Game IDs: directories under `src/games/` (excluding `shared/`) and the corresponding game manifests/routes.
- Agent policy: `AGENTS.md` and `docs/agents/OPERATING_CONTRACT.md`.

The root `docs:check` script validates the identity values and package naming rules documented here against those files.
