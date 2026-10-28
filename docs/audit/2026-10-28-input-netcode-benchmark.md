# Input-path benchmark baseline

## Scope

The benchmark probes `canonicalToInputFrame`, `hasInputAction`, `applyInputFrameToEntity`, and the enqueue path in `LocalPredictionSystem.update`.

## Reproduction

Run from the repository root:

```sh
pnpm exec tsx packages/core/src/__benchmarks__/inputPathBenchmark.ts
```

The CI workflow runs the same command on pull requests and records throughput and net heap delta in the workflow log. Heap delta is a retained-heap proxy; it is not a direct count of allocations or garbage-collection pauses. Use a profiler before making allocation-focused optimizations.

## Decision

No pooling or cached sorting has been introduced without measured evidence that the input path materially threatens the 16 ms frame budget. The first successful CI execution supplies the environment-specific numeric baseline; those figures must not be guessed or copied across runner environments.
