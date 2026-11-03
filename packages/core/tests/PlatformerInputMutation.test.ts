import { World, CoreComponentRegistry, PlatformerInputComponent, PlatformerMovementConfigComponent, VelocityComponent } from "../src/index";
import { mutatePlatformerInputState } from "../../gameplay-kit/src/arcade/helpers/inputHelpers";

describe("Platformer Input Mutation Tests", () => {
  let world: World<CoreComponentRegistry>;
  let playerEntity: number;

  beforeEach(() => {
    world = new World<CoreComponentRegistry>();
    playerEntity = world.createEntity();

    const inputComp: PlatformerInputComponent = {
      type: "PlatformerInput",
      moveDir: 0,
      jumpPressed: false,
      jumpHeld: false,
      jumpReleased: false
    };
    world.addComponent(playerEntity, inputComp);

    const movementConfig: PlatformerMovementConfigComponent = {
      type: "PlatformerMovementConfig",
      acceleration: 800,
      maxSpeed: 200,
      deceleration: 1200,
      airAcceleration: 400,
      airDeceleration: 600
    };
    world.addComponent(playerEntity, movementConfig);

    const velocity: VelocityComponent = {
      type: "Velocity",
      vx: 0,
      vy: 0,
      angularVelocity: 0
    };
    world.addComponent(playerEntity, velocity);
  });

  it("should set moveDir to -1 on moveLeft: true", () => {
    mutatePlatformerInputState(world, { moveLeft: true });
    const inputComp = world.getComponent(playerEntity, "PlatformerInput");
    expect(inputComp?.moveDir).toBe(-1);
  });

  it("should set moveDir to 1 on moveRight: true", () => {
    mutatePlatformerInputState(world, { moveRight: true });
    const inputComp = world.getComponent(playerEntity, "PlatformerInput");
    expect(inputComp?.moveDir).toBe(1);
  });

  it("should evaluate moveDir to 0 when opposing inputs moveLeft and moveRight are both true", () => {
    mutatePlatformerInputState(world, { moveLeft: true, moveRight: true });
    const inputComp = world.getComponent(playerEntity, "PlatformerInput");
    expect(inputComp?.moveDir).toBe(0);
  });

  it("should route the held slide action to PlatformerInput.slideHeld", () => {
    mutatePlatformerInputState(world, { slide: true });
    expect(world.getComponent(playerEntity, "PlatformerInput")).toMatchObject({ slideHeld: true, slideActionHeld: true });

    mutatePlatformerInputState(world, { slide: false });
    expect(world.getComponent(playerEntity, "PlatformerInput")).toMatchObject({ slideHeld: false, slideActionHeld: false });
  });

  it("should update moveRight without getting stuck on previous moveLeft state", () => {
    mutatePlatformerInputState(world, { moveLeft: true });
    let inputComp = world.getComponent(playerEntity, "PlatformerInput");
    expect(inputComp?.moveDir).toBe(-1);

    mutatePlatformerInputState(world, { moveLeft: false, moveRight: true });
    inputComp = world.getComponent(playerEntity, "PlatformerInput");
    expect(inputComp?.moveDir).toBe(1);
  });
});
