import { World } from "../src/ecs/World";
import { Scene } from "../src/scenes/Scene";
import { SceneManager, SceneState } from "../src/scenes/SceneManager";
import { EventBus } from "../src/events/EventBus";
import {
  TransitionOptions,
  ITransitionEffect,
  EASING_FUNCTIONS,
  getEasingFunction
} from "../src/scenes/TransitionTypes";
import {
  FadeTransition,
  IrisTransition,
  DitherTransition,
  PixelateTransition,
  ScanlineWipeTransition,
  CrossfadeTransition,
  CurtainTransition,
  RetroGridTransition,
  DiagonalSweepTransition,
  RadialWipeTransition
} from "../src/index";

class TestScene extends Scene {
  public enterCount = 0;
  public exitCount = 0;
  public updateCount = 0;
  public renderCount = 0;
  public pauseCount = 0;
  public resumeCount = 0;

  constructor(world: World, name: string) {
    super(world);
    this.name = name;
  }

  public override onEnter(): void {
    this.enterCount++;
  }

  public override onExit(): void {
    this.exitCount++;
  }

  public override onUpdate(dt: number, world: World): void {
    super.onUpdate(dt, world);
    this.updateCount++;
  }

  public override onRender(alpha: number): void {
    this.renderCount++;
  }

  public override onPause(): void {
    this.pauseCount++;
  }

  public override onResume(): void {
    this.resumeCount++;
  }
}

describe("Scene Transitions", () => {
  let world: World;
  let manager: SceneManager;
  let eventBus: EventBus<any>;

  beforeEach(() => {
    world = new World();
    eventBus = new EventBus();
    world.setResource("EventBus", eventBus);
    manager = new SceneManager(world, eventBus);
    world.setResource("SceneManager", manager);
  });

  afterEach(() => {
    manager.destroy();
  });

  test("Easing resolver resolves built-in and custom easing functions", () => {
    const linear = getEasingFunction("linear");
    expect(linear(0.5)).toBe(0.5);

    const custom = (t: number) => t * 3;
    expect(getEasingFunction(custom)(2)).toBe(6);

    const fallback = getEasingFunction("non-existent");
    expect(fallback(0.5)).toBe(0.5);
  });

  test("Immediate transition (duration: 0)", async () => {
    const sceneA = new TestScene(new World(), "SceneA");
    const sceneB = new TestScene(new World(), "SceneB");

    await manager.transitionTo(sceneA, { duration: 0 });
    expect(manager.getCurrentScene()).toBe(sceneA);
    expect(manager.getState()).toBe(SceneState.ACTIVE);
    expect(sceneA.enterCount).toBe(1);

    await manager.transitionTo(sceneB, { duration: 0 });
    expect(manager.getCurrentScene()).toBe(sceneB);
    expect(sceneA.exitCount).toBe(1);
    expect(sceneB.enterCount).toBe(1);
  });

  test("Animated transitionTo (duration: 200ms)", async () => {
    const sceneA = new TestScene(new World(), "SceneA");
    const sceneB = new TestScene(new World(), "SceneB");

    // Pre-populate with sceneA
    await manager.transitionTo(sceneA, { duration: 0 });
    expect(manager.getCurrentScene()).toBe(sceneA);

    const progressEvents: number[] = [];
    eventBus.on("scene:transition:progress", (payload: any) => {
      progressEvents.push(payload.progress);
    });

    // Start transition to sceneB
    const transitionPromise = manager.transitionTo(sceneB, { duration: 200, effect: "fade" });

    // Instantly the old scene should be paused and state should be UNLOADING
    expect(sceneA.pauseCount).toBe(1);
    expect(manager.getState()).toBe(SceneState.UNLOADING);
    expect(manager.getActiveTransitionEffect()).toBeInstanceOf(FadeTransition);

    // Tick by 50ms (25% progress)
    manager.update(50);
    expect(manager.getState()).toBe(SceneState.UNLOADING);
    expect(manager.transitionProgress).toBe(0.25);

    // Tick by 50ms (now 100ms elapsed, 50% progress - midpoint peak)
    manager.update(50);

    // Flush microtasks so onEnter resolves
    await new Promise(resolve => setTimeout(resolve, 0));

    // Advance state machine with onEnterResolved: true
    manager.update(0);

    // Old scene should be exited at midpoint raw progress >= 0.5
    expect(sceneA.exitCount).toBe(1);
    // New scene enters
    expect(sceneB.enterCount).toBe(1);
    expect(manager.getState()).toBe(SceneState.LOADING);
    expect(manager.transitionProgress).toBe(0.5);

    // Tick by 50ms (now 150ms elapsed, 75% progress)
    manager.update(50);
    expect(manager.transitionProgress).toBe(0.75);

    // Tick by 50ms (now 200ms elapsed, 100% progress - completion)
    manager.update(50);
    await transitionPromise;

    expect(manager.getState()).toBe(SceneState.ACTIVE);
    expect(manager.getCurrentScene()).toBe(sceneB);
    expect(progressEvents.length).toBeGreaterThan(0);
    expect(progressEvents[progressEvents.length - 1]).toBe(1.0);
  });

  test("Animated push and pop transitions", async () => {
    const sceneA = new TestScene(new World(), "SceneA");
    const sceneB = new TestScene(new World(), "SceneB");

    await manager.transitionTo(sceneA, { duration: 0 });

    // Animated push
    const pushPromise = manager.push(sceneB, { duration: 100 });
    expect(manager.getState()).toBe(SceneState.UNLOADING);
    expect(sceneA.pauseCount).toBe(1);

    manager.update(50); // Peak
    await new Promise(resolve => setTimeout(resolve, 0)); // Let onEnter resolve
    manager.update(0); // Advance state machine
    expect(sceneB.enterCount).toBe(1);

    manager.update(50); // Done
    await pushPromise;
    expect(manager.getCurrentScene()).toBe(sceneB);

    // Animated pop
    const popPromise = manager.pop({ duration: 100 });
    expect(manager.getState()).toBe(SceneState.UNLOADING);

    manager.update(50); // Peak
    await new Promise(resolve => setTimeout(resolve, 0)); // Let pop resolve
    manager.update(0); // Advance state machine
    expect(sceneB.exitCount).toBe(1);

    manager.update(50); // Done
    await popPromise;

    expect(manager.getCurrentScene()).toBe(sceneA);
    expect(sceneA.resumeCount).toBe(1);
  });

  test("Transitions can use built-in Iris, Dither, and Scanline effects", () => {
    const iris = new IrisTransition();
    const dither = new DitherTransition();
    const scanline = new ScanlineWipeTransition();
    const pixelate = new PixelateTransition();
    const crossfade = new CrossfadeTransition();
    const curtain = new CurtainTransition();
    const grid = new RetroGridTransition();
    const diagonal = new DiagonalSweepTransition();
    const radial = new RadialWipeTransition();

    expect(crossfade.drawsBothScenes).toBe(true);
    expect(curtain.drawsBothScenes).toBe(true);
    expect(grid.drawsBothScenes).toBe(true);
    expect(diagonal.drawsBothScenes).toBe(true);
    expect(radial.drawsBothScenes).toBe(true);

    const mockCanvas = {
      width: 800,
      height: 600
    };
    const mockCtx: any = {
      canvas: mockCanvas,
      save: jest.fn(),
      restore: jest.fn(),
      rect: jest.fn(),
      arc: jest.fn(),
      fill: jest.fn(),
      fillRect: jest.fn(),
      beginPath: jest.fn(),
      moveTo: jest.fn(),
      lineTo: jest.fn(),
      stroke: jest.fn(),
      clearRect: jest.fn(),
      drawImage: jest.fn(),
      closePath: jest.fn(),
      clip: jest.fn()
    };

    // Test render on each at various progress points
    iris.render(mockCtx, 0.25, { color: "#ff0000" });
    expect(mockCtx.save).toHaveBeenCalled();
    expect(mockCtx.restore).toHaveBeenCalled();

    dither.render(mockCtx, 0.4);
    scanline.render(mockCtx, 0.8, { lineColor: "#ff00ff" });
    pixelate.render(mockCtx, 0.3); // Runs cleanly even if document/offscreen elements are absent

    const mockOffscreen = { width: 800, height: 600 };
    const optionsWithOffscreen = { offscreenCanvas: mockOffscreen };

    crossfade.render(mockCtx, 0.5, optionsWithOffscreen);
    curtain.render(mockCtx, 0.5, optionsWithOffscreen);
    grid.render(mockCtx, 0.5, optionsWithOffscreen);
    diagonal.render(mockCtx, 0.5, optionsWithOffscreen);
    radial.render(mockCtx, 0.5, optionsWithOffscreen);
  });
});
