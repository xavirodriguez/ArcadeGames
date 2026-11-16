import { World } from "../src/ecs/World";
import { CoreComponentRegistry } from "../src/ecs/CoreComponents";
import { EnemySensorSystem } from "../src/systems/EnemySensorSystem";

function addTransform(
  world: World<CoreComponentRegistry>,
  entity: number,
  x: number,
  y: number
): void {
  world.addComponent(entity, {
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
    dirty: false
  });
}

describe("EnemySensorSystem player input families", () => {
  it("detects a belt-scroll player without requiring PlatformerInput", () => {
    const world = new World<CoreComponentRegistry>();
    const player = world.createEntity();
    addTransform(world, player, 100, 100);
    world.addComponent(player, {
      type: "BeltInput",
      moveX: 0,
      moveY: 0,
      attackHeld: false,
      attackPressed: false,
      fireHeld: false,
      firePressed: false,
      specialHeld: false,
      specialPressed: false,
      jumpHeld: false,
      jumpPressed: false,
      _prevHeldMask: 0
    });

    const enemy = world.createEntity();
    addTransform(world, enemy, 150, 100);
    world.addComponent(enemy, {
      type: "PlayerSensor",
      visionRange: 100,
      detectedPlayerEntity: undefined
    });

    new EnemySensorSystem().update(world, 1 / 60);

    const sensor = world.getComponent(enemy, "PlayerSensor");
    expect(sensor?.detectedPlayerEntity).toBe(player);
  });

  it("keeps the nearest target selection deterministic across both input families", () => {
    const world = new World<CoreComponentRegistry>();

    const beltPlayer = world.createEntity();
    addTransform(world, beltPlayer, 110, 100);
    world.addComponent(beltPlayer, {
      type: "BeltInput",
      moveX: 0,
      moveY: 0,
      attackHeld: false,
      attackPressed: false,
      fireHeld: false,
      firePressed: false,
      specialHeld: false,
      specialPressed: false,
      jumpHeld: false,
      jumpPressed: false,
      _prevHeldMask: 0
    });

    const platformerPlayer = world.createEntity();
    addTransform(world, platformerPlayer, 120, 100);
    world.addComponent(platformerPlayer, {
      type: "PlatformerInput",
      moveDir: 0,
      jumpPressed: false,
      jumpHeld: false,
      jumpReleased: false
    });

    const enemy = world.createEntity();
    addTransform(world, enemy, 100, 100);
    world.addComponent(enemy, {
      type: "PlayerSensor",
      visionRange: 100,
      detectedPlayerEntity: undefined
    });

    new EnemySensorSystem().update(world, 1 / 60);

    const sensor = world.getComponent(enemy, "PlayerSensor");
    expect(sensor?.detectedPlayerEntity).toBe(beltPlayer);
  });
});
