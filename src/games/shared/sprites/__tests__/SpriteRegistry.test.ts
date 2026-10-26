import { SpriteRegistry } from "../SpriteRegistry";

describe("SpriteRegistry static tower art", () => {
  beforeEach(() => {
    SpriteRegistry.init();
  });

  it("registers the basic tower as a full-image sprite", () => {
    const sheet = SpriteRegistry.get("tower_basic_art");
    expect(sheet).toMatchObject({
      id: "tower_basic_art",
      sourceMode: "full-image",
      frameWidth: 34,
      frameHeight: 34,
      anchor: { x: 0.5, y: 0.5 },
    });
    expect(sheet?.animations.idle.frames).toEqual([]);
    expect(sheet?.imageSource).toBeTruthy();
  });

  it("registers the sniper tower as a full-image sprite", () => {
    const sheet = SpriteRegistry.get("tower_sniper_art");
    expect(sheet).toMatchObject({
      id: "tower_sniper_art",
      sourceMode: "full-image",
      frameWidth: 34,
      frameHeight: 34,
      anchor: { x: 0.5, y: 0.5 },
    });
    expect(sheet?.animations.idle.frames).toEqual([]);
    expect(sheet?.imageSource).toBeTruthy();
  });
});
