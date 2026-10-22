import { System, World, createDeferredEntity } from "@tiny-aster/core";
import { GalaxianComponentRegistry, GalaxianEventRegistry, ScorePopupComponent } from "../types/GalaxianTypes";

export class ScorePopupSystem extends System<GalaxianComponentRegistry, GalaxianEventRegistry> {
  private listenerBound = false;

  public update(world: World<GalaxianComponentRegistry, GalaxianEventRegistry>, deltaTime: number): void {
    if (!this.listenerBound) {
      const bus = world.getEventBus();
      if (bus) {
        bus.on("combat:enemy_hit", (event) => {
          this.spawnPopup(world, event.x, event.y, event.points);
        });
        this.listenerBound = true;
      }
    }

    if (deltaTime <= 0) return;

    const popupEntities = world.query("ScorePopup", "Transform");
    for (const entity of popupEntities) {
      const popup = world.getMutableComponent(entity, "ScorePopup") as ScorePopupComponent | undefined;
      const transform = world.getMutableComponent(entity, "Transform");
      if (!popup || !transform) continue;

      popup.life -= deltaTime;
      if (popup.life <= 0) {
        world.commands.removeEntity(entity);
      } else {
        transform.y -= 14 * deltaTime;
        transform.dirty = true;
      }
    }
  }

  private spawnPopup(world: World<GalaxianComponentRegistry>, x: number, y: number, points: number): void {
    const life = 0.6;
    const { add } = createDeferredEntity(world, true);
    add({
      type: "Transform",
      x,
      y,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      worldX: x,
      worldY: y,
      worldRotation: 0,
      worldScaleX: 1,
      worldScaleY: 1,
      dirty: true,
    });
    add({
      type: "Render",
      shape: "score_popup",
      size: 14,
      color: "#FFC145",
      visible: true,
      opacity: 1,
      order: 25,
      rotation: 0,
      angularVelocity: 0,
      hitFlashFrames: 0,
    });
    add({
      type: "ScorePopup",
      points,
      x,
      y,
      life,
      maxLife: life,
    });
  }
}
