import {
  getEchoRunnerSpriteFrame,
  resolveEchoRunnerSpriteMotion,
} from "../rendering/EchoRunnerPixelArt";

describe("EchoRunnerPixelArt", () => {
  it("uses simulation state to resolve the animation", () => {
    expect(resolveEchoRunnerSpriteMotion(0, 0, true, false)).toBe("idle");
    expect(resolveEchoRunnerSpriteMotion(40, 0, true, false)).toBe("run");
    expect(resolveEchoRunnerSpriteMotion(0, -80, false, false)).toBe("jump");
    expect(resolveEchoRunnerSpriteMotion(0, 80, false, false)).toBe("fall");
    expect(resolveEchoRunnerSpriteMotion(0, 0, true, true)).toBe("attack");
  });

  it("selects run frames deterministically from the simulation tick", () => {
    expect(getEchoRunnerSpriteFrame("run", 0)).toEqual(getEchoRunnerSpriteFrame("run", 0));
    expect(getEchoRunnerSpriteFrame("run", 0)).not.toEqual(getEchoRunnerSpriteFrame("run", 4));
    expect(getEchoRunnerSpriteFrame("run", 0)).toEqual(getEchoRunnerSpriteFrame("run", 8));
  });

  it("uses a dedicated fall pose instead of reusing the idle sprite", () => {
    expect(getEchoRunnerSpriteFrame("fall", 0)).not.toEqual(getEchoRunnerSpriteFrame("idle", 0));
  });

  it("keeps every sprite frame on a consistent 16 by 20 pixel grid", () => {
    const motions = ["idle", "run", "jump", "fall", "attack"] as const;
    for (const motion of motions) {
      const frame = getEchoRunnerSpriteFrame(motion, 0);
      expect(frame).toHaveLength(20);
      expect(frame.every((row) => row.length === 16)).toBe(true);
    }
  });
});
