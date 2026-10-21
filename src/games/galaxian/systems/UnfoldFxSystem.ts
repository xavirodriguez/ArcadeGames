import { System, World, createDeferredEntity } from "@tiny-aster/core";
import { GalaxianComponentRegistry, UnfoldShardComponent } from "../types/GalaxianTypes";
import { GalaxianConfig } from "../types/GalaxianConfigSchema";

export class UnfoldFxSystem extends System<GalaxianComponentRegistry> {
  private listenerBound = false;

  public update(world: World<GalaxianComponentRegistry>, deltaTime: number): void {
    if (!this.listenerBound) {
      const bus = world.getEventBus();
      if (bus) {
        bus.on("combat:enemy_hit" as any, (event: any) => {
          this.spawnUnfoldShards(world, event.x, event.y, event.enemyType);
        });
        this.listenerBound = true;
      }
    }

    if (deltaTime <= 0) return;

    const shardEntities = world.query("UnfoldShard", "Transform");
    for (const entity of shardEntities) {
      const shard = world.getMutableComponent(entity, "UnfoldShard") as UnfoldShardComponent | undefined;
      const transform = world.getMutableComponent(entity, "Transform");
      if (!shard || !transform) continue;

      shard.life -= deltaTime;
      if (shard.life <= 0) {
        world.commands.removeEntity(entity);
      } else {
        transform.x += shard.vx * deltaTime;
        transform.y += shard.vy * deltaTime;
        transform.rotation += shard.vRot * deltaTime;
        transform.dirty = true;
      }
    }
  }

  private spawnUnfoldShards(
    world: World<GalaxianComponentRegistry>,
    x: number,
    y: number,
    enemyType: string
  ): void {
    const config = world.getResource<GalaxianConfig>("GameConfig");
    const palette = config?.visual.colorblindMode
      ? config.visual.paletteColorblind
      : config?.visual.palette;
    if (!palette) return;

    let shardColors = [palette.droneLight, palette.droneMid, palette.droneDark];
    if (enemyType === "emissary") {
      shardColors = [palette.emissaryLight, palette.emissaryMid, palette.emissaryDark];
    } else if (enemyType === "escort") {
      shardColors = [palette.escortLight, palette.escortMid, palette.escortDark];
    } else if (enemyType === "flagship") {
      shardColors = [palette.flagshipLight, palette.flagshipMid, palette.flagshipDark];
    }

    const shardCount = enemyType === "flagship" ? 12 : 6;
    for (let i = 0; i < shardCount; i++) {
      const angle = (i / shardCount) * Math.PI * 2 + world.renderRandom.next() * 0.5;
      const speed = 80 + world.renderRandom.next() * 120;
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed;
      const vRot = (world.renderRandom.next() - 0.5) * 10;
      const color = shardColors[i % shardColors.length];
      const life = 0.45;

      const { add } = createDeferredEntity(world, true);
      add({
        type: "Transform",
        x,
        y,
        rotation: angle,
        scaleX: 1,
        scaleY: 1,
        worldX: x,
        worldY: y,
        worldRotation: angle,
        worldScaleX: 1,
        worldScaleY: 1,
        dirty: true,
      });
      add({
        type: "Render",
        shape: "unfold_shard",
        size: 8,
        color,
        visible: true,
        opacity: 1,
        order: 20,
        rotation: angle,
        angularVelocity: vRot,
        hitFlashFrames: 0,
      });
      add({
        type: "UnfoldShard",
        vx,
        vy,
        rotation: angle,
        vRot,
        color,
        life,
        maxLife: life,
        size: 8,
      });
    }
  }
}
