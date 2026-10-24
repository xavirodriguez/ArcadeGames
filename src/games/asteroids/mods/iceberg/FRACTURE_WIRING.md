# Ice-shard fracture wiring

**Status: applied** on `feat/asteroids-visual-mods`.

`AsteroidCollisionSystem.spawnExplosionParticles` invokes `world.getResource<AsteroidsVisualMod>("VisualMod")?.spawnDestructionEffect(...)`, which in `icebergMod` delegates directly to `spawnIceShardFracture`.

No further action required for Phase 3 fracture VFX.
