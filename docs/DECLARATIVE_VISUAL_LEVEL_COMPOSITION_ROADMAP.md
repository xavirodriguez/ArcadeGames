# Roadmap — Declarative Visual Level Composition

**Status:** architecture proposal; no runtime implementation included  
**Date:** 2026-10-29  
**Primary pilot:** Hit & Run Sumi-e village  
**Scope:** reusable visual composition infrastructure for levels across ArcadeGames

## 1. Goal

Build a declarative system that describes a level's visual composition as data rather than embedding placement rules in game-specific rendering code. It must support:

1. **Fixed composition first:** every prop has an explicit, testable transform and layer assignment.
2. **Deterministic variation later:** seeded rules for scatter, weighted variants and constrained placement, without changing the renderer contract.
3. **Reusable composition:** prefabs such as villages, forests, shrines and ruins can be reused across levels.
4. **Theme independence:** composition describes what is placed and where; a theme describes how it looks.
5. **Renderer independence:** the resolved scene can be consumed by Canvas and Skia adapters without backend objects in JSON or ECS simulation.
6. **Gameplay isolation:** decorative assets must not implicitly create colliders, alter gameplay state or affect simulation determinism.

This document is a plan, not an implementation. Proposed module names below do not imply that those modules already exist.

## 2. Design principles

- **Data describes intent; TypeScript validates and resolves it; renderers draw it.** JSON is not executable code and must not contain callbacks or arbitrary expressions.
- **One source of truth for assets.** Extend or adapt the existing sprite registry and AssetLoader where appropriate. Do not create a competing asset registry or duplicate image cache.
- **Fixed data is the baseline contract.** Procedural rules later become another producer of the same resolved-instance format, not a separate rendering path.
- **Stable semantic IDs.** Definitions reference asset keys and prefab IDs, never file paths from individual placements.
- **Explicit coordinate semantics.** World, screen and parallax coordinates must not be inferred from a layer name.
- **Stable composition.** Cosmetic randomness is seeded and isolated by level, prefab and rule, so adding a decoration does not reshuffle structural buildings.
- **No implicit gameplay semantics.** A visual instance is decorative unless a separate gameplay definition explicitly says otherwise.
- **Backend parity is verified, not assumed.** The current Hit & Run background/theme path is Canvas-oriented even though the game can select Skia. A renderer-neutral data model can precede fully verified adapters.

## 3. Concepts and responsibilities

| Concept | Responsibility | Must not own |
| --- | --- | --- |
| Asset catalog / registry | Resolve semantic asset IDs, source metadata, dimensions, anchors and loading state | Level placement |
| Theme definition | Palette, material treatment, atmosphere and visual effect presets | Structural composition |
| Prefab definition | Reusable group of layers and visual instances; later may include procedural rules | Gameplay collision or simulation |
| Level visual definition | Select theme and compose prefabs/layers for a level | Asset decoding and drawing |
| Scene validator | Validate IDs, references, finite values, ranges and supported features | Rendering |
| Scene composer | Resolve fixed definitions into a normalized, ordered scene; later expand deterministic rules | Asset I/O and ECS mutation |
| Asset lifecycle | Load and retain resources before drawing; report readiness/errors; release owned resources | Per-frame placement decisions |
| Renderer adapter | Draw the resolved scene using backend-native resources | Parsing authoring JSON or generating placements |

## 4. Target data flow

    LevelVisualDefinition (JSON)
       |-- ThemeDefinition
       |-- PrefabDefinition(s)
       |-- Existing asset registry
                |
                v
       Schema validation + reference resolution
                |
                v
       SceneComposer
       (fixed instances first; seeded rules later)
                |
                v
       ResolvedVisualScene (renderer-neutral IR)
                |
           +----+----+
           v         v
        Canvas      Skia
           |         |
           +----+----+
                v
         Visual environment

The resolved scene is an intermediate representation: a predictable list of instances with resolved asset IDs, transforms, layer/order, opacity and coordinate-space information. It must not contain CanvasImageSource, HTMLCanvasElement, Skia image handles or other backend-native objects.

The composer runs when a level or visual definition changes, not on every frame. The renderer may apply camera transforms at draw time but must not re-parse JSON or re-run composition rules per tick.

## 5. Authoring model

Use separate files so assets, themes and prefabs can be reused without copying their definitions. Suggested organization, to adapt to existing conventions:

    src/games/<game>/assets/environment/
      catalog.ts
      prefabs/
        rural-japanese-village.json
      levels/
        mountain-village.json
      themes/
        sumi-e.json
        autumn-night.json
      schema/
        level-visual.schema.ts

The first pilot may remain under Hit & Run while keeping contracts generic enough to move into shared presentation infrastructure later. Do not prematurely create a monorepo-wide package before at least two real compositions validate the API.

### 5.1 Asset identity and metadata

Every asset uses a stable semantic key. The existing registry remains authoritative for source paths and load behavior.

Illustrative metadata:

    {
      "id": "environment.village.house.large",
      "category": "building",
      "anchor": "bottom-center",
      "nominalSize": { "width": 96, "height": 80 },
      "tags": ["village", "wood", "foreground"]
    }

Requirements:
- IDs are unique within the asset namespace.
- Anchors are documented and consistent; initial candidates: top-left, center, bottom-center.
- Source dimensions come from authoritative asset metadata or decoded resources, not repeated per placement.
- Tags may support tooling and future procedural selection, but must not silently alter fixed placements.
- Atlas-backed assets use the registry's established source-rectangle contract.
- Missing assets are validation errors in development. Runtime fallback must be explicit and observable, never an unrelated silent substitution.

### 5.2 Fixed visual instance

An instance references an asset and declares its transform and coordinate semantics.

    {
      "id": "main-house",
      "asset": "environment.village.house.large",
      "space": "world",
      "position": { "x": -120, "y": 40 },
      "scale": { "x": 1, "y": 1 },
      "rotation": 0,
      "opacity": 1,
      "flipX": false
    }

Initial contract:
- ID is unique within its prefab/level and stable for debugging.
- Position uses logical world or screen units as specified by space, never implicit source pixels.
- Scale defaults to 1 and must be finite. Zero/negative scale is rejected unless a supported use case is documented.
- Rotation is in radians and defaults to 0.
- Opacity is in the inclusive range [0, 1].
- flipX is explicit; do not encode flips as negative scale.
- Anchor comes from asset metadata unless a documented per-instance override is required.
- Defaults are schema-defined, not renderer-specific.

Keep the first version small. Do not add arbitrary shader graphs, nested expressions, user scripts or unrestricted transform matrices to JSON.

### 5.3 Layers and ordering

Layers group visual responsibilities and define stable order. Names should express composition role, not only arbitrary numeric indices.

Initial roles:
- **far-background:** sky, distant mountains and large silhouettes.
- **atmosphere:** fog, mist and atmospheric overlays.
- **midground:** distant vegetation and buildings.
- **settlement:** structural village props.
- **foreground:** close vegetation and occluding decorative props.
- **effects:** rain, particles and overlays.

Each layer has explicit order/depth, coordinate mode and optional parallax factor. Choose the exact ordering model after inspecting the existing background callback and camera conventions.

Visual depth/order is not collision depth. A foreground sprite may cover scenery without changing gameplay hitboxes or entity draw order.

### 5.4 Prefabs

A prefab packages reusable visual layers and fixed instances. A village prefab may include a main house, huts, well, fences and decorations. Structural objects are explicitly positioned in the first iteration.

A level references a prefab with a transform and narrowly scoped overrides rather than copying its contents. Override rules must be deterministic: for example, adjust overall scale or hide a named decorative instance, but do not mutate the shared prefab definition.

Prefab nesting may be supported if cycles can be validated and resolution remains predictable. If it adds significant complexity, defer it and start with flat prefabs.

### 5.5 Level and theme separation

Illustrative level document:

    {
      "schemaVersion": 1,
      "id": "hitrun.mountain-village",
      "theme": "sumi-e.autumn",
      "seed": 18427,
      "layers": [
        {
          "id": "distant-landscape",
          "role": "far-background",
          "space": "parallax",
          "parallaxFactor": 0.15,
          "proceduralSource": "existing-shanshui-mountains"
        },
        {
          "id": "village",
          "role": "settlement",
          "space": "world",
          "prefab": "environment.village.rural-japanese",
          "position": { "x": 0, "y": 0 }
        }
      ]
    }

This is illustrative. proceduralSource is a placeholder for an explicit registry/adapter contract, not a claim that this key exists today. Do not encode executable renderer callbacks in JSON. Existing procedural background functions should initially remain code-owned and be referenced through a validated registry of known IDs.

Theme data may change palette, material/tint treatment, atmosphere, lighting and effect presets. It must not secretly move buildings or modify gameplay. Composition chooses prefabs/placements but should not duplicate palette settings.

## 6. Fixed composition first; variation later

The first runtime milestone supports fixed instances only. This keeps tests simple and validates coordinates, anchors, layer order, resource readiness and renderer parity before stochastic placement is introduced.

Reserve an extension point for rules, but do not implement a generic rule engine in Phase 1.

Later deterministic rule candidates:
- ruleId: stable ID.
- seedOffset: stable local seed input.
- source: explicit asset IDs or a query against a validated tag/category catalog.
- region: bounded placement region.
- count or bounded count range.
- minDistance: optional spacing constraint.
- weights: explicit non-negative variant weights.
- exclusions: named keep-out regions or fixed instance IDs.

Determinism requirements:
1. Derive each rule's random stream from the level seed, prefab/instance identity and rule ID.
2. Never use global Math.random().
3. A rule's random stream must not depend on evaluation order or unrelated rules.
4. Failed placement must have a documented result (validation error, bounded partial result or warning); never retry indefinitely.
5. Canonicalize resolved output so equivalent inputs produce stable order.
6. Keep composition RNG independent of gameplay RNG and gameplay state hashes.

Add rule variants incrementally with schema versioning and focused tests. Fixed and generated instances must resolve into the same IR and use the same renderer path.

## 7. Coordinates, camera and scrolling

Explicitly distinguish:
- **world:** fixed in world coordinates and follows camera movement.
- **screen:** fixed to the viewport.
- **parallax:** world-related placement with a declared parallax factor.

The sign convention and camera origin must match Hit & Run's existing camera/background implementation and be covered by tests. Never infer coordinate semantics from layer names.

For vertically scrolling or long levels, composition should eventually be segment-aware so every decorative instance need not remain in memory. This is not required for the first small fixed village. Future chunking must preserve stable IDs and deterministic placement at segment boundaries.

Resize should recompute viewport-dependent screen placements without changing world placements or re-randomizing composition.

## 8. Resource lifecycle and renderer adapters

- Reuse the existing asset loader and readiness/error resources.
- Resolve/load assets during scene preparation, never inside the frame loop.
- Cache decoded resources at the appropriate owner/scope; avoid duplicate caches and unbounded retention.
- Keep loading state separate from immutable composition data.
- Preserve the procedural backdrop while sprites load or fail, according to explicit fallback policy.
- Dispose only resources owned by the scene/theme; do not prematurely dispose shared registry assets.
- Keep headless simulation initialization free of DOM-dependent decoding or canvas allocation.
- Implement Canvas and Skia adapters against the same resolved scene. Never pass Canvas handles to Skia or assume current Canvas-compatible drawers establish native parity.

For the pilot, the existing Sumi-e backdrop remains responsible for procedural far/middle landscape. The new system adds fixed foreground/settlement props through the current theme/background extension point. Rendering must not move into gameplay systems.

## 9. Phased implementation plan and acceptance criteria

### Phase 0 — repository and contract audit

Tasks:
- Trace Hit & Run's background callback, camera coordinate convention, sprite registry, asset loader and theme lifecycle.
- Identify reusable infrastructure and gaps, especially native Skia image support.
- Choose the smallest implementation home without introducing a competing registry.

Acceptance:
- A short implementation note maps proposed responsibilities to actual modules.
- No runtime behavior changes in this phase.

### Phase 1 — fixed schema, validator and resolved scene

Tasks:
- Define strict TypeScript types and runtime validation for versioned level, prefab, layer and instance definitions.
- Define renderer-neutral ResolvedVisualScene.
- Resolve semantic asset references through the existing registry boundary.
- Validate unique IDs, missing references, finite transforms, opacity/scale bounds, supported coordinate spaces, prefab references and layer order.
- Add valid and invalid JSON fixtures.

Acceptance:
- Valid fixed JSON produces a stable resolved scene.
- Invalid definitions fail early with actionable field-path errors.
- Identical input resolves to structurally identical output.
- Unit tests need no asset decoding or renderer object.

### Phase 2 — Canvas fixed-composition pilot

Tasks:
- Integrate the resolved scene at the existing Hit & Run backdrop/theme boundary.
- Place a representative set of village assets manually (e.g. main house, tower, well, fence and tree).
- Keep current procedural shanshui layers for far/middle planes.
- Support explicit anchor, scale, opacity, world/screen/parallax and stable draw order.
- Follow existing asset readiness/fallback conventions.

Acceptance:
- No per-frame JSON parsing, image decoding or composition.
- Unready/failed assets do not crash rendering; fallback behavior is visible and testable.
- The village is stable across repeated runs and does not change gameplay state.
- Decorative props do not create gameplay ECS entities or colliders.

### Phase 3 — deterministic and headless tests

Required tests:
1. Schema validation: unknown asset, duplicate ID, invalid opacity/scale, NaN/Infinity and unsupported schema version.
2. Transform/anchor conversion and coordinate-space behavior.
3. Stable layer and instance ordering.
4. Camera movement: world props follow camera, screen props remain fixed, parallax uses the documented factor.
5. Resize does not move world props or regenerate composition.
6. Resource-not-ready and resource-failure paths preserve fallback behavior.
7. Load/resolve work is not repeated per render frame.
8. Headless simulation initialization does not touch document or decode images.
9. Loading a composition leaves simulation state hashes and gameplay determinism unchanged.
10. Disposal does not leak or prematurely release shared resources.

Acceptance:
- New tests pass with existing Hit & Run lifecycle and determinism suites.
- Tests distinguish composition determinism from gameplay determinism.

### Phase 4 — second theme/level and renderer parity

Tasks:
- Add a second visual level using the same infrastructure and, where useful, the same prefab/assets.
- Change theme independently of placement.
- Implement/verify Skia-native asset resolution and drawing if Skia is a supported target.
- Compare logical positions, anchors, alpha, ordering and camera behavior across backends.

Acceptance:
- Changing theme does not require duplicating a prefab.
- The same fixed definition resolves to the same logical instances on both backends.
- Native parity is demonstrated by tests and visual smoke testing, not inferred from selecting the Skia renderer.

### Phase 5 — deterministic variation

Tasks:
- Add a small set of typed rules, starting with bounded scatter and weighted variants.
- Derive independent seeded random streams per rule.
- Add region bounds, keep-out areas, minimum distance and bounded placement attempts.
- Keep important composition landmarks artist-controlled.

Acceptance:
- Same input/seed produces identical output.
- Changing an unrelated rule does not reshuffle fixed props or other rule streams.
- Failed placement terminates predictably.
- Fixed and generated instances share the same IR and renderer path.

### Phase 6 — production scale and authoring tools

Tasks:
- Expand the pilot to a catalog of approximately 50 environment sprites.
- Add composition previews or a lightweight editor only after the contract is stable.
- Consider segment/chunk streaming for long scrolling levels.
- Profile draw calls, memory, image decode and frame time on target mobile devices.

Acceptance:
- Adding assets requires no new renderer branches.
- Scene size and load time remain within measured budgets on target devices.
- A designer can create a fixed composition by editing data and registering assets, without changing gameplay code.

## 10. Testing strategy

Prefer pure unit tests for schema validation and composition resolution. Keep renderer integration tests narrow and use deterministic fixtures for visual output.

Suggested test responsibilities:
- schema: valid/invalid documents and actionable error paths.
- composer: fixed scene resolution and stable ordering.
- transforms: anchor, camera, coordinate and parallax math.
- asset lifecycle: readiness, fallback, caching and disposal.
- existing Hit & Run lifecycle/determinism tests: regression guard.

Adapt test filenames to the repository's existing layout. Golden screenshots are useful only if the current test stack can produce stable output; they supplement, not replace, logical composition tests.

## 11. Non-goals for the first implementation

- No general-purpose visual editor.
- No arbitrary script expressions in JSON.
- No runtime procedural generation required for the fixed-composition milestone.
- No automatic collision or gameplay entity generation from decorative props.
- No migration of every game before the Hit & Run pilot validates the contract.
- No rewrite of the current procedural Sumi-e mountain/fog renderer.
- No new asset loader, image cache or global theme singleton.
- No claim of Canvas/Skia parity until the native adapter is verified.

## 12. Risks and decisions before coding

1. **Ownership boundary:** decide whether the resolved scene belongs to the Hit & Run theme, backdrop service or a new per-game visual-scene instance. Avoid a global singleton that prevents multiple game instances.
2. **Asset metadata:** establish the authoritative source for dimensions, anchors and atlas source rectangles.
3. **Camera contract:** inspect actual camera origin and parallax math before fixing schema semantics.
4. **Renderer support:** decide whether native Skia is in scope for the first runtime PR or is an explicit follow-up.
5. **Schema tooling:** reuse an installed validation library if available; otherwise prefer a small explicit validator over adding a dependency solely for this pilot.
6. **Versioning:** include schemaVersion from the start and report unsupported versions clearly.
7. **Fallback:** define whether a failed decorative asset is skipped, replaced by a neutral placeholder or causes the visual definition to fail. Keep behavior explicit and testable.

## 13. Definition of done for the initial feature

A fixed JSON composition can be loaded and validated, resolved into renderer-neutral instances and drawn in the Hit & Run Sumi-e scene using the existing asset lifecycle. Tests cover resolution, ordering, transforms, failure paths and simulation isolation. A second composition can be expressed without adding placement-specific renderer code.

**Recommended next step:** execute Phase 0 and Phase 1 in a separate implementation PR after reviewing this roadmap. Keep the current tower-sprite PR focused on its existing rendering change; do not fold the compositor implementation into that PR.
