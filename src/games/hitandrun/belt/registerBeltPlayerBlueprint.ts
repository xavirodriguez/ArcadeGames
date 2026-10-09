/**
 * Fantasy belt-scroll player blueprint: free movement, melee, ranged weapon.
 * No PlatformerGravity / PlatformerJumper / PlatformerGroundState.
 */

import {
  World,
  Entity,
  CoreComponentRegistry,
  EventRegistry,
  BlueprintDefinition,
  HealthComponent,
  TagComponent,
  SystemPhase,
  PhysicsIntegrateSystem
} from "@tiny-aster/core";
import { ArcadeEntityBuilder } from "@tiny-aster/gameplay-kit";
import {
  createBeltInputComponent,
  createBeltMovementComponent
} from "./BeltMovementTypes";
import { createMeleeAttackComponent } from "../melee/HitRunMeleeSystem";
import { FANTASY_PALETTE } from "../fantasy/FantasyPalette";
import type { HitRunWeaponState } from "../weapons/HitRunWeaponTypes";
import type { ComboMeleeComponent } from "../melee/ComboMeleeTypes";

export interface BeltPlayerSpawnArgs {
  x: number;
  y: number;
  weaponId?: string;
  health?: number;
  size?: number;
}

export const DEFAULT_BELT_PLAYER_SPAWN: Required<
  Omit<BeltPlayerSpawnArgs, "x" | "y">
> & { x: number; y: number } = {
  x: 120,
  y: 400,
  weaponId: "longbow",
  health: 5,
  size: 26
};

export function spawnBeltPlayer(
  world: World<CoreComponentRegistry>,
  entity: Entity,
  args: BeltPlayerSpawnArgs
): void {
  const x = args.x;
  const y = args.y;
  const size = args.size ?? DEFAULT_BELT_PLAYER_SPAWN.size;
  const health = args.health ?? DEFAULT_BELT_PLAYER_SPAWN.health;
  const weaponId = args.weaponId ?? DEFAULT_BELT_PLAYER_SPAWN.weaponId;

  ArcadeEntityBuilder.fromEntity(world, entity)
    .withTransform({ x, y, scaleX: 1, scaleY: 1 })
    .withVelocity()
    .withCollider2D({
      shape: { type: "aabb", halfWidth: size * 0.35, halfHeight: size * 0.45 },
      layer: 1,
      mask: 0xffff,
      enabled: true,
      isTrigger: false
    })
    .withRender({
      shape: "player",
      size,
      color: FANTASY_PALETTE.playerArmor,
      order: 2,
      depthSort: true
    })
    .withCollisionEvents();

  world.addComponent(entity, {
    type: "Health",
    current: health,
    max: health
  } as HealthComponent);

  world.addComponent(entity, {
    type: "Tag",
    tags: ["Player", "BeltHero"]
  } as TagComponent);

  world.addComponent(entity, {
    type: "Hurtbox"
  } as { type: string; [key: string]: unknown });

  world.addComponent(entity, {
    type: "Faction",
    value: "player"
  } as { type: string; [key: string]: unknown });

  const beltMove = createBeltMovementComponent(1);
  beltMove.groundY = y;
  world.addComponent(entity, beltMove);

  world.addComponent(entity, {
    type: "BeltElevation",
    z: 0,
    vz: 0,
    grounded: true
  } as unknown as import("./BeltElevationComponent").BeltElevationComponent);

  world.addComponent(entity, createBeltInputComponent());

  world.addComponent(entity, createMeleeAttackComponent());
  world.addComponent(entity, {
    type: "ComboMelee",
    chainStep: 0,
    chainTimer: 0,
    facing: 1,
    activeStep: "idle"
  } as ComboMeleeComponent);

  world.addComponent(entity, {
    type: "HitRunWeapon",
    weaponId: weaponId as HitRunWeaponState["weaponId"],
    cooldownRemaining: 0
  } as HitRunWeaponState);
}

export function createBeltPlayerBlueprint(): BlueprintDefinition<
  CoreComponentRegistry,
  EventRegistry,
  BeltPlayerSpawnArgs
> {
  return {
    spawn: (world, entity, args) => {
      spawnBeltPlayer(world, entity, args ?? { x: 120, y: 400 });
    }
  };
}

export function registerBeltPlayerBlueprint(blueprints: {
  register: (
    name: string,
    def: BlueprintDefinition<
      CoreComponentRegistry,
      EventRegistry,
      BeltPlayerSpawnArgs
    >
  ) => void;
}): void {
  blueprints.register("player", createBeltPlayerBlueprint());
}

import { HierarchySystem } from "@tiny-aster/core";

export function ensurePhysicsIntegration(
  world: World<CoreComponentRegistry>
): void {
  if (world.getResource("BeltPhysicsIntegrateRegistered") === true) return;
  world.addSystem(new PhysicsIntegrateSystem(), {
    phase: SystemPhase.Simulation,
    priority: -10
  });
  world.addSystem(new HierarchySystem(), {
    phase: SystemPhase.Transform,
    priority: 0
  });
  world.setResource("BeltPhysicsIntegrateRegistered", true);
}
