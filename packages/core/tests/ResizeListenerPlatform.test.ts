import { BaseGame } from "../src/runtime/BaseGame";
import { GamePresentationShell } from "../src/runtime/GamePresentationShell";

class ResizeTestGame extends BaseGame<any, any, any, any, any> {
  public update(): void {}
  public getGameState(): any { return {}; }
  public isGameOver(): boolean { return false; }
  public setup(): void { this.setupCommonArcadeResources(); }
}

describe("Resize listeners on non-DOM runtimes (React Native)", () => {
  const originalWindow = Reflect.get(globalThis, "window");

  afterEach(() => {
    if (originalWindow === undefined) {
      Reflect.deleteProperty(globalThis, "window");
    } else {
      Reflect.set(globalThis, "window", originalWindow);
    }
  });

  it("does not throw when `window` exists without the DOM event API", () => {
    // React Native exposes a partial `window` global that has no
    // addEventListener/removeEventListener functions. Guarding only on
    // `typeof window !== "undefined"` used to crash here.
    Reflect.set(globalThis, "window", {});

    const game = new ResizeTestGame();
    expect(() => game.setup()).not.toThrow();
    expect(() => game.destroy()).not.toThrow();

    const shell = new GamePresentationShell(game);
    expect(() => shell.registerResizeListener()).not.toThrow();
    expect(() => shell.unregisterResizeListener()).not.toThrow();
  });

  it("adds and removes a resize listener when the DOM event API is present", () => {
    const addEventListener = jest.fn();
    const removeEventListener = jest.fn();
    Reflect.set(globalThis, "window", { addEventListener, removeEventListener });

    const game = new ResizeTestGame();
    game.setup();
    expect(addEventListener).toHaveBeenCalledWith("resize", expect.any(Function));

    game.destroy();
    expect(removeEventListener).toHaveBeenCalledWith("resize", expect.any(Function));
  });
});
