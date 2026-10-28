import { performance } from "node:perf_hooks";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";
import { World } from "../ecs/World";
import { canonicalToInputFrame, createEmptyCanonicalInputState } from "../input/CanonicalInput";
import { hasInputAction } from "../input/hasInputAction";
import { applyInputFrameToEntity } from "../network/InputComponentFactory";
import { LocalPredictionSystem } from "../network/LocalPredictionSystem";
import { NetworkManager } from "../network/NetworkManager";
import type { InputPayload, MultiplayerRegistry } from "../network/types";

interface Measurement {
  name: string;
  iterations: number;
  elapsedMs: number;
  operationsPerSecond: number;
  netHeapDeltaBytesPerOperation: number;
}

function measure(name: string, iterations: number, operation: () => void): Measurement {
  for (let i = 0; i < Math.min(2_000, iterations); i++) operation();

  const heapBefore = process.memoryUsage().heapUsed;
  const started = performance.now();
  for (let i = 0; i < iterations; i++) operation();
  const elapsedMs = performance.now() - started;
  const heapAfter = process.memoryUsage().heapUsed;
  const safeElapsedMs = Math.max(elapsedMs, 0.001);

  const result: Measurement = {
    name,
    iterations,
    elapsedMs,
    operationsPerSecond: iterations / (safeElapsedMs / 1_000),
    netHeapDeltaBytesPerOperation: (heapAfter - heapBefore) / iterations
  };

  process.stdout.write(
    `${result.name}: ${result.iterations} ops in ${result.elapsedMs.toFixed(2)} ms; ` +
    `${result.operationsPerSecond.toFixed(0)} ops/s; net heap delta ${result.netHeapDeltaBytesPerOperation.toFixed(2)} bytes/op\n`
  );
  return result;
}

/**
 * Repeatable throughput/heap-delta probe.
 * Heap delta is a retained-heap proxy, not an exact count of allocations or GC activity.
 */
export function runInputPathBenchmark(): Measurement[] {
  const canonical = createEmptyCanonicalInputState();
  canonical.actions = ["boost", "fire", "thrust"];
  canonical.axes.moveX = 1;
  canonical.axes.aimY = -0.25;

  let tick = 0;
  const inputWorld = new World<MultiplayerRegistry>();
  const entity = inputWorld.createEntity();
  inputWorld.addComponent(entity, {
    type: "Transform",
    x: 0,
    y: 0,
    rotation: 0,
    scaleX: 1,
    scaleY: 1,
    worldX: 0,
    worldY: 0,
    worldRotation: 0,
    worldScaleX: 1,
    worldScaleY: 1,
    dirty: false
  });
  inputWorld.addComponent(entity, { type: "Velocity", vx: 1, vy: 1 });
  inputWorld.addComponent(entity, { type: "LocalPlayer" });
  applyInputFrameToEntity(inputWorld, entity, { actions: ["fire", "boost"], axes: { moveX: 1 } });

  const predictionSystem = new LocalPredictionSystem<MultiplayerRegistry, InputPayload>(
    new NetworkManager<MultiplayerRegistry>(),
    { simulateFn: () => undefined }
  );

  process.stdout.write("Input-path microbenchmark; heap delta is not an allocation count.\n");
  return [
    measure("canonicalToInputFrame", 50_000, () => {
      canonicalToInputFrame(canonical, tick++);
    }),
    measure("hasInputAction", 250_000, () => {
      hasInputAction(canonical.actions, "fire");
    }),
    measure("applyInputFrameToEntity", 25_000, () => {
      applyInputFrameToEntity(inputWorld, entity, { actions: ["fire", "boost"], axes: { moveX: 1 } });
    }),
    measure("LocalPredictionSystem.update/enqueue", 10_000, () => {
      predictionSystem.update(inputWorld, 1 / 60);
    })
  ];
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  runInputPathBenchmark();
}
