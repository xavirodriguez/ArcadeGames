import { World, ReplayRecorder, ReplayPlayer, InputFrame } from "../src";

describe("Replay System (Recorder & Player)", () => {
  let world: World<any>;
  let entityId: number;

  beforeEach(() => {
    world = new World<any>();
    entityId = world.createEntity();
    world.addComponent(entityId, {
      type: "Transform",
      x: 100,
      y: 100
    } as any);
  });

  it("should record input frames, serialize them, and play them back bit-perfectly", () => {
    const seed = 12345;
    const recorder = new ReplayRecorder(seed);

    // Mock recorded frames
    const frame1: InputFrame = {
      tick: 1,
      actions: ["shoot", "thrust"],
      axes: { moveX: 1.0, moveY: 0.0 }
    };
    const frame2: InputFrame = {
      tick: 2,
      actions: ["thrust"],
      axes: { moveX: 0.5, moveY: -0.5 }
    };

    recorder.recordFrame(frame1);
    recorder.recordFrame(frame2);

    const serialized = recorder.serialize({ gameId: "space-invaders", duration: 120 });
    expect(serialized).toContain('"seed":12345');
    expect(serialized).toContain('"gameId":"space-invaders"');

    // Load serialized replay using Player
    const player = new ReplayPlayer(serialized);
    expect(player.getSeed()).toBe(12345);
    expect(player.isFinished(0)).toBe(false);

    // Apply inputs for tick 1
    const applied1 = player.applyInputForTick(world, entityId, 1);
    expect(applied1).toBe(true);

    const inputComp1 = world.getComponent(entityId, "Input" as any) as any;
    expect(inputComp1).toBeDefined();
    expect(inputComp1.actions.has("shoot")).toBe(true);
    expect(inputComp1.actions.has("thrust")).toBe(true);
    expect(inputComp1.axes.moveX).toBe(1.0);

    // Apply inputs for tick 2
    const applied2 = player.applyInputForTick(world, entityId, 2);
    expect(applied2).toBe(true);

    const inputComp2 = world.getComponent(entityId, "Input" as any) as any;
    expect(inputComp2.actions.has("shoot")).toBe(false); // cleared/not present in tick 2 frame
    expect(inputComp2.actions.has("thrust")).toBe(true);
    expect(inputComp2.axes.moveY).toBe(-0.5);

    // Apply inputs for nonexistent tick 3
    const applied3 = player.applyInputForTick(world, entityId, 3);
    expect(applied3).toBe(false);

    // Check finished boundary
    expect(player.isFinished(2)).toBe(false);
    expect(player.isFinished(3)).toBe(true); // tick 3 is beyond recorded max tick (2)
  });
});
