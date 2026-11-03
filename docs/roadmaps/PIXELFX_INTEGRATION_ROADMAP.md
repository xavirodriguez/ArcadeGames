# PixelFX Integration Roadmap

1. **Done — contracts + spike**  
   Manifest, export adapter fixtures, Juice `pixelFxId`, re-sim guard on `spawn`.

2. **Next — asset registration**  
   Export hit-flash + cartoon-pow (and Sumi-e variant of hit-flash).  
   Register in SPRITE_SHEET_CATALOG; `pnpm run sprites:validate`.

3. **Canvas/Skia parity**  
   Draw one sheet-backed entity with identical anchor/filter on both backends.

4. **Asteroids consumer**  
   Optional `pixelFxId` on rock destroyed while keeping `pixelfx_explosion` procedural fallback.

5. **Platformer / Hit & Run**  
   Only after surface events and Sumi-e review.

6. **Close**  
   Tests for re-sim, manifest validation, docs update to ADR-001 / juice-orchestrator.
