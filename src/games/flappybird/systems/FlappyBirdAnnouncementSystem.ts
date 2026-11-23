import { System, THEME_RESOURCE_KEY } from "@tiny-aster/core";
import type {
  World,
  Theme,
  TransformComponent,
  TTLComponent
} from "@tiny-aster/core";
import { colors } from "../../../theme/colors";
import type {
  FlappyBirdComponentRegistry,
  FlappyBirdEventRegistry,
  FlappyBirdRenderComponent
} from "../types/FlappyBirdTypes";
import { resolveFlappyAnnouncement } from "../theme/FlappyThemeShared";
import type { FlappyAnnouncementDescriptor } from "../theme/FlappyThemeShared";

/**
 * VFX consumer for scenario and sector-event announcements.
 * It subscribes to gameplay facts directly and owns only transient presentation entities.
 */
export class FlappyBirdAnnouncementSystem extends System<
  FlappyBirdComponentRegistry,
  FlappyBirdEventRegistry
> {
  private readonly subscriptions: Array<() => void> = [];

  public override onRegister(
    world: World<FlappyBirdComponentRegistry, FlappyBirdEventRegistry>
  ): void {
    if (this.subscriptions.length > 0) return;
    const eventBus = world.getEventBus();

    this.subscriptions.push(
      eventBus.on("flappy:scenario_changed", ({ to }) => {
        this.announce(world, { type: "scenario", scenario: to }, 0, -22);
      }),
      eventBus.on("flappy:sector_event_started", ({ event }) => {
        this.announce(world, { type: "sector_event", event }, 0, 18);
      })
    );
  }

  public override update(
    _world: World<FlappyBirdComponentRegistry, FlappyBirdEventRegistry>,
    _deltaTime: number
  ): void {}

  public override dispose(): void {
    for (const unsubscribe of this.subscriptions) unsubscribe();
    this.subscriptions.length = 0;
  }

  private announce(
    world: World<FlappyBirdComponentRegistry, FlappyBirdEventRegistry>,
    descriptor: FlappyAnnouncementDescriptor,
    offsetX: number,
    offsetY: number
  ): void {
    if (world.isReSimulating) return;

    const birdEntity = world.query("Bird", "Transform")[0];
    const birdTransform = birdEntity === undefined
      ? undefined
      : world.getComponent(birdEntity, "Transform");
    const x = (birdTransform?.worldX ?? birdTransform?.x ?? 0) + offsetX;
    const y = (birdTransform?.worldY ?? birdTransform?.y ?? 0) + offsetY;
    const theme = world.getResource<Theme>(THEME_RESOURCE_KEY);
    const text = resolveFlappyAnnouncement(theme, descriptor);
    const color = theme?.colorMap?.bird ?? colors.yellow;

    const transform: TransformComponent = {
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
      dirty: true
    };
    const render: FlappyBirdRenderComponent = {
      type: "Render",
      shape: "floating_text",
      size: 14,
      color,
      visible: true,
      opacity: 1,
      order: 120,
      rotation: 0,
      angularVelocity: 0,
      hitFlashFrames: 0,
      text
    };
    const ttl: TTLComponent = {
      type: "TTL",
      remaining: 0.9,
      timeLeft: 0.9
    };

    const entity = world.isUpdating ? world.reserveEntityId() : world.createEntity();
    if (world.isUpdating) {
      const commands = world.getCommandBuffer();
      commands.createEntity(entity);
      commands.addComponent(entity, transform);
      commands.addComponent(entity, render);
      commands.addComponent(entity, ttl);
      return;
    }

    world.addComponent(entity, transform);
    world.addComponent(entity, render);
    world.addComponent(entity, ttl);
  }
}
