# Tech Debt: Code Duplication Tracking (`jscpd`)

This document tracks known code duplication clusters across `packages/core/src` and `src/games`, as identified by `jscpd` and managed via `scripts/duplication-ratchet.ts`.

---

## 1. Top Duplication Clusters

### [DUP-01] Player Input Application (`setInputState`)
- **Files**:
  - `src/games/platformer/PlatformerGame.ts`
  - `src/games/echorunner/EchoRunnerGame.ts`
- **Lines**: ~20 lines per game
- **Impact**: Medium
- **Priority**: High (Refactored)
- **Status**: Refactored / In Progress
- **Refactoring Strategy**: Extracted into a shared helper `applyPlatformerInputState` in `src/games/shared/input/PlatformerInputUtils.ts`.

---

### [DUP-02] Canvas vs Skia Particle & Visual Presentation Loops
- **Files**:
  - `src/games/flappybird/rendering/FlappyBirdCanvasVisuals.ts` ↔ `src/games/flappybird/rendering/FlappyBirdSkiaVisuals.ts`
  - `src/games/geometrywars/rendering/GeometryWarsCanvasVisuals.ts` ↔ `src/games/geometrywars/rendering/GeometryWarsSkiaVisuals.ts`
  - `src/games/space-invaders/rendering/SpaceInvadersCanvasVisuals.ts` ↔ `src/games/space-invaders/rendering/SpaceInvadersSkiaVisuals.ts`
- **Lines**: ~30–50 lines per game drawer
- **Impact**: High
- **Priority**: Medium
- **Status**: Blocked (Dual Renderer Architecture)
- **Rationale / Blocked Reason**: Canvas2D and Skia backends operate on different draw APIs (Canvas Context 2D state machine vs Skia Canvas primitives/Paints). Abstracting state calculations vs draw calls introduces per-frame closure allocations in hot loops.
- **Actionable Steps for Next Developer**:
  1. Isolate stateless positional/particle calculations into game visual utility modules (e.g. `SpaceInvadersVisualUtils.ts`).
  2. Keep drawer-specific drawing API calls separate in Canvas/Skia files to avoid allocation overhead in hot rendering loops.

---

### [DUP-03] Narrowphase Polygon/Circle Contact Calculations
- **Files**:
  - `packages/core/src/physics/collision/NarrowPhase.ts` (multiple internal geometry test helpers)
- **Lines**: ~27 lines
- **Impact**: Medium
- **Priority**: Low
- **Status**: Blocked (Hot Path Performance)
- **Rationale / Blocked Reason**: Narrowphase collision math runs every tick for hundreds of potential contacts. Extracting dot product or vertex distance loops into helper functions adds stack frame overhead without vectorization benefits in JS runtime.
- **Actionable Steps for Next Developer**:
  1. Maintain inline math loops unless a SIMD/TypedArray batching approach is introduced for collision detection.

---

### [DUP-04] Snapshot Serializer Interfaces & World Access Setup
- **Files**:
  - `packages/core/src/snapshots/SnapshotSerializer.ts` ↔ `packages/core/src/snapshots/SnapshotSerializerSoA.ts`
- **Lines**: ~27 lines
- **Impact**: Low
- **Priority**: Low
- **Status**: Blocked (Core API & Architecture)
- **Rationale / Blocked Reason**: `SnapshotSerializer` (AoS) and `SnapshotSerializerSoA` (SoA) share internal interface definitions for private World access (`InternalWorldAccess`).
- **Actionable Steps for Next Developer**:
  1. Move shared internal World serializer interfaces into a common private header file `packages/core/src/snapshots/SerializerTypes.ts`.

---

## 2. Ratchet & CI Integration

- **Command**: `pnpm run check:duplication`
- **Baseline Update**: `pnpm run duplication:update-baseline`
- **Script**: `scripts/duplication-ratchet.ts`
- **CI Job**: `static-and-mutation-guards` in `.github/workflows/ecs-sentinel.yml`
