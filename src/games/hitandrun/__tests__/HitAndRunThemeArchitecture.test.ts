import fs from "fs";
import path from "path";
import * as ts from "typescript";
import { ThemeRegistry } from "../rendering/theme/ThemeRegistry";
import {
  activateHitAndRunTheme,
  resolveHitAndRunTheme,
  fantasyThemeModule,
  sumiEThemeModule
} from "../mods/registry";

const SIMULATION_FOLDERS = [
  "belt", "ai", "combat", "melee", "hurt", "waves", "weapons",
  "input", "levels", "pow", "story"
] as const;

function walkSourceFiles(directory: string): string[] {
  if (!fs.existsSync(directory)) return [];
  const files: string[] = [];
  for (const name of fs.readdirSync(directory)) {
    const fullPath = path.join(directory, name);
    if (fs.statSync(fullPath).isDirectory()) {
      if (!name.startsWith("__tests__")) files.push(...walkSourceFiles(fullPath));
    } else {
      const isTypeScript = name.endsWith(".ts") || name.endsWith(".tsx");
      const isDeclaration = name.endsWith(".d.ts") || name.endsWith(".d.tsx");
      const isTest = /\.(test|spec)\.tsx?$/.test(name);
      if (isTypeScript && !isDeclaration && !isTest) files.push(fullPath);
    }
  }
  return files;
}

function pointsToRendering(file: string, specifier: string): boolean {
  const normalizedSpecifier = specifier.replace(/\\/g, "/");
  if (normalizedSpecifier.split("/").includes("rendering")) return true;
  if (!specifier.startsWith(".")) return false;
  const resolved = path.resolve(path.dirname(file), specifier);
  return path.normalize(resolved).split(path.sep).includes("rendering");
}

function findRenderingImports(baseDir: string): string[] {
  const violations: string[] = [];
  const simulationFiles = SIMULATION_FOLDERS.flatMap(folder =>
    walkSourceFiles(path.join(baseDir, folder))
  );

  for (const file of simulationFiles) {
    const sourceFile = ts.createSourceFile(
      file,
      fs.readFileSync(file, "utf-8"),
      ts.ScriptTarget.Latest,
      true,
      file.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS
    );

    const addViolation = (module: ts.StringLiteralLike): void => {
      if (!pointsToRendering(file, module.text)) return;
      const line = sourceFile.getLineAndCharacterOfPosition(module.getStart(sourceFile)).line + 1;
      violations.push(`${path.relative(baseDir, file)}:${line} -> ${module.text}`);
    };

    const visit = (node: ts.Node): void => {
      if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) {
        if (node.moduleSpecifier && ts.isStringLiteralLike(node.moduleSpecifier)) {
          addViolation(node.moduleSpecifier);
        }
      } else if (ts.isCallExpression(node)) {
        const argument = node.arguments[0];
        const isDynamicImport = node.expression.kind === ts.SyntaxKind.ImportKeyword;
        const isRequire = ts.isIdentifier(node.expression) && node.expression.text === "require";
        if ((isDynamicImport || isRequire) && argument && ts.isStringLiteralLike(argument)) {
          addViolation(argument);
        }
      } else if (
        ts.isImportTypeNode(node) &&
        ts.isLiteralTypeNode(node.argument) &&
        ts.isStringLiteralLike(node.argument.literal)
      ) {
        addViolation(node.argument.literal);
      } else if (
        ts.isImportEqualsDeclaration(node) &&
        ts.isExternalModuleReference(node.moduleReference)
      ) {
        const expression = node.moduleReference.expression;
        if (expression && ts.isStringLiteralLike(expression)) addViolation(expression);
      }
      ts.forEachChild(node, visit);
    };

    visit(sourceFile);
  }

  return violations.sort();
}

describe("HitAndRun presentation theme boundary", () => {

  it("resolves fantasy and sumi-e theme modules", () => {
    expect(resolveHitAndRunTheme("fantasy")).toBe(fantasyThemeModule);
    expect(resolveHitAndRunTheme("sumi-e")).toBe(sumiEThemeModule);
    expect(fantasyThemeModule.palette.primary).toBeDefined();
    expect(sumiEThemeModule.palette.background).toBeDefined();
  });

  it("resolves theme metadata without a global active instance", () => {
    expect(resolveHitAndRunTheme("sumi-e")).toBe(sumiEThemeModule);
    expect(activateHitAndRunTheme("sumi-e")).toBe(sumiEThemeModule);
    expect(activateHitAndRunTheme("not-a-theme")).toBe(fantasyThemeModule);

    const first = ThemeRegistry.get("sumi-e");
    const second = ThemeRegistry.get("sumi-e");
    expect(first).not.toBe(second);
    first.dispose();
    second.dispose();
  });

  it("routes startup through the facade and forbids direct production activation", () => {
    const baseDir = path.resolve(__dirname, "..");
    const gameSource = fs.readFileSync(path.join(baseDir, "HitAndRunGame.ts"), "utf-8");
    expect(gameSource).toContain("resolveHitAndRunTheme(requestedThemeId).id");
    expect(gameSource).toContain("createHitRunPresentationSession(");
    expect(gameSource).not.toContain("activateHitAndRunTheme(requestedThemeId)");

    const facadePath = path.join(baseDir, "mods", "registry.ts");
    const facadeSource = fs.readFileSync(facadePath, "utf-8");
    expect(facadeSource).not.toContain("ThemeRegistry.setActiveTheme");

    const registrySource = fs.readFileSync(path.join(baseDir, "rendering", "theme", "ThemeRegistry.ts"), "utf-8");
    expect(registrySource).not.toContain("activeThemeInstance");
    expect(registrySource).not.toContain("getActiveTheme");
    expect(registrySource).not.toContain("setActiveTheme");

    const forbiddenCalls = walkSourceFiles(baseDir)
      .filter(file => /ThemeRegistry\.(getActiveTheme|setActiveTheme)\s*\(/.test(fs.readFileSync(file, "utf-8")))
      .map(file => path.relative(baseDir, file).replace(/\\/g, "/"));
    expect(forbiddenCalls).toEqual([]);
  });

  it("keeps simulation folders free of static, re-exported, dynamic and type-only rendering imports", () => {
    const baseDir = path.resolve(__dirname, "..");
    expect(findRenderingImports(baseDir)).toEqual([]);
  });

  it("does not invent empty GameplayMods", () => {
    const modsDir = path.resolve(__dirname, "../mods");
    const names = fs.readdirSync(modsDir, { recursive: true }).map(String);
    expect(names.some(name => /Gameplay/i.test(name))).toBe(false);
  });
});
