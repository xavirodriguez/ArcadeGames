import fs from "fs";
import path from "path";
import { resolveHitAndRunTheme, fantasyThemeModule, sumiEThemeModule } from "../mods/registry";

describe("HitAndRun Lote D theme boundary", () => {
  it("resolves fantasy and sumi-e theme modules", () => {
    expect(resolveHitAndRunTheme("fantasy")).toBe(fantasyThemeModule);
    expect(resolveHitAndRunTheme("sumi-e")).toBe(sumiEThemeModule);
    expect(fantasyThemeModule.palette.primary).toBeDefined();
    expect(sumiEThemeModule.palette.background).toBeDefined();
  });

  it("keeps simulation folders free of rendering imports", () => {
    const baseDir = path.resolve(__dirname, "..");
    const simulationFolders = ["belt", "ai", "combat", "melee", "hurt", "waves", "weapons"];
    const violations: string[] = [];

    function walk(dir: string): string[] {
      if (!fs.existsSync(dir)) return [];
      const out: string[] = [];
      for (const name of fs.readdirSync(dir)) {
        const full = path.join(dir, name);
        if (fs.statSync(full).isDirectory()) {
          if (!name.startsWith("__tests__")) out.push(...walk(full));
        } else if (name.endsWith(".ts") && !name.endsWith(".test.ts")) {
          out.push(full);
        }
      }
      return out;
    }

    for (const folder of simulationFolders) {
      for (const file of walk(path.join(baseDir, folder))) {
        const lines = fs.readFileSync(file, "utf8").split("\n");
        lines.forEach((line, i) => {
          if (!line.trim().startsWith("import ")) return;
          if (line.includes("/rendering") || line.includes('"./rendering') || line.includes("'./rendering")) {
            violations.push(`${path.relative(baseDir, file)}:${i + 1} ${line.trim()}`);
          }
        });
      }
    }

    expect(violations).toEqual([]);
  });

  it("does not invent empty GameplayMods", () => {
    const modsDir = path.resolve(__dirname, "../mods");
    const names = fs.readdirSync(modsDir, { recursive: true }).map(String);
    expect(names.some((n) => /Gameplay/i.test(n))).toBe(false);
  });
});
