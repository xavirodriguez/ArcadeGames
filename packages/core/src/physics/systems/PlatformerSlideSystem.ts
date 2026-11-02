import { World } from "../../ecs/World";
import { System } from "../../ecs/System";
import { ComponentRegistry } from "../../ecs/Component";
import {
  CoreComponentRegistry,
  Collider2DComponent,
  ColliderComponent,
  LocomotionProfileComponent,
  PlatformerInputComponent,
  PlatformerPostureComponent,
  PlatformerGroundStateComponent,
  TilemapComponent,
  TransformComponent
} from "../../ecs/CoreComponents";
import { ShapeType } from "../shapes/Shapes";

/**
 * Resolves opt-in slide posture, collider resizing and deterministic stand-up clearance.
 *
 * @remarks
 * Requires PlatformerPosture and a LocomotionProfile with slide tuning. Entities without
 * both components retain their existing movement and collider behavior.
 * @public
 */
export class PlatformerSlideSystem<TRegistry extends ComponentRegistry = CoreComponentRegistry> extends System<TRegistry> {
  /** Updates slide entry/exit using fixed-step time and tilemap-backed clearance. */
  public update(world: World<TRegistry>, deltaTime: number): void {
    if (world.getResource("IsPaused") === true) return;
    const entities = world.query(
      "PlatformerPosture" as Extract<keyof TRegistry, string>,
      "LocomotionProfile" as Extract<keyof TRegistry, string>,
      "PlatformerInput" as Extract<keyof TRegistry, string>,
      "Velocity" as Extract<keyof TRegistry, string>
    );
    const dt = Math.max(0, deltaTime);
    for (let i = 0; i < entities.length; i++) {
      const entity = entities[i];
      const posture = world.getComponent(entity, "PlatformerPosture" as Extract<keyof TRegistry, string>) as PlatformerPostureComponent | undefined;
      const profile = world.getComponent(entity, "LocomotionProfile" as Extract<keyof TRegistry, string>) as LocomotionProfileComponent | undefined;
      const input = world.getComponent(entity, "PlatformerInput" as Extract<keyof TRegistry, string>) as PlatformerInputComponent | undefined;
      const velocity = world.getComponent(entity, "Velocity" as Extract<keyof TRegistry, string>) as { vx: number } | undefined;
      const ground = world.getComponent(entity, "PlatformerGroundState" as Extract<keyof TRegistry, string>) as PlatformerGroundStateComponent | undefined;
      const contacts = world.getComponent(entity, "PhysicsContactState" as Extract<keyof TRegistry, string>) as { isGrounded: boolean } | undefined;
      const transform = world.getComponent(entity, "Transform" as Extract<keyof TRegistry, string>) as TransformComponent | undefined;
      if (!posture || !profile?.slide || !input || !velocity || !transform) continue;

      const isGrounded = contacts?.isGrounded === true || ground?.isGrounded === true;
      const slideHeld = input.slideHeld === true;
      const slide = profile.slide;
      const mutablePosture = world.getMutableComponent(entity, "PlatformerPosture" as Extract<keyof TRegistry, string>) as PlatformerPostureComponent | undefined;
      if (!mutablePosture) continue;

      if (mutablePosture.current === "standing" && slideHeld && isGrounded && Math.abs(velocity.vx) >= Math.max(0, slide.minEntrySpeed)) {
        if (this.resizeCollider(world, entity, mutablePosture.slidingHeight)) {
          mutablePosture.current = "sliding";
          mutablePosture.desired = "sliding";
          mutablePosture.slideElapsed = 0;
        }
        continue;
      }

      if (mutablePosture.current === "sliding") {
        mutablePosture.slideElapsed += dt;
        const minimumElapsed = Math.max(mutablePosture.slideMinimumDuration, slide.minimumDuration);
        const maximumElapsed = Math.min(
          mutablePosture.slideMaximumDuration > 0 ? mutablePosture.slideMaximumDuration : slide.maximumDuration,
          slide.maximumDuration
        );
        const mustExit = mutablePosture.slideElapsed >= maximumElapsed;
        const mayExit = !slideHeld && mutablePosture.slideElapsed >= minimumElapsed;
        if (mustExit || mayExit) {
          mutablePosture.desired = "standing";
          if (this.canStand(world, entity, mutablePosture, transform)) {
            if (this.resizeCollider(world, entity, mutablePosture.standingHeight)) {
              mutablePosture.current = "standing";
              mutablePosture.desired = "standing";
              mutablePosture.slideElapsed = 0;
            }
          } else {
            mutablePosture.current = "blocked";
          }
        }
        continue;
      }

      if (mutablePosture.current === "blocked") {
        mutablePosture.desired = "standing";
        if (this.canStand(world, entity, mutablePosture, transform)
          && this.resizeCollider(world, entity, mutablePosture.standingHeight)) {
          mutablePosture.current = "standing";
          mutablePosture.slideElapsed = 0;
        }
      }
    }
  }

  private getColliderGeometry(world: World<TRegistry>, entity: number): { halfWidth: number; halfHeight: number; offsetX: number; offsetY: number; layer: number; mask: number } | undefined {
    const collider2D = world.getComponent(entity, "Collider2D" as Extract<keyof TRegistry, string>) as Collider2DComponent | undefined;
    if (collider2D?.enabled && !collider2D.isTrigger && collider2D.shape.type === "aabb") {
      return { halfWidth: collider2D.shape.halfWidth, halfHeight: collider2D.shape.halfHeight, offsetX: collider2D.offsetX, offsetY: collider2D.offsetY, layer: collider2D.layer, mask: collider2D.mask };
    }
    const collider = world.getComponent(entity, "Collider" as Extract<keyof TRegistry, string>) as ColliderComponent | undefined;
    if (collider?.enabled && !collider.isTrigger && collider.shape.type === ShapeType.Box) {
      return { halfWidth: collider.shape.width / 2, halfHeight: collider.shape.height / 2, offsetX: collider.offsetX ?? 0, offsetY: collider.offsetY ?? 0, layer: collider.layer, mask: collider.mask };
    }
    return undefined;
  }

  private resizeCollider(world: World<TRegistry>, entity: number, targetHeight: number): boolean {
    const geometry = this.getColliderGeometry(world, entity);
    const transform = world.getMutableComponent(entity, "Transform" as Extract<keyof TRegistry, string>) as TransformComponent | undefined;
    if (!geometry || !transform || targetHeight <= 0) return false;
    const targetHalfHeight = targetHeight / 2;
    const delta = geometry.halfHeight - targetHalfHeight;
    if (delta !== 0) {
      transform.y += delta;
      transform.dirty = true;
    }

    const collider2D = world.getMutableComponent(entity, "Collider2D" as Extract<keyof TRegistry, string>) as Collider2DComponent | undefined;
    if (collider2D?.shape.type === "aabb") collider2D.shape.halfHeight = targetHalfHeight;
    const collider = world.getMutableComponent(entity, "Collider" as Extract<keyof TRegistry, string>) as ColliderComponent | undefined;
    if (collider?.shape.type === ShapeType.Box) collider.shape.height = targetHeight;
    return true;
  }

  private canStand(
    world: World<TRegistry>,
    entity: number,
    posture: PlatformerPostureComponent,
    transform: TransformComponent
  ): boolean {
    const geometry = this.getColliderGeometry(world, entity);
    if (!geometry) return false;
    const tilemaps = world.query("Tilemap" as Extract<keyof TRegistry, string>);
    const footY = transform.y + geometry.offsetY + geometry.halfHeight;
    const topY = footY - posture.standingHeight;
    const left = transform.x + geometry.offsetX - geometry.halfWidth;
    const right = transform.x + geometry.offsetX + geometry.halfWidth;

    if (tilemaps.length > 0) {
      const tilemap = world.getComponent(tilemaps[0], "Tilemap" as Extract<keyof TRegistry, string>) as TilemapComponent | undefined;
      const tilemapTransform = world.getComponent(tilemaps[0], "Transform" as Extract<keyof TRegistry, string>) as TransformComponent | undefined;
      if (tilemap && tilemap.tileSize > 0) {
        const tileSize = tilemap.tileSize;
        const mapX = tilemapTransform?.x ?? 0;
        const mapY = tilemapTransform?.y ?? 0;
        const minX = Math.floor((left - mapX) / tileSize);
        const maxX = Math.floor((right - mapX - 0.001) / tileSize);
        const minY = Math.floor((topY - mapY) / tileSize);
        const maxY = Math.floor((footY - mapY - 0.001) / tileSize);

        for (let ty = minY; ty <= maxY; ty++) {
          const row = tilemap.data[ty];
          if (!row) continue;
          for (let tx = minX; tx <= maxX; tx++) {
            const tileId = row[tx];
            if (tileId === undefined || tileId === 0) continue;
            const definition = tilemap.tileDefinitions?.[tileId];
            if (!definition?.solid || definition.oneWay || definition.slope) continue;
            return false;
          }
        }
      }
    }

    // Non-trigger solid box colliders also block standing; the entity's own collider is ignored.
    const boxEntities = world.query("Transform" as Extract<keyof TRegistry, string>, "Collider" as Extract<keyof TRegistry, string>);
    for (let i = 0; i < boxEntities.length; i++) {
      const otherEntity = boxEntities[i];
      if (otherEntity === entity) continue;
      const other = world.getComponent(otherEntity, "Collider" as Extract<keyof TRegistry, string>) as ColliderComponent | undefined;
      const otherTransform = world.getComponent(otherEntity, "Transform" as Extract<keyof TRegistry, string>) as TransformComponent | undefined;
      if (!other?.enabled || other.isTrigger || other.shape.type !== ShapeType.Box || !otherTransform) continue;
      if ((geometry.mask & other.layer) === 0 || (other.mask & geometry.layer) === 0) continue;
      const otherLeft = otherTransform.x + (other.offsetX ?? 0) - other.shape.width / 2;
      const otherRight = otherTransform.x + (other.offsetX ?? 0) + other.shape.width / 2;
      const otherTop = otherTransform.y + (other.offsetY ?? 0) - other.shape.height / 2;
      const otherBottom = otherTransform.y + (other.offsetY ?? 0) + other.shape.height / 2;
      if (left < otherRight && right > otherLeft && topY < otherBottom && footY > otherTop) return false;
    }

    const aabbEntities = world.query("Transform" as Extract<keyof TRegistry, string>, "Collider2D" as Extract<keyof TRegistry, string>);
    for (let i = 0; i < aabbEntities.length; i++) {
      const otherEntity = aabbEntities[i];
      if (otherEntity === entity) continue;
      const other = world.getComponent(otherEntity, "Collider2D" as Extract<keyof TRegistry, string>) as Collider2DComponent | undefined;
      const otherTransform = world.getComponent(otherEntity, "Transform" as Extract<keyof TRegistry, string>) as TransformComponent | undefined;
      if (!other?.enabled || other.isTrigger || other.shape.type !== "aabb" || !otherTransform) continue;
      if ((geometry.mask & other.layer) === 0 || (other.mask & geometry.layer) === 0) continue;
      const otherLeft = otherTransform.x + other.offsetX - other.shape.halfWidth;
      const otherRight = otherTransform.x + other.offsetX + other.shape.halfWidth;
      const otherTop = otherTransform.y + other.offsetY - other.shape.halfHeight;
      const otherBottom = otherTransform.y + other.offsetY + other.shape.halfHeight;
      if (left < otherRight && right > otherLeft && topY < otherBottom && footY > otherTop) return false;
    }
    return true;
  }
}
