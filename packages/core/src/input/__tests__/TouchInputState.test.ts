import { TouchInputState } from "../TouchInputState";
import {
  clamp,
  applyDeadzone,
  applyDeadzone2D,
  normalizeAxis,
  snapDirections,
  mapFingerToPaddle,
} from "../TouchInputUtils";

describe("TouchInputUtils", () => {
  describe("clamp", () => {
    it("clamps values correctly", () => {
      expect(clamp(5, 0, 10)).toBe(5);
      expect(clamp(-5, 0, 10)).toBe(0);
      expect(clamp(15, 0, 10)).toBe(10);
    });
  });

  describe("applyDeadzone", () => {
    it("returns 0 within deadzone", () => {
      expect(applyDeadzone(0.1, 0.2)).toBe(0);
      expect(applyDeadzone(-0.15, 0.2)).toBe(0);
      expect(applyDeadzone(0.2, 0.2)).toBe(0);
    });

    it("scales values above deadzone", () => {
      expect(applyDeadzone(0.6, 0.2)).toBeCloseTo(0.5);
      expect(applyDeadzone(1.0, 0.2)).toBe(1.0);
      expect(applyDeadzone(-1.0, 0.2)).toBe(-1.0);
    });
  });

  describe("applyDeadzone2D", () => {
    it("returns zero vector within radial deadzone", () => {
      const res = applyDeadzone2D(0.1, 0.1, 0.2);
      expect(res.x).toBe(0);
      expect(res.y).toBe(0);
    });

    it("remaps magnitude when outside deadzone", () => {
      const res = applyDeadzone2D(1.0, 0.0, 0.2);
      expect(res.x).toBeCloseTo(1.0);
      expect(res.y).toBeCloseTo(0.0);
    });
  });

  describe("normalizeAxis", () => {
    it("normalizes range [min, max] to [-1, 1]", () => {
      expect(normalizeAxis(50, 0, 100)).toBe(0);
      expect(normalizeAxis(0, 0, 100)).toBe(-1);
      expect(normalizeAxis(100, 0, 100)).toBe(1);
    });
  });

  describe("snapDirections", () => {
    it("snaps to 4 cardinal directions", () => {
      const right = snapDirections(0.9, 0.1, 4);
      expect(right.x).toBeCloseTo(Math.sqrt(0.9 * 0.9 + 0.1 * 0.1));
      expect(right.y).toBeCloseTo(0);

      const up = snapDirections(0.1, 0.9, 4);
      expect(up.x).toBeCloseTo(0);
      expect(up.y).toBeCloseTo(Math.sqrt(0.1 * 0.1 + 0.9 * 0.9));
    });

    it("snaps to 8 directions", () => {
      const diag = snapDirections(0.8, 0.8, 8);
      const mag = Math.sqrt(0.8 * 0.8 + 0.8 * 0.8);
      expect(diag.x).toBeCloseTo(Math.cos(Math.PI / 4) * mag);
      expect(diag.y).toBeCloseTo(Math.sin(Math.PI / 4) * mag);
    });
  });

  describe("mapFingerToPaddle", () => {
    it("clamps finger within horizontal bounds", () => {
      const pos = mapFingerToPaddle(120, 50, { minX: 10, maxX: 100 });
      expect(pos.x).toBe(100);
      expect(pos.y).toBe(50);
    });

    it("clamps finger within both horizontal and vertical bounds when provided", () => {
      const pos = mapFingerToPaddle(-10, 200, { minX: 0, maxX: 100, minY: 0, maxY: 150 });
      expect(pos.x).toBe(0);
      expect(pos.y).toBe(150);
    });
  });
});

describe("TouchInputState", () => {
  let state: TouchInputState;

  beforeEach(() => {
    state = new TouchInputState();
  });

  it("initializes with default zeroed values", () => {
    expect(state.moveX).toBe(0);
    expect(state.moveY).toBe(0);
    expect(state.aimX).toBe(0);
    expect(state.aimY).toBe(0);
    expect(state.getButton("fire")).toBe(false);
    expect(state.pointer.active).toBe(false);
  });

  it("updates continuous axes and buttons correctly", () => {
    state.setMoveAxis(-0.8, 0.5);
    expect(state.moveX).toBe(-0.8);
    expect(state.moveY).toBe(0.5);

    state.setButton("jump", true);
    expect(state.getButton("jump")).toBe(true);

    state.setPointer(100, 200, true);
    expect(state.pointer.x).toBe(100);
    expect(state.pointer.y).toBe(200);
    expect(state.pointer.active).toBe(true);
  });

  it("queues and consumes discrete events", () => {
    state.pushTap({ x: 50, y: 60, id: "tap-1" });
    state.pushFling({ direction: "right", velocityX: 500 });
    state.pushLaneShift({ direction: 1 });

    const events = state.consumeEvents();

    expect(events.taps).toHaveLength(1);
    expect(events.taps[0].x).toBe(50);
    expect(events.taps[0].id).toBe("tap-1");

    expect(events.flings).toHaveLength(1);
    expect(events.flings[0].direction).toBe("right");

    expect(events.laneShifts).toHaveLength(1);
    expect(events.laneShifts[0].direction).toBe(1);

    // Queue should be cleared after consumption
    const emptyEvents = state.consumeEvents();
    expect(emptyEvents.taps).toHaveLength(0);
    expect(emptyEvents.flings).toHaveLength(0);
    expect(emptyEvents.laneShifts).toHaveLength(0);
  });

  it("resets all states and queues", () => {
    state.setMoveAxis(1, 1);
    state.setButton("fire", true);
    state.pushTap({ x: 10, y: 10 });

    state.reset();

    expect(state.moveX).toBe(0);
    expect(state.moveY).toBe(0);
    expect(state.getButton("fire")).toBe(false);
    expect(state.consumeTaps()).toHaveLength(0);
  });
});
