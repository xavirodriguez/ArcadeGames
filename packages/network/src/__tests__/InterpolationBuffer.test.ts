import { InterpolationBuffer } from "../InterpolationSystem";
import { EntitySnapshot } from "../NetTypes";

describe("InterpolationBuffer", () => {
  const createSnapshot = (timestamp: number, x: number = 0, y: number = 0): EntitySnapshot => ({
    tick: Math.floor(timestamp / 10),
    timestamp,
    x,
    y,
  });

  it("maintains sorted order for in-order insertions", () => {
    const buffer = new InterpolationBuffer(10);
    buffer.push(createSnapshot(100));
    buffer.push(createSnapshot(200));
    buffer.push(createSnapshot(300));

    const result = buffer.getAt(150);
    expect(result).not.toBeNull();
    expect(result!.prev.timestamp).toBe(100);
    expect(result!.next.timestamp).toBe(200);
    expect(result!.alpha).toBeCloseTo(0.5);
  });

  it("maintains sorted order when snapshots arrive out of order", () => {
    const buffer = new InterpolationBuffer(10);
    buffer.push(createSnapshot(300));
    buffer.push(createSnapshot(100));
    buffer.push(createSnapshot(200));
    buffer.push(createSnapshot(150));
    buffer.push(createSnapshot(50));
    buffer.push(createSnapshot(250));

    const res1 = buffer.getAt(75);
    expect(res1).not.toBeNull();
    expect(res1!.prev.timestamp).toBe(50);
    expect(res1!.next.timestamp).toBe(100);

    const res2 = buffer.getAt(175);
    expect(res2).not.toBeNull();
    expect(res2!.prev.timestamp).toBe(150);
    expect(res2!.next.timestamp).toBe(200);

    const res3 = buffer.getAt(225);
    expect(res3).not.toBeNull();
    expect(res3!.prev.timestamp).toBe(200);
    expect(res3!.next.timestamp).toBe(250);
  });

  it("handles duplicate timestamps without breaking order", () => {
    const buffer = new InterpolationBuffer(10);
    buffer.push(createSnapshot(100));
    buffer.push(createSnapshot(200, 10, 20));
    buffer.push(createSnapshot(200, 15, 25));
    buffer.push(createSnapshot(300));

    const res = buffer.getAt(200);
    expect(res).not.toBeNull();
    expect(res!.prev.timestamp).toBe(100);
    expect(res!.next.timestamp).toBe(200);
  });

  it("enforces maxSize limit and shifts oldest snapshots", () => {
    const buffer = new InterpolationBuffer(3);
    buffer.push(createSnapshot(100));
    buffer.push(createSnapshot(200));
    buffer.push(createSnapshot(300));
    buffer.push(createSnapshot(400));

    // Oldest snapshot (100) should have been evicted
    const resOld = buffer.getAt(150);
    expect(resOld).toBeNull();

    const resNew = buffer.getAt(250);
    expect(resNew).not.toBeNull();
    expect(resNew!.prev.timestamp).toBe(200);
    expect(resNew!.next.timestamp).toBe(300);

    const resLatest = buffer.getAt(350);
    expect(resLatest).not.toBeNull();
    expect(resLatest!.prev.timestamp).toBe(300);
    expect(resLatest!.next.timestamp).toBe(400);
  });

  it("enforces maxSize limit when pushing out-of-order older snapshots", () => {
    const buffer = new InterpolationBuffer(3);
    buffer.push(createSnapshot(200));
    buffer.push(createSnapshot(300));
    buffer.push(createSnapshot(400));
    buffer.push(createSnapshot(100)); // Out-of-order older insertion

    // After inserting 100, buffer becomes [100, 200, 300, 400] -> shifted to [200, 300, 400]
    const resOld = buffer.getAt(150);
    expect(resOld).toBeNull();

    const resValid = buffer.getAt(250);
    expect(resValid).not.toBeNull();
    expect(resValid!.prev.timestamp).toBe(200);
    expect(resValid!.next.timestamp).toBe(300);
  });
});
