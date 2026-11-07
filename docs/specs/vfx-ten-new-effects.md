# Procedural VFX Pack — Ten Additional Effects

Status: implementation baseline
Production registry: 39 procedural drawers
Rendering contract: existing `IDrawAdapter`, Canvas and Skia

## Scope

This pack extends the production procedural VFX vocabulary with ten status, elemental and lifecycle effects. The implementation uses the existing normalized TTL progress, effect color, transform rotation and size. It does not introduce a new renderer, lifecycle, scheduler, random source or drawing primitive.

| Primitive | Visual contract | Semantic read |
| --- | --- | --- |
| `pixelfx_heal` | Plus-sign core, rising motes and a renewal arc | Recovery / healing |
| `pixelfx_poison` | Low toxic cloud, hanging droplets and small bubbles | Persistent toxic status |
| `pixelfx_burn` | Three rising flame tongues around a compressed hot base | Burning / heat damage |
| `pixelfx_frost` | Six-armed snow crystal with branching facets | Freeze / cold status |
| `pixelfx_electric` | Jagged bolt, two branches and a concentrated discharge node | Electrical shock |
| `pixelfx_bleed` | Directional cut marks and falling droplets | Bleeding / wound |
| `pixelfx_buff` | Upward double-chevron and orbiting motes | Positive status / empowerment |
| `pixelfx_debuff` | Descending chevrons and broken status ring | Negative status / weakening |
| `pixelfx_spawn` | Portal aperture, inward ticks and emerging core | Entity arrival |
| `pixelfx_death` | Collapsing shroud and rising fading wisp | Entity defeat / death |

## Temporal review

Every new effect has four deterministic Visual Lab presets at progress 0.04, 0.28, 0.58 and 0.88. Each group shares a stable seed, profile, size and rotation so reviewers can compare the same composition over its lifecycle.

Review the silhouette first, then its motion and residual detail. In particular:

- Heal and Buff must remain distinct: recovery is centered on a plus-sign cue; buff uses upward chevrons.
- Poison and Burn must remain distinct: poison is a low bubbling cloud; burn has rising flame tongues.
- Frost and Electric must remain distinct: frost is radially crystalline; electric is a discontinuous directional bolt.
- Bleed must not read as a generic impact burst.
- Spawn and Death must remain opposites: an aperture opening around an emerging core versus a shroud collapsing around a departing wisp.

## Technical invariants

- All drawers are deterministic functions of the current entity state.
- TTL progress remains the sole temporal input; no private timers or mutable animation state.
- All drawing uses the existing adapter primitives.
- Canvas and Skia register the same 39 primitive names and share the same drawer functions.
- Effects early-return when the entity has expired or effective opacity is zero.
- The Visual Lab catalog references production drawers directly; it does not implement parallel previews.

## Validation still required

Unit tests cover registration parity, temporal preset coverage, deterministic adapter operations, opacity suppression and expired-entity suppression. The implementation still requires execution of Jest and TypeScript checks, followed by matched Canvas/Skia captures and gameplay-scale visual review. Registry parity is not evidence of pixel-identical rendering.
