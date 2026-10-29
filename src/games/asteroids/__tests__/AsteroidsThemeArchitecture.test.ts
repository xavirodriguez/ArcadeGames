import fs from "fs";
import path from "path";
import { listAsteroidsThemes, resolveAsteroidsTheme, resolveAsteroidsThemeId } from "../presentation/themeRegistry";
import { icebergTheme } from "../mods/iceberg/IcebergTheme";
import { classicTheme } from "../mods/classic/ClassicTheme";
import { icebergGameplayMod } from "../mods/iceberg/IcebergGameplayMod";
import { resolveAsteroidsGameplayMod } from "../mods/gameplayRegistry";
import { icebergMod, classicMod } from "../mods";

function listTypeScriptFiles(directory: string): string[] {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return listTypeScriptFiles(fullPath);
    return entry.isFile() && entry.name.endsWith(".ts") ? [fullPath] : [];
  });
}

describe("Asteroids theme/gameplay split", () => {
  it("registers Classic and Iceberg as independent theme modules and gameplay modules", () => {
    expect(listAsteroidsThemes().map(({ id }) => id)).toEqual(expect.arrayContaining(["classic", "iceberg"]));
    expect(resolveAsteroidsTheme("iceberg")).toBe(icebergTheme);
    expect(resolveAsteroidsTheme("missing")).toBe(classicTheme);
    expect(resolveAsteroidsGameplayMod("iceberg")).toBe(icebergGameplayMod);
    expect(resolveAsteroidsGameplayMod("missing").id).toBe("classic");

    expect(icebergMod.id).toBe("iceberg");
    expect(icebergMod.theme).toBe(icebergTheme);
    expect(icebergMod.gameplay).toBe(icebergGameplayMod);
    expect(classicMod.theme).toBe(classicTheme);
    expect(classicMod.gameplay.id).toBe("classic");
    expect("spawnDestructionEffect" in icebergTheme).toBe(false);
    expect("registerDrawers" in icebergGameplayMod).toBe(false);
  });

  it("keeps URL theme selection compatible with the existing two-option start screen", () => {
    expect(resolveAsteroidsThemeId("iceberg")).toBe("iceberg");
    expect(resolveAsteroidsThemeId("classic")).toBe("classic");
    expect(resolveAsteroidsThemeId("unknown")).toBe("classic");
    expect(resolveAsteroidsThemeId(null)).toBe("classic");
  });

  it("keeps systems independent from presentation module imports", () => {
    const systemsDirectory = path.resolve(__dirname, "../systems");
    const sources = listTypeScriptFiles(systemsDirectory).map((file) =>
      fs.readFileSync(file, "utf-8")
    );

    for (const source of sources) {
      const importLines = source.split("\n").filter((line) => /^\s*import\b/.test(line));
      expect(importLines.some((line) =>
        /presentation\/|ClassicTheme|IcebergTheme|AsteroidsVisualMod/.test(line)
      )).toBe(false);
    }
  });

  it("keeps theme modules free of direct ECS writes and Iceberg gameplay imports", () => {
    const themePaths = [
      path.resolve(__dirname, "../mods/classic/ClassicTheme.ts"),
      path.resolve(__dirname, "../mods/iceberg/IcebergTheme.ts")
    ];
    for (const file of themePaths) {
      const source = fs.readFileSync(file, "utf-8");
      expect(source).not.toMatch(/\bworld\s*\.\s*(?:setResource|addComponent|removeComponent)\s*\(/);
    }

    const icebergSource = fs.readFileSync(themePaths[1]!, "utf-8");
    expect(icebergSource).not.toContain("IcebergFracture");
    expect(icebergSource).not.toContain("IcebergGameplayMod");
    expect(icebergSource).not.toContain("IcebergGeometry");
  });
});
