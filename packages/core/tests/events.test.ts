import { EventBus } from "../src";

describe("EventBus", () => {
  it("should emit and receive events", () => {
    const bus = new EventBus<{ "test-event": { value: number } }>();
    let receivedValue = 0;

    bus.on("test-event", (payload) => {
      receivedValue = payload.value;
    });

    bus.emit("test-event", { value: 42 });
    expect(receivedValue).toBe(42);
  });

  it("should handle deferred events", () => {
    const bus = new EventBus<{ "deferred": { msg: string } }>();
    let receivedMsg = "";

    bus.on("deferred", (p) => {
      receivedMsg = p.msg;
    });

    bus.emitDeferred("deferred", { msg: "hello" });
    expect(receivedMsg).toBe("");

    bus.flushDeferred();
    expect(receivedMsg).toBe("hello");
  });

  it("should catch handler errors, log console.error, and continue dispatching to remaining handlers", () => {
    const bus = new EventBus<{ "error-test": { data: string } }>();
    const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

    const handler1Ran = jest.fn();
    const handler2Throws = jest.fn(() => {
      throw new Error("Faulty handler");
    });
    const handler3Ran = jest.fn();

    bus.on("error-test", handler1Ran);
    bus.on("error-test", handler2Throws);
    bus.on("error-test", handler3Ran);

    expect(() => {
      bus.emit("error-test", { data: "test" });
    }).not.toThrow();

    expect(handler1Ran).toHaveBeenCalledTimes(1);
    expect(handler2Throws).toHaveBeenCalledTimes(1);
    expect(handler3Ran).toHaveBeenCalledTimes(1);

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      '[EventBus] Error in handler for event "error-test":',
      expect.any(Error)
    );

    consoleErrorSpy.mockRestore();
  });
});
