import { resolveGalaxianKeyActions } from "../input/GalaxianKeyboardBindings";
import type { GalaxianConfig } from "../types/GalaxianConfigSchema";

describe("Galaxian keyboard bindings", () => {
  const customKeys: GalaxianConfig["KEYS"] = {
    LEFT: "KeyA",
    RIGHT: "KeyD",
    SHOOT: "KeyK",
    PAUSE: "KeyP",
    RESTART: "KeyR",
  };

  it("resolves the game-configured movement and fire keys", () => {
    expect(resolveGalaxianKeyActions("KeyA", customKeys)).toEqual(["moveLeft"]);
    expect(resolveGalaxianKeyActions("KeyD", customKeys)).toEqual(["moveRight"]);
    expect(resolveGalaxianKeyActions("KeyK", customKeys)).toEqual(["shoot"]);
  });

  it("does not silently fall back to generic key mappings when config overrides them", () => {
    expect(resolveGalaxianKeyActions("ArrowLeft", customKeys)).toEqual([]);
    expect(resolveGalaxianKeyActions("ArrowRight", customKeys)).toEqual([]);
    expect(resolveGalaxianKeyActions("Space", customKeys)).toEqual([]);
  });

  it("supports a configured key shared by multiple actions without dropping either action", () => {
    const sharedKey: GalaxianConfig["KEYS"] = {
      ...customKeys,
      LEFT: "Space",
      SHOOT: "Space",
    };

    expect(resolveGalaxianKeyActions("Space", sharedKey)).toEqual(["moveLeft", "shoot"]);
  });
});
