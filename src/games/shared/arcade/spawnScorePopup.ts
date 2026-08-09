import { World, TransformComponent, RenderComponent, TTLComponent, Juice, Entity } from "@tiny-aster/core";

/**
 * Spawns a floating score or combo popup text at (x, y) coordinates.
 * Animates the text upwards and fades it out using the engine's Juice system.
 *
 * @param world The ECS world.
 * @param x The horizontal screen/world coordinate.
 * @param y The vertical screen/world coordinate.
 * @param text The text content to display.
 * @param color The text color (default: "#FFFF00").
 * @public
 */
export function spawnScorePopup(
  world: World<any>,
  x: number,
  y: number,
  text: string,
  color: string = "#FFFF00"
): Entity {
  const popup = world.reserveEntityId();
  world.getCommandBuffer().createEntity(popup);

  world.getCommandBuffer().addComponent(popup, {
    type: "Transform",
    x,
    y: y - 20,
    rotation: 0,
    scaleX: 1,
    scaleY: 1,
    worldX: x,
    worldY: y - 20,
    worldRotation: 0,
    worldScaleX: 1,
    worldScaleY: 1,
    dirty: false
  } as TransformComponent);

  world.getCommandBuffer().addComponent(popup, {
    type: "Render",
    spriteId: "text",
    shape: "floating_text",
    color,
    visible: true,
    opacity: 1,
    order: 100,
    rotation: 0,
    angularVelocity: 0,
    hitFlashFrames: 0,
    data: { content: text }
  } as unknown as RenderComponent);

  // If the game registry supports UIText, we also attach it
  world.getCommandBuffer().addComponent(popup, {
    type: "UIText",
    content: text,
    wordWrap: false,
    maxLines: 1
  } as any);

  world.getCommandBuffer().addComponent(popup, {
    type: "TTL",
    timeLeft: 1000,
    remaining: 1000
  } as TTLComponent);

  // Defer Juice side-effects or apply them directly toCommandBuffer/world
  Juice.add(world, popup, { property: "y", target: -40, duration: 1000, easing: "easeOut" });
  Juice.add(world, popup, { property: "opacity", target: 0, duration: 1000, easing: "easeIn" });

  return popup;
}
