import { GameLoop, FrameScheduler } from "../src";

class MockScheduler implements FrameScheduler {
  private currentTime = 0;
  private nextHandle = 1;
  private callbacks = new Map<number, (time: number) => void>();

  now(): number {
    return this.currentTime;
  }

  requestFrame(callback: (time: number) => void): unknown {
    const handle = this.nextHandle++;
    this.callbacks.set(handle, callback);
    return handle;
  }

  cancelFrame(handle: unknown): void {
    this.callbacks.delete(handle as number);
  }

  tick(ms: number) {
    this.currentTime += ms;
    const currentCallbacks = Array.from(this.callbacks.values());
    this.callbacks.clear();
    currentCallbacks.forEach(cb => cb(this.currentTime));
  }
}

describe("GameLoop", () => {
  it("should execute updates and render callbacks", () => {
    const scheduler = new MockScheduler();
    const loop = new GameLoop({
      step: 1 / 60,
      scheduler
    });

    let updates = 0;
    let renders = 0;
    let _lastAlpha = -1;

    loop.subscribeUpdate(() => updates++);
    loop.subscribeRender((alpha) => {
      renders++;
      _lastAlpha = alpha;
    });

    loop.start();

    // Initial frame
    scheduler.tick(16.67); // ~1/60s
    expect(updates).toBe(1);
    expect(renders).toBe(1);

    // Another frame
    scheduler.tick(16.67);
    expect(updates).toBe(2);
    expect(renders).toBe(2);

    // Large jump (3 steps)
    scheduler.tick(50);
    expect(updates).toBe(5);
    expect(renders).toBe(3);

    loop.stop();
  });

  it("should handle stop correctly", () => {
    const scheduler = new MockScheduler();
    const loop = new GameLoop({ scheduler });
    let updates = 0;

    loop.subscribeUpdate(() => updates++);
    loop.start();
    scheduler.tick(16.67);
    expect(updates).toBe(1);

    loop.stop();
    scheduler.tick(16.67);
    expect(updates).toBe(1); // Should not increase after stop
  });

  it("should handle pause and resume correctly", () => {
    const scheduler = new MockScheduler();
    const loop = new GameLoop({ scheduler, step: 1 / 60 });
    let updates = 0;

    loop.subscribeUpdate(() => updates++);
    loop.start();

    // 1 tick, standard behavior
    scheduler.tick(16.67);
    expect(updates).toBe(1);

    // Pause the loop
    loop.pause();

    // Big jump while paused
    scheduler.tick(100);
    expect(updates).toBe(1); // Should not advance while paused

    // Resume the loop
    loop.resume();

    // Advance 1 frame after resume
    scheduler.tick(16.67);
    expect(updates).toBe(2); // Should advance only 1 frame, no massive accumulator jump!

    loop.stop();
  });
});
