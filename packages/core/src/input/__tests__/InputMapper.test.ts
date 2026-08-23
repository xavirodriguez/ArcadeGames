import { InputMapper, BindingSet, createEmptyRawInputState } from "../InputMapper";

describe("InputMapper", () => {
  const testBindings: BindingSet = [
    {
      kind: "axis",
      canonicalAxis: "moveX",
      source: { type: "keyboard", positiveKey: "KeyD", negativeKey: "KeyA" },
    },
    {
      kind: "axis",
      canonicalAxis: "moveX",
      source: { type: "gamepadAxis", index: 0, deadzone: 0.2 },
    },
    {
      kind: "axis",
      canonicalAxis: "moveY",
      source: { type: "keyboard", positiveKey: "KeyS", negativeKey: "KeyW" },
    },
    {
      kind: "action",
      canonicalAction: "fire",
      source: { type: "keyboard", key: "Space" },
    },
    {
      kind: "action",
      canonicalAction: "fire",
      source: { type: "gamepadButton", index: 0 },
    },
  ];

  it("maps keyboard keys to canonical axes and actions", () => {
    const mapper = new InputMapper(testBindings);
    const raw = createEmptyRawInputState();
    raw.keysPressed.add("KeyD");
    raw.keysPressed.add("Space");

    const canonical = mapper.map(raw);

    expect(canonical.axes.moveX).toBe(1);
    expect(canonical.axes.moveY).toBe(0);
    expect(canonical.actions.has("fire")).toBe(true);
  });

  it("resolves gamepad axis deadzones and button actions", () => {
    const mapper = new InputMapper(testBindings);
    const raw = createEmptyRawInputState();
    raw.gamepad = {
      connected: true,
      axes: [0.1, 0], // below 0.2 deadzone
      buttons: [true], // button 0 pressed
    };

    const canonical1 = mapper.map(raw);
    expect(canonical1.axes.moveX).toBe(0); // filtered by deadzone
    expect(canonical1.actions.has("fire")).toBe(true);

    raw.gamepad.axes[0] = 0.8;
    const canonical2 = mapper.map(raw);
    expect(canonical2.axes.moveX).toBe(0.8);
  });

  it("preserves higher magnitude signal when multiple sources drive the same axis", () => {
    const mapper = new InputMapper(testBindings);
    const raw = createEmptyRawInputState();
    raw.keysPressed.add("KeyD"); // moveX +1
    raw.gamepad = {
      connected: true,
      axes: [0], // moveX 0 from stationary gamepad
      buttons: [],
    };

    const canonical = mapper.map(raw);
    expect(canonical.axes.moveX).toBe(1); // Keyboard signal (+1) preserved over idle gamepad (0)
  });

  it("is pure and deterministic: same raw input produces same canonical output", () => {
    const mapper = new InputMapper(testBindings);
    const raw = createEmptyRawInputState();
    raw.keysPressed.add("KeyA");
    raw.keysPressed.add("KeyS");
    raw.keysPressed.add("Space");

    const res1 = mapper.map(raw);
    const res2 = mapper.map(raw);

    expect(res1.axes).toEqual(res2.axes);
    expect(Array.from(res1.actions)).toEqual(Array.from(res2.actions));
  });
});
