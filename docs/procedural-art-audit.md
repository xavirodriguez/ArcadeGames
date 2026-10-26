# Procedural Art Migration Technical Audit (Phase 0)

## 1. Inventory of HTML Functions and Dependencies (`index(1).html`)

### A. Pseudo-Random Number Generation (`random/`)
- `Prng.hash(v)`: String/number hash returning pseudo-random float in `[0, 1)`.
- `Prng.seed(s)`: Re-seeds internal state.
- `Prng.next()`: Advances internal state and returns uniform float in `[0, 1)`.
- `randChoice(arr, prng)`: Samples an element from array deterministically using PRNG.
- `normRand(min, max, prng)`: Returns uniform float in `[min, max]`.
- `wtrand(fn, prng)`: Rejection sampling with weight curve.
- `randGaussian(prng)`: Standard normal distribution float approximation.

### B. Noise Generation (`noise/`)
- `Noise.noise(x, y, z)`: Multi-dimensional gradient noise table.
- `Noise.noiseDetail(octaves, falloff)`: Configures octaves and persistence/falloff.
- `Noise.noiseSeed(seed)`: Seeds noise permutation table.
- `loopNoise(list, noise)`: Evaluates noise across a closed loop or point sequence.

### C. Computational Geometry (`geometry/`)
- `midPt(p0, p1)`: Midpoint between two 2D points.
- `triangulate(pts, args)`: Ear clipping triangulation for polygon surfaces.
- `shatter(pts, areaTarget)`: Subdivides polygons into smaller triangles/fragments below target area.
- `stroke(pts, options)`: Expands a line path into an organic variable-width stroke contour.
- `blob(x, y, options)`: Generates organic multi-lobed blob shapes via Perlin noise offsets.
- `poly(pts, options)`: Converts point lists into polygon primitives.
- Auxiliaries: `distance`, `intersect`, `onSeg`, `ptInPoly`, `lnInPoly`, `sidesOf`, `areaOf`, `sliverRatio`, `bestEar`, `mapval`, `bezmh`, `unNan`.

### D. Color & Depth Processing (`colors/`)
- `getColor`, `ink`, `stone`, `jade`, `slate`, `fog`, `fogMask`, `getDepth`, `mountainCol`: Depth-based color modulation, ink opacity curves, and stone palette shaders.

### E. Vegetation Generators (`generators/vegetation/`)
- `tree01`–`tree08`: 8 distinct tree archetypes (pine, deciduous, willow, bamboo/palm, gnarled oak, winter bare, cypress, bonsai).
- `branch`, `twig`, `barkify`: Recursive branch splitting, twig cluster placement, and bark surface texture lines.

### F. Terrain Generators (`generators/terrain/`)
- `mountain`: Layered noise mountain ridges with vertex shading.
- `flatMount`: Flat plateau mountain structures with sheer cliffs.
- `distMount`: Soft background haze mountain silhouettes.
- `flatDec`: Ground accent decorations.
- `rock`: Angular faceted boulders and stone clusters.
- `vegetate`: Distributes vegetation along mountain or terrain ridges.

### G. Architecture Generators (`generators/architecture/`)
- `hut`, `box`, `roof`, `pagroof`, `arch01`–`arch04`, `transmissionTower01`: Traditional Asian houses, buildings, pitched/curved pagoda roofs, wooden/stone arches, and lattice transmission towers.

### H. Environmental Generators (`generators/environment/`)
- `cloud01`, `bird01`, `boat01`, `reeds01`, `lantern01`, `flag01`: Clouds, bird flocks, fishing boats, river reeds, hanging paper lanterns, waving flags.

---

## 2. Shared Data Contract (`types/ProceduralTypes.ts`)

All procedural generators return renderer-decoupled `ScenePrimitive` arrays (`PolygonPrimitive`, `PolylinePrimitive`, `EllipsePrimitive`, `LinePrimitive`, `PathPrimitive`), allowing identical geometry to be drawn on Canvas2D and React Native Skia without recomputation.

---

## 3. Risks & Determinism Plan

- **Zero Math.random():** All generators receive an explicit `IPrng` instance.
- **Recursion Depth:** `branch` and `shatter` are hard-capped to prevent stack overflows and frame drops.
- **Legibility in Hit & Run:** Background buildings, trees, and mountains are rendered with reduced opacity and lower layer depth to ensure combat clarity.
