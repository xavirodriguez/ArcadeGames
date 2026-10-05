import {
  World,
  Entity,
  CoreComponentRegistry
} from "@tiny-aster/core";
import { ArcadeEntityBuilder } from "@tiny-aster/gameplay-kit";

export interface PowArgs {
  x: number;
  y: number;
  id: string;
  weaponDrop?: string;
  ammo?: number;
}

export function registerPowBlueprint(blueprints: { register: (id: string, def: any) => void } | import("@tiny-aster/core").BlueprintRegistry<any>): void {
  (blueprints as { register: (id: string, def: unknown) => void }).register("pow", {
    spawn: (world: World<CoreComponentRegistry>, entity: Entity, args: PowArgs) => {
      ArcadeEntityBuilder.fromEntity(world, entity)
        .withTransform({ x: args.x, y: args.y })
        .withCollider2D({
          shape: { type: "aabb", halfWidth: 12, halfHeight: 16 },
          isTrigger: true,
          layer: 1 << 6,
          mask: 1 // Player
        })
        .withCollisionEvents()
        .withRender({ shape: "pow", size: 24, color: "#facc15", order: 2 });

      world.addComponent(entity, {
        type: "PowHostage",
        weaponDrop: args.weaponDrop ?? "shotgun",
        ammo: args.ammo ?? 30,
        rescued: false
      } as unknown as CoreComponentRegistry[Extract<keyof CoreComponentRegistry, string>]);

      world.addComponent(entity, {
        type: "Tag",
        tags: ["PowHostage"]
      });
    }
  });
}
