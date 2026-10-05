import {
  System,
  World,
  CoreComponentRegistry,
  Collider2DComponent,
  PhysicsUtils
} from "@tiny-aster/core";
import { resolveHitRunAim } from "../input/resolveHitRunAim";
import { getWeaponDefinition, createWeaponState } from "../weapons/HitRunWeaponCatalog";
import type { HitRunWeaponState } from "../weapons/HitRunWeaponTypes";

export class HitRunPlayerControllerSystem extends System<CoreComponentRegistry> {
  public update(world: World<CoreComponentRegistry>, deltaTime: number): void {
    if (world.getResource("IsPaused") === true) return;

    const players = world.query("PlatformerInput", "Transform", "Collider2D");
    const len = players.length;

    for (let i = 0; i < len; i++) {
      const player = players[i];
      const input = world.getComponent(player, "PlatformerInput") as {
        moveDir?: number;
        jumpPressed?: boolean;
        aimUp?: boolean;
        aimDown?: boolean;
        pulsePressed?: boolean;
        pulseCooldown?: number;
        grenadePressed?: boolean;
        grenadeCooldown?: number;
        [key: string]: unknown;
      } | undefined;

      if (!input) continue;

      const groundState = world.getComponent(player, "PlatformerGroundState") as {
        isGrounded?: boolean;
      } | undefined;
      const isGrounded = groundState?.isGrounded ?? false;

      const transform = world.getComponent(player, "Transform") as {
        x: number;
        y: number;
        scaleX?: number;
      } | undefined;
      if (!transform) continue;

      const facing = (transform.scaleX ?? 1) >= 0 ? 1 : -1;

      // 1. Aim resolution (aiming down on ground -> forward, aiming down airborne -> down)
      const effectiveAimDown = isGrounded ? false : !!input.aimDown;

      const aim = resolveHitRunAim({
        moveLeft: (input.moveDir ?? 0) < 0,
        moveRight: (input.moveDir ?? 0) > 0,
        aimUp: !!input.aimUp,
        aimDown: effectiveAimDown,
        lastFacingX: facing
      });

      // 2. Crouching logic
      const wantsCrouch = isGrounded && !!input.aimDown;

      world.mutateComponent(player, "PlatformerInput", (inp: unknown) => {
        const p = inp as Record<string, unknown>;
        p.aimX = aim.aimX;
        p.aimY = aim.aimY;
      });

      const collider = world.getComponent(player, "Collider2D") as Collider2DComponent | undefined;
      if (collider && collider.shape.type === "aabb") {
        const targetHalfH = wantsCrouch ? 8 : 16;
        const targetOffset = wantsCrouch ? 8 : 0;
        if (collider.shape.halfHeight !== targetHalfH || collider.offsetY !== targetOffset) {
          world.mutateComponent(player, "Collider2D", (c: Collider2DComponent) => {
            if (c.shape.type === "aabb") {
              c.shape.halfHeight = targetHalfH;
              c.offsetY = targetOffset;
            }
          });
        }
      }

      // 3. Grenade throwing
      let gCd = (input.grenadeCooldown as number) ?? 0;
      if (gCd > 0) {
        gCd = PhysicsUtils.tickTimer(gCd, deltaTime);
        world.mutateComponent(player, "PlatformerInput", (inp: unknown) => {
          (inp as Record<string, unknown>).grenadeCooldown = gCd;
        });
      }

      const wantsGrenade = (input.grenadePressed || input.pulsePressed) && gCd <= 0;
      if (wantsGrenade) {
        world.mutateComponent(player, "PlatformerInput", (inp: unknown) => {
          const p = inp as Record<string, unknown>;
          p.grenadeCooldown = 0.6;
          p.grenadePressed = false;
          p.pulsePressed = false;
        });

        const gx = (transform as { worldX?: number; x: number }).worldX ?? transform.x;
        const gy = (transform as { worldY?: number; y: number }).worldY ?? transform.y;

        const reservedId = world.reserveEntityId();
        world.commands.createEntity(reservedId);
        world.commands.addComponent(reservedId, {
          type: "Transform",
          x: gx + facing * 12,
          y: gy - 10,
          worldX: gx + facing * 12,
          worldY: gy - 10,
          rotation: 0,
          worldRotation: 0,
          scaleX: 1,
          scaleY: 1,
          worldScaleX: 1,
          worldScaleY: 1,
          dirty: true
        });

        world.commands.addComponent(reservedId, {
          type: "Velocity",
          vx: facing * 240 + (aim.aimX * 80),
          vy: -280 + (aim.aimY * 80),
          angularVelocity: facing * 10
        });

        world.commands.addComponent(reservedId, {
          type: "PlatformerGravityConfig",
          riseGravity: 800,
          fallGravity: 800,
          jumpVelocity: 0,
          minJumpVelocity: 0
        } as { type: string; [key: string]: unknown });

        world.commands.addComponent(reservedId, {
          type: "Collider2D",
          shape: { type: "aabb", halfWidth: 5, halfHeight: 5 },
          layer: 1 << 3,
          mask: (1 << 4) | (1 << 0), // Enemies + World
          offsetX: 0,
          offsetY: 0,
          isTrigger: true,
          enabled: true
        });

        world.commands.addComponent(reservedId, {
          type: "CollisionEvents",
          collisions: [],
          activeTriggers: [],
          triggersEntered: [],
          triggersExited: []
        });

        world.commands.addComponent(reservedId, {
          type: "ExplosivePayload",
          damage: 4,
          detonated: false
        } as unknown as CoreComponentRegistry[Extract<keyof CoreComponentRegistry, string>]);

        world.commands.addComponent(reservedId, {
          type: "Damage",
          amount: 4,
          category: "explosive",
          consumption: "remove-component",
          friendlyFire: false,
          sourceEntity: player
        } as { type: string; [key: string]: unknown });

        world.commands.addComponent(reservedId, {
          type: "TTL",
          remaining: 1.8,
          timeLeft: 1.8
        });

        world.commands.addComponent(reservedId, {
          type: "Render",
          shape: "grenade",
          size: 10,
          color: "#22c55e",
          visible: true,
          opacity: 1,
          order: 4,
          rotation: 0,
          angularVelocity: 8,
          hitFlashFrames: 0
        });

        if (!world.isReSimulating) {
          const bus = world.getEventBus();
          if (bus) bus.emit("PlaySFX", { name: "pulse" });
        }
      }

      // 4. Weapon Pickups handling via trigger overlaps
      const colEvents = world.getComponent(player, "CollisionEvents") as {
        activeTriggers?: number[];
        triggersEntered?: number[];
      } | undefined;

      const triggers = [
        ...(colEvents?.triggersEntered ?? []),
        ...(colEvents?.activeTriggers ?? [])
      ];

      for (let t = 0; t < triggers.length; t++) {
        const triggerEntity = triggers[t];
        if (!world.hasEntity(triggerEntity)) continue;

        const pickup = world.getComponent(triggerEntity, "WeaponPickup") as {
          weaponId: string;
          ammo?: number;
        } | undefined;

        if (pickup) {
          const weaponState = world.getMutableComponent(player, "HitRunWeapon") as HitRunWeaponState | undefined;
          if (weaponState) {
            const newState = createWeaponState(pickup.weaponId, pickup.ammo);
            weaponState.weaponId = newState.weaponId;
            weaponState.ammo = newState.ammo;
            weaponState.maxAmmo = newState.maxAmmo;
            weaponState.cooldownRemaining = 0;
          }

          if (!world.isReSimulating) {
            const bus = world.getEventBus();
            if (bus) bus.emit("PlaySFX", { name: "powerup" });
          }

          world.commands.removeEntity(triggerEntity);
        }
      }
    }
  }
}
