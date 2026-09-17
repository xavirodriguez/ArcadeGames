import { World, CoreComponentRegistry } from "../src/index";
import { mutatePlatformerInputState } from "../../gameplay-kit/src/arcade/helpers/inputHelpers";

describe("Platformer Input Mutation Tests", () => {
  let world: World<CoreComponentRegistry>;
  let playerEntity: number;

  beforeEach(() => {
    world = new World<CoreComponentRegistry>();
    playerEntity = world.createEntity();

    world.addComponent(playerEntity, {
      type: "PlatformerInput",
      moveDir: 0,
      jumpPressed: false,
      jumpHeld: false,
      jumpReleased: false,
      dash: false
    } as any);

    world.addComponent(playerEntity, {
      type: "PlatformerMovementConfig",
      acceleration: 800,
      maxSpeed: 200,
      deceleration: 1200,
      airAcceleration: 400,
      airDeceleration: 600
    } as any);

    world.addComponent(playerEntity, {
      type: "Velocity",
      vx: 0,
      vy: 0,
      angularVelocity: 0
    } as any);
  });

  it("should set moveDir to -1 on moveLeft: true", () => {
    mutatePlatformerInputState(world as any, { moveLeft: true });
    const inputComp = world.getComponent(playerEntity, "PlatformerInput" as any) as any;
    expect(inputComp.moveDir).toBe(-1);
  });

  it("should set moveDir to 1 on moveRight: true", () => {
    mutatePlatformerInputState(world as any, { moveRight: true });
    const inputComp = world.getComponent(playerEntity, "PlatformerInput" as any) as any;
    expect(inputComp.moveDir).toBe(1);
  });

  it("should evaluate moveDir to 0 when opposing inputs moveLeft and moveRight are both true", () => {
    mutatePlatformerInputState(world as any, { moveLeft: true, moveRight: true });
    const inputComp = world.getComponent(playerEntity, "PlatformerInput" as any) as any;
    expect(inputComp.moveDir).toBe(0);
  });

  it("should update moveRight without getting stuck on previous moveLeft state", () => {
    mutatePlatformerInputState(world as any, { moveLeft: true });
    let inputComp = world.getComponent(playerEntity, "PlatformerInput" as any) as any;
    expect(inputComp.moveDir).toBe(-1);

    mutatePlatformerInputState(world as any, { moveLeft: false, moveRight: true });
    inputComp = world.getComponent(playerEntity, "PlatformerInput" as any) as any;
    expect(inputComp.moveDir).toBe(1);
  });
});
