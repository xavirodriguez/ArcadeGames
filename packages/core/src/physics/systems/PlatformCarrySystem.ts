import { World } from "../../ecs/World";
import { System } from "../../ecs/System";
import {
  CoreComponentRegistry,
  LocomotionProfileComponent,
  PhysicsContact,
  PhysicsContactStateComponent
} from "../../ecs/CoreComponents";
import { Entity } from "../../ecs/Entity";

type Aabb = { type: "aabb"; halfWidth: number; halfHeight: number };

function isAabb(shape: { type: string; halfWidth?: number; halfHeight?: number }): shape is Aabb {
  return shape.type === "aabb"
    && typeof shape.halfWidth === "number"
    && typeof shape.halfHeight === "number";
}

/**
 * Transfers moving-platform displacement and support velocity to platformer passengers.
 *
 * @remarks
 * Run after jump resolution and before PhysicsIntegrateSystem. Platform motion must
 * already have been advanced by MovingPlatformSystem in the same fixed simulation tick.
 * The system publishes a PhysicsContact so locomotion profiles can control velocity
 * relative to the support surface. Momentum inheritance is opt-in through
 * LocomotionProfile.momentum.preserveMomentum; entities without a profile retain
 * the legacy detach behavior.
 *
 * @public
 */
export class PlatformCarrySystem extends System<CoreComponentRegistry> {
  /**
   * Carries grounded AABB characters, resolves deterministic landings, and detaches
   * passengers while optionally retaining a fraction of platform velocity.
   *
   * @param world - Simulation world instance.
   * @param deltaTime - Fixed simulation step in seconds.
   */
  public update(world: World<CoreComponentRegistry>, deltaTime: number): void {
    if (world.getResource("IsPaused") === true || !Number.isFinite(deltaTime) || deltaTime < 0) return;

    const characters = world.query("Transform", "Velocity", "Collider2D", "PlatformerGroundState");
    const platforms = world.query("Transform", "Velocity", "Collider2D", "MovingPlatform");

    for (let i = 0; i < characters.length; i++) {
      const character = characters[i];
      const groundState = world.getComponent(character, "PlatformerGroundState");
      const characterTransform = world.getComponent(character, "Transform");
      const characterVelocity = world.getComponent(character, "Velocity");
      const characterCollider = world.getComponent(character, "Collider2D");
      if (!groundState || !characterTransform || !characterVelocity || !characterCollider
        || !characterCollider.enabled || characterCollider.isTrigger || !isAabb(characterCollider.shape)) continue;

      const characterShape = characterCollider.shape;
      const characterCenterX = characterTransform.x + characterCollider.offsetX;
      const characterCenterY = characterTransform.y + characterCollider.offsetY;

      if (groundState.carrierEntity !== undefined) {
        const carrier = groundState.carrierEntity;
        const platformTransform = world.getComponent(carrier, "Transform");
        const platformVelocity = world.getComponent(carrier, "Velocity");
        const platformCollider = world.getComponent(carrier, "Collider2D");
        const validCarrier = world.hasEntity(carrier)
          && world.hasComponent(carrier, "MovingPlatform")
          && platformTransform !== undefined
          && platformVelocity !== undefined
          && platformCollider !== undefined
          && platformCollider.enabled
          && !platformCollider.isTrigger
          && isAabb(platformCollider.shape);

        if (!validCarrier || !groundState.isGrounded) {
          this.detach(world, character, carrier, platformVelocity);
          continue;
        }

        // Apply the platform's fixed-step displacement before the character is integrated.
        const supportState = world.getComponent(character, "PhysicsContactState");
        if (supportState) {
          const previousContact = supportState.groundContact?.entity === carrier
            ? supportState.groundContact
            : supportState.contacts.find((contact) => contact.entity === carrier);
          const previousSupport = previousContact?.surfaceVelocity ?? { x: 0, y: 0 };
          // Locomotion movement already integrates relative velocity plus the previous
          // support velocity. Rebase it to this tick's platform velocity; PhysicsIntegrate
          // then performs the single authoritative passenger displacement.
          world.mutateComponent(character, "Velocity", (velocity) => {
            velocity.vx = velocity.vx - previousSupport.x + platformVelocity.vx;
            velocity.vy = platformVelocity.vy;
          });
        } else {
          // Legacy entities without the contact model retain transform-delta carrying.
          world.mutateComponent(character, "Transform", (transform) => {
            transform.x += platformVelocity.vx * deltaTime;
            transform.y += platformVelocity.vy * deltaTime;
            transform.dirty = true;
          });
        }

        const movedTransform = world.getComponent(character, "Transform")!;
        const platformCenterX = platformTransform.x + platformCollider.offsetX;
        const platformCenterY = platformTransform.y + platformCollider.offsetY;
        const platformShape = platformCollider.shape as Aabb;
        const movedCenterX = movedTransform.x + characterCollider.offsetX;
        const supportCenterX = movedCenterX + (supportState ? platformVelocity.vx * deltaTime : 0);
        const overlapsSupport = supportCenterX + characterShape.halfWidth > platformCenterX - platformShape.halfWidth
          && supportCenterX - characterShape.halfWidth < platformCenterX + platformShape.halfWidth;

        if (!overlapsSupport) {
          this.writeSupportContact(
            world,
            character,
            carrier,
            { x: supportCenterX, y: platformCenterY - platformShape.halfHeight },
            platformVelocity.vx,
            platformVelocity.vy
          );
          world.mutateComponent(character, "PlatformerGroundState", (state) => {
            state.isGrounded = false;
          });
          this.detach(world, character, carrier, platformVelocity);
          continue;
        }

        this.writeSupportContact(
          world,
          character,
          carrier,
          {
            x: supportCenterX,
            y: platformCenterY - platformShape.halfHeight
          },
          platformVelocity.vx,
          platformVelocity.vy
        );
        continue;
      }

      // Landing uses relative vertical velocity and previous-step support positions.
      if (characterCollider.shape.type !== "aabb") continue;
      const previousCharacterBottom = characterCenterY
        - characterVelocity.vy * deltaTime + characterShape.halfHeight;
      const currentCharacterBottom = characterCenterY + characterShape.halfHeight;
      let landedPlatform: Entity | undefined;

      for (let j = 0; j < platforms.length; j++) {
        const platform = platforms[j];
        const platformTransform = world.getComponent(platform, "Transform");
        const platformVelocity = world.getComponent(platform, "Velocity");
        const platformCollider = world.getComponent(platform, "Collider2D");
        if (!platformTransform || !platformVelocity || !platformCollider
          || !platformCollider.enabled || platformCollider.isTrigger || !isAabb(platformCollider.shape)) continue;

        const platformShape = platformCollider.shape;
        const platformCenterX = platformTransform.x + platformCollider.offsetX;
        const platformCenterY = platformTransform.y + platformCollider.offsetY;
        const platformTop = platformCenterY - platformShape.halfHeight;
        const previousPlatformTop = platformTop - platformVelocity.vy * deltaTime;
        const overlapX = characterCenterX + characterShape.halfWidth > platformCenterX - platformShape.halfWidth
          && characterCenterX - characterShape.halfWidth < platformCenterX + platformShape.halfWidth;
        const descendingRelativeToPlatform = characterVelocity.vy >= platformVelocity.vy;
        const wasAbove = previousCharacterBottom <= previousPlatformTop + 2;
        const isAtSurface = currentCharacterBottom >= platformTop - 2
          && currentCharacterBottom <= platformCenterY + platformShape.halfHeight + 5;

        if (overlapX && descendingRelativeToPlatform && wasAbove && isAtSurface) {
          landedPlatform = platform;
          break;
        }
      }

      if (landedPlatform === undefined) continue;
      const landedTransform = world.getComponent(landedPlatform, "Transform")!;
      const landedVelocity = world.getComponent(landedPlatform, "Velocity")!;
      const landedCollider = world.getComponent(landedPlatform, "Collider2D")!;
      const landedShape = landedCollider.shape as Aabb;
      const platformTop = landedTransform.y + landedCollider.offsetY - landedShape.halfHeight;

      const hasContactState = world.hasComponent(character, "PhysicsContactState");
      world.mutateComponent(character, "Transform", (transform) => {
        const landingOffset = hasContactState ? landedVelocity.vy * deltaTime : 0;
        // Contact-aware passengers are placed at the previous support position so
        // PhysicsIntegrateSystem advances them onto the already-advanced platform once.
        transform.y = platformTop - characterShape.halfHeight - characterCollider.offsetY - landingOffset;
        transform.dirty = true;
      });
      world.mutateComponent(character, "Velocity", (velocity) => {
        if (hasContactState) {
          velocity.vx += landedVelocity.vx;
          velocity.vy = landedVelocity.vy;
        } else {
          // Legacy entities without PhysicsContactState keep independent velocity.
          velocity.vy = 0;
        }
      });
      world.mutateComponent(character, "PlatformerGroundState", (state) => {
        state.isGrounded = true;
        state.carrierEntity = landedPlatform;
      });
      this.writeSupportContact(
        world,
        character,
        landedPlatform,
        {
          x: characterCenterX,
          y: platformTop
        },
        landedVelocity.vx,
        landedVelocity.vy
      );
    }
  }

  private writeSupportContact(
    world: World<CoreComponentRegistry>,
    character: Entity,
    platform: Entity,
    point: { x: number; y: number },
    velocityX: number,
    velocityY: number
  ): void {
    if (!world.hasComponent(character, "PhysicsContactState")) return;
    const contact: PhysicsContact = {
      entity: platform,
      point,
      normal: { x: 0, y: -1 },
      separation: 0,
      surfaceVelocity: { x: velocityX, y: velocityY }
    };
    const state = world.getMutableComponent(character, "PhysicsContactState") as PhysicsContactStateComponent | undefined;
    if (!state) return;
    state.contacts = [contact];
    state.groundContact = contact;
    state.isGrounded = true;
  }

  private detach(
    world: World<CoreComponentRegistry>,
    character: Entity,
    carrier: Entity,
    fallbackVelocity?: { vx: number; vy: number }
  ): void {
    const contactState = world.getComponent(character, "PhysicsContactState");
    const supportContact = contactState?.groundContact?.entity === carrier
      ? contactState.groundContact
      : contactState?.contacts.find((contact) => contact.entity === carrier);
    const supportVelocity = supportContact?.surfaceVelocity ?? {
      x: fallbackVelocity?.vx ?? 0,
      y: fallbackVelocity?.vy ?? 0
    };
    const profile = world.getComponent(character, "LocomotionProfile") as LocomotionProfileComponent | undefined;
    const preserve = profile
      ? Math.max(0, Math.min(1, profile.momentum.preserveMomentum))
      : 0;

    if (supportContact || profile) {
      const velocity = world.getMutableComponent(character, "Velocity");
      if (velocity) {
        if (supportContact) {
          // Remove the support contribution for legacy contact-aware entities; opt-in
          // profiles retain only the configured fraction.
          const retained = profile ? preserve : 0;
          velocity.vx = velocity.vx - supportVelocity.x + supportVelocity.x * retained;
          velocity.vy = velocity.vy - supportVelocity.y + supportVelocity.y * retained;
        } else if (profile) {
          // Legacy transform-delta carrying never included support velocity in ECS velocity.
          velocity.vx += supportVelocity.x * preserve;
          velocity.vy += supportVelocity.y * preserve;
        }
      }
    }

    if (world.hasComponent(character, "PlatformerGroundState")) {
      world.mutateComponent(character, "PlatformerGroundState", (state) => {
        state.carrierEntity = undefined;
        state.isGrounded = false;
      });
    }
    if (world.hasComponent(character, "PhysicsContactState")) {
      const state = world.getMutableComponent(character, "PhysicsContactState") as PhysicsContactStateComponent | undefined;
      if (state) {
        state.contacts = state.contacts.filter((contact) => contact.entity !== carrier);
        if (state.groundContact?.entity === carrier) {
          state.groundContact = undefined;
          state.isGrounded = false;
        }
      }
    }
  }
}
