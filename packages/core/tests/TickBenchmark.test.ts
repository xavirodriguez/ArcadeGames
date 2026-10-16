import { runWorldBenchmark } from "../src/__benchmarks__/tickBenchmark";

describe("Tick & Snapshot Benchmark (MapStorage vs SparseSetStorage)", () => {
  it("benchmarks 100, 1000, and 5000 entity performance across both storage modes", () => {
    console.log("=== ECS Storage Benchmark Comparison (MapStorage vs SparseSetStorage) ===");
    for (const count of [100, 1000, 5000]) {
      const resMap = runWorldBenchmark(count, 20, false);
      const resSparse = runWorldBenchmark(count, 20, true);
      console.log(
        `[${count} entities]` +
        ` MapStorage: ${resMap.msPerTick.toFixed(3)}ms/tick (AoS: ${resMap.snapshotAoSMs.toFixed(3)}ms, SoA: ${resMap.snapshotSoAMs.toFixed(3)}ms, RSS: ${resMap.residentMemoryMB.toFixed(2)}MB)` +
        ` | SparseSetStorage: ${resSparse.msPerTick.toFixed(3)}ms/tick (AoS: ${resSparse.snapshotAoSMs.toFixed(3)}ms, SoA: ${resSparse.snapshotSoAMs.toFixed(3)}ms, RSS: ${resSparse.residentMemoryMB.toFixed(2)}MB)`
      );

      expect(resSparse.msPerTick).toBeGreaterThan(0);
      expect(resMap.msPerTick).toBeGreaterThan(0);
    }
  });
});
