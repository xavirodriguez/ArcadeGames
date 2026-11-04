## Summary

<!-- What changed and why? -->

## Impact

- [ ] Gameplay or simulation behavior
- [ ] Input handling
- [ ] ECS components, systems or scheduling
- [ ] Rendering, Canvas or Skia
- [ ] Assets, audio or generated files
- [ ] Lifecycle, restart or resource cleanup
- [ ] Network, replay or determinism
- [ ] Documentation or tooling only

## Validation

Record each command actually executed and its result. Do not mark a check as passed when it was not run.

- [ ] Relevant unit or regression tests
- [ ] `pnpm run check:agent-guardrails`
- [ ] `pnpm run docs:check`
- [ ] Relevant package or app typecheck
- [ ] Build / E2E checks when affected

Commands and results:

<!-- e.g. pnpm ... — passed / failed / not run -->

## Technical-debt baselines

- [ ] No baseline changed.
- [ ] Baseline changed with measured before/after values and a concrete reason.

<!-- Explain any baseline change. Never update a baseline only to make CI green. -->

## Contract and regression review

- [ ] New behavior has a regression test.
- [ ] Deterministic code does not introduce unseeded randomness or time-dependent simulation behavior.
- [ ] Lifecycle changes cover init, pause/resume, restart and destroy as applicable.
- [ ] Rendering changes preserve the required Canvas/Skia behavior.
- [ ] No unrelated files, generated outputs or public APIs changed accidentally.
