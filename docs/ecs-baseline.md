# ECS Baseline & Performance Metrics

This document registers performance metrics for the ECS engine before and after Phase 1 optimizations.

## Performance Comparison (Pre-Phase 1 vs Post-Phase 1)

| Entity Count | Pre-Phase 1 ms/tick | Post-Phase 1 ms/tick | AoS Snapshot (ms) | SoA Snapshot (ms) | Speedup |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **100 entities** | ~0.64ms | **~0.41ms** | ~1.07ms | ~1.15ms | **+36%** |
| **1000 entities** | ~10.75ms | **~6.55ms** | ~5.12ms | ~5.03ms | **+39%** |
| **5000 entities** | ~163.78ms | **~61.06ms** | ~20.59ms | ~14.70ms | **+63%** |

## Determinism & Invariant Tests
- **Golden Determinism**: Verified tick-by-tick state hash parity across identical simulation runs (`GoldenDeterminism.test.ts`).
- **Snapshot Round-Trip**: Verified AoS and SoA `snapshot() -> restore() -> snapshot()` hash equality (`SnapshotRoundTrip.test.ts`).
- **Multi-World Isolation**: Verified parallel `World` instance execution with independent collision detection without cross-world state pollution (`MultiWorldIsolation.test.ts`).
