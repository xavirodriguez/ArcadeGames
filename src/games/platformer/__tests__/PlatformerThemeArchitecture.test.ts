import fs from "fs";
import path from "path";
import { resolvePlatformerTheme, classicTheme } from "../mods/registry";
import { DEFAULT_ECHO_PALETTE } from "../../shared/rendering/PlatformerSharedVisualUtils";

describe("Platformer theme presentation (Lote C)", () => {
  it("resolves classic theme from shared palette defaults", () => {
    expect(resolvePlatformerTheme()).toBe(classicTheme);
    expect(classicTheme.tokens).toBe(DEFAULT_ECHO_PALETTE);
  });

  it("does not depend on the echorunner game package", () => {
    const modsRoot = path.resolve(__dirname, "../mods");
    const walk = (dir: string): string[] => {
      const out: string[] = [];
      for (const name of fs.readdirSync(dir)) {
        const full = path.join(dir, name);
        if (fs.statSync(full).isDirectory()) out.push(...walk(full));
        else out.push(fs.readFileSync(full, "utf-8"));
      }
      return out;
    };
    const sources = walk(modsRoot).join("\n");
    expect(sources).not.toMatch(/games\/echorunner/);
    expect(sources).not.toMatch(/registerSystems/);
  });
});
