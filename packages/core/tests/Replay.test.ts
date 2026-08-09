import { World, System, SystemPhase, UnifiedInputSystem, GameplayFreeze } from "../src";
import { ReplayRecorder } from "../src/replay/ReplayRecorder";
import { ReplayPlayer } from "../src/replay/ReplayPlayer";

interface PositionComponent {
  type: "Position";
  x: number;
  y: number;
}

interface VelocityComponent {
  type: "Velocity";
  vx: number;
  vy: number;
}

interface SmokeRegistry {
  Position: PositionComponent;
  Velocity: VelocityComponent;
  LocalPlayer: { type: "LocalPlayer" };
  Input: { type: "Input"; actions: Set<string>; axes: Record<string, number> };
}

class TestInputReaderSystem extends System<any> {
  update(world: World<any>, deltaTime: number): void {
    const inputSystem = world.getResource<any>("InputSystem");
    if (!inputSystem) return;

    const players = world.query("LocalPlayer", "Input");
    for (const player of players) {
      world.mutateComponent(player, "Input", (input: any) => {
        input.actions = new Set<string>();
        if (inputSystem.getAction("left")) input.actions.add("left");
        if (inputSystem.getAction("right")) input.actions.add("right");
        if (inputSystem.getAction("up")) input.actions.add("up");
        if (inputSystem.getAction("down")) input.actions.add("down");
      });
    }
  }
}

class TestMovementSystem extends System<any> {
  update(world: World<any>, deltaTime: number): void {
    const players = world.query("LocalPlayer", "Position", "Velocity", "Input");
    for (const player of players) {
      const pos = world.getComponent(player, "Position")!;
      const vel = world.getComponent(player, "Velocity")!;
      const input = world.getComponent(player, "Input")!;

      let speedX = 0;
      let speedY = 0;

      if (input.actions.has("left")) speedX = -100;
      if (input.actions.has("right")) speedX = 100;
      if (input.actions.has("up")) speedY = -100;
      if (input.actions.has("down")) speedY = 100;

      world.mutateComponent(player, "Position", (p) => {
        p.x += speedX * deltaTime;
        p.y += speedY * deltaTime;
      });
    }
  }
}

describe("Replay & Recording Infrastructure Tests", () => {
  let world: World<any>;
  let recorder: ReplayRecorder;
  let movementSys: TestMovementSystem;
  let inputSystem: UnifiedInputSystem;

  beforeEach(() => {
    world = new World<any>();
    recorder = new ReplayRecorder({ actions: ["left", "right", "up", "down"] });
    movementSys = new TestMovementSystem();
    inputSystem = new UnifiedInputSystem();

    world.setResource("InputSystem", inputSystem);
    world.addSystem(new TestInputReaderSystem(), { phase: SystemPhase.Input });
    world.addSystem(movementSys, { phase: SystemPhase.Simulation });
  });

  it("should record ticks and replay them deterministically (bit-perfect)", () => {
    // 1. Initialize starting entity state
    const player = world.createEntity();
    world.addComponent(player, { type: "LocalPlayer" });
    world.addComponent(player, { type: "Position", x: 100, y: 100 });
    world.addComponent(player, { type: "Velocity", vx: 0, vy: 0 });
    world.addComponent(player, { type: "Input", actions: new Set<string>(), axes: {} });

    // Take initial snapshot before recording starts
    const initialSnapshot = world.snapshot();

    // 2. Start recording
    recorder.start(12345);

    // Tick 0: Hold Right
    inputSystem.setOverride("right", true);
    recorder.recordTick(world, 0);
    world.update(0.1); // Move player right (100 -> 110)

    // Tick 1: Hold Right and Down
    inputSystem.setOverride("down", true);
    recorder.recordTick(world, 1);
    world.update(0.1); // Move player right and down (110 -> 120, 100 -> 110)

    // Tick 2: Release Right, Hold Down only
    inputSystem.setOverride("right", false);
    recorder.recordTick(world, 2);
    world.update(0.1); // Move player down only (120 -> 120, 110 -> 120)

    // 3. Stop recording and verify RecordedReplay
    const replayData = recorder.stop({ description: "Test playthrough" });
    expect(replayData.seed).toBe(12345);
    expect(replayData.inputs.length).toBe(3);
    expect(replayData.metadata?.description).toBe("Test playthrough");

    // Verify final player position is exactly (120, 120)
    const finalPos = world.getComponent(player, "Position");
    expect(finalPos?.x).toBe(120);
    expect(finalPos?.y).toBe(120);

    // 4. Restore initial world state from snapshot for playback
    world.restore(initialSnapshot);
    const restoredPos = world.getComponent(player, "Position");
    expect(restoredPos?.x).toBe(100);
    expect(restoredPos?.y).toBe(100);

    // 5. Instancialize ReplayPlayer and playback recorded inputs
    // Clear the input-reading systems from the schedule so they do not overwrite playback inputs
    world.schedule.clearSystems();
    world.addSystem(movementSys, { phase: SystemPhase.Simulation });

    const playerPlayback = new ReplayPlayer(replayData.inputs);

    expect(playerPlayback.isFinished()).toBe(false);
    expect(playerPlayback.getCurrentTick()).toBe(0);

    // Playback Tick 0 (0.1s delta)
    let advanced = playerPlayback.playTick(world, 0.1);
    expect(advanced).toBe(true);
    expect(world.getComponent(player, "Position")?.x).toBe(110);
    expect(world.getComponent(player, "Position")?.y).toBe(100);

    // Playback Tick 1
    advanced = playerPlayback.playTick(world, 0.1);
    expect(advanced).toBe(true);
    expect(world.getComponent(player, "Position")?.x).toBe(120);
    expect(world.getComponent(player, "Position")?.y).toBe(110);

    // Playback Tick 2
    advanced = playerPlayback.playTick(world, 0.1);
    expect(advanced).toBe(true);
    expect(world.getComponent(player, "Position")?.x).toBe(120);
    expect(world.getComponent(player, "Position")?.y).toBe(120);

    // Playback Finished
    advanced = playerPlayback.playTick(world, 0.1);
    expect(advanced).toBe(false); // Reached end of recorded inputs
    expect(playerPlayback.isFinished()).toBe(true);
  });
});
