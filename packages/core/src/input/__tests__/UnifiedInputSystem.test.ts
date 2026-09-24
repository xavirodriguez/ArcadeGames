import { UnifiedInputSystem } from "../UnifiedInputSystem";

describe("UnifiedInputSystem", () => {
  let system: UnifiedInputSystem;

  beforeEach(() => {
    system = new UnifiedInputSystem();
  });

  afterEach(() => {
    system.dispose();
  });

  it("returns action state based on bound keys via setKeyState without canvas focus", () => {
    system.bind("p1Up", ["KeyW"]);
    system.bind("p1Down", ["KeyS"]);

    expect(system.getAction("p1Up")).toBe(false);
    expect(system.getAction("p1Down")).toBe(false);

    system.setKeyState("KeyW", true);
    expect(system.getAction("p1Up")).toBe(true);
    expect(system.getAction("p1Down")).toBe(false);

    system.setKeyState("KeyW", false);
    expect(system.getAction("p1Up")).toBe(false);
  });

  it("prioritizes overrides over key bindings", () => {
    system.bind("shoot", ["Space"]);
    expect(system.getAction("shoot")).toBe(false);

    system.setOverride("shoot", true);
    expect(system.getAction("shoot")).toBe(true);

    system.clearOverride("shoot");
    expect(system.getAction("shoot")).toBe(false);
  });
});
