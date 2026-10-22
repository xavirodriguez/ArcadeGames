# Ice-shard fracture wiring

`AsteroidCollisionSystem.ts` must be the **full master version** plus this branch inside `spawnExplosionParticles`:

```ts
import { spawnIceShardFracture } from "../mods/iceberg/IcebergFracture";

private spawnExplosionParticles(
  world: World<AsteroidsComponentRegistry, AsteroidsEventRegistry>,
  transform: { x: number; y: number },
  size: "large" | "medium" | "small" | "ship"
): void {
  const visualMod = world.getResource<{ particleStyle?: string }>("VisualMod");
  if (visualMod?.particleStyle === "iceShard") {
    spawnIceShardFracture(world, transform.x, transform.y, size);
    return;
  }
  const explosionType = size === "ship" ? "ship" : size === "large" ? "enemy" : "small";
  spawnLayeredExplosion(world, transform.x, transform.y, { type: explosionType });
}
```

Restore file:

```bash
git checkout master -- src/games/asteroids/systems/AsteroidCollisionSystem.ts
# then apply the branch above
```
