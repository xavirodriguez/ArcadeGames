# VFX P0/P1 — Temporal, Motion and Lab Quality Pass

Branch: `feat/vfx-p0-p1-temporal-motion-lab`

## Scope

This implementation pass addresses the P0/P1 work without introducing a second animation scheduler or particle engine.

### P0 — Temporal foundation
- Add optional `animDuration` to Juice profiles/spawn options.
- Preserve `TTL` as the entity lifetime and use `Render.vfxAnimDuration` as the visual clock when supplied.
- Keep the legacy behavior when `animDuration` is omitted: animation duration defaults to the TTL selected by the existing Juice-level scaling.

### P0 — Secondary motion
- Add a closed-form deterministic recoil/settle sampler.
- Seed its small per-effect variation from the stable entity identity.
- Apply it to the procedural Impact ring without introducing per-frame RNG or particle allocation.

### P0/P1 — Visual Lab and semantic phases
- Add shared semantic phase definitions and a stateless resolver returning `phase` and normalized `phaseT`.
- Add phase-jump controls and phase inspection to the Visual Lab.

### P1 — Deterministic regression tests
- Cover semantic phase boundaries and invalid definitions.
- Cover recoil repeatability, seed variation, finiteness and bounded amplitude.
- Cover the separation between animation progress and unchanged TTL state.

## Deliberate constraints / follow-up

- Per-effect phase maps are not yet authored; the current combat phase map is a shared default.
- A/B preset comparison, onion-skin preview and full timeline curve editing remain follow-up Lab work.
- Secondary motion is initially integrated into Impact only. Expand to Hitstun, Stagger, Slash, Explosion and Combo Finisher after reviewing captures.
- CI and device-level Canvas/Skia visual parity must be verified before merge.
