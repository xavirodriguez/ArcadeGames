import {
  TouchInputState,
  applyDeadzone,
  normalizeVector,
  snapTo4Way,
  snapTo8Way,
  clamp,
  mapPointerToPaddle,
} from "../src/input";

describe("TouchInputState", () => {
  let state: TouchInputState;

  beforeEach(() => {
    state = new TouchInputState();
  });

  test("manages continuous movement axis state", () => {
    expect(state.moveX).toBe(0);
    expect(state.moveY).toBe(0);

    state.setMove(0.75, -0.5);
    expect(state.moveX).toBe(0.75);
    expect(state.moveY).toBe(-0.5);
  });

  test("manages action button states", () => {
    expect(state.getButton("fire")).toBe(false);

    state.setButton("fire", true);
    expect(state.getButton("fire")).toBe(true);

    state.setButton("fire", false);
    expect(state.getButton("fire")).toBe(false);
  });

  test("manages paddle and pointer position states", () => {
    state.setPaddlePos(120, 300);
    expect(state.paddlePos).toEqual({ x: 120, y: 300 });

    state.setPointerPos(450, 600);
    expect(state.pointerPos).toEqual({ x: 450, y: 600 });
  });

  test("enqueues and consumes discrete events", () => {
    state.addTap(100, 200, 1000);
    state.addTap(150, 250, 1005);
    state.addFling(1, 0, 500);
    state.addLaneShift("left");

    expect(state.taps).toHaveLength(2);
    expect(state.flings).toHaveLength(1);
    expect(state.laneShifts).toHaveLength(1);

    const consumed = state.consumeEvents();

    expect(consumed.taps).toHaveLength(2);
    expect(consumed.taps[0]).toEqual({ x: 100, y: 200, timestamp: 1000 });
    expect(consumed.flings).toEqual([{ dirX: 1, dirY: 0, speed: 500 }]);
    expect(consumed.laneShifts).toEqual(["left"]);

    // Queues should be empty after consumption
    expect(state.taps).toHaveLength(0);
    expect(state.flings).toHaveLength(0);
    expect(state.laneShifts).toHaveLength(0);
  });

  test("resets all continuous and discrete states", () => {
    state.setMove(1, 1);
    state.setButton("boost", true);
    state.setPaddlePos(50, 50);
    state.setPointerPos(100, 100);
    state.addTap(10, 10);

    state.reset();

    expect(state.moveX).toBe(0);
    expect(state.moveY).toBe(0);
    expect(state.getButton("boost")).toBe(false);
    expect(state.paddlePos).toEqual({ x: 0, y: 0 });
    expect(state.pointerPos).toEqual({ x: 0, y: 0 });
    expect(state.taps).toHaveLength(0);
  });
});

describe("TouchInputUtils", () => {
  test("clamp restricts values within range", () => {
    expect(clamp(5, 0, 10)).toBe(5);
    expect(clamp(-5, 0, 10)).toBe(0);
    expect(clamp(15, 0, 10)).toBe(10);
  });

  test("applyDeadzone filters small noise and remaps range", () => {
    expect(applyDeadzone(0.1, 0.2)).toBe(0);
    expect(applyDeadzone(-0.15, 0.2)).toBe(0);
    expect(applyDeadzone(0.6, 0.2)).toBeCloseTo(0.5); // (0.6 - 0.2) / 0.8
    expect(applyDeadzone(-1.0, 0.2)).toBe(-1.0);
  });

  test("normalizeVector constrains magnitude to max 1.0", () => {
    expect(normalizeVector(0, 0)).toEqual({ x: 0, y: 0 });
    expect(normalizeVector(0.5, 0.5)).toEqual({ x: 0.5, y: 0.5 }); // length < 1

    const norm = normalizeVector(3, 4); // length = 5
    expect(norm.x).toBeCloseTo(0.6);
    expect(norm.y).toBeCloseTo(0.8);
  });

  test("snapTo4Way snaps vectors to 4 cardinal directions", () => {
    expect(snapTo4Way(0.05, 0.05)).toEqual({ x: 0, y: 0 });
    expect(snapTo4Way(0.8, 0.1)).toEqual({ x: 1, y: 0 }); // Right
    expect(snapTo4Way(-0.9, 0.1)).toEqual({ x: -1, y: 0 }); // Left
    expect(snapTo4Way(0.1, 0.9)).toEqual({ x: 0, y: 1 }); // Down
    expect(snapTo4Way(0.1, -0.9)).toEqual({ x: 0, y: -1 }); // Up
  });

  test("snapTo8Way snaps vectors to 8 directional sectors", () => {
    expect(snapTo8Way(0.05, 0.05)).toEqual({ x: 0, y: 0 });
    expect(snapTo8Way(0.8, 0.1)).toEqual({ x: 1, y: 0 }); // Right
    expect(snapTo8Way(0.8, 0.8)).toEqual({ x: 1, y: 1 }); // Down-Right
    expect(snapTo8Way(0.1, 0.8)).toEqual({ x: 0, y: 1 }); // Down
    expect(snapTo8Way(-0.8, -0.8)).toEqual({ x: -1, y: -1 }); // Up-Left
  });

  test("mapPointerToPaddle maps touch x to bounded paddle position", () => {
    // minX = 0, maxX = 400, paddleWidth = 80 -> valid center range [40, 360]
    expect(mapPointerToPaddle(200, 0, 400, 80)).toBe(200);
    expect(mapPointerToPaddle(10, 0, 400, 80)).toBe(40);
    expect(mapPointerToPaddle(390, 0, 400, 80)).toBe(360);
  });
});
