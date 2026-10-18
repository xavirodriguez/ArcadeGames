# Echo Runner — Pixel-art restoration slice

## Intent

This first visual slice replaces the protagonist's smooth geometric body with an original indexed-colour pixel sprite. The dark Archive silhouette, cyan restoration core, white visor, crimson corruption antenna and gold pulse accents use the active Echo Runner theme.

## Rendering contract

- The 12×16 indexed-colour grid is shared by Canvas and Skia.
- Animation state is derived from velocity, grounded state, attack state and the simulation tick; it does not read wall-clock time or random values.
- The gameplay collider, ECS components, movement systems and pulse hitbox are unchanged.
- The sprite is rasterized as rectangles rather than relying on image smoothing or platform-specific image assets.

## Review checklist

- [ ] Compare Canvas and Skia at the same viewport and simulation tick.
- [ ] Verify idle, running, jump, fall, attack and invulnerability flash in a real gameplay capture.
- [ ] Run the Echo Runner unit and lifecycle suites, app typecheck and lint.
- [ ] Confirm the sprite remains readable at the smallest supported viewport.
- [ ] Profile on a representative mobile device before adding more per-pixel animated assets.

This is an initial vertical slice, not a claim that the full environment restoration mechanic or all environment sprites have been completed.
