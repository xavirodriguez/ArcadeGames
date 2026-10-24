import {
  System,
  World,
  CoreComponentRegistry,
  BlueprintDefinition,
  SystemPhase,
  Entity
} from "@tiny-aster/core";
import { createWeaponPickupBlueprint } from "../weapons/HitRunWeaponPickup";
import type { HitRunWeaponId } from "../weapons/HitRunWeaponTypes";
import {
  createBeltTransformComponent,
  createBeltElevationComponent
} from "../belt/BeltEntityHelpers";

export interface HitRunPowComponent {
  type: "HitRunPow";
  state: "tied" | "liberated" | "retreating";
  timer: number;
  dropType: HitRunWeaponId | "points";
  dropGranted: boolean;
}

export const POW_LAYER = 1 << 6;

export interface PowSpawnArgs {
  x: number;
  y: number;
  z?: number;
  dropType?: HitRunWeaponId | "points";
}

export function createPowBlueprint(): BlueprintDefinition<
  CoreComponentRegistry,
  import("@tiny-aster/core").EventRegistry,
  PowSpawnArgs
> {
  return {
    spawn(world, entity, args) {
      const isUpdating = world.isUpdating;
      const cmd = world.getCommandBuffer();

      const transformComp = createBeltTransformComponent(args.x, args.y);
      const elevComp = createBeltElevationComponent(args.z ?? 0);

      const colliderComp = {
        type: "Collider2D",
        shape: { type: "aabb", halfWidth: 12, halfHeight: 16 },
        layer: POW_LAYER,
        mask: 0xffff,
        offsetX: 0,
        offsetY: 0,
        isTrigger: false,
        enabled: true
      } as const;

      const powComp: HitRunPowComponent = {
        type: "HitRunPow",
        state: "tied",
        timer: 0,
        dropType: args.dropType ?? "shotgun",
        dropGranted: false
      };

      const healthComp = {
        type: "Health",
        current: 1,
        max: 1
      } as const;

      const factionComp = {
        type: "Faction",
        value: "neutral"
      } as const;

      const renderComp = {
        type: "Render",
        shape: "pow",
        size: 16,
        color: "#f59e0b",
        visible: true,
        opacity: 1,
        order: 2,
        depthSort: true,
        rotation: 0,
        angularVelocity: 0,
        hitFlashFrames: 0
      } as const;

      const hurtboxComp = { type: "Hurtbox" } as const;

      if (isUpdating) {
        cmd.addComponent(entity, transformComp as never);
        cmd.addComponent(entity, elevComp as never);
        cmd.addComponent(entity, colliderComp as never);
        cmd.addComponent(entity, powComp as never);
        cmd.addComponent(entity, healthComp as never);
        cmd.addComponent(entity, factionComp as never);
        cmd.addComponent(entity, renderComp as never);
        cmd.addComponent(entity, hurtboxComp as never);
      } else {
        world.addComponent(entity, transformComp as never);
        world.addComponent(entity, elevComp as never);
        world.addComponent(entity, colliderComp as never);
        world.addComponent(entity, powComp as never);
        world.addComponent(entity, healthComp as never);
        world.addComponent(entity, factionComp as never);
        world.addComponent(entity, renderComp as never);
        world.addComponent(entity, hurtboxComp as never);
      }
    }
  };
}

export class HitRunPowSystem extends System<CoreComponentRegistry> {
  public update(world: World<CoreComponentRegistry>, dt: number): void {
    const pows = world.query("HitRunPow", "Transform");
    const len = pows.length;

    let players = world.query("BeltInput", "Transform");
    if (players.length === 0) {
      players = world.query("PlatformerInput", "Transform");
    }
    const playerEntity = players[0];
    const playerTr = playerEntity !== undefined ? world.getComponent(playerEntity, "Transform") : undefined;
    const px = playerTr ? (playerTr.worldX ?? playerTr.x) : undefined;
    const py = playerTr ? (playerTr.worldY ?? playerTr.y) : undefined;

    for (let i = 0; i < len; i++) {
      const entity = pows[i];
      const pow = world.getMutableComponent(entity, "HitRunPow") as
        | HitRunPowComponent
        | undefined;
      if (!pow) continue;

      const tr = world.getMutableComponent(entity, "Transform");
      if (!tr) continue;

      // Interaction check (player contact or attack hit)
      if (pow.state === "tied") {
        let liberated = false;
        if (world.hasComponent(entity, "Dead")) {
          // Hit by bullet or melee attack
          liberated = true;
          if (world.isUpdating) {
            world.getCommandBuffer().removeComponent(entity, "Dead");
          } else {
            world.removeComponent(entity, "Dead");
          }
        } else if (px !== undefined && py !== undefined) {
          const ex = tr.worldX ?? tr.x;
          const ey = tr.worldY ?? tr.y;
          const dx = ex - px;
          const dy = ey - py;
          if (dx * dx + dy * dy <= 28 * 28) {
            liberated = true;
          }
        }

        if (liberated) {
          pow.state = "liberated";
          pow.timer = 1.2;

          if (world.hasComponent(entity, "Hurtbox")) {
            world.getCommandBuffer().removeComponent(entity, "Hurtbox");
          }

          if (!pow.dropGranted) {
            pow.dropGranted = true;
            this.grantPowDrop(world, entity, tr.x, tr.y, pow.dropType);
          }

          const bus = world.getEventBus();
          if (bus) {
            bus.emit("combat:pow_rescued", { entity, dropType: pow.dropType });
            if (!world.isReSimulating) {
              bus.emit("PlaySFX", { name: "item_pickup" });
            }
          }
        }
      } else if (pow.state === "liberated" || pow.state === "retreating") {
        pow.state = "retreating";
        pow.timer -= dt;

        // Animate retreat running rightward & fading out
        tr.x += 120 * dt;
        tr.worldX = tr.x;
        tr.dirty = true;

        const render = world.getMutableComponent(entity, "Render");
        if (render) {
          render.opacity = Math.max(0, pow.timer / 1.2);
        }

        if (pow.timer <= 0) {
          world.getCommandBuffer().addComponent(entity, { type: "Dead" });
        }
      }
    }
  }

  private grantPowDrop(
    world: World<CoreComponentRegistry>,
    powEntity: Entity,
    x: number,
    y: number,
    dropType: HitRunWeaponId | "points"
  ): void {
    if (dropType === "points") {
      const bus = world.getEventBus();
      if (bus) {
        bus.emit("combat:pow_rescued", { entity: powEntity, dropType: "points" });
      }
    } else {
      const pickupEntity = world.createEntity();
      const pickupBp = createWeaponPickupBlueprint();
      pickupBp.spawn(world, pickupEntity, {
        x: x + 20,
        y,
        weaponId: dropType
      });
    }
  }
}

export function registerHitRunPowSystem(world: World<CoreComponentRegistry>): void {
  world.addSystem(new HitRunPowSystem(), {
    phase: SystemPhase.Simulation,
    priority: 16
  });
}
