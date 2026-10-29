import fs from "fs";
import path from "path";
import { resolveEchoRunnerTheme, classicTheme } from "../mods/registry";
import { DEFAULT_ECHO_PALETTE } from "../../shared/rendering/PlatformerSharedVisualUtils";

describe("Echo Runner theme presentation (Lote C)", () => {
  it("resolves classic theme from shared palette defaults", () => {
    expect(resolveEchoRunnerTheme()).toBe(classicTheme);
    expect(classicTheme.tokens).toBe(DEFAULT_ECHO_PALETTE);
  });

  it("does not depend on the platformer game package", () => {
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
    expect(sources).not.toMatch(/games\/platformer/);
    expect(sources).not.toMatch(/registerSystems/);
  });
});
