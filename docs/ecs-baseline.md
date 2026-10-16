# ECS Baseline & Performance Metrics

This document registers performance metrics for the ECS engine across optimization phases.

## Performance Comparison (Phase 1 vs Phase 2: MapStorage vs SparseSetStorage)

| Entity Count | Storage Mode | ms/tick | AoS Snapshot (ms) | SoA Snapshot (ms) | Memory RSS (MB) | Gain vs MapStorage |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **100 entities** | MapStorage | 1.280ms | 2.109ms | 1.844ms | ~469.5MB | Baseline |
| **100 entities** | SparseSetStorage | **1.148ms** | **0.870ms** | **1.053ms** | ~469.5MB | **+10.3% tick / +58.7% AoS** |
| **1000 entities** | MapStorage | 17.466ms | 7.929ms | 5.012ms | ~476.3MB | Baseline |
| **1000 entities** | SparseSetStorage | **15.409ms** | **4.981ms** | **3.608ms** | ~477.2MB | **+11.8% tick / +37.2% AoS / +28.0% SoA** |
| **5000 entities** | MapStorage | 258.574ms | 22.818ms | 17.184ms | ~559.1MB | Baseline |
| **5000 entities** | SparseSetStorage | **198.193ms** | 27.046ms | **11.995ms** | ~647.8MB | **+23.4% tick / +30.2% SoA** |

## Determinism & Invariant Tests
- **Golden Determinism**: Verified tick-by-tick state hash parity across identical simulation runs (`GoldenDeterminism.test.ts`), including binary-identical hash equivalence BETWEEN MapStorage and SparseSetStorage modes.
- **Snapshot Round-Trip**: Verified AoS and SoA `snapshot() -> restore() -> snapshot()` hash equality (`SnapshotRoundTrip.test.ts`) across both storage modes.
- **Multi-World Isolation**: Verified parallel `World` instance execution with independent collision detection without cross-world state pollution (`MultiWorldIsolation.test.ts`), including mixed MapStorage and SparseSetStorage instances.
